import jwt from 'jsonwebtoken'
import { env } from '@/config/env'
import { randomUUID } from 'crypto'

// Must mirror the UserRole enum in schema.prisma exactly.
export interface JWTPayload {
  sub: string             // userId
  role: 'STUDENT' | 'HMC' | 'ADMIN'
  jti: string             // unique token ID — used for Redis blocklist on logout
  iat: number
  exp: number
}

/**
 * Issues a short-lived access token (15 min by default).
 * Each token gets a unique `jti` so it can be individually blocklisted on logout.
 */
export function signAccessToken(payload: Pick<JWTPayload, 'sub' | 'role'>): string {
  return jwt.sign(
    { ...payload, jti: randomUUID() },
    env.JWT_SECRET as string,
    { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'] }
  )
}

/**
 * Issues a long-lived refresh token (7 days by default).
 */
export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, jti: randomUUID() },
    env.JWT_SECRET as string,
    { expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'] }
  )
}

/**
 * Verifies a token synchronously.
 * Throws JsonWebTokenError or TokenExpiredError if invalid/expired.
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_SECRET) as JWTPayload
}
