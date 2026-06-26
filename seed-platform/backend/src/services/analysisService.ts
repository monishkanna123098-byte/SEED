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
import { MetricType, ReferralStatus, SessionStatus } from '@prisma/client'

const ANALYSIS_URL = process.env.ANALYSIS_ENGINE_URL ?? 'http://localhost:8001'

// ─── Bull Queue ───────────────────────────────────────────────────────────────
//
// Bull requires three independent Redis connections (client, subscriber, bclient).
// subscriber enters pub/sub mode and bclient issues blocking commands — neither
// can share a connection. We create a fresh ioredis instance per call from
// REDIS_URL so all three respect the same env-driven config without interference.
//
// Default fallback targets the 'redis' Docker service name on port 6379.

const REDIS_URL = process.env.REDIS_URL ?? 'redis://redis:6379'

function makeBullRedis(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // required for Bull blocking clients
    enableReadyCheck: false,
  })
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

function emitProgress(
  sessionId: string,
  jobId: string,
  stage: string,
  progress: number,
  data?: Record<string, unknown>
) {
  io.to(`job:${jobId}`).emit('analysis:progress', {
    sessionId,
    jobId,
    stage,
    progress,  // 0-100
    ...data,
    timestamp: new Date().toISOString(),
  })
}

function emitComplete(sessionId: string, jobId: string, result: Record<string, unknown>) {
  io.to(`job:${jobId}`).emit('analysis:complete', {
    sessionId,
    jobId,
    result,
    disclaimer:
      'Screening tool only. Not a diagnostic instrument. Clinical confirmation required.',
    timestamp: new Date().toISOString(),
  })
}

function emitError(sessionId: string, jobId: string, error: string) {
  io.to(`job:${jobId}`).emit('analysis:error', {
    sessionId,
    jobId,
    error,
    timestamp: new Date().toISOString(),
  })
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
  childAgeMonths: number
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

  // Persist results to database
  await persistAnalysisResults(sessionId, fusionResult, mChatScore, mChatAnswers)

  // Emit socket event for real-time update
  const jobId = await getJobIdForSession(sessionId)
  if (jobId) {
    emitComplete(sessionId, jobId, fusionResult)
  }

  return fusionResult
}

// ─── Database persistence ─────────────────────────────────────────────────────

async function persistAnalysisResults(
  sessionId: string,
  fusionResult: Record<string, unknown>,
  mChatScore: number | null,
  mChatAnswers: Record<string, boolean> | null
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
      status: SessionStatus.COMPLETE,
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

  try {
    // Stage 1: Send video to FastAPI
    emitProgress(sessionId, jobId, 'video_processing', 10)

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

    emitProgress(sessionId, jobId, 'extracting_landmarks', 30)

    const videoResponse = await axios.post(`${ANALYSIS_URL}/analyze/video`, form, {
      headers: form.getHeaders(),
      maxContentLength: 150 * 1024 * 1024, // 150MB
      maxBodyLength: 150 * 1024 * 1024,
      timeout: 300_000, // 5 min timeout for long videos
    })

    const videoMetrics = videoResponse.data?.raw_metrics as Record<string, unknown>
    emitProgress(sessionId, jobId, 'computing_features', 60)

    // Stage 2: Retrieve game session if available
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

    // Stage 3: Fusion
    emitProgress(sessionId, jobId, 'fusion_scoring', 80)

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
      childAgeMonths
    )

    emitProgress(sessionId, jobId, 'complete', 100)
    logger.info('Video analysis job completed', { jobId, sessionId })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Video analysis job failed', { jobId, sessionId, error: message })

    await prisma.screeningSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.FAILED },
    })

    emitError(sessionId, jobId, message)
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
