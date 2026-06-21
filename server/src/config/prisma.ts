import { PrismaClient } from '../../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { env } from '@/config/env'

const pool = new Pool({ connectionString: env.DATABASE_URL })

// Prisma 7: PrismaPg adapter takes the pool directly as the first argument,
// not as a { pool } object. Passing { pool } is a silent bug — Prisma would
// not use the adapter and would fall back to the default query engine.
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
