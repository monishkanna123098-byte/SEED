/**
 * S.E.E.D. — Buddy's World
 * BuddysWorld.tsx
 *
 * React wrapper for the Phaser game:
 *   1. Age selection (3-4 years / 4-5 years)
 *   2. Parent instructions ("let your child play naturally...")
 *   3. Fullscreen Phaser canvas
 *   4. POST completion payload to /api/screening/game-complete
 *   5. Poll session status, hand off once analysis is ready (or bounded)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, extractApiError } from '@/utils/api'
import { Disclaimer } from '@/components/Disclaimer'
import { SEEDLogo } from '@/components/SEEDLogo'
import { createBuddysWorldGame, destroyBuddysWorldGame } from './PhaserGame'
import { GameCompletionPayload } from './analytics/EventCollector'
import type Phaser from 'phaser'

type Step = 'age-select' | 'instructions' | 'playing' | 'submitting' | 'waiting' | 'done' | 'error'

interface BuddysWorldProps {
  /** Existing ScreeningSession id (created via POST /api/screening/start). */
  sessionId: string
  /** Called once the game-complete POST has been accepted and either
   *  results are ready or polling has reached its bound. The parent
   *  page owns subsequent navigation / further waiting UI. */
  onFinished?: (sessionId: string) => void
  /** Optional escape hatch before the game starts. */
  onCancel?: () => void
}

const AGE_OPTIONS: Array<{ label: string; sublabel: string; ageMonths: number; emoji: string }> = [
  { label: '3–4 years', sublabel: 'Younger group', ageMonths: 42, emoji: '🧒' },
  { label: '4–5 years', sublabel: 'Older group', ageMonths: 54, emoji: '🧑' },
]

const MAX_POLL_ATTEMPTS = 15
const POLL_INTERVAL_MS = 2000

export const BuddysWorld: React.FC<BuddysWorldProps> = ({ sessionId, onFinished, onCancel }) => {
  const [step, setStep] = useState<Step>('age-select')
  const [ageMonths, setAgeMonths] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Step 1: age selection ───────────────────────────────────────────────────
  function selectAge(months: number) {
    setAgeMonths(months)
    setStep('instructions')
  }

  // ── Step 2 → 3: instructions → fullscreen + Phaser mount ────────────────────
  const beginGame = useCallback(async () => {
    if (ageMonths === null) return

    try {
      await containerRef.current?.requestFullscreen?.()
    } catch {
      // Fullscreen may be blocked (e.g. iOS Safari) — proceed regardless.
    }

    setStep('playing')
  }, [ageMonths])

  // Mount Phaser once we enter 'playing' and the container is in the DOM
  useEffect(() => {
    if (step !== 'playing' || ageMonths === null || !containerRef.current) return
    if (gameRef.current) return // already mounted

    gameRef.current = createBuddysWorldGame({
      parent: containerRef.current,
      sessionId,
      ageMonths,
      onGameComplete: (payload) => {
        void handleGameComplete(payload)
      },
    })

    return () => {
      if (gameRef.current) {
        destroyBuddysWorldGame(gameRef.current)
        gameRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, ageMonths, sessionId])

  // ── Step 4: completion → exit fullscreen → submit ───────────────────────────
  async function handleGameComplete(payload: GameCompletionPayload) {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        // ignore
      }
    }

    setStep('submitting')

    try {
      await api.post('/screening/game-complete', {
        sessionId: payload.sessionId,
        gameModuleId: payload.gameModuleId,
        events: payload.events,
        childAgeMonths: payload.childAgeMonths,
        ageGroup: payload.ageGroup,
        completionRate: payload.completionRate,
        touchPrecisionScore: payload.touchPrecisionScore,
        reactionLatencyMean: payload.reactionLatencyMean,
        imitationAccuracy: payload.imitationAccuracy,
        rigidityScore: payload.rigidityScore,
        disengagementCount: payload.disengagementCount,
      })

      setStep('waiting')
    } catch (err) {
      setError(extractApiError(err))
      setStep('error')
    }
  }

  // ── Step 5: poll for analysis completion ────────────────────────────────────
  useEffect(() => {
    if (step !== 'waiting') return

    let cancelled = false
    let attempts = 0

    const poll = async () => {
      try {
        const res = await api.get<{ session: { status: string } }>(`/screening/${sessionId}/status`)
        if (cancelled) return

        const status = res.data.session.status
        if (status === 'COMPLETE' || status === 'FAILED') {
          setStep('done')
          onFinished?.(sessionId)
          return
        }

        attempts++
        if (attempts >= MAX_POLL_ATTEMPTS) {
          // Bounded wait reached — likely a COMBINED session still
          // processing video. Hand off to the parent page.
          setStep('done')
          onFinished?.(sessionId)
          return
        }

        pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return
        setError(extractApiError(err))
        setStep('error')
      }
    }

    poll()

    return () => {
      cancelled = true
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [step, sessionId, onFinished])

  // Cleanup: exit fullscreen on unmount
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      if (gameRef.current) {
        destroyBuddysWorldGame(gameRef.current)
        gameRef.current = null
      }
    }
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────────

  if (step === 'playing') {
    return (
      <div className="fixed inset-0 bg-seed-ice z-50">
        <div ref={containerRef} className="w-full h-full flex items-center justify-center" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-seed-ice flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <SEEDLogo size="md" showTagline={false} />
          </div>

          <AnimatePresence mode="wait">
            {step === 'age-select' && (
              <motion.div
                key="age-select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="seed-card"
              >
                <h1 className="text-xl font-bold text-seed-dark text-center mb-1">
                  Buddy's World
                </h1>
                <p className="text-seed-muted text-sm text-center mb-6">
                  How old is your child?
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {AGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.ageMonths}
                      onClick={() => selectAge(opt.ageMonths)}
                      className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-seed-muted/20
                                 hover:border-seed-teal hover:bg-seed-teal/5 transition-all duration-200
                                 focus-visible:ring-2 focus-visible:ring-seed-teal focus-visible:ring-offset-2"
                    >
                      <span className="text-4xl">{opt.emoji}</span>
                      <span className="font-bold text-seed-dark">{opt.label}</span>
                      <span className="text-xs text-seed-muted">{opt.sublabel}</span>
                    </button>
                  ))}
                </div>

                {onCancel && (
                  <button onClick={onCancel} className="seed-btn-secondary w-full mt-5">
                    Not now
                  </button>
                )}
              </motion.div>
            )}

            {step === 'instructions' && (
              <motion.div
                key="instructions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="seed-card"
              >
                <div className="text-center mb-5">
                  <div className="text-5xl mb-3">🌟</div>
                  <h1 className="text-xl font-bold text-seed-dark mb-2">Before you begin</h1>
                </div>

                <div className="bg-seed-teal/5 border border-seed-teal/20 rounded-xl px-5 py-4 mb-5">
                  <p className="text-seed-dark text-base leading-relaxed text-center">
                    Let your child play this game naturally.
                    <br />
                    <strong>Do not guide them.</strong>
                    <br />
                    The game will take about 8–10 minutes.
                  </p>
                </div>

                <ul className="space-y-2 mb-6 text-sm text-seed-muted">
                  <li className="flex items-start gap-2">
                    <span className="text-seed-mint mt-0.5">●</span>
                    <span>Place the tablet flat or propped where your child can comfortably reach the screen.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-seed-mint mt-0.5">●</span>
                    <span>The game will enter fullscreen. Buddy will guide your child with sounds and animations — no reading required.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-seed-mint mt-0.5">●</span>
                    <span>If your child needs a break, you can exit fullscreen at any time. Progress up to that point will still be used.</span>
                  </li>
                </ul>

                <button onClick={beginGame} className="seed-btn-primary w-full">
                  Let's begin
                </button>
                <button
                  onClick={() => setStep('age-select')}
                  className="seed-btn-secondary w-full mt-3"
                >
                  Back
                </button>
              </motion.div>
            )}

            {step === 'submitting' && (
              <motion.div
                key="submitting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="seed-card text-center"
              >
                <div className="w-12 h-12 border-4 border-seed-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h2 className="text-lg font-bold text-seed-dark mb-1">Saving your results...</h2>
                <p className="text-seed-muted text-sm">Just a moment.</p>
              </motion.div>
            )}

            {step === 'waiting' && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="seed-card text-center"
              >
                <div className="w-12 h-12 border-4 border-seed-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h2 className="text-lg font-bold text-seed-dark mb-1">Waiting for results...</h2>
                <p className="text-seed-muted text-sm">
                  Buddy is putting away the toys while we finish up.
                </p>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="seed-card text-center"
              >
                <div className="text-5xl mb-3">🎉</div>
                <h2 className="text-lg font-bold text-seed-dark mb-1">All done!</h2>
                <p className="text-seed-muted text-sm">
                  Great job! Buddy had a wonderful time.
                </p>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="seed-card text-center"
              >
                <div className="w-14 h-14 bg-seed-alert/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-seed-alert" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-seed-dark mb-2">Something went wrong</h2>
                <p className="text-seed-muted text-sm mb-5">{error ?? 'Please try again.'}</p>
                <button onClick={() => setStep('waiting')} className="seed-btn-primary w-full">
                  Try again
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <Disclaimer variant="inline" className="text-center mt-4" />
        </div>
      </main>
      <Disclaimer />
    </div>
  )
}
