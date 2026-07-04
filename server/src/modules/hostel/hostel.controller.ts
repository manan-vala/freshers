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

export async function getMyHostelHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = await prisma.hMCAdmin.findUnique({
      where: { userId: req.user!.sub },
      include: {
        hostel: {
          include: {
            rooms: {
              select: {
                id: true,
                roomNumber: true,
                capacity: true,
                currentOccupancy: true
              }
            }
          }
        }
      }
    });
    
    if (!admin) {
      res.status(404).json({ success: false, message: 'Admin not found' });
      return;
    }
    
    if (!admin.hostel) {
      res.status(404).json({ success: false, message: 'Hostel not assigned' });
      return;
    }
    
    res.status(200).json({ success: true, data: admin.hostel });
  } catch (error) {
    next(error);
  }
}
