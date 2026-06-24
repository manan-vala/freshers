import { Request, Response, NextFunction } from 'express'
import { prisma } from '@/config/prisma'

export async function getHostelsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const hostels = await prisma.hostel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        type: true
      }
    })
    
    res.status(200).json({ success: true, data: hostels })
  } catch (error) {
    next(error)
  }
}
