/**
 * Step 5 — Processing Screen
 *
 * Shows animated progress while the backend analyses the screening data.
 * Primary: Socket.io events from the backend ('analysis:progress',
 *           'analysis:complete', 'analysis:error').
 * Fallback: timed stage simulation + polling /api/screening/:id/status
 *           (used in demo mode or when Socket.io is unavailable).
 *
 * Back navigation is blocked unconditionally while processing runs.
 * Cleanup: socket is disconnected and all timers are cleared on unmount.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useBlocker } from 'react-router-dom'
import { motion } from 'framer-motion'
import { io, Socket } from 'socket.io-client'
import { api } from '@/utils/api'
import { WizardState, ScreeningModality } from './NewScreeningPage'

// ─── Stage definitions ───────────────────────────────────────────────────────
// Backend stage string → display label + order index.
// Must stay in sync with AnalysisStage type in analysisService.ts.

type AnalysisStage =
  | 'extracting_frames'
  | 'computing_gaze'
  | 'analyzing_game'
  | 'running_model'
  | 'generating_report'

const STAGE_LABEL: Record<AnalysisStage, string> = {
  extracting_frames:  'Extracting video frames...',
  computing_gaze:     'Analyzing gaze patterns...',
  analyzing_game:     'Processing game responses...',
  running_model:      'Running analysis model...',
  generating_report:  'Generating your report...',
}

// Ordered list for progress display
const STAGE_ORDER: AnalysisStage[] = [
  'extracting_frames',
  'computing_gaze',
  'analyzing_game',
  'running_model',
  'generating_report',
]

function buildStages(modality: ScreeningModality | null): string[] {
  const stages: string[] = []
  if (modality === 'VIDEO' || modality === 'BOTH') {
    stages.push('Extracting video frames...')
    stages.push('Analyzing gaze patterns...')
  }
  if (modality === 'GAME' || modality === 'BOTH') {
    stages.push('Processing game responses...')
  }
  stages.push('Calculating behavioral scores...')
  stages.push('Running analysis model...')
  stages.push('Generating your report...')
  return stages
}

// ─── Animated SEED logo ───────────────────────────────────────────────────────

function PulsingSeedLogo() {
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      className="flex items-center gap-1 select-none"
    >
      {['S', 'E', 'E', 'D'].map((letter, i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.18,
            ease: 'easeInOut',
          }}
          className="text-4xl font-extrabold text-seed-navy leading-none"
        >
          {letter}
          {i < 3 && (
            <span className="text-seed-mint">.</span>
          )}
        </motion.span>
      ))}
    </motion.div>
  )
}

// ─── Poll constants ───────────────────────────────────────────────────────────

const POLL_INTERVAL_MS  = 4000
const MAX_POLL_ATTEMPTS = 25    // ~100 s before we show an error
// Milliseconds between simulated stage advances (demo mode)
const STAGE_ADVANCE_MS  = 7000

// ─── Component ────────────────────────────────────────────────────────────────

interface Step5Props {
  state: WizardState
  onNext: (updates?: Partial<WizardState>) => void
}

export function Step5_Processing({ state, onNext }: Step5Props) {
  const stages = buildStages(state.modality)
  const [currentStageIdx, setCurrentStageIdx] = useState(0)
  const [done, setDone]                         = useState(false)
  const [error, setError]                       = useState<string | null>(null)

  const socketRef   = useRef<Socket | null>(null)
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const pollCount   = useRef(0)
  const advancedRef = useRef(false)  // guard: only call onNext once

  const advance = useCallback(() => {
    if (advancedRef.current) return
    advancedRef.current = true
    setDone(true)
    // Brief "complete" pause so the user sees the filled bar
    setTimeout(() => onNext(), 900)
  }, [onNext])

  // ── Block back navigation ────────────────────────────────────────────────────
  // useBlocker covers React Router navigation
  useBlocker(() => true)

  // popstate covers browser back button
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const guard = () => window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', guard)
    return () => window.removeEventListener('popstate', guard)
  }, [])

  // ── Socket.io + polling + stage simulation ────────────────────────────────
  useEffect(() => {
    const sessionId = state.sessionId
    if (!sessionId) {
      // No session in demo mode — just simulate and advance
      scheduleSimulation()
      return cleanup
    }

    // ── Socket.io (primary) ────────────────────────────────────────────────
    const wsBase = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
    const socket = io(wsBase, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join-session', sessionId)
    })

    socket.on('analysis:started', () => {
      setCurrentStageIdx(0)
    })

    socket.on('analysis:progress', (data: { stage?: AnalysisStage; percent?: number }) => {
      if (data.stage && Object.prototype.hasOwnProperty.call(STAGE_LABEL, data.stage)) {
        // Map spec stage string to display index
        const idx = STAGE_ORDER.indexOf(data.stage)
        if (idx >= 0) setCurrentStageIdx(idx)
      }
    })

    socket.on('analysis:complete', (data: { riskTier?: string; score?: number }) => {
      // Store result payload in wizard state so Step 6 can use it without a re-fetch
      advance({ riskTierFromSocket: data.riskTier, scoreFromSocket: data.score })
    })

    // analysis:failed is the spec event name (not analysis:error)
    socket.on('analysis:failed', (data: { error?: string }) => {
      setError(data.error ?? 'Analysis failed. Please try again.')
    })

    // Keep legacy analysis:error listener for backward compatibility during deploy
    socket.on('analysis:error', (data: { error?: string }) => {
      setError(data.error ?? 'Analysis failed. Please try again.')
    })

    socket.on('connect_error', () => {
      // Socket.io unavailable — rely on simulation + polling
    })

    // ── Timed stage simulation (runs in parallel as visual fallback) ─────────
    scheduleSimulation()

    // ── Polling (secondary) ──────────────────────────────────────────────────
    pollRef.current = setInterval(async () => {
      pollCount.current++
      if (pollCount.current > MAX_POLL_ATTEMPTS) {
        clearInterval(pollRef.current!)
        setError('Processing is taking longer than expected. Please check back later.')
        return
      }
      try {
        const { data } = await api.get<{ session: { status: string } }>(
          `/screening/${sessionId}/status`
        )
        const status = data.session.status
        if (status === 'COMPLETE' || status === 'PARTIAL_ANALYSIS' || status === 'FAILED') {
          clearInterval(pollRef.current!)
          if (status === 'COMPLETE' || status === 'PARTIAL_ANALYSIS') advance()
          else setError('Analysis failed. Please return to the dashboard.')
        }
      } catch { /* network error in poll — keep trying */ }
    }, POLL_INTERVAL_MS)

    return cleanup

    function scheduleSimulation() {
      stages.forEach((_, i) => {
        stageTimers.current.push(
          setTimeout(() => setCurrentStageIdx(i), i * STAGE_ADVANCE_MS + 800)
        )
      })
      // Demo mode: auto-complete after all stages played
      if (!sessionId) {
        stageTimers.current.push(
          setTimeout(advance, (stages.length + 1) * STAGE_ADVANCE_MS)
        )
      }
    }

    function cleanup() {
      socket.disconnect()
      if (pollRef.current) clearInterval(pollRef.current)
      stageTimers.current.forEach(clearTimeout)
      stageTimers.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progressPct = done ? 100 : ((currentStageIdx + 1) / stages.length) * 95

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="seed-card max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth={1.8}
              className="w-7 h-7">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="font-bold text-seed-dark mb-2">Processing error</h2>
          <p className="text-sm text-seed-muted mb-5">{error}</p>
          <a href="/parent/dashboard" className="seed-btn-secondary w-full block text-center">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // ── Processing state ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-12
                    max-w-lg mx-auto w-full">
      <PulsingSeedLogo />

      {/* Stage list */}
      <div className="w-full space-y-2.5">
        {stages.map((stage, i) => {
          const isActive    = i === currentStageIdx && !done
          const isCompleted = i < currentStageIdx || done

          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: isActive || isCompleted ? 1 : 0.3 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3"
            >
              {/* Status icon */}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted
                  ? 'bg-seed-mint'
                  : isActive
                  ? 'bg-seed-teal'
                  : 'bg-slate-200'
              }`}>
                {isCompleted ? (
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                    <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth={2}
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isActive ? (
                  <motion.div
                    animate={{ scale: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-white"
                  />
                ) : null}
              </div>

              {/* Stage text */}
              <span className={`text-sm font-medium ${
                isActive    ? 'text-seed-dark' :
                isCompleted ? 'text-seed-teal' :
                              'text-slate-400'
              }`}>
                {stage}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-seed-teal rounded-full"
            initial={{ width: '4%' }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-seed-muted text-center mt-3">
          This usually takes 1–2 minutes
        </p>
      </div>
    </div>
  )
}
