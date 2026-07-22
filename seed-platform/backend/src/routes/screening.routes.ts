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
 *
 * SQL INJECTION AUDIT (2025-07-01):
 * All database operations in this file use Prisma ORM methods exclusively
 * (findUnique, findMany, create, update, findFirst). Prisma parameterizes
 * every query by default. No raw $queryRaw or $executeRaw calls exist here.
 * Adding user input directly to query strings is structurally impossible
 * with this pattern. Last audited: Stage 5A security hardening.
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
import { MIN_AGE_MONTHS, MAX_AGE_MONTHS } from '../utils/ageConstants'
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

// ─── Magic byte signatures for accepted video formats ─────────────────────────
// File MIME type and extension can be trivially spoofed by the client.
// We validate by reading the actual file header (magic bytes) after multer writes
// the file to disk, before any DB write or queue enqueue.
//
//  MP4 / MOV (QuickTime):
//    Bytes 4–7: 'ftyp' (0x66 74 79 70) — ISO Base Media file format box
//    Bytes 4–7: 'moov' (0x6D 6F 6F 76) — older QuickTime variant
//    Bytes 4–7: 'free' (0x66 72 65 65) — rare QuickTime freeform box
//    Bytes 4–7: 'wide' (0x77 69 64 65) — rare QuickTime wide box
//    Bytes 0–3: 0x00 00 00 xx (size prefix before box type) — so we check offset 4
//  WebM:
//    Bytes 0–3: 0x1A 45 DF A3 (EBML header)

type MagicSignature = { offset: number; bytes: number[] }

const VIDEO_MAGIC: MagicSignature[] = [
  // ISO Base Media (MP4, M4V, MOV 'ftyp' box)
  { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // 'ftyp'
  // QuickTime older variants
  { offset: 4, bytes: [0x6D, 0x6F, 0x6F, 0x76] }, // 'moov'
  { offset: 4, bytes: [0x66, 0x72, 0x65, 0x65] }, // 'free'
  { offset: 4, bytes: [0x77, 0x69, 0x64, 0x65] }, // 'wide'
  // WebM / MKV (EBML)
  { offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3] },
]

async function isValidVideoMagicBytes(filePath: string): Promise<boolean> {
  // Read first 12 bytes — enough to cover offset-4 signatures
  const buf = Buffer.alloc(12)
  let fd: number | undefined
  try {
    fd = fs.openSync(filePath, 'r')
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0)
    if (bytesRead < 8) return false // file too small to be a valid video
  } catch {
    return false
  } finally {
    if (fd !== undefined) fs.closeSync(fd)
  }

  return VIDEO_MAGIC.some(({ offset, bytes }) =>
    bytes.every((b, i) => buf[offset + i] === b)
  )
}

const videoUpload = multer({
  storage: videoStorage,
  // Enforce 100MB hard cap. The declared MIME type is NOT checked here —
  // client-declared MIME is trivially spoofable. Magic byte validation runs
  // in the route handler after the file lands on disk.
  limits: { fileSize: 100 * 1024 * 1024 },
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
export const uploadVideoValidators = [
  body('sessionId').isUUID().withMessage('Valid session ID required'),
  body('childAgeMonths')
    .isInt({ min: MIN_AGE_MONTHS, max: MAX_AGE_MONTHS })
    .withMessage(`childAgeMonths must be an integer between ${MIN_AGE_MONTHS} and ${MAX_AGE_MONTHS}`),
]

router.post(
  '/upload-video',
  videoUpload.single('video'),
  // express-validator for body fields (multer populates req.body from multipart)
  validate(uploadVideoValidators),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' })
      return
    }

    const { sessionId } = req.body as { sessionId: string; childAgeMonths: string }
    const ageMonths = parseInt((req.body as { childAgeMonths: string }).childAgeMonths, 10)

    // ── Magic byte validation ────────────────────────────────────────────────
    // Client-declared MIME type (req.file.mimetype) is trivially spoofable.
    // Read the actual file header and reject if it doesn't match a known video
    // signature. Delete the file before returning to prevent storage accumulation.
    const validVideo = await isValidVideoMagicBytes(req.file.path)
    if (!validVideo) {
      fs.unlink(req.file.path, () => {}) // async cleanup, error non-fatal
      logger.warn('Video upload rejected — invalid magic bytes', {
        sessionId,
        declaredMime: req.file.mimetype,
        filename: req.file.filename,
        userId: req.user!.sub,
      })
      res.status(415).json({
        error: 'File rejected. Only MP4, WebM, and MOV video formats are accepted.',
      })
      return
    }

    try {
      const session = await prisma.screeningSession.findUnique({
        where: { id: sessionId },
        include: { child: true },
      })

      if (!session) {
        fs.unlink(req.file.path, () => {})
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
      // Clean up uploaded file on any downstream error
      if (req.file) fs.unlink(req.file.path, () => {})
      logger.error('Video upload error', { error: err, sessionId })
      res.status(500).json({ error: 'Failed to queue video analysis' })
    }
  }
)

// ─── POST /api/screening/game-complete ────────────────────────────────────────
export const gameCompleteValidators = [
  body('sessionId').isUUID().withMessage('Valid session ID required'),
  body('gameModuleId').notEmpty().withMessage('gameModuleId required'),
  body('events').isArray({ min: 1 }).withMessage('events array required'),
  body('childAgeMonths').isInt({ min: MIN_AGE_MONTHS, max: MAX_AGE_MONTHS }).withMessage(`Age ${MIN_AGE_MONTHS}-${MAX_AGE_MONTHS} months required`),
  body('ageGroup').notEmpty().withMessage('ageGroup required'),
  body('completionRate').isFloat({ min: 0, max: 1 }).withMessage('completionRate 0-1'),
  body('touchPrecisionScore').isFloat({ min: 0, max: 1 }),
  body('reactionLatencyMean').isFloat({ min: 0 }),
  body('imitationAccuracy').isFloat({ min: 0, max: 1 }),
  body('rigidityScore').isFloat({ min: 0, max: 1 }),
  body('disengagementCount').isInt({ min: 0 }),
]

router.post(
  '/game-complete',
  validate(gameCompleteValidators),
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
