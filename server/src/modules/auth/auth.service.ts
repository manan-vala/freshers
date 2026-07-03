import { prisma } from '@/config/prisma';
import { redis } from '@/config/redis';
import { env } from '@/config/env';
import { AppError } from '@/utils/errors';
import { generateOTP, storeOTP, verifyAndDeleteOTP } from '@/utils/otp.util';
import { signAccessToken, signRefreshToken, verifyToken } from '@/utils/jwt.util';
import { verifyPassword, hashPassword } from '@/utils/password.util';
import { emailQueue } from '@/modules/email/email.queue';
import type { LoginInput, ChangePasswordInput, ForgotPasswordInput, ResetPasswordInput } from '@shared/auth';
import { timingSafeEqual } from 'crypto';

// Constant-time string comparison — prevents timing attacks on credentials.
function safeEqual(a: string, b: string): boolean {
  // Buffers must be the same length for timingSafeEqual. If lengths differ,
  // we still run the comparison on padded data to avoid leaking length info.
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false; // Different byte lengths — guaranteed mismatch
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
  });

  if (!user || !user.isActive || !user.passwordHash) {
    throw new AppError(401, 'Invalid credentials');
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError(401, 'Invalid credentials');
  }
if (user.mustChangePassword) {
    const otp = generateOTP();
    await storeOTP('first-login', user.id, otp, 5); // 5 min expiry
    
    if (env.NODE_ENV === 'development') {
      console.log(`[DEV] First-login OTP sent to ${user.email}. Check your email worker output.`);
    }
    
    await emailQueue.add('first-login-otp', {
      to: user.email,
      templateId: 'otp-email',
      data: { otp },
    });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken(user.id);

  return {
    user: {
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
    accessToken,
    refreshToken,
  };
}

export async function adminLogin(input: LoginInput) {
  const emailMatch    = safeEqual(input.email,    env.SUPERADMIN_EMAIL);
  const passwordMatch = safeEqual(input.password, env.SUPERADMIN_PASSWORD);

  // Evaluate BOTH comparisons before throwing — prevents short-circuit leaking
  // which field was wrong.
  if (!emailMatch || !passwordMatch) {
    throw new AppError(401, 'Invalid admin credentials');
  }

  const adminUser = await prisma.user.upsert({
    where: { email: input.email },
    update: { role: 'ADMIN', lastLoginAt: new Date() },
    create: {
      loginId: input.email,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'ADMIN',
      mustChangePassword: false,
      isActive: true,
    }
  });

  const accessToken = signAccessToken({ sub: adminUser.id, role: adminUser.role });
  const refreshToken = signRefreshToken(adminUser.id);

  return {
    user: {
      role: adminUser.role,
      mustChangePassword: adminUser.mustChangePassword,
    },
    accessToken,
    refreshToken,
  };
}

export async function refresh(token: string) {
  const payload = verifyToken(token); // throws JsonWebTokenError if invalid/expired

  // Check if this specific refresh token JTI has been blocklisted
  const blocked = await redis.get(`jwt:blocklist:${payload.jti}`);
  if (blocked) {
    throw new AppError(401, 'Token revoked');
  }

  // `findUnique` only works on @unique fields — use `findFirst` for the compound filter
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'User not found or deactivated');
  }

  if (user.sessionInvalidatedAt) {
    // Token iat is in seconds; getTime() returns milliseconds
    const invalidatedAtSec = Math.floor(user.sessionInvalidatedAt.getTime() / 1000);
    if (payload.iat < invalidatedAtSec) {
      throw new AppError(401, 'Session expired — please log in again');
    }
  }

  const newAccessToken = signAccessToken({ sub: user.id, role: user.role });
  return { accessToken: newAccessToken };
}

export async function logout(jti: string, exp: number) {
  const remainingMs = exp * 1000 - Date.now();
  if (remainingMs > 0) {
    await redis.set(`jwt:blocklist:${jti}`, '1', 'PX', remainingMs);
  }
}



// ─── NEW: REQUEST FIRST LOGIN OTP ──────────────────────────────────────────
export async function requestFirstLoginOtp(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user || !user.isActive || !user.mustChangePassword) {
    throw new AppError(400, 'Invalid request or password already changed');
  }

  const otp = generateOTP();
  await storeOTP('first-login', user.id, otp, 5); // 5 min expiry
  if (env.NODE_ENV === 'development') {
    console.log('[DEV] OTP dispatched via email queue.');
  }
  await emailQueue.add('first-login-otp', {
    to: user.email,
    templateId: 'otp-email',
    data: { otp },
  });
}

// ─── UPDATED: CHANGE PASSWORD (FIRST LOGIN) ──────────────────────────────
export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user || !user.isActive) {
    throw new AppError(404, 'User not found');
  }

  // O(1) lookup in Redis instead of checking DB
  const isValid = await verifyAndDeleteOTP('first-login', user.id, input.otp);
  if (!isValid) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  const newPasswordHash = await hashPassword(input.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
      sessionInvalidatedAt: new Date(),
    },
  });
}

// ─── UPDATED: FORGOT PASSWORD ─────────────────────────────────────────────
export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
  });

  if (!user || !user.isActive) return;

  const otp = generateOTP();
  await storeOTP('forgot', user.email, otp, 5); // 5 min expiry
  if (env.NODE_ENV === 'development') {
    console.log('[DEV] Password reset OTP dispatched via email queue.');
  }
  await emailQueue.add('password-reset', {
    to: user.email,
    templateId: 'otp-email', 
    data: { otp },
  });
}

// ─── UPDATED: RESET PASSWORD ──────────────────────────────────────────────
export async function resetPassword(input: ResetPasswordInput) {
  const isValid = await verifyAndDeleteOTP('forgot', input.email, input.otp);
  if (!isValid) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  const user = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null }
  });

  if (!user) throw new AppError(404, 'User not found');

  const newPasswordHash = await hashPassword(input.newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
      sessionInvalidatedAt: new Date(),
    },
  });
}
export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      loginId: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      // 1. If the user is a STUDENT, fetch their onboarding status
      student: {
        select: {
          onboardingStatus: true,
        }
      },
      // 2. If the user is a HOSTEL ADMIN (HMC), fetch their hostel details
      hmcAdmin: {
        select: {
          hostelId: true,
          hostel: {
            select: { id: true, name: true, code: true, type: true }
          }
        }
      }
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
}