import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '@/middleware/auth.middleware'
import { authorize } from '@/middleware/role.middleware'
import {
  createAdminUserHandler,
  getHMCUsersHandler,
  deleteHMCUserHandler,
  bulkUploadStudentsHandler,
  getImportStatusHandler,
  getAllStudentsHandler,
  exportAllStudentsHandler,
  seedPersonasHandler,
} from './user.controller'

const router = Router()

// ── Multer: memory storage, hard file size cap ────────────────────────────────
// The MIME/size guards inside the controller are the logical gatekeepers.
// This multer limit is a cheap first-line defence at the network layer.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

// ── Admin/HMC management ──────────────────────────────────────────────────────
router.post('/admin', authenticate, authorize('ADMIN'), createAdminUserHandler)
router.get('/hmc', authenticate, authorize('ADMIN'), getHMCUsersHandler)
router.delete('/hmc/:id', authenticate, authorize('ADMIN'), deleteHMCUserHandler)

// ── Seed management ───────────────────────────────────────────────────────────
router.post('/seed-personas', authenticate, authorize('ADMIN'), seedPersonasHandler)

// ── Student management ────────────────────────────────────────────────────────
router.get('/students', authenticate, authorize('ADMIN'), getAllStudentsHandler)
router.get('/students/export', authenticate, authorize('ADMIN'), exportAllStudentsHandler)

// ── Bulk CSV upload ───────────────────────────────────────────────────────────
// Step 1: Upload CSV → 202 + { jobId }
router.post(
  '/bulk-upload',
  authenticate,
  authorize('ADMIN'),
  upload.single('file'),
  bulkUploadStudentsHandler
)

// Step 2: Poll status → { state, progress, result }
router.get(
  '/bulk-upload/:jobId/status',
  authenticate,
  authorize('ADMIN'),
  getImportStatusHandler
)

export default router
