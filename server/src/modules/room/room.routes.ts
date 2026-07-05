import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '@/middleware/auth.middleware'
import { authorize } from '@/middleware/role.middleware'
import { validateBody } from '@/middleware/validate.middleware'
import { createRoomSchema, updateRoomSchema } from '@shared/room'
import { getRoomsHandler, createRoomHandler, updateRoomHandler, deactivateRoomHandler, bulkUploadRoomsHandler } from './room.controller'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

router.get('/', authenticate, authorize('HMC', 'ADMIN'), getRoomsHandler)
router.post('/', authenticate, authorize('ADMIN'), validateBody(createRoomSchema), createRoomHandler)
router.post('/bulk-upload', authenticate, authorize('ADMIN'), upload.single('file'), bulkUploadRoomsHandler)
router.patch('/:id', authenticate, authorize('ADMIN'), validateBody(updateRoomSchema), updateRoomHandler)
router.delete('/:id', authenticate, authorize('ADMIN'), deactivateRoomHandler)

export default router
