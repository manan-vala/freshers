import { Router } from 'express'
import { authenticate } from '@/middleware/auth.middleware'
import { authorize } from '@/middleware/role.middleware'
import { getHostelDashboardHandler } from './dashboard.controller'

const router = Router()

router.get('/hostel', authenticate, authorize('HMC'), getHostelDashboardHandler)

export default router
