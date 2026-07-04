import { Router } from 'express'
import { getHostelsHandler, getMyHostelHandler } from './hostel.controller'
import { authenticate } from '@/middleware/auth.middleware'
import { authorize } from '@/middleware/role.middleware'

const router = Router()

router.get('/', authenticate, getHostelsHandler)
router.get('/mine', authenticate, authorize('HMC', 'ADMIN'), getMyHostelHandler)

export default router
