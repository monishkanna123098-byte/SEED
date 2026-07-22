/**
 * S.E.E.D. Children Routes
 *
 * GET  /api/children   — list all children belonging to the authenticated parent
 * POST /api/children   — create a new child for the authenticated parent
 *
 * Both routes require authenticateToken + requireRole(PARENT).
 * clinicianId is automatically inherited from the parent's own clinicianId
 * (set at registration via invite code) — parents cannot assign a different
 * clinician to their child.
 *
 * SQL INJECTION AUDIT:
 * All DB operations use Prisma ORM. No raw queries. Last audited: Children fix.
 */

import { Router, Request, Response } from 'express'
import { body } from 'express-validator'
import { UserRole } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { authenticateToken, requireRole } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { logger } from '../utils/logger'
import { MIN_AGE_MONTHS } from '../utils/ageConstants'
import { isAtLeastMinimumAge } from '../utils/childAge'

const router = Router()

// All children routes require authentication and PARENT role
router.use(authenticateToken)
router.use(requireRole(UserRole.PARENT))

// ─── GET /api/children ────────────────────────────────────────────────────────
// Returns all children for the authenticated parent, ordered by creation date.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const parentId = req.user!.sub

  try {
    const children = await prisma.child.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' },
      select: {
        id:          true,
        name:        true,
        dateOfBirth: true,
        gender:      true,
        parentId:    true,
        clinicianId: true,
        createdAt:   true,
      },
    })

    res.json({ children })
  } catch (err) {
    logger.error('Failed to list children', { error: err, parentId })
    res.status(500).json({ error: 'Failed to retrieve children' })
  }
})

// ─── POST /api/children ───────────────────────────────────────────────────────
// Creates a new child for the authenticated parent.
// clinicianId is automatically set from the parent user record — it cannot
// be supplied by the client, preventing parents from self-assigning clinicians.
router.post(
  '/',
  validate([
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Child name is required (max 100 characters)'),
    body('dateOfBirth')
      .isISO8601()
      .withMessage('dateOfBirth must be a valid ISO 8601 date (e.g. 2022-03-15)')
      .custom((value: string) => {
        const dob = new Date(value)
        const now = new Date()
        // Must be in the past
        if (dob >= now) {
          throw new Error('dateOfBirth must be in the past')
        }
        // Must be within screening age range — child must be born within last 8 years
        // (this is a deliberately loose sanity bound, not the strict 5-year product
        // ceiling — that's enforced client-side in AddChildPage.tsx)
        const eightYearsAgo = new Date()
        eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8)
        if (dob < eightYearsAgo) {
          throw new Error('Child appears to be outside the supported age range (up to 8 years)')
        }
        // Floor check — previously absent server-side entirely (this comment used to
        // say "18 months minimum is enforced by the wizard, not the API", which was
        // a real gap: nothing stopped a direct API call from registering a below-floor
        // child). See docs/superpowers/specs/2026-07-18-age-floor-ceiling-consistency-design.md
        if (!isAtLeastMinimumAge(dob, MIN_AGE_MONTHS, now)) {
          throw new Error(`Child must be at least ${MIN_AGE_MONTHS} months old`)
        }
        return true
      }),
    body('gender')
      .isIn(['MALE', 'FEMALE', 'PREFER_NOT_TO_SAY'])
      .withMessage('gender must be MALE, FEMALE, or PREFER_NOT_TO_SAY'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const parentId = req.user!.sub
    const { name, dateOfBirth, gender } = req.body as {
      name:        string
      dateOfBirth: string
      gender:      string
    }

    try {
      // Fetch the parent user to inherit their clinicianId
      const parent = await prisma.user.findUnique({
        where:  { id: parentId },
        select: { clinicianId: true },
      })

      if (!parent) {
        // Should never happen — authenticateToken already verified the token
        res.status(401).json({ error: 'Parent account not found' })
        return
      }

      const child = await prisma.child.create({
        data: {
          name:        name.trim(),
          dateOfBirth: new Date(dateOfBirth),
          gender,
          parentId,
          // Auto-assign the clinician from the parent's invite-code registration.
          // This ensures every child is visible to the correct clinician without
          // requiring the parent to select one manually.
          clinicianId: parent.clinicianId ?? null,
        },
        select: {
          id:          true,
          name:        true,
          dateOfBirth: true,
          gender:      true,
          parentId:    true,
          clinicianId: true,
          createdAt:   true,
        },
      })

      logger.info('Child created', { childId: child.id, parentId, clinicianId: child.clinicianId })

      res.status(201).json({ child })
    } catch (err) {
      logger.error('Failed to create child', { error: err, parentId })
      res.status(500).json({ error: 'Failed to create child profile' })
    }
  }
)

export default router
