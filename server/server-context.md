# Server — Architecture & Implementation Guide

> **For AI Agents:** Read this file fully before writing any server-side code. Every section contains rules that must be followed. Do not deviate from the patterns described here.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Directory Structure](#2-directory-structure)
3. [TypeScript Configuration](#3-typescript-configuration)
4. [Build Configuration](#4-build-configuration)
5. [Environment Variables](#5-environment-variables)
6. [Express App Setup](#6-express-app-setup)
7. [Architecture Rules — Controller / Service / DB](#7-architecture-rules--controller--service--db)
8. [Database — Prisma 7](#8-database--prisma-7)
9. [Redis — ioredis](#9-redis--ioredis)
10. [Authentication](#10-authentication)
11. [Middleware](#11-middleware)
12. [Error Handling](#12-error-handling)
13. [Email Worker](#13-email-worker)
14. [Shared Schemas](#14-shared-schemas)
15. [Deployment Configuration](#15-deployment-configuration)

---

## 1. Tech Stack

| Package | Version | Purpose |
|---|---|---|
| Node.js | 24 LTS | Runtime |
| TypeScript | 5.8+ | Language |
| Express | 5.x | HTTP framework |
| Prisma (`prisma-client` + `@prisma/adapter-pg`) | 7.x | ORM |
| PostgreSQL | 17 | Database |
| ioredis | 5.x | Redis client — rate limiting, JWT blocklist, BullMQ |
| BullMQ | 5.x | Email job queue (dev-only worker) |
| bcryptjs | 2.x | Password hashing |
| jsonwebtoken | 9.x | JWT sign + verify |
| Zod | 3.x | Validation — shared with client |
| Multer | 1.x | Multipart file upload (CSV/Excel ingestion) |
| csv-parse | 5.x | CSV stream parsing |
| ExcelJS | 4.x | Excel export |
| Nodemailer | 6.x | Email via IITG SMTP relay |
| Helmet | 7.x | HTTP security headers |
| cors | 2.x | CORS policy |
| express-rate-limit | 7.x | Request rate limiting |
| rate-limit-redis | 4.x | Redis store for rate limiter |
| tsup | 8.x | Production build bundler |
| PM2 | 5.x | Process manager (cluster mode) |

---

## 2. Directory Structure

```
server/
├── src/
│   ├── app.ts                        # Express app factory — middleware + route registration
│   ├── server.ts                     # HTTP server entry point — listens on PORT
│   ├── worker.ts                     # BullMQ email worker — run manually in dev only
│   ├── config/
│   │   ├── env.ts                    # Re-exports validated `env` from shared/env.ts
│   │   ├── prisma.ts                 # PrismaClient singleton (PrismaPg adapter)
│   │   └── redis.ts                  # ioredis singleton — shared instance
│   ├── middleware/
│   │   ├── auth.middleware.ts        # JWT cookie verification, blocklist check, sessionInvalidatedAt
│   │   ├── role.middleware.ts        # Role-based route guard factory
│   │   ├── validate.middleware.ts    # Zod validation factory for body/query/params
│   │   └── error.middleware.ts       # Global error handler (Express 5 — catches async throws)
│   ├── utils/
│   │   ├── jwt.util.ts               # signAccessToken, signRefreshToken, verifyToken
│   │   ├── password.util.ts          # hashPassword, verifyPassword (bcryptjs)
│   │   ├── email.util.ts             # Nodemailer transport + sendMail wrapper
│   │   ├── export.util.ts            # ExcelJS CSV/XLSX buffer generation
│   │   └── errors.ts                 # AppError class + HTTP error helpers
│   ├── jobs/
│   │   └── email.queue.ts            # BullMQ Queue definition + typed dispatch helpers
│   └── modules/
│       ├── auth/
│       │   ├── auth.routes.ts
│       │   ├── auth.controller.ts
│       │   └── auth.service.ts
│       ├── user/
│       │   ├── user.routes.ts
│       │   ├── user.controller.ts
│       │   └── user.service.ts
│       ├── onboarding/
│       │   ├── onboarding.routes.ts
│       │   ├── onboarding.controller.ts
│       │   └── onboarding.service.ts
│       ├── hostel/
│       │   ├── hostel.routes.ts
│       │   ├── hostel.controller.ts
│       │   └── hostel.service.ts
│       ├── room/
│       │   ├── room.routes.ts
│       │   ├── room.controller.ts
│       │   └── room.service.ts
│       ├── allocation/
│       │   ├── allocation.routes.ts
│       │   ├── allocation.controller.ts
│       │   └── allocation.service.ts
│       └── dashboard/
│           ├── dashboard.routes.ts
│           ├── dashboard.controller.ts
│           └── dashboard.service.ts
├── prisma/
│   └── schema.prisma
├── src/types/
│   └── express.d.ts                  # Augments Express Request with req.user
├── tsconfig.json
├── tsup.config.ts
├── .env
├── .env.example
└── Dockerfile
```

---

## 3. TypeScript Configuration

### `server/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "CommonJS",
    "moduleResolution": "Node10",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src", "../shared"],
  "exclude": ["node_modules", "dist"]
}
```

**Key decisions:**
- `"module": "CommonJS"` — avoids the `.js` extension requirement that ESM enforces on Node.js imports. Simpler, fully compatible with PM2.
- `"moduleResolution": "Node10"` — correct resolution strategy for CommonJS on Node.js.
- `noUncheckedIndexedAccess` — catches array/object access bugs at compile time.
- `@shared/*` alias — imports Zod schemas from the shared directory without relative paths.

### Express Request Type Augmentation (`src/types/express.d.ts`)

```ts
import type { JWTPayload } from '@/utils/jwt.util'

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

export {}
```

This file **must** be included in `tsconfig.json`'s `include` array (it is, via `"src"`). Without it, `req.user` does not exist on the type and every controller will error.

---

## 4. Build Configuration

### `server/tsup.config.ts`

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/server.ts',
    // worker is intentionally excluded from production build
    // it is run manually in development with: node --watch src/worker.ts
  },
  format: ['cjs'],
  target: 'node24',
  splitting: false,
  shims: true,
  dts: false,
  clean: true,
  sourcemap: true,
  minify: false,
  // Resolve @shared/* alias so tsup can find shared/ files
  esbuildOptions(options) {
    options.alias = {
      '@shared': '../shared',
      '@': './src',
    }
  },
})
```

### `server/package.json` Scripts

```json
{
  "scripts": {
    "dev": "node --watch src/server.ts",
    "build": "tsup",
    "start": "node dist/index.js",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "typecheck": "tsc --noEmit",
    "worker:dev": "node --watch src/worker.ts"
  }
}
```

**Node.js 24 native TypeScript stripping:** `node --watch src/server.ts` works in development without any compilation step. Types are stripped at runtime. The separate `tsc --noEmit` typecheck script is required in CI to catch type errors (native stripping does not type-check).

**Worker:** `worker:dev` is provided for manual use when email job testing is needed. It is not part of the normal dev or production flow.

---

## 5. Environment Variables

All env vars are validated at startup via Zod (`shared/env.ts`). If any required variable is missing or malformed, the server exits with a descriptive error. **Never read `process.env` directly in application code** — always import from `src/config/env.ts`.

### `server/.env`

```env
# ─── Server ───────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# DEPLOYMENT: CLIENT_URL is the browser-facing origin of the frontend.
# Used for CORS. In production this is https://your-domain.com (no path suffix).
CLIENT_URL=http://localhost:3000

# ─── Database ─────────────────────────────────────────────────────────────────
# connection_limit: (pg max_connections - 10 reserved) / PM2 worker count
# e.g. (100 - 10) / 4 workers = 22 → use 15 to be safe
DATABASE_URL=postgresql://user:password@localhost:5432/iitg_onboarding?connection_limit=15&pool_timeout=20

# ─── Redis ────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Auth ─────────────────────────────────────────────────────────────────────
JWT_SECRET=replace-with-minimum-32-character-random-string
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# ─── Email (IITG Google Workspace SMTP relay) ─────────────────────────────────
SMTP_HOST=smtp-relay.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@iitg.ac.in
SMTP_PASS=google-app-specific-password
SMTP_FROM=noreply@iitg.ac.in

# ─── Password Reset ───────────────────────────────────────────────────────────
RESET_TOKEN_EXPIRES_MINUTES=15
```

### `src/config/env.ts`

```ts
// Re-export from shared so the rest of the server only needs one import path
export { env } from '@shared/env'
```

---

## 6. Express App Setup

### `src/app.ts`

```ts
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { redis } from '@/config/redis'
import { env } from '@/config/env'
import { errorMiddleware } from '@/middleware/error.middleware'

// Module imports
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

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    store: new RedisStore({ client: redis, prefix: 'rl:global:' }),
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })

  // Stricter limit on the login endpoint
  const loginLimiter = rateLimit({
    store: new RedisStore({ client: redis, prefix: 'rl:login:' }),
    windowMs: 5 * 60 * 1000,    // 5 minutes
    max: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
  })

  app.use('/v1/', globalLimiter)
  app.use('/v1/auth/login', loginLimiter)

  // ── Routes ────────────────────────────────────────────────────────────────
  // DEPLOYMENT NOTE:
  // The backend is served at /{frontend-route}/api/ by nginx.
  // nginx strips /{frontend-route}/api/ before forwarding to this container.
  // So this server receives requests starting at /v1/... directly.
  // Do NOT add /api prefix here or anywhere in this codebase.
  app.use('/v1/auth',        authRoutes)
  app.use('/v1/users',       userRoutes)
  app.use('/v1/onboarding',  onboardingRoutes)
  app.use('/v1/hostels',     hostelRoutes)
  app.use('/v1/rooms',       roomRoutes)
  app.use('/v1/allocations', allocationRoutes)
  app.use('/v1/dashboard',   dashboardRoutes)

  // ── Health ────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))

  // ── Error Handler (must be last) ──────────────────────────────────────────
  app.use(errorMiddleware)

  return app
}
```

### `src/server.ts`

```ts
import http from 'http'
import { createApp } from './app'
import { env } from '@/config/env'
import { prisma } from '@/config/prisma'
import { redis } from '@/config/redis'

async function bootstrap() {
  const app = createApp()
  const server = http.createServer(app)

  server.listen(env.PORT, () => {
    console.log(`✓ Server running on port ${env.PORT} [${env.NODE_ENV}]`)
  })

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`${signal} received — shutting down`)
    server.close(async () => {
      await prisma.$disconnect()
      redis.disconnect()
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
```

---

## 7. Architecture Rules — Controller / Service / DB

This is the most important section. These rules are **mandatory**.

### Three-Layer Architecture

```
Request
  ↓
routes.ts          — registers path + middleware chain
  ↓
controller.ts      — extracts input, calls service, sends response
  ↓
service.ts         — ALL business logic and database calls live here
  ↓
Prisma / Redis
```

### Rules

**Controllers must:**
- Extract data from `req.body`, `req.params`, `req.query`, `req.user`
- Call exactly one service function per action
- Send the response (`res.json(...)`)
- Do nothing else

**Controllers must NOT:**
- Contain any business logic
- Call Prisma directly
- Call Redis directly
- Check permissions beyond what middleware already enforced
- Make decisions about data shape

**Services must:**
- Contain all business logic
- Perform all database queries (via Prisma)
- Throw `AppError` when business rules are violated
- Return plain objects — never `res.json()`
- Be independently testable without an HTTP context

**Services must NOT:**
- Accept `req`, `res`, or `next` as parameters
- Know anything about HTTP

### Example — Correct Pattern

```ts
// allocation.controller.ts
import { Request, Response } from 'express'
import { allocateRoom } from './allocation.service'

export async function allocateRoomHandler(req: Request, res: Response) {
  const { studentId, hostelId, roomId, notes } = req.body
  const allocatedBy = req.user!.sub

  const result = await allocateRoom({ studentId, hostelId, roomId, notes, allocatedBy })

  res.status(201).json({ success: true, data: result })
}
```

```ts
// allocation.service.ts — business logic and DB live here
import { prisma } from '@/config/prisma'
import { AppError } from '@/utils/errors'

export async function allocateRoom(input: AllocateRoomInput) {
  // 1. Validate student has no active allocation
  const existing = await getActiveAllocation(input.studentId)
  if (existing) throw new AppError(409, 'Student already has an active allocation', 'ALREADY_ALLOCATED')

  // 2. Validate room capacity — inside transaction
  const allocation = await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id: input.roomId } })
    if (!room) throw new AppError(404, 'Room not found')
    if (room.currentOccupancy >= room.capacity) {
      throw new AppError(409, 'Room is at full capacity', 'ROOM_FULL')
    }

    // 3. Create allocation + update occupancy + write audit — atomically
    const newAllocation = await tx.allocation.create({ data: { ...input, isActive: true } })
    await tx.room.update({
      where: { id: input.roomId },
      data: { currentOccupancy: { increment: 1 } },
    })
    await tx.allocationAudit.create({
      data: {
        allocationId: newAllocation.id,
        academicYearId: input.academicYearId,
        action: 'ALLOCATED',
        performedBy: input.allocatedBy,
        newRoomId: input.roomId,
      },
    })

    return newAllocation
  })

  return allocation
}

// Private helper — only used within this service file
async function getActiveAllocation(studentId: string) {
  return prisma.allocation.findFirst({
    where: { studentId, isActive: true },
  })
}
```

### One Service Function Per Action

Do not write a single service function that does multiple things. Break operations into focused, named functions:

```ts
// ✅ Correct — each function does one thing
export async function allocateRoom(input) { ... }
export async function changeRoom(input) { ... }
export async function swapRoommates(input) { ... }
export async function deallocateStudent(allocationId, performedBy) { ... }
export async function getActiveAllocation(studentId) { ... }
export async function getAllocationAuditLog(allocationId) { ... }

// ❌ Wrong — one function doing too much
export async function manageAllocation(action, data) { ... }
```

---

## 8. Database — Prisma 7

### Client Initialization (`src/config/prisma.ts`)

```ts
import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { env } from '@/config/env'

const pool = new Pool({ connectionString: env.DATABASE_URL })
const adapter = new PrismaPg({ pool })

export const prisma = new PrismaClient({ adapter })
```

**Key notes:**
- Prisma 7 uses the `PrismaPg` driver adapter — the `pg` pool is passed in explicitly. Connection limit is configured in `DATABASE_URL` query string.
- Import `{ prisma }` from `@/config/prisma` in service files. Nowhere else.
- `PrismaClient` is a singleton. Do not instantiate it anywhere else.

### Schema Location

`server/prisma/schema.prisma` — single source of truth. Full schema is documented in `technical-context.md`.

### Migrations

```bash
# Development — generate and apply migration
npm run db:migrate -- --name <descriptive_name>

# Production — apply existing migrations
npx prisma migrate deploy

# After schema changes — regenerate client types
npm run db:generate
```

### Transaction Pattern

Any operation that touches more than one table must use `prisma.$transaction()`. This is especially important for allocation operations where room occupancy must stay in sync.

```ts
// Always use transaction for multi-table mutations
await prisma.$transaction(async (tx) => {
  await tx.allocation.create({ ... })
  await tx.room.update({ ... })
  await tx.allocationAudit.create({ ... })
})
```

### Common Query Patterns

```ts
// Paginated list with filters
const [items, total] = await Promise.all([
  prisma.student.findMany({
    where: { academicYearId, onboardingStatus },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  }),
  prisma.student.count({ where: { academicYearId, onboardingStatus } }),
])

// Soft-delete aware query — always filter deletedAt
prisma.user.findMany({ where: { deletedAt: null } })

// Never hard-delete — always soft-delete
prisma.user.update({ where: { id }, data: { deletedAt: new Date() } })
```

---

## 9. Redis — ioredis

### Client Initialization (`src/config/redis.ts`)

```ts
import IORedis from 'ioredis'
import { env } from '@/config/env'

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,    // Required for BullMQ compatibility
  enableReadyCheck: false,
  lazyConnect: false,
  family: 4,
  retryStrategy: (times) => Math.min(times * 50, 2000),
})

redis.on('connect', () => console.log('✓ Redis connected'))
redis.on('error',   (err) => console.error('Redis error:', err))
```

One `redis` instance is shared across all consumers. Import `{ redis }` from `@/config/redis`.

### Key Namespace Convention

```
jwt:blocklist:{jti}          → JWT logout blocklist (TTL = token remaining lifetime)
rl:global:{ip}               → Global rate limit counter
rl:login:{ip}                → Login rate limit counter
bull:emails                  → BullMQ queue (managed by BullMQ internally)
```

---

## 10. Authentication

### JWT Utilities (`src/utils/jwt.util.ts`)

```ts
import jwt from 'jsonwebtoken'
import { env } from '@/config/env'

export interface JWTPayload {
  sub: string             // userId
  role: 'STUDENT' | 'HMC' | 'ADMIN'
  jti: string             // unique token ID — used for blocklist
  iat: number
  exp: number
}

export function signAccessToken(payload: Pick<JWTPayload, 'sub' | 'role'>): string {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL }
  )
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, jti: crypto.randomUUID() },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_TTL }
  )
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_SECRET) as JWTPayload
}
```

### Password Utilities (`src/utils/password.util.ts`)

```ts
import bcrypt from 'bcryptjs'

const ROUNDS = 12

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

### Cookie Configuration

Applied in auth service when issuing tokens:

```ts
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const secure = env.NODE_ENV === 'production'
  const cookieBase = { httpOnly: true, sameSite: 'strict' as const, secure }

  res.cookie('access_token', accessToken, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000,         // 15 minutes
  })

  res.cookie('refresh_token', refreshToken, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}
```

### Session Invalidation — Two Layers

**Layer 1 — Per-token blocklist (logout):**
```ts
// On POST /auth/logout — blocklist current token's jti
const remainingMs = (payload.exp * 1000) - Date.now()
await redis.set(`jwt:blocklist:${payload.jti}`, '1', 'PX', remainingMs)
```

**Layer 2 — sessionInvalidatedAt (password change):**
```ts
// On password change or reset — invalidate ALL existing tokens for this user
await prisma.user.update({
  where: { id: userId },
  data: { sessionInvalidatedAt: new Date(), mustChangePassword: false },
})
// Auth middleware checks: if token.iat < sessionInvalidatedAt → reject
```

---

## 11. Middleware

### Auth Middleware (`src/middleware/auth.middleware.ts`)

Executed in this exact order on every protected route:

```ts
import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '@/utils/jwt.util'
import { redis } from '@/config/redis'
import { prisma } from '@/config/prisma'
import { AppError } from '@/utils/errors'

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies.access_token
  if (!token) throw new AppError(401, 'Unauthenticated')

  const payload = verifyToken(token)   // throws if invalid/expired

  // 1. Check JWT blocklist (logout)
  const blocked = await redis.get(`jwt:blocklist:${payload.jti}`)
  if (blocked) throw new AppError(401, 'Token revoked')

  // 2. Check user still exists and is active
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || user.deletedAt) throw new AppError(401, 'User not found')
  if (!user.isActive) throw new AppError(403, 'Account deactivated')

  // 3. Check sessionInvalidatedAt (password change invalidation)
  if (user.sessionInvalidatedAt) {
    const invalidatedAtSec = user.sessionInvalidatedAt.getTime() / 1000
    if (payload.iat < invalidatedAtSec) throw new AppError(401, 'Session expired')
  }

  req.user = payload
  next()
}
```

### Role Middleware (`src/middleware/role.middleware.ts`)

```ts
import { Request, Response, NextFunction } from 'express'
import { AppError } from '@/utils/errors'
import type { JWTPayload } from '@/utils/jwt.util'

export function authorize(...roles: JWTPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'Forbidden')
    }
    next()
  }
}
```

Usage in routes:

```ts
router.post('/',               authenticate, authorize('HMC', 'ADMIN'), allocateRoomHandler)
router.get('/admin/list',      authenticate, authorize('ADMIN', 'HMC'), listStudentsHandler)
router.get('/me',              authenticate, authorize('STUDENT'),       getMeHandler)
```

### Validate Middleware (`src/middleware/validate.middleware.ts`)

```ts
import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body)   // throws ZodError on failure → caught by errorMiddleware
    next()
  }
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query) as typeof req.query
    next()
  }
}
```

Usage in routes:

```ts
import { validateBody } from '@/middleware/validate.middleware'
import { loginSchema } from '@shared/auth'

router.post('/login', validateBody(loginSchema), loginHandler)
```

---

## 12. Error Handling

### `AppError` (`src/utils/errors.ts`)

```ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}
```

### Error Middleware (`src/middleware/error.middleware.ts`)

Express 5 automatically forwards async throws to this handler — no `try/catch` needed in controllers or services.

```ts
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '@/utils/errors'

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation failure
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  // Known application error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code ?? null,
    })
  }

  // Unknown error — log and return 500
  console.error('[Unhandled error]', err)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}
```

### Response Envelope

Every successful response follows this shape:

```ts
// Success
res.status(200).json({ success: true, data: result })
res.status(201).json({ success: true, data: result })
res.status(200).json({ success: true, message: 'Action completed.' })

// Error — handled by errorMiddleware, not in controllers
```

---

## 13. Email Worker

The BullMQ worker (`src/worker.ts`) is a **development tool only**. It is not part of the production Docker image or PM2 configuration.

### When to use

Run manually when testing email flows during development:

```bash
npm run worker:dev
```

The worker picks up jobs from the `emails` BullMQ queue and processes them via Nodemailer.

### How jobs are queued

From any service that needs to send an email:

```ts
import { emailQueue } from '@/jobs/email.queue'

await emailQueue.add('credential', {
  to: user.email,
  templateId: 'credentials',
  data: { loginId: user.loginId, password: plainPassword },
})
```

Jobs are queued even when the worker is not running — BullMQ stores them in Redis. They will be processed the next time the worker is started.

### `src/jobs/email.queue.ts`

```ts
import { Queue } from 'bullmq'
import { redis } from '@/config/redis'
import type { EmailJob } from '@shared/email'

export const emailQueue = new Queue<EmailJob>('emails', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
})
```

### `src/worker.ts`

```ts
import { Worker } from 'bullmq'
import nodemailer from 'nodemailer'
import { redis } from '@/config/redis'
import { env } from '@/config/env'
import type { EmailJob } from '@shared/email'

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
})

const worker = new Worker<EmailJob>(
  'emails',
  async (job) => {
    const { to, templateId, data } = job.data
    const html = renderTemplate(templateId, data)
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject: getSubject(templateId), html })
    console.log(`✓ Email sent to ${to} [${templateId}]`)
  },
  { connection: redis }
)

worker.on('failed', (job, err) => {
  console.error(`✗ Email job ${job?.id} failed:`, err.message)
})

function getSubject(templateId: EmailJob['templateId']): string {
  const subjects: Record<EmailJob['templateId'], string> = {
    credentials: 'IITG Fresher Onboarding — Your Login Credentials',
    allocation: 'IITG Fresher Onboarding — Room Allocation Confirmed',
    'password-reset': 'IITG Fresher Onboarding — Password Reset',
  }
  return subjects[templateId]
}

function renderTemplate(templateId: EmailJob['templateId'], data: Record<string, string>): string {
  // Build and return HTML string for each templateId
  // Keep templates simple — no external templating engine needed
  if (templateId === 'credentials') {
    return `<p>Login ID: ${data['loginId']}</p><p>Password: ${data['password']}</p>`
  }
  return ''
}
```

---

## 14. Shared Schemas

Zod schemas in `shared/` are the single source of truth for both server-side request validation and client-side form validation. Import using the `@shared/` path alias:

```ts
import { loginSchema, type LoginInput }             from '@shared/auth'
import { onboardingSchema, type OnboardingInput }   from '@shared/student'
import { allocationSchema }                          from '@shared/allocation'
import { env }                                       from '@shared/env'
```

**Rules:**
- Never redefine a schema that exists in `shared/`.
- `validateBody(schema)` middleware uses these schemas — the controller receives a fully-typed, validated body.
- If a new field is needed, update the schema in `shared/` first.

---

## 15. Deployment Configuration

### How the Deployment Works

```
Browser → https://domain.com/freshers-onboarding/api/v1/auth/login
  ↓
Outer nginx:
  location /freshers-onboarding/api/ {
    proxy_pass http://localhost:5000/;   ← trailing slash strips the location prefix
  }
  ↓
This container (port 5000) receives: /v1/auth/login
Express router handles: /v1/auth/login  ✓
```

**Critical:** The outer nginx strips `/freshers-onboarding/api/` entirely before forwarding. This server must never add `/api` to its own routes. Routes in this codebase start at `/v1/`.

### `Dockerfile` (`server/Dockerfile`)

```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY ../shared ./shared_temp
# Shared directory is included in tsup build via alias

RUN npm run build

FROM node:24-alpine
WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY ecosystem.config.js .

ENV NODE_ENV=production

# Run migrations before starting the server
CMD ["sh", "-c", "npx prisma migrate deploy && pm2-runtime ecosystem.config.js"]
```

### PM2 Config (`server/ecosystem.config.js`)

```js
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'dist/index.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Graceful shutdown timeout
      kill_timeout: 5000,
      listen_timeout: 3000,
    },
    // Worker is NOT listed here.
    // Run manually in dev: npm run worker:dev
  ],
}
```

### `docker-compose.yml` (development only)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: iitg_onboarding
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Infrastructure only — no app services in docker-compose. Run the server with `npm run dev` locally and point it at the docker-compose postgres + redis.

### Rules for AI Agents — CRITICAL

- **Never add `/api` prefix** to any route in this codebase. nginx handles this externally.
- Routes start at `/v1/...`. No exceptions.
- `PORT` is always read from `env.PORT`. Never hardcode a port number.
- `CLIENT_URL` is used for the CORS `origin`. Set it to the browser-facing domain in production (no path suffix — just `https://domain.com`).
- The worker is **excluded from Docker and PM2**. Do not add it to `ecosystem.config.js` or the Dockerfile `CMD`.
- Database migrations (`prisma migrate deploy`) run at container startup, before the server starts.
- Never call `process.env.X` directly — always import from `@/config/env`.

---
