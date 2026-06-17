# Fresher Onboarding & Hostel Management Portal — Technical Context

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [Component Breakdown](#5-component-breakdown)
6. [API Documentation](#6-api-documentation)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Error Handling Conventions](#8-error-handling-conventions)
9. [Environment Variables](#9-environment-variables)

---

## 1. Project Overview

This portal serves two user roles — **Student (Fresher)** and **Admin (HMC Staff)** — and handles the complete lifecycle of:

- Fresher account provisioning and first-login password reset
- Student onboarding form collection
- Hostel and room inventory management
- Room and roommate allocation (manual/desk-based)
- Conditional roommate contact disclosure
- Student dashboard with allotment slip PDF generation
- Admin reporting and export

---

## 2. System Architecture

The backend is structured as a **modular monolith** using Node.js + Express, split into the following self-contained components (feature modules). Each module owns its routes, controllers, services, and validators. A shared layer handles auth middleware, error handling, DB connection, and utilities.

```
src/
├── app.ts                  # Express app setup
├── server.ts               # Entry point
├── config/
│   ├── db.ts               # Mongoose connection
│   └── env.ts              # Env config loader
├── middlewares/
│   ├── auth.middleware.ts  # JWT verification
│   ├── role.middleware.ts  # Role-based guard
│   └── error.middleware.ts # Global error handler
├── utils/
│   ├── email.util.ts       # Email sender (nodemailer)
│   ├── pdf.util.ts         # Allotment slip PDF generator
│   ├── export.util.ts      # CSV/Excel exporter
│   └── token.util.ts       # JWT helpers
├── modules/
│   ├── auth/
│   ├── user/
│   ├── onboarding/
│   ├── hostel/
│   ├── room/
│   ├── allocation/
│   └── dashboard/
└── types/
    └── express.d.ts        # Augmented Request type
```

---

## 3. Technology Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 24 |
| Language | TypeScript 5+ |
| Framework | Express 4 |
| Database | MongoDB 7+ via Mongoose 8 |
| Auth | JWT (access token) + bcrypt |
| PDF Generation | PDFKit or Puppeteer |
| Export | ExcelJS (xlsx/csv) |
| Validation | Zod |
| File Upload | Multer + xlsx/csv-parse |
| Session Timeout | Token expiry + client-side idle timer |

---

## 4. Database Schema

All timestamps use ISO 8601 UTC. Soft deletes are not used; records are hard-deleted only where noted.

---

### 4.1 `users` Collection

Represents both students and hostel admins. Role field differentiates behavior.

```typescript
{
  _id: ObjectId,
  loginId: String,           // Unique. Admin-provisioned (e.g., JEE advance roll number or custom ID)
  email: String,             // Unique. Used for forgot-password flow
  passwordHash: String,      // bcrypt hash
  role: "student" | "hmc",
  isFirstLogin: Boolean,     // true until first password reset is completed
  isActive: Boolean,         // Admin can deactivate
  lastLoginAt: Date | null,
  sessionInvalidatedAt: Date | null,  // Used to invalidate all old tokens on password reset
  createdAt: Date,
  updatedAt: Date
}

Indexes:
  - loginId: unique
  - email: unique
  - role: 1
```

---

### 4.2 `students` Collection

Extended profile linked 1:1 to a user. Populated from the admin's master upload and completed by the student during onboarding.

```typescript
{
  _id: ObjectId,
  userId: ObjectId,          // ref: users
  name: String,
  rollNumber: String,        // Unique
  branch: String,
  email: String,             // Matches users.email

  // Onboarding fields — null until submitted
  contactNumber: String | null,
  alternateContactNumber: String | null,
  permanentAddress: String | null,
  state: String | null,
  emergencyContactName: String | null,
  emergencyContactNumber: String | null,
  emergencyContactRelation: String | null,
  bloodGroup: String | null,
  medicalConditions: String | null,    // Free text
  physicalAccessibilityRequirements: String | null,

  onboardingStatus: "pending" | "submitted",
  onboardingSubmittedAt: Date | null,
  consentGiven: Boolean,

  // Admin control
  editAllowedByAdmin: Boolean,         // If true, student can re-submit form

  createdAt: Date,
  updatedAt: Date
}

Indexes:
  - userId: unique
  - rollNumber: unique
  - onboardingStatus: 1
  - branch: 1
```

---

### 4.3 `hostels` Collection

Represents a hostel building.

```typescript
{
  _id: ObjectId,
  name: String,              // e.g., "Tagore Bhawan"
  type: "boys" | "girls" | "co-ed",
  wardenName: String,
  wardenContact: String,
  messTimings: {
    breakfast: String,       // e.g., "7:30 AM – 9:00 AM"
    lunch: String,
    dinner: String
  },
  rules: [String],           // Array of rule strings
  facilities: [String],      // e.g., ["Wi-Fi", "Laundry", "Gym"]
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
  - name: 1
```

---

### 4.4 `rooms` Collection

Each room belongs to one hostel. A room has a defined capacity.

```typescript
{
  _id: ObjectId,
  hostelId: ObjectId,        // ref: hostels
  roomNumber: String,        // e.g., "A-101"
  floor: Number | null,
  capacity: Number,          // Admin-configured (1–2), if isAccessible : true, is 1 else 2
  currentOccupancy: Number,  // Derived field; updated on allocation
  isAccessible: Boolean,     // For students with accessibility requirements, by default false
  isActive: Boolean, // make is false if the 
  createdAt: Date,
  updatedAt: Date
}

Indexes:
  - hostelId: 1
  - hostelId + roomNumber: unique (compound)
  - currentOccupancy: 1
  - isActive: 1
```

---

### 4.5 `allocations` Collection

Core record binding a student to a hostel room. One active allocation per student at a time.

```typescript
{
  _id: ObjectId,
  studentId: ObjectId,       // ref: students
  hostelId: ObjectId,        // ref: hostels
  roomId: ObjectId,          // ref: rooms
  allocatedBy: ObjectId,     // ref: users (admin)
  allocatedAt: Date,
  isActive: Boolean,         // false when student is moved or deallocated
  notes: String | null,      // Admin notes

  // Audit history is stored in allocationAudits collection
  createdAt: Date,
  updatedAt: Date
}

Indexes:
  - studentId: 1
  - roomId: 1
  - isActive: 1
  - studentId + isActive: compound (for fast lookup of current allocation)
```

---

### 4.6 `allocationAudits` Collection

Append-only audit log for every allocation action. Never updated, only inserted.

```typescript
{
  _id: ObjectId,
  allocationId: ObjectId,    // ref: allocations
  action: "allocated" | "roomChanged" | "roommateSwapped" | "deallocated",
  performedBy: ObjectId,     // ref: users (admin)
  previousRoomId: ObjectId | null,
  newRoomId: ObjectId | null,
  previousRoommateIds: [ObjectId],
  newRoommateIds: [ObjectId],
  notes: String | null,
  performedAt: Date
}

Indexes:
  - allocationId: 1
  - performedAt: -1
```

---

### 4.7 `passwordResetTokens` Collection

Short-lived tokens for the forgot-password flow.

```typescript
{
  _id: ObjectId,
  userId: ObjectId,          // ref: users
  token: String,             // Hashed random token
  expiresAt: Date,           // TTL: 15 minutes
  isUsed: Boolean,
  createdAt: Date
}

Indexes:
  - token: unique
  - expiresAt: 1 (TTL index — MongoDB auto-purges expired docs)
  - userId: 1
```

---

### 4.8 `bulkUploadLogs` Collection

Tracks each admin bulk-upload operation for auditability.

```typescript
{
  _id: ObjectId,
  uploadedBy: ObjectId,      // ref: users (admin)
  type: "fresherMaster" | "hostelInventory",
  fileName: String,
  totalRows: Number,
  successCount: Number,
  failureCount: Number,
  errors: [
    {
      row: Number,
      reason: String
    }
  ],
  uploadedAt: Date
}

Indexes:
  - uploadedBy: 1
  - uploadedAt: -1
```

---

## 5. Component Breakdown

The backend is broken into seven feature modules plus a shared layer.

---

### 5.1 Auth Module

Responsibility: login, session management, first-login password reset, forgot password, and token validation.

Files: `modules/auth/auth.routes.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.validator.ts`

Key logic:
- On login, check `isFirstLogin`; if true, return a flag in response so the client forces the password-reset screen.
- On password reset, update `sessionInvalidatedAt` to current time. All JWTs issued before this timestamp are treated as invalid by the auth middleware.
- Forgot-password tokens are hashed with SHA-256 before storage; raw token is sent via email.

---

### 5.2 User Module

Responsibility: Admin-facing user management — provision accounts, deactivate, view user list.

Files: `modules/user/user.routes.ts`, `user.controller.ts`, `user.service.ts`

Key logic:
- Admin uploads a CSV/Excel file; the service parses rows, creates `users` + `students` records in bulk.
- Duplicate `rollNumber` or `email` rows are skipped and logged in `bulkUploadLogs`.
- Passwords are set to a provisioned default and hashed; `isFirstLogin = true`.

---

### 5.3 Onboarding Module

Responsibility: Student form submission and admin oversight of completion status.

Files: `modules/onboarding/onboarding.routes.ts`, `onboarding.controller.ts`, `onboarding.service.ts`, `onboarding.validator.ts`

Key logic:
- `GET /onboarding/me` returns pre-filled fields (name, roll, branch) + any previously saved data.
- On `POST /onboarding/submit`, check `editAllowedByAdmin` if `onboardingStatus === "submitted"` — reject if false.
- On successful submission, set `onboardingStatus = "submitted"` and `consentGiven = true`.

---

### 5.4 Hostel Module

Responsibility: CRUD for hostels and room inventory; admin configuration.

Files: `modules/hostel/hostel.routes.ts`, `hostel.controller.ts`, `hostel.service.ts`

Key logic:
- Hostel info (warden, mess timings, rules, facilities) is served to both students (read-only) and admins (full CRUD).
- Room upload via CSV bulk-creates room records under a hostel.
- Room capacity is set per-room and enforced at allocation time.

---

### 5.5 Room Module

Responsibility: Room inventory queries — available rooms, occupancy, accessibility filters.

Files: `modules/room/room.routes.ts`, `room.controller.ts`, `room.service.ts`

Key logic:
- `getAvailableRooms(hostelId)` returns rooms where `currentOccupancy < capacity` and `isActive = true`.
- Occupancy count (`currentOccupancy`) is updated atomically using MongoDB `$inc` on each allocation/deallocation to avoid race conditions.

---

### 5.6 Allocation Module

Responsibility: Core allocation engine — assign rooms, assign roommates, swap rooms/roommates, audit trail.

Files: `modules/allocation/allocation.routes.ts`, `allocation.controller.ts`, `allocation.service.ts`

Key logic:
- Before allocating, verify the room has remaining capacity.
- Allocation sets `isActive = true` on the new `allocations` record and increments `rooms.currentOccupancy`.
- Room change: deactivates old allocation, creates new one, decrements old room occupancy, increments new.
- Roommate swap: swaps `roomId` between two students' allocations; no net change in occupancy.
- Every mutation writes an `allocationAudits` record.
- Roommate contacts are revealed only when both students sharing a room have active `allocations` records pointing to the same room.

---

### 5.7 Dashboard Module

Responsibility: Aggregated views for students and admins; PDF slip generation; data export.

Files: `modules/dashboard/dashboard.routes.ts`, `dashboard.controller.ts`, `dashboard.service.ts`

Key logic:
- Student dashboard: looks up active allocation → joins hostel and room → finds co-occupants in same room → conditionally exposes roommate contact only if roommate is also allocated to that room.
- Admin dashboard: aggregation pipelines for occupancy overview, onboarding completion counts, per-hostel breakdowns.
- PDF slip: generated server-side using PDFKit; returned as a binary stream with `Content-Disposition: attachment`.
- Export: ExcelJS writes to a buffer; returned with `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

---

## 6. API Documentation

### Base URL

```
/api/v1
```

### Common Headers

```
Authorization: Bearer <jwt_token>    (all protected routes)
Content-Type: application/json       (all POST/PUT/PATCH)
```

### Common Response Envelope

```json
{
  "success": true | false,
  "data": { ... } | null,
  "message": "Human-readable message",
  "errors": [ ... ] | null    // Validation errors only
}
```

---

### 6.1 Auth Routes — `/api/v1/auth`

---

#### POST `/auth/login`

Login with pre-provisioned credentials.

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
    "token": "<jwt>",
    "role": "student",
    "isFirstLogin": true
  }
}
```

Response `401 Unauthorized`: Invalid credentials.

Notes: If `isFirstLogin` is `true`, the client must redirect to the change-password screen before allowing further navigation.

---

#### POST `/auth/change-password`

Mandatory first-login password reset and voluntary password change.

Access: Protected (student, admin)

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

Notes: On success, sets `isFirstLogin = false` and updates `sessionInvalidatedAt`. Client must discard the old token and redirect to login.

---

#### POST `/auth/forgot-password`

Initiate forgot-password flow by sending a reset link to the registered email.

Access: Public

Request body:
```json
{
  "email": "student@college.edu"
}
```

Response `200 OK`:
```json
{
  "success": true,
  "message": "If this email is registered, a reset link has been sent."
}
```

Notes: Always returns 200 regardless of whether the email exists, to prevent user enumeration.

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

---

#### POST `/auth/logout`

Invalidate the current session (client discards token; server logs the event).

Access: Protected (student, admin)

Response `200 OK`:
```json
{
  "success": true,
  "message": "Logged out."
}
```

---

### 6.2 User / Admin Provisioning Routes — `/api/v1/users`

All routes in this section require `role: admin`.

---

#### POST `/users/upload`

Bulk-upload fresher master list from a CSV or Excel file.

Access: Admin only

Request: `multipart/form-data`

Form fields:
```
file: <csv or xlsx file>
```

Expected file columns: `name`, `rollNumber`, `branch`, `email`, `loginId`, `password`, `hostel` (optional pre-assignment hint)

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
    "uploadLogId": "<ObjectId>"
  }
}
```

---

#### GET `/users`

List all users with optional filters.

Access: Admin only

Query params:
```
role=student|admin
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
    "users": [ { "_id": "...", "loginId": "...", "email": "...", "role": "...", "isActive": true } ],
    "total": 120,
    "page": 1,
    "limit": 20
  }
}
```

---

#### PATCH `/users/:userId/deactivate`

Deactivate a user account.

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

### 6.3 Onboarding Routes — `/api/v1/onboarding`

---

#### GET `/onboarding/me`

Fetch the onboarding form data for the logged-in student (pre-filled + any previously saved fields).

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
    "physicalAccessibilityRequirements": null,
    "onboardingStatus": "pending",
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
  "bloodGroup": "B+",
  "medicalConditions": "Mild asthma",
  "physicalAccessibilityRequirements": "None",
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

Get the onboarding completion status for the logged-in student.

Access: Student only

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "status": "submitted",
    "submittedAt": "2024-07-10T14:32:00Z"
  }
}
```

---

#### GET `/onboarding/admin/list`

List all freshers with their onboarding status. Supports search and filter.

Access: Admin only

Query params:
```
status=pending|submitted
branch=<branch name>
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
        "onboardingStatus": "submitted",
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

Allow a specific student to re-submit their onboarding form.

Access: Admin only

Response `200 OK`:
```json
{
  "success": true,
  "message": "Edit permission granted."
}
```

---

### 6.4 Hostel Routes — `/api/v1/hostels`

---

#### GET `/hostels`

List all active hostels.

Access: Protected (student, admin)

Response `200 OK`:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Tagore Bhawan",
      "type": "boys",
      "wardenName": "Dr. P.K. Singh",
      "wardenContact": "9988776655",
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

Access: Protected (student, admin)

Response `200 OK`: Full hostel object as above.

---

#### POST `/hostels`

Create a new hostel.

Access: Admin only

Request body:
```json
{
  "name": "Tagore Bhawan",
  "type": "boys",
  "wardenName": "Dr. P.K. Singh",
  "wardenContact": "9988776655",
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

Request body: Same shape as POST, all fields optional.

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

### 6.5 Room Routes — `/api/v1/rooms`

---

#### GET `/rooms`

List rooms with optional filters. Returns occupancy status.

Access: Admin only

Query params:
```
hostelId=<id>
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
        "_id": "...",
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

Get details of a specific room, including current occupants.

Access: Admin only

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

Notes: Capacity cannot be set below `currentOccupancy`. Returns `409` if violated.

---

### 6.6 Allocation Routes — `/api/v1/allocations`

All routes require `role: admin`.

---

#### POST `/allocations`

Allocate a room to a student.

Access: Admin only

Request body:
```json
{
  "studentId": "<ObjectId>",
  "hostelId": "<ObjectId>",
  "roomId": "<ObjectId>",
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

Access: Admin only

Request body:
```json
{
  "newRoomId": "<ObjectId>",
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

Access: Admin only

Request body:
```json
{
  "studentIdA": "<ObjectId>",
  "studentIdB": "<ObjectId>",
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

Deallocate a student (sets `isActive = false`, decrements room occupancy).

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

Access: Admin only

Query params:
```
hostelId=<id>
roomId=<id>
studentId=<id>
isActive=true|false
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

Get the audit trail for a specific allocation.

Access: Admin only

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "auditLogs": [
      {
        "action": "allocated",
        "performedBy": "Admin Name",
        "performedAt": "2024-07-12T10:00:00Z",
        "notes": "Pre-allocated before arrival"
      },
      {
        "action": "roomChanged",
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

### 6.7 Dashboard Routes — `/api/v1/dashboard`

---

#### GET `/dashboard/student`

Get the student's personal dashboard data.

Access: Student only

Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "allocationStatus": "allocated",
    "hostelName": "Tagore Bhawan",
    "roomNumber": "A-101",
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

Notes: `roommates` is an empty array if not yet allocated. `contactNumber` in roommate objects is `null` and `roommateContactVisible = false` if the roommate does not yet have an active allocation.

Allocation status values: `"pending"` (no allocation exists) or `"allocated"` (active allocation exists).

---

#### GET `/dashboard/student/slip`

Download the hostel allotment slip as a PDF.

Access: Student only (must have active allocation)

Response `200 OK`:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="allotment-slip-CSE2024001.pdf"
<binary PDF stream>
```

Response `404 Not Found`: No active allocation exists for the student.

---

#### GET `/dashboard/admin/overview`

Get the admin overview: onboarding stats, occupancy summary.

Access: Admin only

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

Paginated student listing with onboarding and allocation status. Supports search and filter.

Access: Admin only

Query params:
```
onboardingStatus=pending|submitted
allocationStatus=pending|allocated
branch=<branch>
hostelId=<id>
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
        "onboardingStatus": "submitted",
        "allocationStatus": "allocated",
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
hostelId=<id>           (optional filter)
onboardingStatus=pending|submitted   (optional filter)
allocationStatus=pending|allocated   (optional filter)
```

Response `200 OK`:
```
Content-Type: text/csv  OR  application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="students-export-2024-07-14.csv"
<file binary>
```

---

## 7. Authentication & Authorization

### JWT Structure

Payload:
```json
{
  "sub": "<userId>",
  "role": "student | admin",
  "iat": 1720000000,
  "exp": 1720086400
}
```

Expiry: 24 hours (configurable via env). Session timeout is enforced client-side; token expiry is the server-side hard limit.

### Session Invalidation

On password change or reset, the server sets `users.sessionInvalidatedAt = now()`. The auth middleware checks:

```
if (token.iat < user.sessionInvalidatedAt) → reject with 401
```

This invalidates all previously issued tokens for that user without a blocklist.

### Role Guards

Two middleware layers applied per route:

`auth.middleware.ts` — verifies token signature, expiry, and `sessionInvalidatedAt`.

`role.middleware.ts` — checks `req.user.role` against the allowed roles for the route. Returns `403 Forbidden` on mismatch.

Usage:
```typescript
router.get("/admin/list", authenticate, authorize("admin"), handler);
router.get("/me", authenticate, authorize("student"), handler);
```

---

## 8. Error Handling Conventions

All errors are caught by the global `error.middleware.ts` and returned in the standard envelope.

| HTTP Status | Meaning |
|---|---|
| 400 | Validation error or bad input |
| 401 | Missing, invalid, or expired token |
| 403 | Authenticated but insufficient role |
| 404 | Resource not found |
| 409 | Conflict (duplicate submission, room full, already allocated) |
| 422 | Business rule violation (e.g., capacity below occupancy) |
| 500 | Unhandled server error |

Validation errors (400) include a structured `errors` array:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "contactNumber", "message": "Must be a 10-digit number" }
  ]
}
```

---

## 9. Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/hostel_portal

# JWT
JWT_SECRET=<strong_random_secret>
JWT_EXPIRES_IN=24h

# App
FRONTEND_URL=https://swc.iitg.ac.in/freshers-onboarding
RESET_TOKEN_EXPIRES_MINUTES=15
```

---

