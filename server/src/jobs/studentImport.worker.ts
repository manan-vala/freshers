import { Worker, Job } from 'bullmq'
import { randomBytes } from 'crypto'
import { env } from '@/config/env'
import { prisma } from '@/config/prisma'
import { hashPassword } from '@/utils/password.util'
import { emailQueue } from '@/modules/email/email.queue'
import type { StudentImportJobData } from './studentImport.queue'
import type { ImportJobResult, BulkUploadRow } from '@shared/student'

// ─── Batch size ───────────────────────────────────────────────────────────────
// 100 rows per transaction is a safe sweet spot:
//   - Keeps each transaction short (< 1s) so PG doesn't time out
//   - Minimises the number of DB round-trips (10 transactions for 1000 rows)
//   - If one batch fails, only those 100 rows are lost, not the whole upload
const BATCH_SIZE = 100

// ─── Worker ───────────────────────────────────────────────────────────────────
const redisUrl = new URL(env.REDIS_URL)

export const studentImportWorker = new Worker<StudentImportJobData, ImportJobResult>(
  'student-imports',

  async (job: Job<StudentImportJobData, ImportJobResult>): Promise<ImportJobResult> => {
    const { rows, academicYearId } = job.data

    const result: ImportJobResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
    }

    // ── Step 1: Resolve all hostel codes in ONE query ─────────────────────────
    const uniqueHostelCodes = [...new Set(rows.map((r) => r.hostelCode))]
    const hostels = await prisma.hostel.findMany({
      where: { code: { in: uniqueHostelCodes }, academicYearId },
      select: { id: true, code: true },
    })
    const hostelMap = new Map(hostels.map((h) => [h.code, h.id]))

    // Flag rows with unknown hostel codes immediately (don't attempt DB insert)
    const unknownHostelRows = rows.filter((r) => !hostelMap.has(r.hostelCode))
    for (const row of unknownHostelRows) {
      result.failureCount++
      result.errors.push({
        row: rows.indexOf(row) + 1,
        rollNumber: row.rollNumber,
        reason: `Hostel code "${row.hostelCode}" not found for active academic year`,
      })
    }

    const validRows = rows.filter((r) => hostelMap.has(r.hostelCode))

    // ── Step 2: Check for duplicates already in DB (one query) ────────────────
    const rollNumbers = validRows.map((r) => r.rollNumber)
    const emails = validRows.map((r) => r.outlookId)

    const [existingUsers, existingStudents] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [{ loginId: { in: rollNumbers } }, { email: { in: emails } }],
        },
        select: { loginId: true, email: true },
      }),
      prisma.student.findMany({
        where: { rollNumber: { in: rollNumbers } },
        select: { rollNumber: true },
      }),
    ])

    const existingLoginIds = new Set(existingUsers.map((u) => u.loginId))
    const existingEmails = new Set(existingUsers.map((u) => u.email))
    const existingRollNumbers = new Set(existingStudents.map((s) => s.rollNumber))

    const duplicateRows = validRows.filter(
      (r) =>
        existingLoginIds.has(r.rollNumber) ||
        existingEmails.has(r.outlookId) ||
        existingRollNumbers.has(r.rollNumber)
    )
    for (const row of duplicateRows) {
      result.failureCount++
      result.errors.push({
        row: rows.indexOf(row) + 1,
        rollNumber: row.rollNumber,
        reason: 'Student with this roll number or email already exists',
      })
    }

    const insertableRows = validRows.filter(
      (r) =>
        !existingLoginIds.has(r.rollNumber) &&
        !existingEmails.has(r.outlookId) &&
        !existingRollNumbers.has(r.rollNumber)
    )

    // ── Step 3: Pre-generate passwords in parallel ────────────────────────────
    // bcrypt is CPU-bound but Promise.all lets Node interleave IO between hashes.
    // Total time ≈ max(individual_hash_time) rather than sum — ~250ms for all.
    type PreparedRow = BulkUploadRow & { plainPassword: string; passwordHash: string }

    const prepared: PreparedRow[] = await Promise.all(
      insertableRows.map(
        async (row): Promise<PreparedRow> => {
          const plainPassword = randomBytes(8).toString('hex')
          const passwordHash = await hashPassword(plainPassword)
          return { ...row, plainPassword, passwordHash }
        }
      )
    )

    // ── Step 4: Insert in chunks ───────────────────────────────────────────────
    for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
      const chunk = prepared.slice(i, i + BATCH_SIZE)

      try {
        await prisma.$transaction(async (tx) => {
          // 4a. Insert User rows
          await tx.user.createMany({
            data: chunk.map((p) => ({
              email: p.outlookId,
              loginId: p.rollNumber,
              passwordHash: p.passwordHash,
              role: 'STUDENT' as const,
              mustChangePassword: true,
              isActive: true,
            })),
            skipDuplicates: true, // belt-and-suspenders in case of a race condition
          })

          // 4b. Fetch the IDs that were just created
          // We need userId for the Student FK — createMany doesn't return created records.
          const createdUsers = await tx.user.findMany({
            where: { loginId: { in: chunk.map((p) => p.rollNumber) } },
            select: { id: true, loginId: true },
          })
          const userIdByLoginId = new Map(createdUsers.map((u) => [u.loginId, u.id]))

          // 4c. Insert Student rows
          await tx.student.createMany({
            data: chunk.map((p) => ({
              userId: userIdByLoginId.get(p.rollNumber)!,
              name: p.name,
              rollNumber: p.rollNumber,
              discipline: p.discipline,
              programme: p.programme,
              academicYearId,
              hostelId: hostelMap.get(p.hostelCode)!,
              gmailId: p.gmailId,
              outlookId: p.outlookId,
              onboardingStatus: 'PENDING' as const,
            })),
            skipDuplicates: true,
          })
        })

        result.successCount += chunk.length
      } catch (err: unknown) {
        // One batch failed — record all rows in this batch as errors
        // This avoids leaving the result summary in an unknown state
        result.failureCount += chunk.length
        const reason = err instanceof Error ? err.message : 'Database error'
        for (let j = 0; j < chunk.length; j++) {
          const row = chunk[j]!
          result.errors.push({
            row: rows.indexOf(row) + 1,
            rollNumber: row.rollNumber,
            reason,
          })
        }
      }

      // Update progress after each batch so the status endpoint shows live %
      await job.updateProgress(Math.round(((i + chunk.length) / prepared.length) * 100))
    }

    // ── Step 5: Queue credential emails for all successfully inserted students ─
    // The user has opted to disable automatic credential emails after CSV upload.
    // So we skip it here.

    return result
  },

  {
    connection: {
      host: redisUrl.hostname,
      port: Number(redisUrl.port) || 6379,
      username: redisUrl.username || undefined,
      password: redisUrl.password || undefined,
      family: 4,
      maxRetriesPerRequest: null,
    },
    // concurrency: 1 — only one import job runs at a time.
    // This prevents two simultaneous bulk uploads from racing on the same
    // hostel/duplicate checks and producing inconsistent results.
    concurrency: 1,
  }
)

studentImportWorker.on('completed', (job, result) => {
  console.log(
    `✓ Student import job ${job.id} completed — ` +
      `${result.successCount} ok, ${result.failureCount} failed`
  )
})

studentImportWorker.on('failed', (job, err) => {
  console.error(`✗ Student import job ${job?.id} failed:`, err.message)
})
