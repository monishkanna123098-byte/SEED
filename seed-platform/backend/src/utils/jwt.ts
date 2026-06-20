import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { UserRole } from '@prisma/client'
import { redis, redisKeys } from './redis'
import { logger } from './logger'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN ?? '15m'
const REFRESH_EXPIRES_SECONDS = 7 * 24 * 60 * 60 // 7 days in seconds

export interface TokenPayload {
  sub: string       // userId
  email: string
  role: UserRole
  jti: string       // unique token ID for blacklisting
  iat?: number
  exp?: number
}

export function signAccessToken(userId: string, email: string, role: UserRole): string {
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    sub: userId,
    email,
    role,
    jti: uuidv4(),
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES })
}

export async function signRefreshToken(userId: string, email: string, role: UserRole): Promise<string> {
  const tokenId = uuidv4()
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    sub: userId,
    email,
    role,
    jti: tokenId,
  }
  const token = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_SECONDS })

  // Store refresh token ID in Redis for validation and revocation
  await redis.setex(
    redisKeys.refreshToken(tokenId),
    REFRESH_EXPIRES_SECONDS,
    userId
  )

  return token
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload
}

export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await redis.del(redisKeys.refreshToken(tokenId))
}

export async function isRefreshTokenValid(tokenId: string): Promise<boolean> {
  const val = await redis.get(redisKeys.refreshToken(tokenId))
  return val !== null
}

export async function blacklistAccessToken(jti: string, expiresInSeconds: number): Promise<void> {
  if (expiresInSeconds > 0) {
    await redis.setex(redisKeys.blacklistedToken(jti), expiresInSeconds, '1')
  }
}

export async function isAccessTokenBlacklisted(jti: string): Promise<boolean> {
  const val = await redis.get(redisKeys.blacklistedToken(jti))
  return val !== null
}

export function getTokenRemainingSeconds(exp: number): number {
  return Math.max(0, exp - Math.floor(Date.now() / 1000))
}
