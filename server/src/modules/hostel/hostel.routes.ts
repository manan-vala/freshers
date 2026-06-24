import { Router } from 'express'
import { getHostelsHandler } from './hostel.controller'
import { authenticate } from '@/middleware/auth.middleware'

const router = Router()

router.get('/', authenticate, getHostelsHandler)

export default router
