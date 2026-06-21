import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from '@/config/env'
import { errorMiddleware } from '@/middleware/error.middleware'

// Module route imports
import authRoutes from '@/modules/auth/auth.routes'
import userRoutes from '@/modules/user/user.routes'
import onboardingRoutes from '@/modules/onboarding/onboarding.routes'
import hostelRoutes from '@/modules/hostel/hostel.routes'
import roomRoutes from '@/modules/room/room.routes'
import allocationRoutes from '@/modules/allocation/allocation.routes'
import dashboardRoutes from '@/modules/dashboard/dashboard.routes'

export function createApp() {
  const app = express()

  // ── Security ─────────────────────────────────────────────────────────────
  app.use(helmet())
  app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,          // Required for httpOnly cookie auth
    optionsSuccessStatus: 200,
  }))

  // ── Parsing ───────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use(cookieParser())

  // ── Routes ────────────────────────────────────────────────────────────────
  // DEPLOYMENT NOTE:
  // The backend is served at /{frontend-route}/api/ by nginx.
  // nginx strips /{frontend-route}/api/ before forwarding to this container.
  // So this server receives requests starting at /v1/... directly.
  // Do NOT add /api prefix here.
  app.use('/v1/auth',        authRoutes)
  app.use('/v1/users',       userRoutes)
  app.use('/v1/onboarding',  onboardingRoutes)
  app.use('/v1/hostels',     hostelRoutes)
  app.use('/v1/rooms',       roomRoutes)
  app.use('/v1/allocations', allocationRoutes)
  app.use('/v1/dashboard',   dashboardRoutes)

  // ── Health ────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // ── Error Handler (must be last) ──────────────────────────────────────────
  app.use(errorMiddleware)

  return app
}
