// Import PrismaClient from the generated class file (the actual typed class).
// The top-level client.ts has @ts-nocheck which causes TypeScript to treat the
// PrismaClient constructor as returning `any`, losing all model type information.
// Importing from internal/class gives us the fully-typed version.
import { getPrismaClientClass } from '../generated/prisma/internal/class'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { env } from '@/config/env'

const pool = new Pool({ connectionString: env.DATABASE_URL })

// Prisma 7: PrismaPg adapter takes the pool directly as the first argument.
const adapter = new PrismaPg(pool)

const PrismaClient = getPrismaClientClass()

export const prisma = new PrismaClient({ adapter })

export type { PrismaClient }
