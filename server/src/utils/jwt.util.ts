import jwt from 'jsonwebtoken'
import { env } from '@/config/env'
import { randomUUID } from 'crypto'

export interface JWTPayload {
  sub: string
  role: 'STUDENT' | 'WARDEN' | 'ADMIN' | 'SUPER_ADMIN'
  jti: string
  iat: number
  exp: number
}

/**
 * Generates a short-lived access token with a unique JTI for Redis blocklisting
 */
export function generateAccessToken(userId: string, role: JWTPayload['role']): string {
  const payload = { sub: userId, role }
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    jwtid: randomUUID(), // Sets the `jti` claim
  })
}

/**
 * Generates a longer-lived refresh token
 */
export function generateRefreshToken(userId: string, role: JWTPayload['role']): string {
  const payload = { sub: userId, role }
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
    jwtid: randomUUID(), // Sets the `jti` claim
  })
}


/**
 * Verifies a token synchronously.
 * Throws JsonWebTokenError or TokenExpiredError if invalid.
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_SECRET) as JWTPayload
}
