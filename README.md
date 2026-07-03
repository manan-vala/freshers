# IITG Fresher Onboarding Portal

A full-stack, enterprise-grade web application designed to streamline the onboarding, authentication, and hostel allocation process for incoming students at IIT Guwahati.

## Project Overview

This platform replaces manual onboarding processes with a secure, digital-first approach. It features robust role-based access control, a secure first-login OTP verification flow, asynchronous background job processing for emails, and a multi-step data collection form for student profiling.

## Tech Stack

### Frontend
* **Framework:** React with TypeScript, powered by Vite.
* **Routing:** `@tanstack/react-router` for file-based, type-safe client-side routing.
* **State & Forms:** `react-hook-form` coupled with `zod` for strict schema validation.
* **Styling & UI:** Tailwind CSS with custom accessible components (shadcn/ui inspired), featuring interactive OTP inputs and responsive layouts.
* **Icons:** `@tabler/icons-react`.

### Backend
* **Core:** Node.js and Express built with TypeScript (`tsx`).
* **Database:** Relational database managed via Prisma ORM.
* **Caching & Queues:** Redis.
* **Background Jobs:** `bullmq` for asynchronous task processing (e.g., non-blocking email delivery).
* **Email Processing:** `nodemailer` configured for SMTP (Gmail/Outlook) with dynamic HTML templating.

### Security & Authentication
* **Token Management:** JWT-based authentication featuring short-lived access tokens and Redis-blocklisted refresh tokens.
* **Password Security:** `bcrypt` hashing for all user credentials.
* **External Auth:** Microsoft OAuth integration for Hostel Management Committee (HMC) admins.
* **Environment Validation:** Strict startup validation of all secrets using Zod.

---

## Core Features & Use Cases

### 1. Secure Student Onboarding Flow
* **First-Login Enforcement:** Newly provisioned student accounts are flagged (`mustChangePassword: true`). Upon first login, the system intercepts the request, generates a secure 6-digit OTP, and emails it to the user.
* **OTP Verification:** A polished UI captures the OTP and a new permanent password, calling the backend to verify the code, hash the new password, and securely update the database in a single transaction.
* **Multi-Step Profiling:** Once authenticated, students complete a sequential onboarding form capturing General Details and Medical Information before final review and submission.

### 2. Asynchronous Background Workers
* **Email Queueing:** To ensure a lightning-fast frontend experience, emails are not sent synchronously on the main thread. Instead, the Express API drops an `EmailJob` into a Redis queue.
* **Dedicated Worker Process:** A standalone BullMQ worker process actively listens to the queue, compiles the HTML templates, and securely dispatches the emails via SMTP.

### 3. Comprehensive Authentication System
* **Role-Based Access:** Distinct routing and data access layers for `STUDENT`, `ADMIN`, and `HMC` (Hostel Admin) roles.
* **Self-Service Recovery:** Fully functional "Forgot Password" flow utilizing the same secure OTP email architecture to allow students to independently reset forgotten credentials.
* **Session Management:** Secure, HTTP-only cookies combined with Redis-backed session invalidation.

---

## Local Development Setup

### Prerequisites
* Node.js (v18+ recommended)
* Redis (Running locally or via Docker on port 6379)
* A PostgreSQL/MySQL Database

### Environment Variables
Create a `.env` file in the root directory. The application enforces strict validation on startup and will crash if these are missing:

```env
# Application URLs
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/iitg_onboarding
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_super_secret_jwt_key

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password
SMTP_FROM=your-email@gmail.com

# Microsoft OAuth (HMC Admins)
MICROSOFT_TENANT_ID=your_tenant_id
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/v1/auth/microsoft/callback
ALLOWED_EMAIL_DOMAIN=iitg.ac.in

# Super Admin Details
SUPERADMIN_EMAIL=admin@iitg.ac.in
SUPERADMIN_PASSWORD=secureadminpassword
```
Running the Application
You will need three separate terminal instances to run the full stack locally.

1. Start the Backend API
cd server
npm install
npx prisma db push
npm run dev
2. Start the Background Worker
cd server
npm run worker:dev
3. Start the Frontend Client
cd client
npm install
npm run dev
4.Seeding Data for Testing
To test the first-login flow, you can provision a test student account:
cd server
npx tsx src/scripts/seed-test-user.ts


