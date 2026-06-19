# Fresher Onboarding & Hostel Management Portal — Technical Context

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [Server Component Breakdown](#5-server-component-breakdown)
6. [Client Component Breakdown](#6-client-component-breakdown)
7. [API Documentation](#7-api-documentation)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Error Handling Conventions](#9-error-handling-conventions)
10. [Environment Variables](#10-environment-variables)

---

## 1. Project Overview

This portal serves three user roles — **Student (Fresher)**, **HMC Staff (Hostel Management Committee)**, and **SWC Admin** — and handles the complete lifecycle of:

- Fresher account provisioning and first-login mandatory password reset
- Student onboarding form collection (personal, medical, emergency contact data)
- Hostel and room inventory management
- Room and roommate allocation — desk-based at arrival or pre-allocation by HMC
- Conditional roommate contact disclosure
- Student dashboard with allocation status and hostel information
- Allotment slip PDF generation (Phase 2)
- Admin reporting, search, filter, and CSV/Excel export
- Multi-year reuse: the system resets per academic batch without dropping historical data

---

## 2. System Architecture

The codebase lives in a **single repository** with three top-level directories: `client`, `server`, and `shared`.

```
iitg-onboarding/
├── client/              # React 19 SPA (Vite 8)
├── server/              # Express 5 modular monolith (Node.js 24)
├── shared/              # Zod schemas + TypeScript types shared by both
├── package.json         # Root — single npm install
├── package-lock.json
└── tsconfig.base.json   # Base TypeScript config extended by client and server
```

The server is a **modular monolith** — each feature owns its routes, controller, service, and validator. A shared layer handles auth middleware, error handling, database connection, Redis, and utilities.

---

### Server Directory Structure

```
server/
├── src/
│   ├── app.ts                      # Express app setup + middleware registration
│   ├── server.ts                   # HTTP server entry point
│   ├── worker.ts                   # BullMQ email worker (separate process)
│   ├── config/
│   │   ├── prisma.ts               # Prisma client (PrismaPg adapter)
│   │   ├── redis.ts                # ioredis client shared across rate limit, BullMQ, JWT blocklist
│   │   └── env.ts                  # Re-exports validated env from shared/env.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts      # JWT cookie verification + Redis blocklist + sessionInvalidatedAt check
│   │   ├── role.middleware.ts      # Role-based route guard
│   │   ├── validate.middleware.ts  # Zod request body/query validation factory
│   │   └── error.middleware.ts     # Global error handler (Express 5 async-safe)
│   ├── utils/
│   │   ├── email.util.ts           # Nodemailer wrapper (IITG SMTP relay)
│   │   ├── pdf.util.ts             # Allotment slip PDF via Puppeteer (Phase 2)
│   │   ├── export.util.ts          # CSV / Excel export via ExcelJS
│   │   └── jwt.util.ts             # signAccessToken, signRefreshToken, verifyToken
│   ├── jobs/
│   │   └── email.queue.ts          # BullMQ Queue definition + job dispatch helpers
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.validator.ts
│   │   ├── user/
│   │   │   ├── user.routes.ts
│   │   │   ├── user.controller.ts
│   │   │   └── user.service.ts
│   │   ├── onboarding/
│   │   │   ├── onboarding.routes.ts
│   │   │   ├── onboarding.controller.ts
│   │   │   ├── onboarding.service.ts
│   │   │   └── onboarding.validator.ts
│   │   ├── hostel/
│   │   │   ├── hostel.routes.ts
│   │   │   ├── hostel.controller.ts
│   │   │   └── hostel.service.ts
│   │   ├── room/
│   │   │   ├── room.routes.ts
│   │   │   ├── room.controller.ts
│   │   │   └── room.service.ts
│   │   ├── allocation/
│   │   │   ├── allocation.routes.ts
│   │   │   ├── allocation.controller.ts
│   │   │   └── allocation.service.ts
│   │   └── dashboard/
│   │       ├── dashboard.routes.ts
│   │       ├── dashboard.controller.ts
│   │       └── dashboard.service.ts
│   └── types/
│       └── express.d.ts            # Augments Express Request with req.user
└── prisma/
    └── schema.prisma               # Single source of truth for the database schema
```

---

### Client Directory Structure

```
client/
├── src/
│   ├── main.tsx                    # App entry point
│   ├── routes/                     # TanStack Router file-based route tree
│   │   ├── __root.tsx              # Root layout (auth guard, navigation shell)
│   │   ├── login.tsx
│   │   ├── change-password.tsx     # First-login gate; blocks all other routes
│   │   ├── onboarding.tsx          # Student onboarding form
│   │   ├── dashboard/
│   │   │   ├── student.tsx         # Allocation status, roommate info, hostel details
│   │   │   └── admin.tsx           # Overview stats, student listing
│   │   └── admin/
│   │       ├── users.tsx           # User provisioning and management
│   │       ├── hostels.tsx         # Hostel CRUD
│   │       ├── rooms.tsx           # Room inventory
│   │       └── allocations.tsx     # Room allocation desk view
│   ├── components/
│   │   ├── ui/                     # shadcn/ui component copies (Button, Input, Table, etc.)
│   │   ├── forms/
│   │   │   └── OnboardingForm.tsx  # RHF + Zod wired to shared onboardingSchema
│   │   └── layouts/
│   │       ├── StudentLayout.tsx
│   │       └── AdminLayout.tsx
│   ├── lib/
│   │   ├── queryClient.ts          # TanStack Query instance (staleTime, gcTime config)
│   │   └── api.ts                  # Axios instance with withCredentials: true + 401 refresh interceptor
│   └── hooks/
│       ├── useAuth.ts              # Auth state via TanStack Query (current user, role)
│       └── useAllocation.ts        # Allocation status query + mutation hooks
└── index.html
```

---

### Shared Directory Structure

```
shared/
├── auth.ts           # loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema
├── student.ts        # onboardingSchema, OnboardingInput type, BloodGroup enum
├── allocation.ts     # allocationSchema, roomChangeSchema, roommateSwapSchema
├── email.ts          # EmailJob type (BullMQ job data shape)
└── env.ts            # Zod env schema; parsed and exported as `env` object
```

Both `client` and `server` import from `../../shared/` via a tsconfig path alias `@shared/*`.

---

### Root Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\" \"npm run dev:worker\"",
    "dev:client": "cd client && npm run dev",
    "dev:server": "cd server && node --watch src/server.ts",
    "dev:worker": "cd server && node --watch src/worker.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "cd client && npm run build",
    "build:server": "cd server && npx tsup",
    "typecheck": "cd client && tsc --noEmit && cd ../server && tsc --noEmit",
    "lint": "eslint client/src server/src shared --ext ts,tsx"
  },
  "devDependencies": {
    "concurrently": "^8.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.8.0"
  }
}
```

---

## 3. Technology Stack

### Server

| Layer | Package | Version |
|---|---|---|
| Runtime | Node.js | 24 LTS |
| Package Manager | npm | 11+ |
| Language | TypeScript | 5.8+ |
| Framework | Express | 5.x |
| ORM | Prisma (`prisma-client` + `@prisma/adapter-pg`) | 7.x |
| Database | PostgreSQL | 17 |
| Redis Client | ioredis | 5.x |
| Job Queue | BullMQ | 5.x |
| Validation | Zod (shared with client) | 3.x |
| Auth | Custom JWT + bcryptjs | — |
| File Upload | Multer + csv-parse | latest |
| Email | Nodemailer + IITG SMTP relay | 6.x |
| Export | ExcelJS | 4.x |
| PDF Generation | Puppeteer via BullMQ worker | Phase 2 |
| Server Build | tsup | 8.x |
| Process Manager | PM2 (cluster mode) | 5.x |

### Client

| Layer | Package | Version |
|---|---|---|
| Framework | React | 19.x |
| Build Tool | Vite + @vitejs/plugin-react | 8.x / 6.x |
| Routing | TanStack Router | v1 |
| Data Fetching | TanStack Query | v5 |
| Forms | React Hook Form + @hookform/resolvers | 7.x |
| Validation | Zod (shared with server) | 3.x |
| UI Components | shadcn/ui | latest |
| Styling | Tailwind CSS | 4.x |
| HTTP Client | Axios | 1.x |

---

## 4. Database Schema

All timestamps use ISO 8601 UTC. Soft deletes use `deletedAt` — records are never hard-deleted from student and user tables. Allocation audit records are append-only (never updated). All primary keys are CUIDs generated by Prisma.

---

### Prisma Schema (`server/prisma/schema.prisma`)

```prisma
generator client {
  provider   = "prisma-client"
  output     = "../src/generated/prisma"
  engineType = "client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Academic Year ────────────────────────────────────────────────────────────
// Every batch-specific table carries an academicYearId.
// To start a new batch, create a new AcademicYear record and seed fresh data.
// Historical records remain untouched.

model AcademicYear {
  id        String   @id @default(cuid())
  year      String   @unique  // e.g. "2025-2026"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  students         Student[]
  hostels          Hostel[]
  allocations      Allocation[]
  allocationAudits AllocationAudit[]
  bulkUploadLogs   BulkUploadLog[]

  @@index([isActive])
}

// ─── User ─────────────────────────────────────────────────────────────────────

model User {
  id                   String    @id @default(cuid())
  loginId              String    @unique  // Admin-provisioned (e.g. JEE roll number or custom ID)
  email                String    @unique  // Institute email; used for forgot-password flow
  passwordHash         String
  role                 UserRole  @default(STUDENT)
  isActive             Boolean   @default(true)
  mustChangePassword   Boolean   @default(true)   // true until first-login password reset is done
  sessionInvalidatedAt DateTime?                  // Set on password change; tokens issued before this are rejected
  lastLoginAt          DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  deletedAt            DateTime?                  // Soft delete

  student              Student?
  hmcAdmin             HMCAdmin?
  allocationsPerformed Allocation[]
  passwordResetTokens  PasswordResetToken[]
  bulkUploadLogs       BulkUploadLog[]
  allocationAudits     AllocationAudit[]

  @@index([role])
  @@index([isActive])
  @@index([deletedAt])
}

enum UserRole {
  STUDENT
  HMC
  ADMIN
}

// ─── Student ──────────────────────────────────────────────────────────────────

model Student {
  id             String           @id @default(cuid())
  userId         String           @unique
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  academicYearId String
  academicYear   AcademicYear     @relation(fields: [academicYearId], references: [id])

  // Pre-filled from admin bulk upload
  name           String
  rollNumber     String
  branch         String
  email          String  // mirrors user.email for convenience

  // Filled by student during onboarding — null until submitted
  contactNumber                 String?
  alternateContactNumber        String?
  permanentAddress              String?
  state                         String?
  emergencyContactName          String?
  emergencyContactNumber        String?
  emergencyContactRelation      String?  // e.g. "Father", "Guardian"
  bloodGroup                    BloodGroup?
  medicalConditions             String?
  allergies                     String?
  physicalAccessibilityRequirements String?

  onboardingStatus      OnboardingStatus @default(PENDING)
  onboardingSubmittedAt DateTime?
  consentGiven          Boolean          @default(false)
  editAllowedByAdmin    Boolean          @default(false)  // Admin can re-open the form for correction

  allocation            Allocation?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([academicYearId, rollNumber])
  @@index([academicYearId])
  @@index([onboardingStatus])
  @@index([branch])
}

enum OnboardingStatus {
  PENDING
  SUBMITTED
}

enum BloodGroup {
  A_POSITIVE
  A_NEGATIVE
  B_POSITIVE
  B_NEGATIVE
  O_POSITIVE
  O_NEGATIVE
  AB_POSITIVE
  AB_NEGATIVE
}

// ─── Hostel ───────────────────────────────────────────────────────────────────

model Hostel {
  id             String       @id @default(cuid())
  academicYearId String
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])

  name           String
  code           String       // Short identifier e.g. "TGB" for Tagore Bhawan
  type           HostelType
  wardenName     String
  wardenContact  String
  wardenEmail    String
  messTimings    Json         // { breakfast: string, lunch: string, dinner: string }
  rules          Json         // string[]
  facilities     Json         // string[] e.g. ["Wi-Fi", "Laundry", "Gym"]
  isActive       Boolean      @default(true)

  rooms          Room[]
  hmcAdmins      HMCAdmin[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([academicYearId, code])
  @@index([academicYearId])
  @@index([isActive])
}

enum HostelType {
  BOYS
  GIRLS
  CO_ED
}

// ─── Room ─────────────────────────────────────────────────────────────────────

model Room {
  id               String  @id @default(cuid())
  hostelId         String
  hostel           Hostel  @relation(fields: [hostelId], references: [id], onDelete: Cascade)
  roomNumber       String  // e.g. "A-101"
  floor            Int?
  capacity         Int     @default(2)
  currentOccupancy Int     @default(0)  // Kept in sync via Prisma transactions on alloc/dealloc
  isAccessible     Boolean @default(false)  // Reserved for students with accessibility requirements
  isActive         Boolean @default(true)

  allocations      Allocation[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([hostelId, roomNumber])
  @@index([hostelId])
  @@index([isActive])
  @@index([currentOccupancy])
}

// ─── Allocation ───────────────────────────────────────────────────────────────
// One active allocation per student at a time.

model Allocation {
  id             String       @id @default(cuid())
  studentId      String       @unique
  student        Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  academicYearId String
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  hostelId       String       // Denormalised for fast hostel-level queries
  roomId         String
  room           Room         @relation(fields: [roomId], references: [id])
  allocatedBy    String
  allocator      User         @relation(fields: [allocatedBy], references: [id])
  isActive       Boolean      @default(true)  // false when student is moved or deallocated
  notes          String?
  allocatedAt    DateTime     @default(now())

  auditLogs      AllocationAudit[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([academicYearId])
  @@index([roomId])
  @@index([isActive])
  @@index([studentId, isActive])
}

// ─── Allocation Audit ─────────────────────────────────────────────────────────
// Append-only. Records are never updated after insert.

model AllocationAudit {
  id                  String       @id @default(cuid())
  allocationId        String
  allocation          Allocation   @relation(fields: [allocationId], references: [id])
  academicYearId      String
  academicYear        AcademicYear @relation(fields: [academicYearId], references: [id])
  action              AuditAction
  performedBy         String
  performer           User         @relation(fields: [performedBy], references: [id])
  previousRoomId      String?
  newRoomId           String?
  previousRoommateIds String[]     // Student IDs of previous co-occupants
  newRoommateIds      String[]
  notes               String?
  performedAt         DateTime     @default(now())

  @@index([allocationId])
  @@index([academicYearId])
  @@index([performedAt])
}

enum AuditAction {
  ALLOCATED
  ROOM_CHANGED
  ROOMMATE_SWAPPED
  DEALLOCATED
}

// ─── Password Reset Token ─────────────────────────────────────────────────────

model PasswordResetToken {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String   @unique  // SHA-256 hash; raw token is sent via email
  expiresAt  DateTime           // Checked at query time; expired rows cleaned by a scheduled job
  isUsed     Boolean  @default(false)
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}

// ─── Bulk Upload Log ──────────────────────────────────────────────────────────

model BulkUploadLog {
  id             String         @id @default(cuid())
  uploadedBy     String
  uploader       User           @relation(fields: [uploadedBy], references: [id])
  academicYearId String
  academicYear   AcademicYear   @relation(fields: [academicYearId], references: [id])
  type           BulkUploadType
  fileName       String
  totalRows      Int
  successCount   Int
  failureCount   Int
  errors         Json           // { row: number, reason: string }[]
  uploadedAt     DateTime       @default(now())

  @@index([uploadedBy])
  @@index([academicYearId])
  @@index([uploadedAt])
}

enum BulkUploadType {
  FRESHER_MASTER
  HOSTEL_INVENTORY
}

// ─── HMC Admin ────────────────────────────────────────────────────────────────

model HMCAdmin {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  hostelId  String
  hostel    Hostel   @relation(fields: [hostelId], references: [id])
  createdAt DateTime @default(now())

  @@index([hostelId])
}
```

---

### Key Schema Notes

**`currentOccupancy` on Room** is a denormalised field kept for fast availability queries. It is always updated inside a `prisma.$transaction()` together with the allocation record, preventing race conditions when two HMC coordinators allocate the same room simultaneously.

```ts
// allocation.service.ts — transactional occupancy update
await prisma.$transaction([
  prisma.allocation.create({ data: allocationPayload }),
  prisma.room.update({
    where: { id: roomId },
    data: { currentOccupancy: { increment: 1 } },
  }),
  prisma.allocationAudit.create({ data: auditPayload }),
])
```

**Roommate contact visibility** is computed at query time in `dashboard.service.ts`. A student's contact number is exposed to their co-occupant only when both have `isActive = true` allocations pointing to the same room.

**Multi-year reuse:** Every batch-scoped table (`Student`, `Hostel`, `Allocation`, etc.) carries an `academicYearId`. To open a new batch, the admin creates a new `AcademicYear` record and seeds fresh hostel and student data. All prior-year records remain intact and queryable.

**`editAllowedByAdmin`:** An admin can flip this field to `true` on any student's record to permit re-submission of their onboarding form after it has already been submitted. The service rejects re-submission if the flag is `false`.

---

## 5. Server Component Breakdown

The server has seven feature modules plus a shared infrastructure layer.

---

### 5.1 Auth Module

**Responsibility:** Login, first-login password gate, change password, forgot-password flow, refresh token rotation, and logout.

**Files:** `modules/auth/auth.routes.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.validator.ts`

**Key logic:**
- Login validates `loginId` + `password`. On success, issues two httpOnly cookies: `access_token` (15 min) and `refresh_token` (7 days). No token is returned in the response body.
- If `mustChangePassword = true`, the login response includes `mustChangePassword: true`. The client blocks all navigation until the change-password screen is completed.
- On password change: sets `mustChangePassword = false`, updates `sessionInvalidatedAt = now()`. This invalidates all previously issued tokens for the user at the middleware level without needing to enumerate a per-token blocklist.
- On logout: adds the access token's `jti` to the Redis blocklist with TTL equal to the token's remaining lifetime. Clears both cookies.
- `POST /auth/refresh` reads the `refresh_token` cookie, verifies it, issues a new `access_token` cookie. Called automatically by the client Axios interceptor on receiving a `401`.
- Forgot-password tokens are SHA-256 hashed before storage; the raw token is sent via BullMQ email queue and matched at reset time.

---

### 5.2 User Module

**Responsibility:** Admin-facing account management — provision accounts, deactivate/reactivate, list users.

**Files:** `modules/user/user.routes.ts`, `user.controller.ts`, `user.service.ts`

**Key logic:**
- Admin uploads a CSV/Excel file via Multer. The service parses rows with `csv-parse` and bulk-creates `User` + `Student` records using `prisma.createMany({ skipDuplicates: true })`.
- Duplicate `rollNumber` or `email` rows are skipped and logged in `BulkUploadLog`.
- Passwords are set to an admin-provisioned default and hashed with bcryptjs (12 rounds). `mustChangePassword = true` on all new accounts.
- Credential emails are dispatched via BullMQ email queue (never inline) so the upload response is not blocked.

---

### 5.3 Onboarding Module

**Responsibility:** Student form submission and admin oversight of completion status.

**Files:** `modules/onboarding/onboarding.routes.ts`, `onboarding.controller.ts`, `onboarding.service.ts`, `onboarding.validator.ts`

**Key logic:**
- `GET /onboarding/me` returns pre-filled admin-seeded fields (name, roll, branch) merged with any previously saved onboarding data.
- On `POST /onboarding/submit`: if `onboardingStatus = SUBMITTED` and `editAllowedByAdmin = false`, return `409`. Otherwise save all fields, set `onboardingStatus = SUBMITTED`, `consentGiven = true`, `onboardingSubmittedAt = now()`.
- Validation is handled by the shared `onboardingSchema` Zod schema from `shared/student.ts`, applied via `validate.middleware.ts`.

---

### 5.4 Hostel Module

**Responsibility:** CRUD for hostel records and room inventory; admin configuration.

**Files:** `modules/hostel/hostel.routes.ts`, `hostel.controller.ts`, `hostel.service.ts`

**Key logic:**
- Hostel data (warden, mess timings, rules, facilities) is read-only for students and fully editable for admins.
- `messTimings`, `rules`, and `facilities` are stored as Prisma `Json` columns and returned as structured objects or arrays.
- Room bulk upload via CSV/Excel (Multer + `csv-parse`) bulk-creates room records under a hostel. Results are logged in `BulkUploadLog`.

---

### 5.5 Room Module

**Responsibility:** Room inventory queries — available rooms, occupancy, accessibility filters.

**Files:** `modules/room/room.routes.ts`, `room.controller.ts`, `room.service.ts`

**Key logic:**
- `getAvailableRooms(hostelId)` returns rooms where `currentOccupancy < capacity` and `isActive = true`.
- `isAccessible = true` rooms are reserved for students with `physicalAccessibilityRequirements` set.
- Room capacity cannot be reduced below `currentOccupancy`. Returns `422` if violated.

---

### 5.6 Allocation Module

**Responsibility:** Core allocation engine — assign rooms, change rooms, swap roommates, audit trail.

**Files:** `modules/allocation/allocation.routes.ts`, `allocation.controller.ts`, `allocation.service.ts`

**Key logic:**
- Before allocating, the service checks `currentOccupancy < capacity` inside a `prisma.$transaction()` to prevent race conditions at the desk.
- **Allocate:** create `Allocation` + increment `room.currentOccupancy` + write `AllocationAudit` — all in one transaction.
- **Room change:** deactivate old `Allocation`, create new one, decrement old room occupancy, increment new room occupancy — single transaction.
- **Roommate swap:** swap `roomId` between two students' `Allocation` records; net occupancy unchanged across both rooms.
- Every mutation appends an `AllocationAudit` record (never updated after insert).
- Roommate contact is revealed only when both students sharing a room have `isActive = true` allocations to the same room.

---

### 5.7 Dashboard Module

**Responsibility:** Aggregated views for students and admins; data export; allotment slip (Phase 2).

**Files:** `modules/dashboard/dashboard.routes.ts`, `dashboard.controller.ts`, `dashboard.service.ts`

**Key logic:**
- **Student dashboard:** fetch active allocation → join hostel and room → find co-occupants in the same room → conditionally expose roommate contact per the visibility rule.
- **Admin overview:** aggregated counts for onboarding and allocation status, per-hostel occupancy breakdown — via Prisma `groupBy` and `_count`.
- **Admin student listing:** paginated with filters on `onboardingStatus`, `allocationStatus`, `branch`, `hostelId`, and free-text search on `name` or `rollNumber`.
- **Export:** ExcelJS writes to a buffer and is sent with correct `Content-Type` and `Content-Disposition` headers.
- **PDF slip (Phase 2):** Puppeteer renders the allotment slip server-side; job dispatched via BullMQ worker.

---

## 6. Client Component Breakdown

---

### 6.1 Routing (TanStack Router)

File-based routing lives in `client/src/routes/`. The `@tanstack/router-plugin` Vite plugin auto-generates `routeTree.gen.ts` at build time.

```ts
// client/src/routes/__root.tsx
import { createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context, location }) => {
    // Auth guard: redirect to /login if no session
    // First-login gate: redirect to /change-password if mustChangePassword = true
  },
})
```

Route loaders prefetch TanStack Query data before rendering, so pages are never blank on first load.

---

### 6.2 Data Fetching (TanStack Query)

All server state lives in TanStack Query. No global client-side state manager (no Redux, no Zustand).

```ts
// client/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 minutes
      gcTime: 1000 * 60 * 10,     // 10 minutes
      retry: 1,
    },
  },
})
```

---

### 6.3 HTTP Client (Axios)

```ts
// client/src/lib/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,   // Required for httpOnly cookie-based auth
})

// Intercept 401s, attempt token refresh, retry original request
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      await api.post('/auth/refresh')
      return api(original)
    }
    return Promise.reject(error)
  }
)
```

The proxy in `client/vite.config.ts` forwards `/api/*` to `http://localhost:5000` in development, so no CORS configuration is needed locally.

---

### 6.4 Forms (React Hook Form + Zod)

All forms use RHF with the Zod resolver, sharing schemas from `shared/`.

```ts
// client/src/components/forms/OnboardingForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { onboardingSchema, type OnboardingInput } from '@shared/student'

export function OnboardingForm() {
  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
  })
  // ...
}
```

shadcn/ui `<Form>`, `<FormField>`, `<FormItem>`, `<FormControl>`, and `<FormMessage>` components are used as the layout layer — they are built-in wrappers around RHF's `Controller`.

---

### 6.5 First-Login Gate

On login, if the server returns `mustChangePassword: true`, TanStack Router's `beforeLoad` hook redirects all routes to `/change-password`. The change-password route calls `POST /auth/change-password`, then invalidates the session query and redirects to the appropriate dashboard.

---

## 7. API Documentation

### Base URL

```
/api/v1
```

### Common Headers

Authentication is cookie-based. The browser sends the `access_token` httpOnly cookie automatically on every request when the Axios instance has `withCredentials: true`. **No `Authorization` header is needed or accepted.**

```
Content-Type: application/json    (all POST / PUT / PATCH requests)
```

### Common Response Envelope

```json
{
  "success": true | false,
  "data": { ... } | null,
  "message": "Human-readable message",
  "errors": [ ... ] | null
}
```

`errors` is populated only on `400` validation failures and contains Zod's structured field-level messages.

---

### 7.1 Auth Routes — `/api/v1/auth`

---

#### POST `/auth/login`

Login with admin-provisioned credentials.

Access: Public

Request body:
```json
{
  "loginId": "CSE2024001",
  "password": "ProvisionedPass@123"
}
```

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "role": "STUDENT",
    "mustChangePassword": true
  }
}
```

Notes:
- Sets two httpOnly cookies on the response: `access_token` (15 min) and `refresh_token` (7 days). No token is included in the response body.
- If `mustChangePassword: true`, the client must redirect to `/change-password` and block all other navigation until the password is changed.

Response `401 Unauthorized`: Invalid `loginId` or `password`.

---

#### POST `/auth/change-password`

Mandatory first-login password reset and voluntary password change.

Access: Protected (student, hmc, admin)

Request body:
```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewSecurePass@456"
}
```

Response `200 OK`:
```json
{
  "success": true,
  "message": "Password updated. Please log in again."
}
```

Notes: Sets `mustChangePassword = false` and `sessionInvalidatedAt = now()`. Client clears local state and redirects to `/login` — all existing tokens are now rejected.

---

#### POST `/auth/refresh`

Exchange a valid `refresh_token` cookie for a new `access_token` cookie.

Access: Public (requires valid `refresh_token` cookie)

Response `200 OK`:
```json
{
  "success": true
}
```

Notes: Called automatically by the Axios 401 interceptor. Sets a new `access_token` cookie. Response `401` means the refresh token is missing, invalid, or expired — client must redirect to `/login`.

---

#### POST `/auth/logout`

Invalidate the current session.

Access: Protected (student, hmc, admin)

Response `200 OK`:
```json
{
  "success": true,
  "message": "Logged out."
}
```

Notes: Adds the access token's `jti` to Redis blocklist with TTL = token's remaining lifetime. Clears both `access_token` and `refresh_token` cookies.

---

#### POST `/auth/forgot-password`

Initiate forgot-password flow.

Access: Public

Request body:
```json
{
  "email": "student@iitg.ac.in"
}
```

Response `200 OK`:
```json
{
  "success": true,
  "message": "If this email is registered, a reset link has been sent."
}
```

Notes: Always returns `200` regardless of whether the email exists (prevents user enumeration). Reset email is dispatched via BullMQ email queue.

---

#### POST `/auth/reset-password`

Complete the forgot-password flow using the token from the email link.

Access: Public

Request body:
```json
{
  "token": "<raw_reset_token>",
  "newPassword": "NewSecurePass@789"
}
```

Response `200 OK`:
```json
{
  "success": true,
  "message": "Password reset successful."
}
```

Response `400 Bad Request`: Token expired or already used.

Notes: Raw token is SHA-256 hashed and matched against `PasswordResetToken.tokenHash`. On success, marks token `isUsed = true` and sets `sessionInvalidatedAt = now()` on the user.

---

### 7.2 User / Admin Provisioning Routes — `/api/v1/users`

All routes require `role: ADMIN`.

---

#### POST `/users/upload`

Bulk-upload fresher master list from a CSV or Excel file.

Access: Admin only

Request: `multipart/form-data`

Form fields:
```
file: <csv or xlsx>
academicYearId: <cuid>
```

Expected file columns: `name`, `rollNumber`, `branch`, `email`, `loginId`, `password`

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "totalRows": 120,
    "successCount": 118,
    "failureCount": 2,
    "errors": [
      { "row": 45, "reason": "Duplicate rollNumber: CSE2024044" },
      { "row": 89, "reason": "Missing required field: email" }
    ],
    "uploadLogId": "<cuid>"
  }
}
```

---

#### GET `/users`

List all users with optional filters.

Access: Admin only

Query params:
```
role=STUDENT|HMC|ADMIN
isActive=true|false
page=1
limit=20
search=<name or rollNumber>
```

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "users": [
      { "id": "...", "loginId": "...", "email": "...", "role": "STUDENT", "isActive": true }
    ],
    "total": 120,
    "page": 1,
    "limit": 20
  }
}
```

---

#### PATCH `/users/:userId/deactivate`

Deactivate a user account (sets `isActive = false`).

Access: Admin only

Response `200 OK`:
```json
{
  "success": true,
  "message": "User deactivated."
}
```

---

#### PATCH `/users/:userId/activate`

Reactivate a previously deactivated user.

Access: Admin only

Response `200 OK`:
```json
{
  "success": true,
  "message": "User activated."
}
```

---

### 7.3 Onboarding Routes — `/api/v1/onboarding`

---

#### GET `/onboarding/me`

Fetch the onboarding form data for the logged-in student.

Access: Student only

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "name": "Rohan Mehta",
    "rollNumber": "CSE2024001",
    "branch": "Computer Science & Engineering",
    "contactNumber": null,
    "alternateContactNumber": null,
    "permanentAddress": null,
    "state": null,
    "emergencyContactName": null,
    "emergencyContactNumber": null,
    "emergencyContactRelation": null,
    "bloodGroup": null,
    "medicalConditions": null,
    "allergies": null,
    "physicalAccessibilityRequirements": null,
    "onboardingStatus": "PENDING",
    "editAllowedByAdmin": false
  }
}
```

---

#### POST `/onboarding/submit`

Submit the onboarding form. Rejected if already submitted and `editAllowedByAdmin = false`.

Access: Student only

Request body:
```json
{
  "contactNumber": "9876543210",
  "alternateContactNumber": "9123456780",
  "permanentAddress": "12, MG Road, Pune",
  "state": "Maharashtra",
  "emergencyContactName": "Suresh Mehta",
  "emergencyContactNumber": "9000011111",
  "emergencyContactRelation": "Father",
  "bloodGroup": "B_POSITIVE",
  "medicalConditions": "Mild asthma",
  "allergies": null,
  "physicalAccessibilityRequirements": null,
  "consentGiven": true
}
```

Response `200 OK`:
```json
{
  "success": true,
  "message": "Onboarding form submitted successfully."
}
```

Response `409 Conflict`:
```json
{
  "success": false,
  "message": "Form already submitted. Contact admin to enable re-submission."
}
```

---

#### GET `/onboarding/status`

Get onboarding completion status for the logged-in student.

Access: Student only

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "status": "SUBMITTED",
    "submittedAt": "2024-07-10T14:32:00Z"
  }
}
```

---

#### GET `/onboarding/admin/list`

Paginated list of all freshers with onboarding status.

Access: Admin / HMC only

Query params:
```
status=PENDING|SUBMITTED
branch=<branch name>
search=<name or rollNumber>
academicYearId=<cuid>
page=1
limit=20
```

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "studentId": "...",
        "name": "Rohan Mehta",
        "rollNumber": "CSE2024001",
        "branch": "CSE",
        "onboardingStatus": "SUBMITTED",
        "onboardingSubmittedAt": "2024-07-10T14:32:00Z"
      }
    ],
    "total": 120,
    "page": 1,
    "limit": 20
  }
}
```

---

#### PATCH `/onboarding/admin/:studentId/allow-edit`

Grant a specific student permission to re-submit their onboarding form.

Access: Admin only

Response `200 OK`:
```json
{
  "success": true,
  "message": "Edit permission granted."
}
```

---

### 7.4 Hostel Routes — `/api/v1/hostels`

---

#### GET `/hostels`

List all active hostels for the current academic year.

Access: Protected (student, hmc, admin)

Query params:
```
academicYearId=<cuid>
```

Response `200 OK`:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Tagore Bhawan",
      "code": "TGB",
      "type": "BOYS",
      "wardenName": "Dr. P.K. Singh",
      "wardenContact": "9988776655",
      "wardenEmail": "warden.tgb@iitg.ac.in",
      "messTimings": {
        "breakfast": "7:30 AM – 9:00 AM",
        "lunch": "12:30 PM – 2:00 PM",
        "dinner": "7:30 PM – 9:00 PM"
      },
      "rules": ["No visitors after 10 PM", "Maintain silence in corridors"],
      "facilities": ["Wi-Fi", "Laundry", "Common Room"]
    }
  ]
}
```

---

#### GET `/hostels/:hostelId`

Get full details of a specific hostel.

Access: Protected (student, hmc, admin)

Response `200 OK`: Full hostel object as above.

---

#### POST `/hostels`

Create a new hostel.

Access: Admin only

Request body:
```json
{
  "academicYearId": "...",
  "name": "Tagore Bhawan",
  "code": "TGB",
  "type": "BOYS",
  "wardenName": "Dr. P.K. Singh",
  "wardenContact": "9988776655",
  "wardenEmail": "warden.tgb@iitg.ac.in",
  "messTimings": {
    "breakfast": "7:30 AM – 9:00 AM",
    "lunch": "12:30 PM – 2:00 PM",
    "dinner": "7:30 PM – 9:00 PM"
  },
  "rules": ["No visitors after 10 PM"],
  "facilities": ["Wi-Fi", "Laundry"]
}
```

Response `201 Created`: Created hostel object.

---

#### PUT `/hostels/:hostelId`

Update hostel details (warden, mess timings, rules, facilities).

Access: Admin only

Request body: Same shape as POST; all fields optional.

Response `200 OK`: Updated hostel object.

---

#### POST `/hostels/:hostelId/rooms/upload`

Bulk-upload room inventory for a hostel from CSV or Excel.

Access: Admin only

Request: `multipart/form-data`

Expected file columns: `roomNumber`, `floor`, `capacity`, `isAccessible`

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "hostelId": "...",
    "totalRows": 50,
    "successCount": 50,
    "failureCount": 0,
    "errors": []
  }
}
```

---

### 7.5 Room Routes — `/api/v1/rooms`

---

#### GET `/rooms`

List rooms with optional filters and occupancy status.

Access: Admin / HMC only

Query params:
```
hostelId=<cuid>
available=true|false
isAccessible=true|false
floor=<number>
page=1
limit=50
```

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "...",
        "hostelId": "...",
        "hostelName": "Tagore Bhawan",
        "roomNumber": "A-101",
        "floor": 1,
        "capacity": 2,
        "currentOccupancy": 1,
        "isAccessible": false,
        "isActive": true
      }
    ],
    "total": 50
  }
}
```

---

#### GET `/rooms/:roomId`

Get details of a specific room including current occupants.

Access: Admin / HMC only

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "room": { "...": "..." },
    "occupants": [
      {
        "studentId": "...",
        "name": "Rohan Mehta",
        "rollNumber": "CSE2024001",
        "branch": "CSE"
      }
    ]
  }
}
```

---

#### PATCH `/rooms/:roomId/capacity`

Update the capacity of a room.

Access: Admin only

Request body:
```json
{
  "capacity": 3
}
```

Response `200 OK`: Updated room object.

Notes: Returns `422 Unprocessable Entity` if new capacity would fall below `currentOccupancy`.

---

### 7.6 Allocation Routes — `/api/v1/allocations`

All routes require `role: HMC` or `role: ADMIN`.

---

#### POST `/allocations`

Allocate a room to a student.

Access: Admin / HMC only

Request body:
```json
{
  "studentId": "<cuid>",
  "hostelId": "<cuid>",
  "roomId": "<cuid>",
  "notes": "Pre-allocated before arrival"
}
```

Response `201 Created`:
```json
{
  "success": true,
  "data": {
    "allocationId": "...",
    "studentName": "Rohan Mehta",
    "hostelName": "Tagore Bhawan",
    "roomNumber": "A-101",
    "allocatedAt": "2024-07-12T10:00:00Z"
  }
}
```

Response `409 Conflict`: Student already has an active allocation, or room is at capacity.

---

#### PUT `/allocations/:allocationId/room`

Change the room of an already-allocated student.

Access: Admin / HMC only

Request body:
```json
{
  "newRoomId": "<cuid>",
  "notes": "Moved due to maintenance"
}
```

Response `200 OK`:
```json
{
  "success": true,
  "message": "Room changed successfully.",
  "data": {
    "previousRoomNumber": "A-101",
    "newRoomNumber": "B-202"
  }
}
```

---

#### PUT `/allocations/swap-roommates`

Swap the room assignments of two students.

Access: Admin / HMC only

Request body:
```json
{
  "studentIdA": "<cuid>",
  "studentIdB": "<cuid>",
  "notes": "Student request approved"
}
```

Response `200 OK`:
```json
{
  "success": true,
  "message": "Roommate swap completed."
}
```

---

#### DELETE `/allocations/:allocationId`

Deallocate a student — sets `isActive = false` and decrements room occupancy.

Access: Admin only

Response `200 OK`:
```json
{
  "success": true,
  "message": "Student deallocated."
}
```

---

#### GET `/allocations`

List all allocations with filters.

Access: Admin / HMC only

Query params:
```
hostelId=<cuid>
roomId=<cuid>
studentId=<cuid>
isActive=true|false
academicYearId=<cuid>
page=1
limit=20
```

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "allocations": [
      {
        "allocationId": "...",
        "student": { "name": "...", "rollNumber": "..." },
        "hostel": { "name": "..." },
        "room": { "roomNumber": "..." },
        "allocatedAt": "...",
        "isActive": true
      }
    ],
    "total": 100
  }
}
```

---

#### GET `/allocations/:allocationId/audit`

Get the full audit trail for a specific allocation.

Access: Admin only

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "auditLogs": [
      {
        "action": "ALLOCATED",
        "performedBy": "Admin Name",
        "performedAt": "2024-07-12T10:00:00Z",
        "notes": "Pre-allocated before arrival"
      },
      {
        "action": "ROOM_CHANGED",
        "performedBy": "Admin Name",
        "performedAt": "2024-07-14T11:00:00Z",
        "previousRoomId": "...",
        "newRoomId": "...",
        "notes": "Maintenance issue"
      }
    ]
  }
}
```

---

### 7.7 Dashboard Routes — `/api/v1/dashboard`

---

#### GET `/dashboard/student`

Get the logged-in student's dashboard data.

Access: Student only

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "allocationStatus": "ALLOCATED",
    "hostelName": "Tagore Bhawan",
    "roomNumber": "A-101",
    "wardenContact": "9988776655",
    "messTimings": {
      "breakfast": "7:30 AM – 9:00 AM",
      "lunch": "12:30 PM – 2:00 PM",
      "dinner": "7:30 PM – 9:00 PM"
    },
    "roommates": [
      {
        "name": "Amit Sharma",
        "contactNumber": "9876500000"
      }
    ],
    "roommateContactVisible": true
  }
}
```

Notes:
- `allocationStatus` is `"PENDING"` (no active allocation) or `"ALLOCATED"`.
- `roommates` is an empty array when not yet allocated.
- `contactNumber` in roommate objects is `null` and `roommateContactVisible = false` when the roommate does not yet have an active allocation to the same room.

---

#### GET `/dashboard/student/slip`

Download the hostel allotment slip as a PDF.

Access: Student only (must have active allocation)

**Status: Phase 2 — not available in Phase 1.**

Response `200 OK`:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="allotment-slip-CSE2024001.pdf"
<binary PDF stream>
```

Response `404 Not Found`: No active allocation exists for the student.

---

#### GET `/dashboard/admin/overview`

Get onboarding stats and per-hostel occupancy summary.

Access: Admin / HMC only

Query params:
```
academicYearId=<cuid>
```

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "onboarding": {
      "total": 300,
      "submitted": 245,
      "pending": 55
    },
    "allocation": {
      "total": 300,
      "allocated": 200,
      "pending": 100
    },
    "hostels": [
      {
        "hostelId": "...",
        "hostelName": "Tagore Bhawan",
        "totalRooms": 50,
        "totalCapacity": 100,
        "currentOccupancy": 80,
        "availableBeds": 20
      }
    ]
  }
}
```

---

#### GET `/dashboard/admin/students`

Paginated student listing with onboarding and allocation status.

Access: Admin / HMC only

Query params:
```
onboardingStatus=PENDING|SUBMITTED
allocationStatus=PENDING|ALLOCATED
branch=<branch>
hostelId=<cuid>
academicYearId=<cuid>
search=<name or rollNumber>
page=1
limit=20
```

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "studentId": "...",
        "name": "Rohan Mehta",
        "rollNumber": "CSE2024001",
        "branch": "CSE",
        "onboardingStatus": "SUBMITTED",
        "allocationStatus": "ALLOCATED",
        "hostelName": "Tagore Bhawan",
        "roomNumber": "A-101"
      }
    ],
    "total": 300,
    "page": 1,
    "limit": 20
  }
}
```

---

#### GET `/dashboard/admin/export`

Export student or allocation data as CSV or Excel.

Access: Admin only

Query params:
```
type=students|allocations
format=csv|xlsx
academicYearId=<cuid>
hostelId=<cuid>                       (optional)
onboardingStatus=PENDING|SUBMITTED    (optional)
allocationStatus=PENDING|ALLOCATED    (optional)
```

Response `200 OK`:
```
Content-Type: text/csv  OR  application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="students-export-2025-07-14.csv"
<file binary>
```

---

## 8. Authentication & Authorization

### JWT Structure

**Access token** — stored in `access_token` httpOnly cookie, expires in 15 minutes:
```json
{
  "sub": "<userId>",
  "role": "STUDENT | HMC | ADMIN",
  "jti": "<unique token id>",
  "iat": 1720000000,
  "exp": 1720000900
}
```

**Refresh token** — stored in `refresh_token` httpOnly cookie, expires in 7 days:
```json
{
  "sub": "<userId>",
  "jti": "<unique token id>",
  "iat": 1720000000,
  "exp": 1720604800
}
```

No token is ever returned in a response body.

---

### Cookie Configuration

Both cookies are set with:
```
HttpOnly:  true
SameSite:  Strict
Secure:    true   (production only; false in development)
Path:      /
```

---

### Session Invalidation — Two-Layer Approach

**Layer 1 — Per-token logout (Redis blocklist):**

On `POST /auth/logout`, the access token's `jti` is written to Redis with a TTL equal to the token's remaining lifetime:

```ts
await redis.set(`jwt:blocklist:${jti}`, '1', 'EX', remainingSeconds)
```

The auth middleware checks `redis.get('jwt:blocklist:{jti}')` on every request. If found, the token is rejected with `401`.

**Layer 2 — All-tokens invalidation (`sessionInvalidatedAt`):**

On `POST /auth/change-password` or `POST /auth/reset-password`, the server sets `user.sessionInvalidatedAt = now()`. The auth middleware checks:

```ts
if (tokenPayload.iat < user.sessionInvalidatedAt.getTime() / 1000) {
  // reject 401 — token was issued before the password change
}
```

This invalidates all previously issued tokens for that user without needing to enumerate them individually — effective for the full session revocation scenario.

---

### Auth Middleware Execution Order (`auth.middleware.ts`)

Applied to every protected route in this order:

1. Read `access_token` from `req.cookies`. If absent → `401`.
2. Verify JWT signature and expiry (`jwt.verify`). If invalid → `401`.
3. Check `redis.get('jwt:blocklist:{jti}')`. If found → `401`.
4. Query `prisma.user.findUnique({ where: { id: payload.sub } })`.
5. Check `payload.iat < user.sessionInvalidatedAt`. If true → `401`.
6. Check `user.isActive`. If false → `403`.
7. Attach `payload` to `req.user`. Call `next()`.

---

### Role Guard (`role.middleware.ts`)

Applied after `auth.middleware.ts` on role-restricted routes:

```ts
router.get('/admin/list', authenticate, authorize('ADMIN', 'HMC'), handler)
router.get('/me',         authenticate, authorize('STUDENT'),        handler)
```

Returns `403 Forbidden` on role mismatch.

---

### First-Login Gate

- Server returns `mustChangePassword: true` in the login response body.
- TanStack Router's `beforeLoad` hook on `__root.tsx` reads this from the session query and redirects to `/change-password` before any other route loads.
- The server does not block other API calls at the middleware level for this — the gate is enforced client-side. The `sessionInvalidatedAt` mechanism remains as the server-side hard stop after a password change is completed.

---

## 9. Error Handling Conventions

All errors are caught by the global `error.middleware.ts`. Express 5 automatically propagates async rejections to the error handler — no `try/catch` is required in route handlers for unhandled errors.

| HTTP Status | Meaning |
|---|---|
| 400 | Validation error or malformed input (Zod parse failure) |
| 401 | Missing, invalid, expired, or blocklisted token |
| 403 | Authenticated but insufficient role, or deactivated account |
| 404 | Resource not found |
| 409 | Conflict — duplicate submission, room at capacity, already allocated |
| 422 | Business rule violation — e.g. capacity set below current occupancy |
| 500 | Unhandled server error |

Validation errors (`400`) include a structured `errors` array:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "contactNumber", "message": "Must be a 10-digit number" },
    { "field": "bloodGroup",    "message": "Invalid enum value" }
  ]
}
```

Custom `AppError` class used in services:
```ts
// server/src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}

// Usage
throw new AppError(409, 'Room is at full capacity', 'ROOM_FULL')
```

---

## 10. Environment Variables

All variables are validated via Zod at server startup (`shared/env.ts`). The server exits immediately with a descriptive error if any required variable is missing or malformed. Never read `process.env` directly in application code — always import from `shared/env.ts`.

```env
# ─── Server ───────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# ─── Database ─────────────────────────────────────────────────────────────────
# connection_limit and pool_timeout tune Prisma's per-process connection pool.
# Formula: (pg max_connections - 10 reserved) / number of PM2 workers
DATABASE_URL=postgresql://user:password@localhost:5432/iitg_onboarding?connection_limit=15&pool_timeout=20

# ─── Redis ────────────────────────────────────────────────────────────────────
# Single ioredis client shared across rate limiting, BullMQ, and JWT blocklist.
# Key prefixes: rl: (rate limit), bull: (BullMQ), jwt:blocklist: (logout tokens)
REDIS_URL=redis://localhost:6379

# ─── Auth ─────────────────────────────────────────────────────────────────────
JWT_SECRET=<minimum 32 character random string>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# ─── Email (IITG Google Workspace SMTP relay) ─────────────────────────────────
SMTP_HOST=smtp-relay.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@iitg.ac.in
SMTP_PASS=<Google app-specific password or OAuth2 credential>
SMTP_FROM=noreply@iitg.ac.in

# ─── Password Reset ───────────────────────────────────────────────────────────
RESET_TOKEN_EXPIRES_MINUTES=15
```

Zod schema (`shared/env.ts`):
```ts
import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url(),

  DATABASE_URL: z.string().startsWith('postgresql://'),
  REDIS_URL: z.string().startsWith('redis://'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string().email(),

  RESET_TOKEN_EXPIRES_MINUTES: z.coerce.number().default(15),
})

export type Env = z.infer<typeof envSchema>
export const env = envSchema.parse(process.env)
```

---
