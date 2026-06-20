/**
 * S.E.E.D. Screening Routes
 *
 * POST /api/screening/start
 * POST /api/screening/mchat
 * POST /api/screening/upload-video
 * POST /api/screening/game-complete
 * GET  /api/screening/:id/status
 * GET  /api/screening/:id/results
 * GET  /api/screening/history/:childId
 */

import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { body, param } from 'express-validator'
import { SessionType, SessionStatus, UserRole } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { authenticateToken, requireRole } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { logger } from '../utils/logger'
import {
  uploadVideoAndQueue,
  processGameData,
  runFusion,
} from '../services/analysisService'

const router = Router()

// ─── Multer config — video uploads ────────────────────────────────────────────
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4'
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `video-${unique}${ext}`)
  },
})

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Invalid video type: ${file.mimetype}. Accepted: mp4, webm, mov`))
    }
  },
})

// ─── All screening routes require auth ────────────────────────────────────────
router.use(authenticateToken)

// ─── POST /api/screening/start ────────────────────────────────────────────────
router.post(
  '/start',
  validate([
    body('childId').isUUID().withMessage('Valid child ID required'),
    body('sessionType')
      .isIn(['VIDEO', 'GAME', 'COMBINED'])
      .withMessage('sessionType must be VIDEO, GAME, or COMBINED'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { childId, sessionType } = req.body as {
      childId: string
      sessionType: SessionType
    }

    try {
      // Verify caller has access to this child
      const child = await prisma.child.findUnique({ where: { id: childId } })
      if (!child) {
        res.status(404).json({ error: 'Child not found' })
        return
      }

      const isParent = req.user!.role === UserRole.PARENT && child.parentId === req.user!.sub
      const isClinician =
        req.user!.role === UserRole.CLINICIAN && child.clinicianId === req.user!.sub
      const isAdmin = req.user!.role === UserRole.ADMIN

      if (!isParent && !isClinician && !isAdmin) {
        res.status(403).json({ error: 'Not authorized to screen this child' })
        return
      }

      const session = await prisma.screeningSession.create({
        data: {
          childId,
          sessionType,
          status: SessionStatus.PENDING,
        },
      })

      res.status(201).json({
        sessionId: session.id,
        status: session.status,
        sessionType: session.sessionType,
        createdAt: session.createdAt,
      })
    } catch (err) {
      logger.error('Start session error', { error: err })
      res.status(500).json({ error: 'Failed to start screening session' })
    }
  }
)

// ─── POST /api/screening/mchat ────────────────────────────────────────────────
router.post(
  '/mchat',
  validate([
    body('sessionId').isUUID().withMessage('Valid session ID required'),
    body('answers')
      .isObject()
      .withMessage('answers must be a JSON object of question:boolean pairs'),
    body('score')
      .isFloat({ min: 0, max: 20 })
      .withMessage('M-CHAT score must be 0-20'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId, answers, score } = req.body as {
      sessionId: string
      answers: Record<string, boolean>
      score: number
    }

    try {
      const session = await prisma.screeningSession.findUnique({
        where: { id: sessionId },
        include: { child: true },
      })

      if (!session) {
        res.status(404).json({ error: 'Session not found' })
        return
      }

      await verifySessionAccess(req.user!.sub, req.user!.role, session.child)

      await prisma.screeningSession.update({
        where: { id: sessionId },
        data: {
          mChatScore: score,
          mChatRawAnswers: answers,
        },
      })

      res.json({
        sessionId,
        mChatScore: score,
        message: 'M-CHAT answers saved',
        disclaimer:
          'Screening tool only. Not a diagnostic instrument. Clinical confirmation required.',
      })
    } catch (err) {
      logger.error('M-CHAT save error', { error: err })
      res.status(500).json({ error: 'Failed to save M-CHAT answers' })
    }
  }
)

// ─── POST /api/screening/upload-video ─────────────────────────────────────────
router.post(
  '/upload-video',
  videoUpload.single('video'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' })
      return
    }

    const { sessionId, childAgeMonths } = req.body as {
      sessionId: string
      childAgeMonths: string
    }

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId required' })
      return
    }

    const ageMonths = parseInt(childAgeMonths ?? '36', 10)
    if (isNaN(ageMonths) || ageMonths < 24 || ageMonths > 60) {
      res.status(400).json({ error: 'childAgeMonths must be 24-60' })
      return
    }

    try {
      const session = await prisma.screeningSession.findUnique({
        where: { id: sessionId },
        include: { child: true },
      })

      if (!session) {
        res.status(404).json({ error: 'Session not found' })
        return
      }

      await verifySessionAccess(req.user!.sub, req.user!.role, session.child)

      // Save video path to session
      await prisma.screeningSession.update({
        where: { id: sessionId },
        data: { videoPath: req.file.path },
      })

      // Queue async analysis
      const { jobId } = await uploadVideoAndQueue(
        sessionId,
        req.file.path,
        ageMonths,
        session.mChatScore ?? undefined
      )

      res.status(202).json({
        sessionId,
        jobId,
        message: 'Video received. Analysis queued.',
        status: 'PROCESSING',
        disclaimer:
          'Screening tool only. Not a diagnostic instrument. Clinical confirmation required.',
      })
    } catch (err) {
      logger.error('Video upload error', { error: err, sessionId })
      res.status(500).json({ error: 'Failed to queue video analysis' })
    }
  }
)

// ─── POST /api/screening/game-complete ────────────────────────────────────────
router.post(
  '/game-complete',
  validate([
    body('sessionId').isUUID().withMessage('Valid session ID required'),
    body('gameModuleId').notEmpty().withMessage('gameModuleId required'),
    body('events').isArray({ min: 1 }).withMessage('events array required'),
    body('childAgeMonths').isInt({ min: 24, max: 60 }).withMessage('Age 24-60 months required'),
    body('ageGroup').notEmpty().withMessage('ageGroup required'),
    body('completionRate').isFloat({ min: 0, max: 1 }).withMessage('completionRate 0-1'),
    body('touchPrecisionScore').isFloat({ min: 0, max: 1 }),
    body('reactionLatencyMean').isFloat({ min: 0 }),
    body('imitationAccuracy').isFloat({ min: 0, max: 1 }),
    body('rigidityScore').isFloat({ min: 0, max: 1 }),
    body('disengagementCount').isInt({ min: 0 }),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const {
      sessionId,
      gameModuleId,
      events,
      childAgeMonths,
      ageGroup,
      completionRate,
      touchPrecisionScore,
      reactionLatencyMean,
      imitationAccuracy,
      rigidityScore,
      disengagementCount,
    } = req.body as {
      sessionId: string
      gameModuleId: string
      events: unknown[]
      childAgeMonths: number
      ageGroup: string
      completionRate: number
      touchPrecisionScore: number
      reactionLatencyMean: number
      imitationAccuracy: number
      rigidityScore: number
      disengagementCount: number
    }

    try {
      const session = await prisma.screeningSession.findUnique({
        where: { id: sessionId },
        include: { child: true },
      })

      if (!session) {
        res.status(404).json({ error: 'Session not found' })
        return
      }

      await verifySessionAccess(req.user!.sub, req.user!.role, session.child)

      // Save game session to DB
      const gameSession = await prisma.gameSession.create({
        data: {
          sessionId,
          childId: session.childId,
          gameModuleId,
          ageGroup,
          events: events as object[],
          completionRate,
          touchPrecisionScore,
          reactionLatencyMean,
          imitationAccuracy,
          rigidityScore,
          disengagementCount,
        },
      })

      // If no video is pending, run game-only analysis immediately
      const isVideoSession =
        session.sessionType === 'VIDEO' || session.sessionType === 'COMBINED'
      const isProcessing = session.status === SessionStatus.PROCESSING

      if (!isVideoSession || !isProcessing) {
        // Game-only or final module in combined: run fusion now
        const gameMetricsResult = await processGameData(
          sessionId,
          events,
          childAgeMonths
        )
        const gameMetrics = (gameMetricsResult.game_metrics as Record<string, unknown>) ?? null

        const updatedSession = await prisma.screeningSession.findUnique({
          where: { id: sessionId },
          select: { mChatScore: true, mChatRawAnswers: true },
        })

        await runFusion(
          sessionId,
          null,
          gameMetrics,
          updatedSession?.mChatRawAnswers as Record<string, boolean> | null,
          updatedSession?.mChatScore ?? null,
          childAgeMonths
        )
      }

      res.status(201).json({
        gameSessionId: gameSession.id,
        sessionId,
        message: 'Game session saved',
      })
    } catch (err) {
      logger.error('Game complete error', { error: err, sessionId })
      res.status(500).json({ error: 'Failed to process game session' })
    }
  }
)

// ─── GET /api/screening/:id/status ────────────────────────────────────────────
router.get(
  '/:id/status',
  validate([param('id').isUUID()]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await prisma.screeningSession.findUnique({
        where: { id: req.params.id },
        include: { child: true },
        select: {
          id: true,
          status: true,
          sessionType: true,
          riskTier: true,
          analysisJobId: true,
          createdAt: true,
          completedAt: true,
          child: {
            select: { id: true, name: true, parentId: true, clinicianId: true },
          },
        },
      })

      if (!session) {
        res.status(404).json({ error: 'Session not found' })
        return
      }

      await verifySessionAccess(req.user!.sub, req.user!.role, session.child)

      res.json({ session })
    } catch (err) {
      logger.error('Get status error', { error: err })
      res.status(500).json({ error: 'Failed to fetch session status' })
    }
  }
)

// ─── GET /api/screening/:id/results ───────────────────────────────────────────
router.get(
  '/:id/results',
  validate([param('id').isUUID()]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await prisma.screeningSession.findUnique({
        where: { id: req.params.id },
        include: {
          child: true,
          behavioralMetrics: { orderBy: { timestamp: 'desc' } },
          gameSessions: { orderBy: { createdAt: 'desc' } },
        },
      })

      if (!session) {
        res.status(404).json({ error: 'Session not found' })
        return
      }

      await verifySessionAccess(req.user!.sub, req.user!.role, session.child)

      if (session.status !== SessionStatus.COMPLETE) {
        res.json({
          sessionId: session.id,
          status: session.status,
          message: 'Analysis not yet complete',
          disclaimer:
            'Screening tool only. Not a diagnostic instrument. Clinical confirmation required.',
        })
        return
      }

      res.json({
        sessionId: session.id,
        status: session.status,
        sessionType: session.sessionType,
        riskTier: session.riskTier,
        compositeScore: session.compositeScore,
        criterionAScore: session.criterionAScore,
        criterionBScore: session.criterionBScore,
        mChatScore: session.mChatScore,
        clinicianNotes: session.clinicianNotes,
        clinicianOverride: session.clinicianOverride,
        referralStatus: session.referralStatus,
        behavioralMetrics: session.behavioralMetrics,
        rawMetrics: session.rawMetrics,
        completedAt: session.completedAt,
        disclaimer:
          'Screening tool only. Not a diagnostic instrument. Clinical confirmation required.',
      })
    } catch (err) {
      logger.error('Get results error', { error: err })
      res.status(500).json({ error: 'Failed to fetch session results' })
    }
  }
)

// ─── GET /api/screening/history/:childId ──────────────────────────────────────
router.get(
  '/history/:childId',
  validate([param('childId').isUUID()]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const child = await prisma.child.findUnique({ where: { id: req.params.childId } })
      if (!child) {
        res.status(404).json({ error: 'Child not found' })
        return
      }

      await verifySessionAccess(req.user!.sub, req.user!.role, child)

      const sessions = await prisma.screeningSession.findMany({
        where: { childId: req.params.childId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sessionType: true,
          status: true,
          riskTier: true,
          compositeScore: true,
          criterionAScore: true,
          criterionBScore: true,
          mChatScore: true,
          referralStatus: true,
          createdAt: true,
          completedAt: true,
        },
      })

      res.json({
        childId: req.params.childId,
        sessions,
        disclaimer:
          'Screening tool only. Not a diagnostic instrument. Clinical confirmation required.',
      })
    } catch (err) {
      logger.error('Get history error', { error: err })
      res.status(500).json({ error: 'Failed to fetch screening history' })
    }
  }
)

// ─── Access control helper ────────────────────────────────────────────────────

async function verifySessionAccess(
  userId: string,
  role: UserRole,
  child: { parentId: string; clinicianId: string | null }
): Promise<void> {
  if (role === UserRole.ADMIN) return
  if (role === UserRole.PARENT && child.parentId === userId) return
  if (role === UserRole.CLINICIAN && child.clinicianId === userId) return
  throw Object.assign(new Error('Not authorized to access this session'), { status: 403 })
}

export default router
