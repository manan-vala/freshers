import { Request, Response, NextFunction } from 'express'
import { AppError } from '@/utils/errors'
import type { JWTPayload } from '@/utils/jwt.util'

export function authorize(...roles: JWTPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError(403, 'Forbidden'))
      return
    }
    next()
  }
}

