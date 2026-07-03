import 'dotenv/config'
import http from 'http'
import { createApp } from './app'
import { env } from '@/config/env'
import { prisma } from '@/config/prisma'
import { redis } from '@/config/redis'

async function bootstrap() {
  // Check Database connection
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✓ Database connected')
  } catch (error) {
    console.error('✗ Database connection failed:', error)
    process.exit(1) // Fail fast if DB is down
  }

  const app = createApp()
  const server = http.createServer(app)

  server.listen(env.PORT, () => {
    console.log(`✓ Server running on port ${env.PORT} [${env.NODE_ENV}]`)
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`✗ Port ${env.PORT} is already in use. Is another instance running?`)
    } else {
      console.error('✗ Server error:', err)
    }
    process.exit(1)
  })

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down`)
    server.close(async () => {
      await prisma.$disconnect()
      redis.disconnect()
      console.log('✓ Disconnected from Prisma and Redis. Exiting.')
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
