import { Router } from 'express'
import { authenticate } from '@/middleware/auth.middleware'
import { authorize } from '@/middleware/role.middleware'
import { getOnboardedStudentsHandler, verifyStudentHandler } from './onboarding.controller'

const router = Router()

// HMC and ADMIN can view onboarded students and verify them
router.get('/students', authenticate, authorize('HMC', 'ADMIN'), getOnboardedStudentsHandler)
router.patch('/students/:studentId/verify', authenticate, authorize('HMC', 'ADMIN'), verifyStudentHandler)

export default router
