/**
 * S.E.E.D. Analysis Service
 *
 * Orchestrates the full analysis pipeline:
 *   1. Upload video → Bull job → FastAPI /analyze/video
 *   2. Game events → FastAPI /analyze/game
 *   3. Fusion → FastAPI /analyze/fusion
 *   4. Persist results to DB (ScreeningSession + BehavioralMetrics)
 *   5. Emit socket events for real-time progress
 */

import Bull from 'bull'
import Redis from 'ioredis'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import { prisma } from '../utils/prisma'
import { io } from '../app'
import { logger } from '../utils/logger'
import { MetricType, SessionStatus } from '@prisma/client'

const ANALYSIS_URL = process.env.ANALYSIS_ENGINE_URL ?? 'http://localhost:8001'

// ─── Bull Queue ───────────────────────────────────────────────────────────────

// Bull requires three independent Redis connections (client, subscriber, bclient).
// We create a fresh ioredis instance per call from REDIS_URL.
const REDIS_URL = process.env.REDIS_URL ?? 'redis://redis:6379'
function makeBullRedis(): Redis {
  return new Redis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false })
}

export const analysisQueue = new Bull('seed-analysis', {
  createClient: (_type) => makeBullRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
})

// ─── Job types ────────────────────────────────────────────────────────────────

interface VideoAnalysisJob {
  sessionId: string
  videoPath: string
  childAgeMonths: number
  mChatScore?: number
}

interface GameAnalysisJob {
  sessionId: string
  gameEvents: unknown[]
  childAgeMonths: number
}

// ─── Progress emitter ─────────────────────────────────────────────────────────

// Spec-mandated stage strings — frontend maps these to display labels.
// Valid values: 'extracting_frames' | 'computing_gaze' | 'analyzing_game'
//             | 'running_model' | 'generating_report'
type AnalysisStage =
  | 'extracting_frames'
  | 'computing_gaze'
  | 'analyzing_game'
  | 'running_model'
  | 'generating_report'

function emitProgress(sessionId: string, jobId: string, stage: AnalysisStage, percent: number) {
  const payload = { sessionId, stage, percent, timestamp: new Date().toISOString() }
  // Emit to both rooms: job:{jobId} (normal path) and session:{sessionId} (race condition
  // fallback where socket joined before the job ID was written to the DB)
  io.to(`job:${jobId}`).to(`session:${sessionId}`).emit('analysis:progress', payload)
}

function emitStarted(sessionId: string, jobId: string) {
  const payload = { sessionId, jobId, timestamp: new Date().toISOString() }
  io.to(`job:${jobId}`).to(`session:${sessionId}`).emit('analysis:started', payload)
}

function emitComplete(sessionId: string, jobId: string, riskTier: string, score: number) {
  const payload = { sessionId, riskTier, score, timestamp: new Date().toISOString() }
  io.to(`job:${jobId}`).to(`session:${sessionId}`).emit('analysis:complete', payload)
}

function emitFailed(sessionId: string, jobId: string, error: string) {
  const payload = { sessionId, error, timestamp: new Date().toISOString() }
  io.to(`job:${jobId}`).to(`session:${sessionId}`).emit('analysis:failed', payload)
}

// ─── Video upload & queue ─────────────────────────────────────────────────────

export async function uploadVideoAndQueue(
  sessionId: string,
  videoPath: string,
  childAgeMonths: number,
  mChatScore?: number
): Promise<{ jobId: string }> {
  const job = await analysisQueue.add('video-analysis', {
    sessionId,
    videoPath,
    childAgeMonths,
    mChatScore,
  } as VideoAnalysisJob)

  // Update session status to PROCESSING
  await prisma.screeningSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.PROCESSING,
      analysisJobId: String(job.id),
    },
  })

  logger.info('Video analysis job queued', { sessionId, jobId: job.id })
  return { jobId: String(job.id) }
}

// ─── Process game data (synchronous — games are fast) ────────────────────────

export async function processGameData(
  sessionId: string,
  gameEvents: unknown[],
  childAgeMonths: number
): Promise<Record<string, unknown>> {
  logger.info('Processing game data', { sessionId, eventCount: gameEvents.length })

  const response = await axios.post(`${ANALYSIS_URL}/analyze/game`, {
    session_id: sessionId,
    child_age_months: childAgeMonths,
    game_events: gameEvents,
  })

  const gameMetrics = response.data as Record<string, unknown>
  logger.info('Game analysis complete', { sessionId })
  return gameMetrics
}

// ─── Run fusion ───────────────────────────────────────────────────────────────

export async function runFusion(
  sessionId: string,
  videoMetrics: Record<string, unknown> | null,
  gameMetrics: Record<string, unknown> | null,
  mChatAnswers: Record<string, boolean> | null,
  mChatScore: number | null,
  childAgeMonths: number,
  partial = false
): Promise<Record<string, unknown>> {
  logger.info('Running fusion', {
    sessionId,
    hasVideo: !!videoMetrics,
    hasGame: !!gameMetrics,
    hasMchat: mChatScore !== null,
  })

  const payload: Record<string, unknown> = {
    session_id: sessionId,
    child_age_months: childAgeMonths,
    mchat_score: mChatScore,
    video_metrics: videoMetrics,
    game_metrics: gameMetrics,
  }

  const response = await axios.post(`${ANALYSIS_URL}/analyze/fusion`, payload)
  const fusionResult = response.data as Record<string, unknown>

  // Persist results to database (partial=true → PARTIAL_ANALYSIS status)
  await persistAnalysisResults(sessionId, fusionResult, mChatScore, mChatAnswers, partial)

  // Emit socket event for real-time update
  const jobId = await getJobIdForSession(sessionId)
  if (jobId) {
    const riskTier = (fusionResult.final_risk_tier as string) ?? 'INDETERMINATE'
    const score = (fusionResult.composite_score as number) ?? 0
    emitComplete(sessionId, jobId, riskTier, score)
  }

  // Create in-app notification for parent
  await createResultReadyNotification(sessionId)

  return fusionResult
}

// ─── Database persistence ─────────────────────────────────────────────────────

async function persistAnalysisResults(
  sessionId: string,
  fusionResult: Record<string, unknown>,
  mChatScore: number | null,
  mChatAnswers: Record<string, boolean> | null,
  partial = false
): Promise<void> {
  const riskTierRaw = (fusionResult.final_risk_tier as string) ?? 'INDETERMINATE'
  const breakdown = fusionResult.per_metric_breakdown as Record<string, unknown> | null

  // Map analysis engine tier strings to Prisma enum
  // Note: INSUFFICIENT_DATA maps to INDETERMINATE (minimum — never clear)
  const tierMap: Record<string, 'MONITOR' | 'INDETERMINATE' | 'ELEVATED'> = {
    MONITOR_CLOSELY: 'MONITOR',
    INDETERMINATE: 'INDETERMINATE',
    ELEVATED: 'ELEVATED',
    INSUFFICIENT_DATA: 'INDETERMINATE',
  }
  const riskTier = tierMap[riskTierRaw] ?? 'INDETERMINATE'

  await prisma.screeningSession.update({
    where: { id: sessionId },
    data: {
      status: partial ? SessionStatus.PARTIAL_ANALYSIS : SessionStatus.COMPLETE,
      riskTier,
      compositeScore: (fusionResult.composite_score as number) ?? null,
      criterionAScore: (fusionResult.criterion_a as number) ?? null,
      criterionBScore: (fusionResult.criterion_b as number) ?? null,
      mChatScore: mChatScore,
      mChatRawAnswers: mChatAnswers ?? undefined,
      rawMetrics: fusionResult,
      completedAt: new Date(),
    },
  })

  // Persist per-metric BehavioralMetric records
  if (breakdown) {
    const metricScores = (breakdown as Record<string, unknown>).metric_scores as
      | Record<string, number>
      | undefined
    const metricDetails = (breakdown as Record<string, unknown>).metric_details as
      | Record<string, Record<string, unknown>>
      | undefined
    const binaryFlags = (breakdown as Record<string, unknown>).binary_flags as
      | Record<string, boolean>
      | undefined

    if (metricScores && metricDetails) {
      const metricTypeMap: Record<string, MetricType> = {
        gaze: MetricType.GAZE,
        reaction: MetricType.REACTION,
        touch: MetricType.TOUCH,
        imitation: MetricType.IMITATION,
        engagement: MetricType.ENGAGEMENT,
      }

      for (const [key, metricType] of Object.entries(metricTypeMap)) {
        const scoreKey = `${key}_score`
        const rawValue = (metricScores[scoreKey] as number) ?? 0
        const details = metricDetails[key] ?? {}
        const normalizedScore = rawValue / 10.0  // 0-10 → 0-1
        const flagKey = `${key}_flag`
        const riskFlagged = (binaryFlags?.[flagKey] as boolean) ?? false

        await prisma.behavioralMetric.create({
          data: {
            sessionId,
            metricType,
            rawValue,
            normalizedScore,
            riskFlagged,
            details: details as Record<string, unknown>,
          },
        })
      }
    }
  }

  logger.info('Analysis results persisted', { sessionId, riskTier })
}

// ─── In-app notification helpers ─────────────────────────────────────────────

async function createResultReadyNotification(sessionId: string): Promise<void> {
  try {
    // Find the parent of the child associated with this session
    const session = await prisma.screeningSession.findUnique({
      where: { id: sessionId },
      select: {
        riskTier: true,
        child: { select: { parentId: true, name: true } },
      },
    })
    if (!session?.child?.parentId) return

    const tierLabel =
      session.riskTier === 'ELEVATED'      ? 'Elevated risk' :
      session.riskTier === 'INDETERMINATE' ? 'Indeterminate' :
                                              'Monitor'

    await prisma.notification.create({
      data: {
        userId:    session.child.parentId,
        type:      'RESULT_READY',
        title:     'Screening result ready',
        body:      `${session.child.name}'s screening is complete. Result: ${tierLabel}. Your clinician will review shortly.`,
        sessionId,
      },
    })
  } catch (err) {
    // Notification failure must never break the analysis pipeline
    logger.warn('Failed to create RESULT_READY notification', { sessionId, error: err })
  }
}

export async function createReviewRequiredNotification(
  sessionId: string,
  clinicianId: string,
  childName: string
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId:    clinicianId,
        type:      'REVIEW_REQUIRED',
        title:     'Review required',
        body:      `${childName}'s screening result is ready and awaiting your clinical review.`,
        sessionId,
      },
    })
  } catch (err) {
    logger.warn('Failed to create REVIEW_REQUIRED notification', { sessionId, error: err })
  }
}

export async function createReferralScheduledNotification(
  sessionId: string,
  clinicianId: string,
  childName: string
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId:    clinicianId,
        type:      'REFERRAL_SCHEDULED',
        title:     'Referral scheduled',
        body:      `Referral for ${childName} has been scheduled. Review the session for details.`,
        sessionId,
      },
    })
  } catch (err) {
    logger.warn('Failed to create REFERRAL_SCHEDULED notification', { sessionId, error: err })
  }
}

async function getJobIdForSession(sessionId: string): Promise<string | null> {
  const session = await prisma.screeningSession.findUnique({
    where: { id: sessionId },
    select: { analysisJobId: true },
  })
  return session?.analysisJobId ?? null
}

// ─── Bull queue worker ────────────────────────────────────────────────────────

analysisQueue.process('video-analysis', async (job) => {
  const { sessionId, videoPath, childAgeMonths, mChatScore } = job.data as VideoAnalysisJob
  const jobId = String(job.id)

  logger.info('Processing video analysis job', { jobId, sessionId })

  // Emit started event before any work begins
  emitStarted(sessionId, jobId)

  let videoMetrics: Record<string, unknown> | null = null
  let videoFailed = false

  try {
    // ── Stage 1: extracting_frames ──────────────────────────────────────────
    emitProgress(sessionId, jobId, 'extracting_frames', 10)

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`)
    }

    const form = new FormData()
    form.append('session_id', sessionId)
    form.append('child_age_months', String(childAgeMonths))
    if (mChatScore !== undefined && mChatScore !== null) {
      form.append('mchat_score', String(mChatScore))
    }
    form.append('video', fs.createReadStream(videoPath), {
      filename: path.basename(videoPath),
      contentType: 'video/mp4',
    })

    // ── Stage 2: computing_gaze ─────────────────────────────────────────────
    emitProgress(sessionId, jobId, 'computing_gaze', 30)

    const videoResponse = await axios.post(`${ANALYSIS_URL}/analyze/video`, form, {
      headers: form.getHeaders(),
      maxContentLength: 150 * 1024 * 1024,
      maxBodyLength:    150 * 1024 * 1024,
      timeout: 300_000, // 5 min for long videos
    })

    videoMetrics = videoResponse.data?.raw_metrics as Record<string, unknown>
    logger.info('Video analysis complete', { sessionId })
  } catch (videoError) {
    // ── Graceful degradation: video failed — fall through to game+M-CHAT ───
    // Do NOT mark session FAILED or re-throw here. Log, flag, continue.
    const msg = videoError instanceof Error ? videoError.message : String(videoError)
    logger.warn('Video analysis failed — falling back to game+M-CHAT data only', {
      jobId, sessionId, error: msg,
    })
    videoFailed = true
    videoMetrics = null
    // Notify frontend that video stage failed but pipeline continues
    emitProgress(sessionId, jobId, 'analyzing_game', 40)
  }

  try {
    // ── Stage 3: analyzing_game ─────────────────────────────────────────────
    if (!videoFailed) emitProgress(sessionId, jobId, 'analyzing_game', 55)

    const gameSession = await prisma.gameSession.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    })

    let gameMetrics: Record<string, unknown> | null = null
    if (gameSession) {
      const gameEventsRaw = gameSession.events as unknown[]
      if (Array.isArray(gameEventsRaw) && gameEventsRaw.length >= 5) {
        const gameResponse = await processGameData(sessionId, gameEventsRaw, childAgeMonths)
        gameMetrics = (gameResponse.game_metrics as Record<string, unknown>) ?? null
      }
    }

    // ── Stage 4: running_model ──────────────────────────────────────────────
    emitProgress(sessionId, jobId, 'running_model', 75)

    const session = await prisma.screeningSession.findUnique({
      where: { id: sessionId },
      select: { mChatScore: true, mChatRawAnswers: true },
    })

    await runFusion(
      sessionId,
      videoMetrics,
      gameMetrics,
      session?.mChatRawAnswers as Record<string, boolean> | null,
      session?.mChatScore ?? mChatScore ?? null,
      childAgeMonths,
      videoFailed // pass partial flag through to persistAnalysisResults
    )

    // ── Stage 5: generating_report ──────────────────────────────────────────
    emitProgress(sessionId, jobId, 'generating_report', 95)

    logger.info('Video analysis job completed', { jobId, sessionId, partial: videoFailed })
  } catch (error) {
    // Fatal: game+fusion also failed — mark session FAILED
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Analysis pipeline failed entirely', { jobId, sessionId, error: message })

    await prisma.screeningSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.FAILED },
    })

    emitFailed(sessionId, jobId, message)
    throw error  // Re-throw for Bull retry logic
  }
})

analysisQueue.on('failed', (job, err) => {
  logger.error('Bull job failed permanently', {
    jobId: job.id,
    attemptsMade: job.attemptsMade,
    error: err.message,
  })
})

analysisQueue.on('stalled', (job) => {
  logger.warn('Bull job stalled', { jobId: job.id })
})
