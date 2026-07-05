import { Router } from 'express'
import { authenticate } from '@/middleware/auth.middleware'
import { authorize } from '@/middleware/role.middleware'
import { getOnboardedStudentsHandler, verifyStudentHandler, submitOnboardingHandler } from './onboarding.controller'
import { onboardingSchema } from '@shared/student'
import { validateBody } from '@/middleware/validate.middleware'

const router = Router()

// HMC and ADMIN can view onboarded students and verify them
// Students submit their onboarding form
router.post('/submit', authenticate, authorize('STUDENT'), validateBody(onboardingSchema), submitOnboardingHandler)

router.get('/students', authenticate, authorize('HMC', 'ADMIN'), getOnboardedStudentsHandler)
router.patch('/students/:studentId/verify', authenticate, authorize('HMC', 'ADMIN'), verifyStudentHandler)

export default router
