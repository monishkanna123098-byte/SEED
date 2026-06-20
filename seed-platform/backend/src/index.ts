import 'dotenv/config'
import { httpServer } from './app'
import { prisma } from './utils/prisma'
import { redis } from './utils/redis'
import { logger } from './utils/logger'
// Import analysis queue — registers Bull worker process on startup
import './services/analysisService'

const PORT = parseInt(process.env.PORT ?? '3001', 10)

async function bootstrap() {
  try {
    // Verify database connection
    await prisma.$connect()
    logger.info('PostgreSQL connected')

    // Verify Redis connection
    await redis.ping()
    logger.info('Redis connected')

    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`S.E.E.D. backend running on port ${PORT}`, {
        env: process.env.NODE_ENV,
        port: PORT,
      })
    })
  } catch (err) {
    logger.error('Failed to start server', { error: err })
    process.exit(1)
  }
}

// ─── Graceful Shutdown ─────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`)

  httpServer.close(async () => {
    try {
      await prisma.$disconnect()
      redis.disconnect()
      logger.info('Shutdown complete')
      process.exit(0)
    } catch (err) {
      logger.error('Error during shutdown', { error: err })
      process.exit(1)
    }
  })

  // Force exit after 15 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 15000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack })
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason })
  process.exit(1)
})

bootstrap()
