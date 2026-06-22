import { prisma } from '@/config/prisma';
import { redis } from '@/config/redis';
import { env } from '@/config/env';
import { AppError } from '@/utils/errors';
import { signAccessToken, signRefreshToken, verifyToken } from '@/utils/jwt.util';
import { verifyPassword, hashPassword } from '@/utils/password.util';
import { emailQueue } from '@/jobs/email.queue';
import { randomBytes, createHash } from 'crypto';
import type { LoginInput, ChangePasswordInput, ForgotPasswordInput, ResetPasswordInput } from '@shared/auth';

export async function login(input: LoginInput) {
  // `findUnique` does not support filtering on non-unique fields in `where`.
  // `deletedAt` is not unique, so we use `findFirst` with the unique loginId
  // filter combined with the soft-delete guard.
  const user = await prisma.user.findFirst({
    where: { loginId: input.loginId, deletedAt: null },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'Invalid credentials');
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError(401, 'Invalid credentials');
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

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const isValidPassword = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError(400, 'Current password is incorrect');
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

export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
  });

  // Always return silently to prevent user enumeration (timing-safe early return is fine
  // here because we don't do any DB work on the missing-user path).
  if (!user || !user.isActive) {
    return;
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  // env.RESET_TOKEN_EXPIRES_MINUTES is already a number after Zod coercion — no need for Number()
  const expiresAt = new Date(Date.now() + env.RESET_TOKEN_EXPIRES_MINUTES * 60_000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  await emailQueue.add('password-reset', {
    to: user.email,
    templateId: 'password-reset',
    data: { token: rawToken },
  });
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = createHash('sha256').update(input.token).digest('hex');

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetToken || resetToken.isUsed || resetToken.expiresAt < new Date()) {
    throw new AppError(400, 'Invalid or expired reset token');
  }

  const newPasswordHash = await hashPassword(input.newPassword);

  // Batch write: update the user's password and mark the token used atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        sessionInvalidatedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { isUsed: true },
    }),
  ]);
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
      student: {
        select: {
          onboardingStatus: true,
        }
      }
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
}
