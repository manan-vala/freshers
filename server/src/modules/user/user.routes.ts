import { Router } from 'express'
import { authenticate } from '@/middleware/auth.middleware'
import { authorize } from '@/middleware/role.middleware'
import { createAdminUserHandler, getHMCUsersHandler, deleteHMCUserHandler } from './user.controller'

const router = Router()

router.post('/admin', authenticate, authorize('ADMIN'), createAdminUserHandler)
router.get('/hmc', authenticate, authorize('ADMIN'), getHMCUsersHandler)
router.delete('/hmc/:id', authenticate, authorize('ADMIN'), deleteHMCUserHandler)

export default router
