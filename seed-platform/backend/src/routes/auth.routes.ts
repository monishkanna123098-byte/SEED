import { Router, Request, Response } from 'express'
import { body, param } from 'express-validator'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { UserRole } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { redis, redisKeys } from '../utils/redis'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  blacklistAccessToken,
  getTokenRemainingSeconds,
} from '../utils/jwt'
import { sendVerificationEmail } from '../utils/email'
import { authenticateToken, requireRole } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { logger } from '../utils/logger'

const router = Router()

// ─── SQL Injection Audit Note ─────────────────────────────────────────────────
// All DB operations use Prisma ORM methods (findUnique, create, update, etc.).
// Prisma parameterizes every query by default. No raw $queryRaw or $executeRaw
// calls exist in this file. Last audited: Stage 5A security hardening.

const BCRYPT_ROUNDS = 12
const REFRESH_COOKIE_NAME = 'seed_refresh'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
}

// ─── Auth Event Logging ───────────────────────────────────────────────────────
// Every authentication lifecycle event is persisted to the AuthEvent table.
// Records: event type, outcome, user ID (if known at event time), source IP.
// Used for security audits, anomaly detection, and DPDPA-2023 incident response.

type AuthEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'REGISTER_SUCCESS'
  | 'REGISTER_FAILURE'
  | 'LOGOUT'
  | 'TOKEN_REFRESH_SUCCESS'
  | 'TOKEN_REFRESH_FAILURE'
  | 'EMAIL_VERIFIED'

async function logAuthEvent(
  req: import('express').Request,
  event: AuthEventType,
  userId: string | null,
  detail?: string
): Promise<void> {
  try {
    await prisma.authEvent.create({
      data: {
        event,
        userId,
        // X-Forwarded-For when behind a proxy (Docker/nginx), fallback to req.ip
        ipAddress: (
          (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
          ?? req.ip
          ?? 'unknown'
        ),
        userAgent: (req.headers['user-agent'] ?? null),
        detail: detail ?? null,
      },
    })
  } catch (err) {
    // Log to winston but never let auth event writes break the auth flow itself
    logger.warn('Failed to write auth event', { event, userId, error: err })
  }
}

// ─── POST /api/auth/register ────────────────────────────────────────────────
router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be 8+ chars with uppercase, lowercase, and number'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name required (2-100 chars)'),
    body('role')
      .isIn([UserRole.PARENT, UserRole.CLINICIAN])
      .withMessage('Role must be PARENT or CLINICIAN'),
    body('inviteCode')
      .if(body('role').equals(UserRole.PARENT))
      .notEmpty()
      .withMessage('Invite code required for parent registration (DPDPA-2023 Schedule IV)'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, name, role, inviteCode } = req.body as {
      email: string
      password: string
      name: string
      role: UserRole
      inviteCode?: string
    }

    try {
      // Duplicate email check
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        res.status(409).json({ error: 'Email already registered' })
        return
      }

      // Admin registration is not permitted via API — must be seeded
      if (role === UserRole.ADMIN) {
        res.status(403).json({ error: 'Admin accounts cannot be self-registered' })
        return
      }

      let clinicianId: string | undefined = undefined

      // DPDPA-2023 Schedule IV: parent registration requires valid clinician invite code
      if (role === UserRole.PARENT) {
        if (!inviteCode) {
          res.status(400).json({
            error: 'Clinician invite code required. Contact your child\'s paediatrician.',
          })
          return
        }

        const codeRecord = await prisma.inviteCode.findUnique({
          where: { code: inviteCode.toUpperCase() },
        })

        if (!codeRecord) {
          res.status(400).json({ error: 'Invalid invite code' })
          return
        }
        if (codeRecord.usedBy !== null) {
          res.status(400).json({ error: 'Invite code has already been used' })
          return
        }
        if (new Date() > codeRecord.expiresAt) {
          res.status(400).json({ error: 'Invite code has expired. Request a new code from your clinician.' })
          return
        }

        clinicianId = codeRecord.clinicianId

        // Mark invite code as consumed atomically
        await prisma.$transaction(async (tx) => {
          const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
          const verifyToken = uuidv4()

          const user = await tx.user.create({
            data: {
              email,
              passwordHash,
              name,
              role,
              clinicianId,
              emailVerifyToken: verifyToken,
            },
          })

          await tx.inviteCode.update({
            where: { code: inviteCode.toUpperCase() },
            data: { usedBy: user.id, usedAt: new Date() },
          })

          // Store verify token in Redis for 24h (belt-and-suspenders alongside DB field)
          await redis.setex(redisKeys.emailVerifyToken(verifyToken), 86400, user.id)

          await sendVerificationEmail(email, name, verifyToken)

          await logAuthEvent(req, 'REGISTER_SUCCESS', user.id, `role=${role}`)

          res.status(201).json({
            message: 'Registration successful. Check your email to verify your account.',
            userId: user.id,
          })
        })
        return
      }

      // Clinician registration (no invite code required, but email verification required)
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
      const verifyToken = uuidv4()

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role,
          emailVerifyToken: verifyToken,
        },
      })

      await redis.setex(redisKeys.emailVerifyToken(verifyToken), 86400, user.id)
      await sendVerificationEmail(email, name, verifyToken)

      await logAuthEvent(req, 'REGISTER_SUCCESS', user.id, `role=${role}`)

      res.status(201).json({
        message: 'Registration successful. Check your email to verify your account.',
        userId: user.id,
      })
    } catch (err) {
      logger.error('Registration error', { error: err, email })
      await logAuthEvent(req, 'REGISTER_FAILURE', null, `email=${email}`)
      res.status(500).json({ error: 'Registration failed. Please try again.' })
    }
  }
)

// ─── POST /api/auth/verify-email/:token ────────────────────────────────────
router.post(
  '/verify-email/:token',
  validate([
    param('token')
      .trim()
      .isUUID()
      .withMessage('Verification token must be a valid UUID'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params

  try {
    // Check Redis first (fast path)
    const userId = await redis.get(redisKeys.emailVerifyToken(token))

    if (!userId) {
      // Fall back to DB check (token may have been set before Redis)
      const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } })
      if (!user) {
        res.status(400).json({ error: 'Invalid or expired verification token' })
        return
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true, emailVerifyToken: null },
      })

      res.json({ message: 'Email verified successfully. You can now log in.' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      res.status(400).json({ error: 'User not found' })
      return
    }

    if (user.isEmailVerified) {
      res.json({ message: 'Email already verified.' })
      return
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true, emailVerifyToken: null },
    })

    await redis.del(redisKeys.emailVerifyToken(token))

    await logAuthEvent(req, 'EMAIL_VERIFIED', userId)

    res.json({ message: 'Email verified successfully. You can now log in.' })
  } catch (err) {
    logger.error('Email verification error', { error: err })
    res.status(500).json({ error: 'Verification failed. Please try again.' })
  }
})

// ─── POST /api/auth/login ───────────────────────────────────────────────────
router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email: string; password: string }

    try {
      const user = await prisma.user.findUnique({ where: { email } })

      // Constant-time comparison to prevent user enumeration
      const dummyHash = '$2b$12$dummy.hash.for.timing.attack.prevention.padding'
      const passwordMatch = user
        ? await bcrypt.compare(password, user.passwordHash)
        : await bcrypt.compare(password, dummyHash)

      if (!user || !passwordMatch) {
        await logAuthEvent(req, 'LOGIN_FAILURE', user?.id ?? null, 'Invalid credentials')
        res.status(401).json({ error: 'Invalid email or password' })
        return
      }

      if (!user.isEmailVerified) {
        await logAuthEvent(req, 'LOGIN_FAILURE', user.id, 'Email not verified')
        res.status(403).json({
          error: 'Email not verified. Check your inbox for the verification link.',
          code: 'EMAIL_NOT_VERIFIED',
        })
        return
      }

      const accessToken = signAccessToken(user.id, user.email, user.role)
      const refreshToken = await signRefreshToken(user.id, user.email, user.role)

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS)

      await logAuthEvent(req, 'LOGIN_SUCCESS', user.id)

      res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      })
    } catch (err) {
      logger.error('Login error', { error: err, email })
      res.status(500).json({ error: 'Login failed. Please try again.' })
    }
  }
)

// ─── POST /api/auth/refresh ────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined

  if (!token) {
    res.status(401).json({ error: 'Refresh token not found' })
    return
  }

  try {
    const payload = verifyRefreshToken(token)

    // Verify token is still in Redis (not revoked)
    const isValid = await isRefreshTokenValid(payload.jti)
    if (!isValid) {
      res.clearCookie(REFRESH_COOKIE_NAME)
      res.status(401).json({ error: 'Refresh token revoked or expired' })
      return
    }

    // Verify user still exists and hasn't been suspended
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) {
      await revokeRefreshToken(payload.jti)
      res.clearCookie(REFRESH_COOKIE_NAME)
      res.status(401).json({ error: 'User not found' })
      return
    }

    // Rotate refresh token (revoke old, issue new)
    await revokeRefreshToken(payload.jti)
    const newAccessToken = signAccessToken(user.id, user.email, user.role)
    const newRefreshToken = await signRefreshToken(user.id, user.email, user.role)

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, COOKIE_OPTIONS)

    await logAuthEvent(req, 'TOKEN_REFRESH_SUCCESS', user.id)

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    })
  } catch (err) {
    logger.warn('Token refresh failed', { error: err instanceof Error ? err.message : err })
    await logAuthEvent(req, 'TOKEN_REFRESH_FAILURE', null)
    res.clearCookie(REFRESH_COOKIE_NAME)
    res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
})

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined

    // Revoke refresh token if present
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken)
        await revokeRefreshToken(payload.jti)
      } catch {
        // Refresh token already invalid — proceed with logout
      }
    }

    // Blacklist the current access token until its natural expiry
    if (req.user?.jti && req.user.exp) {
      const remainingSeconds = getTokenRemainingSeconds(req.user.exp)
      await blacklistAccessToken(req.user.jti, remainingSeconds)
    }

    await logAuthEvent(req, 'LOGOUT', req.user!.sub)

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    logger.error('Logout error', { error: err })
    res.status(500).json({ error: 'Logout failed' })
  }
})

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        clinicianId: true,
        createdAt: true,
      },
    })

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json({ user })
  } catch (err) {
    logger.error('Get me error', { error: err })
    res.status(500).json({ error: 'Failed to fetch user data' })
  }
})

// ─── POST /api/clinician/invite-code ──────────────────────────────────────
// Clinician generates a 6-character alphanumeric invite code
router.post(
  '/clinician/invite-code',
  authenticateToken,
  requireRole(UserRole.CLINICIAN),
  validate([
    body('expiryDays')
      .optional()
      .isInt({ min: 1, max: 90 })
      .withMessage('Expiry must be 1-90 days'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const expiryDays = (req.body as { expiryDays?: number }).expiryDays ?? 30

    try {
      // Generate unique 6-char code (uppercase alphanumeric, no ambiguous chars)
      const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // removed 0/O, 1/I
      let code: string
      let attempts = 0

      do {
        code = Array.from({ length: 6 }, () =>
          charset[Math.floor(Math.random() * charset.length)]
        ).join('')
        attempts++

        if (attempts > 20) {
          throw new Error('Could not generate unique invite code after 20 attempts')
        }

        const existing = await prisma.inviteCode.findUnique({ where: { code } })
        if (!existing) break
      } while (true)

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiryDays)

      const inviteCode = await prisma.inviteCode.create({
        data: {
          code: code!,
          clinicianId: req.user!.sub,
          expiresAt,
        },
      })

      res.status(201).json({
        code: inviteCode.code,
        expiresAt: inviteCode.expiresAt,
        message: `Share this code with the parent. It expires in ${expiryDays} days.`,
      })
    } catch (err) {
      logger.error('Invite code generation error', { error: err })
      res.status(500).json({ error: 'Failed to generate invite code' })
    }
  }
)

// ─── GET /api/clinician/invite-codes ──────────────────────────────────────
// Clinician views all their generated codes
router.get(
  '/clinician/invite-codes',
  authenticateToken,
  requireRole(UserRole.CLINICIAN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const codes = await prisma.inviteCode.findMany({
        where: { clinicianId: req.user!.sub },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          usedBy: true,
          usedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      })

      res.json({ codes })
    } catch (err) {
      logger.error('Fetch invite codes error', { error: err })
      res.status(500).json({ error: 'Failed to fetch invite codes' })
    }
  }
)

// ─── POST /api/auth/validate-invite ───────────────────────────────────────
// Called during parent registration to preview invite code validity
router.post(
  '/validate-invite',
  validate([
    body('code').trim().notEmpty().withMessage('Invite code required'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { code } = req.body as { code: string }

    try {
      const record = await prisma.inviteCode.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          clinician: {
            select: { name: true },
          },
        },
      })

      if (!record) {
        res.status(404).json({ valid: false, error: 'Invite code not found' })
        return
      }

      if (record.usedBy !== null) {
        res.status(400).json({ valid: false, error: 'Invite code already used' })
        return
      }

      if (new Date() > record.expiresAt) {
        res.status(400).json({ valid: false, error: 'Invite code has expired' })
        return
      }

      res.json({
        valid: true,
        clinicianName: record.clinician.name,
        expiresAt: record.expiresAt,
      })
    } catch (err) {
      logger.error('Validate invite error', { error: err })
      res.status(500).json({ error: 'Validation failed' })
    }
  }
)

export default router
