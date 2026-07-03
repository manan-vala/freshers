import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '@/middleware/auth.middleware'
import { authorize } from '@/middleware/role.middleware'
import { createAdminUserHandler, getHMCUsersHandler, deleteHMCUserHandler, bulkUploadStudentsHandler, getAllStudentsHandler } from './user.controller'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/admin', authenticate, authorize('ADMIN'), createAdminUserHandler)
router.get('/hmc', authenticate, authorize('ADMIN'), getHMCUsersHandler)
router.delete('/hmc/:id', authenticate, authorize('ADMIN'), deleteHMCUserHandler)
router.post('/bulk-upload', authenticate, authorize('ADMIN'), upload.single('file'), bulkUploadStudentsHandler)
router.get('/students', authenticate, authorize('ADMIN'), getAllStudentsHandler)

export default router
