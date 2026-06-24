import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(),
  RESET_TOKEN_EXPIRES_MINUTES: z.coerce.number().default(15),
  
  // MS Auth & Admin Config
  MICROSOFT_TENANT_ID: z.string(),
  MICROSOFT_CLIENT_ID: z.string(),
  MICROSOFT_CLIENT_SECRET: z.string(),
  MICROSOFT_REDIRECT_URI: z.string().url(),
  ALLOWED_EMAIL_DOMAIN: z.string(),
  SUPERADMIN_EMAIL: z.string().email(),
  SUPERADMIN_PASSWORD: z.string().min(8),
})

export type Env = z.infer<typeof envSchema>

// Parse and validate at module load time. If any required variable is missing
// or malformed, the process exits immediately with a descriptive Zod error.
// Never read process.env directly elsewhere — import `env` from here.
export const env = envSchema.parse(process.env)
