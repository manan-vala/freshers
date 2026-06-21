import { Router } from 'express'

const router = Router()

// Stub route
router.get('/', (_req, res) => {
  res.json({ message: 'Hostel routes stub' })
})

export default router
