import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '@/utils/jwt.util'
import { redis } from '@/config/redis'
import { prisma } from '@/config/prisma'
import { AppError } from '@/utils/errors'

// Express 5 automatically catches async throws and forwards them to the
// error middleware — no try/catch needed here.
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  let token = req.cookies.access_token as string | undefined
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    next(new AppError(401, 'Unauthenticated'))
    return
  }

  let payload
  try {
    payload = verifyToken(token)   // throws JsonWebTokenError if invalid/expired
  } catch {
    next(new AppError(401, 'Invalid or expired token'))
    return
  }

  // 1. Check JWT blocklist (logout)
  const blocked = await redis.get(`jwt:blocklist:${payload.jti}`)
  if (blocked) {
    next(new AppError(401, 'Token revoked'))
    return
  }

  // 2. Check user still exists and is active
  const user = await prisma.user.findFirst({ where: { id: payload.sub, deletedAt: null } })
  if (!user) {
    next(new AppError(401, 'User not found'))
    return
  }
  if (!user.isActive) {
    next(new AppError(403, 'Account deactivated'))
    return
  }

  // 3. Check sessionInvalidatedAt (password change invalidation)
  if (user.sessionInvalidatedAt) {
    const invalidatedAtSec = Math.floor(user.sessionInvalidatedAt.getTime() / 1000)
    if (payload.iat < invalidatedAtSec) {
      next(new AppError(401, 'Session expired'))
      return
    }
  }

  req.user = payload
  next()
}
