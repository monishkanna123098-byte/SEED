/**
 * S.E.E.D. Clinician Routes
 *
 * GET  /api/clinician/dashboard          — sessions pending review
 * GET  /api/clinician/patients           — all assigned children
 * POST /api/clinician/sessions/:id/notes — add clinical notes
 * POST /api/clinician/sessions/:id/override — override risk tier
 * PATCH /api/clinician/sessions/:id/referral — update referral status
 * POST  /api/clinician/invite-code       — generate invite code (re-exported here)
 * GET   /api/clinician/invite-codes      — list own invite codes
 */

import { Router, Request, Response } from 'express'
import { body, param } from 'express-validator'
import { UserRole, ReferralStatus, SessionStatus } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { authenticateToken, requireRole } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { logger } from '../utils/logger'

const router = Router()

router.use(authenticateToken)
router.use(requireRole(UserRole.CLINICIAN, UserRole.ADMIN))

// ─── GET /api/clinician/dashboard ─────────────────────────────────────────────
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const clinicianId = req.user!.sub

    // All complete sessions for this clinician's children, ordered by risk severity
    const sessions = await prisma.screeningSession.findMany({
      where: {
        child: { clinicianId },
        status: SessionStatus.COMPLETE,
      },
      include: {
        child: {
          select: {
            id: true, name: true, dateOfBirth: true, gender: true,
            parent: { select: { id: true, name: true, email: true } },
          },
        },
        behavioralMetrics: {
          where: { riskFlagged: true },
          select: { metricType: true, rawValue: true, normalizedScore: true },
        },
      },
      orderBy: [
        // ELEVATED first, then INDETERMINATE, then MONITOR
        { riskTier: 'desc' },
        { completedAt: 'desc' },
      ],
    })

    // Stats summary
    const elevated = sessions.filter((s) => s.riskTier === 'ELEVATED').length
    const indeterminate = sessions.filter((s) => s.riskTier === 'INDETERMINATE').length
    const monitor = sessions.filter((s) => s.riskTier === 'MONITOR').length
    const pendingReferral = sessions.filter(
      (s) => s.referralStatus === ReferralStatus.PENDING
    ).length

    res.json({
      summary: { elevated, indeterminate, monitor, pendingReferral, total: sessions.length },
      sessions,
      disclaimer:
        'Screening tool only. Not a diagnostic instrument. Clinical confirmation required.',
    })
  } catch (err) {
    logger.error('Dashboard error', { error: err })
    res.status(500).json({ error: 'Failed to load dashboard' })
  }
})

// ─── GET /api/clinician/patients ──────────────────────────────────────────────
router.get('/patients', async (req: Request, res: Response): Promise<void> => {
  try {
    const children = await prisma.child.findMany({
      where: { clinicianId: req.user!.sub },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true, status: true, riskTier: true,
            compositeScore: true, completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ children })
  } catch (err) {
    logger.error('Patients error', { error: err })
    res.status(500).json({ error: 'Failed to load patients' })
  }
})

// ─── POST /api/clinician/sessions/:id/notes ───────────────────────────────────
router.post(
  '/sessions/:id/notes',
  validate([
    param('id').isUUID(),
    body('notes')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Notes must be 1-5000 characters'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { notes } = req.body as { notes: string }

    try {
      const session = await getSessionForClinician(req.params.id, req.user!.sub)
      if (!session) {
        res.status(404).json({ error: 'Session not found or not accessible' })
        return
      }

      await prisma.screeningSession.update({
        where: { id: req.params.id },
        data: { clinicianNotes: notes },
      })

      res.json({ sessionId: req.params.id, message: 'Clinical notes saved' })
    } catch (err) {
      logger.error('Add notes error', { error: err })
      res.status(500).json({ error: 'Failed to save notes' })
    }
  }
)

// ─── POST /api/clinician/sessions/:id/override ────────────────────────────────
router.post(
  '/sessions/:id/override',
  validate([
    param('id').isUUID(),
    body('overrideTier')
      .isIn(['MONITOR', 'INDETERMINATE', 'ELEVATED'])
      .withMessage('Override tier must be MONITOR, INDETERMINATE, or ELEVATED'),
    body('reason')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Override reason required (10-2000 chars)'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { overrideTier, reason } = req.body as {
      overrideTier: 'MONITOR' | 'INDETERMINATE' | 'ELEVATED'
      reason: string
    }

    try {
      const session = await getSessionForClinician(req.params.id, req.user!.sub)
      if (!session) {
        res.status(404).json({ error: 'Session not found or not accessible' })
        return
      }

      const overrideRecord = JSON.stringify({
        originalTier: session.riskTier,
        overriddenTo: overrideTier,
        reason,
        overriddenBy: req.user!.sub,
        overriddenAt: new Date().toISOString(),
      })

      await prisma.screeningSession.update({
        where: { id: req.params.id },
        data: {
          riskTier: overrideTier,
          clinicianOverride: overrideRecord,
        },
      })

      logger.info('Risk tier overridden', {
        sessionId: req.params.id,
        clinicianId: req.user!.sub,
        from: session.riskTier,
        to: overrideTier,
      })

      res.json({
        sessionId: req.params.id,
        previousTier: session.riskTier,
        newTier: overrideTier,
        message: 'Risk tier override recorded',
        disclaimer:
          'Screening tool only. Not a diagnostic instrument. Clinical confirmation required.',
      })
    } catch (err) {
      logger.error('Override error', { error: err })
      res.status(500).json({ error: 'Failed to save override' })
    }
  }
)

// ─── PATCH /api/clinician/sessions/:id/referral ───────────────────────────────
router.patch(
  '/sessions/:id/referral',
  validate([
    param('id').isUUID(),
    body('referralStatus')
      .isIn(['NONE', 'PENDING', 'SCHEDULED', 'COMPLETE'])
      .withMessage('Invalid referral status'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { referralStatus } = req.body as { referralStatus: ReferralStatus }

    try {
      const session = await getSessionForClinician(req.params.id, req.user!.sub)
      if (!session) {
        res.status(404).json({ error: 'Session not found or not accessible' })
        return
      }

      await prisma.screeningSession.update({
        where: { id: req.params.id },
        data: { referralStatus },
      })

      res.json({ sessionId: req.params.id, referralStatus, message: 'Referral status updated' })
    } catch (err) {
      logger.error('Referral update error', { error: err })
      res.status(500).json({ error: 'Failed to update referral status' })
    }
  }
)

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getSessionForClinician(sessionId: string, clinicianId: string) {
  return prisma.screeningSession.findFirst({
    where: {
      id: sessionId,
      child: { clinicianId },
    },
    select: { id: true, riskTier: true, status: true },
  })
}

export default router
