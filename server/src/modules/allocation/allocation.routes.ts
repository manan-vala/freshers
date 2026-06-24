import { Router } from 'express'
import { authenticate } from '@/middleware/auth.middleware'
import { authorize } from '@/middleware/role.middleware'
import { validateBody } from '@/middleware/validate.middleware'
import { allocationSchema } from '@shared/allocation'
import { allocateRoomHandler } from './allocation.controller'

const router = Router()

router.post('/', authenticate, authorize('HMC'), validateBody(allocationSchema), allocateRoomHandler)

export default router
