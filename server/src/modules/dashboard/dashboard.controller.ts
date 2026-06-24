import { Request, Response, NextFunction } from 'express'
import { getHostelDashboardStats } from './dashboard.service'

export async function getHostelDashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub
    const stats = await getHostelDashboardStats(userId)
    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
}
