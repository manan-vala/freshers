import { Request, Response, NextFunction } from 'express'
import { allocateRoom } from './allocation.service'

export async function allocateRoomHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body
    const allocatedBy = req.user!.sub

    const result = await allocateRoom(input, allocatedBy)

    res.status(201).json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}
