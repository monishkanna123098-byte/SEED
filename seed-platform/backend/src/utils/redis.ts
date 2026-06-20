import Redis from 'ioredis'
import { logger } from './logger'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error('Redis: max retries reached, giving up')
      return null
    }
    return Math.min(times * 200, 3000)
  },
})

redis.on('connect', () => logger.info('Redis connected'))
redis.on('error', (err) => logger.error('Redis error', { error: err.message }))
redis.on('close', () => logger.warn('Redis connection closed'))

// Key namespace helpers to avoid collisions
export const redisKeys = {
  refreshToken: (tokenId: string) => `refresh:${tokenId}`,
  emailVerifyToken: (token: string) => `email_verify:${token}`,
  rateLimitLogin: (ip: string) => `rate:login:${ip}`,
  blacklistedToken: (jti: string) => `blacklist:${jti}`,
}
