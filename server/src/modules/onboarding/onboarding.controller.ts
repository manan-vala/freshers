import { Request, Response, NextFunction } from 'express'
import { getOnboardedStudents, verifyStudent } from './onboarding.service'

import { prisma } from '@/config/prisma'

export async function getOnboardedStudentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string | undefined
    let hostelId: string | undefined;

    if (req.user?.role === 'HMC') {
      const hmcAdmin = await prisma.hMCAdmin.findUnique({ where: { userId: req.user!.sub } });
      if (hmcAdmin) {
        hostelId = hmcAdmin.hostelId;
      }
    }

    const students = await getOnboardedStudents(search)
    res.json({ success: true, data: students })
  } catch (error) {
    next(error)
  }
}

export async function verifyStudentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { studentId } = req.body
    const { isVerified, needsReview } = req.body
    
    const result = await verifyStudent(studentId, Boolean(isVerified), Boolean(needsReview))
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}
