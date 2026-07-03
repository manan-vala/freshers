import { redis } from '@/config/redis';

// Generates a cryptographically safe 6-digit string
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Stores OTP in Redis with a strict TTL (default 5 minutes)
export async function storeOTP(prefix: string, identifier: string, otp: string, ttlMinutes = 5): Promise<void> {
  const key = `otp:${prefix}:${identifier}`;
  await redis.set(key, otp, 'EX', ttlMinutes * 60);
}

// Verifies the OTP and instantly deletes it to prevent replay attacks
export async function verifyAndDeleteOTP(prefix: string, identifier: string, providedOtp: string): Promise<boolean> {
  const key = `otp:${prefix}:${identifier}`;
  const storedOtp = await redis.get(key);
  
  if (!storedOtp || storedOtp !== providedOtp) {
    return false;
  }
  
  // Instantly burn the OTP once verified
  await redis.del(key);
  return true;
}