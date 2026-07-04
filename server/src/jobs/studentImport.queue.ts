import { Queue } from 'bullmq'
import { env } from '@/config/env'
import type { BulkUploadRow } from '@shared/student'

// ─── Job payload ─────────────────────────────────────────────────────────────
export interface StudentImportJobData {
  rows: BulkUploadRow[]
  uploadedBy: string // userId of the ADMIN who triggered the upload
  academicYearId: string
}

// ─── Queue ───────────────────────────────────────────────────────────────────
// Parse connection details from REDIS_URL. Using plain options (not the shared
// ioredis singleton) to avoid the BullMQ internal type conflict.
const redisUrl = new URL(env.REDIS_URL)

export const studentImportQueue = new Queue<StudentImportJobData>('student-imports', {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    family: 4,
    maxRetriesPerRequest: null,
  },
  defaultJobOptions: {
    // Do NOT retry import jobs. A partial retry would re-insert already-created
    // students and hit unique constraint errors, making the error report confusing.
    // The admin should re-upload a corrected CSV instead.
    attempts: 1,
    removeOnComplete: { age: 60 * 60 * 24 }, // keep for 24h so status endpoint works
    removeOnFail: { age: 60 * 60 * 24 * 7 }, // keep failures for 7 days
  },
})
