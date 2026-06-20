import { Request, Response, NextFunction } from 'express'
import { UserRole } from '@prisma/client'
import {
  verifyAccessToken,
  isAccessTokenBlacklisted,
  TokenPayload,
} from '../utils/jwt'
import { logger } from '../utils/logger'

// Extend Express Request to carry decoded token payload
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  try {
    const payload = verifyAccessToken(token)

    // Check if token has been blacklisted (post-logout)
    const blacklisted = await isAccessTokenBlacklisted(payload.jti)
    if (blacklisted) {
      res.status(401).json({ error: 'Token has been revoked' })
      return
    }

    req.user = payload
    next()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid token'
    logger.warn('Token verification failed', { error: message, ip: req.ip })
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.sub,
        requiredRoles: roles,
        actualRole: req.user.role,
        path: req.path,
      })
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    next()
  }
}

// For routes where auth is optional (e.g., public info + enhanced for logged-in users)
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token) {
    try {
      const payload = verifyAccessToken(token)
      const blacklisted = await isAccessTokenBlacklisted(payload.jti)
      if (!blacklisted) {
        req.user = payload
      }
    } catch {
      // Silently ignore invalid tokens for optional auth
    }
  }

  next()
}
