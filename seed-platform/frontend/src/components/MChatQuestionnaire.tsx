/**
 * M-CHAT-R/F Questionnaire Component
 *
 * Scoring verified against: Robins, Fein & Barton (2009).
 * Official source: mchatscreen.com — scoring/
 * Stanford Medicine scoring reference: med.stanford.edu/content/dam/sm/ppc/documents/DBP/MCHAT-R_Scoring.pdf
 * Verification date: 2025-06-16
 *
 * LICENSING NOTICE:
 * The M-CHAT-R/F™ is copyrighted (© 2009 Robins, Fein & Barton).
 * Distribution via software requires a license agreement from Diana L. Robins.
 * Contact: mchatscreen2009@gmail.com | mchatscreen.com/license-inquiry
 * Do NOT deploy this component in production without written license.
 *
 * SCORING IMPLEMENTATION (verified):
 *   - Items 2, 5, 12: YES = at-risk (reverse-scored)
 *   - All other items: NO = at-risk
 *   - Total score bands: 0–2 LOW | 3–7 MEDIUM | 8–20 HIGH
 *   - NO critical items, NO double-weighting in the M-CHAT-R/F
 *     (critical items were in the original 23-item M-CHAT, not the R/F revision)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, extractApiError } from '@/utils/api'
import { Disclaimer } from '@/components/Disclaimer'

// ─── Item definitions ─────────────────────────────────────────────────────────
// IMPORTANT: Verify exact wording against your licensed copy from mchatscreen.com
// before production deployment.

export interface MChatItem {
  id: number
  text: string
  example?: string
  /** true → YES response = at-risk (items 2, 5, 12 per official scoring) */
  reverseScored: boolean
}

/** All 20 M-CHAT-R/F items with examples, in order, as published.
 *  Source: Robins, Fein & Barton 2009 (mchatscreen.com).
 *  Verify wording against licensed copy before production use. */
export const MCHAT_ITEMS: MChatItem[] = [
  {
    id: 1,
    text: 'If you point at something across the room, does your child look at it?',
    example: 'For example, if you point at a toy or an animal, does your child look at the toy or animal?',
    reverseScored: false,
  },
  {
    id: 2,
    text: 'Have you ever wondered if your child might be deaf?',
    reverseScored: true,  // YES = at-risk
  },
  {
    id: 3,
    text: 'Does your child play pretend or make-believe?',
    example: 'For example, pretend to drink from an empty cup, pretend to talk on a phone, or pretend to feed a doll or stuffed animal?',
    reverseScored: false,
  },
  {
    id: 4,
    text: 'Does your child like climbing on things?',
    example: 'For example, furniture, playground equipment, or stairs.',
    reverseScored: false,
  },
  {
    id: 5,
    text: 'Does your child make unusual finger movements near his or her eyes?',
    example: 'For example, does your child wiggle his or her fingers close to his or her eyes?',
    reverseScored: true,  // YES = at-risk
  },
  {
    id: 6,
    text: 'Does your child point with one finger to ask for something or to get help?',
    example: 'For example, pointing to a snack or toy that is out of reach.',
    reverseScored: false,
  },
  {
    id: 7,
    text: 'Does your child point with one finger to show you something interesting?',
    example: 'For example, pointing to an airplane in the sky or a big truck in the road.',
    reverseScored: false,
  },
  {
    id: 8,
    text: 'Is your child interested in other children?',
    example: 'For example, does your child watch other children, smile at them, or go to them?',
    reverseScored: false,
  },
  {
    id: 9,
    text: 'Does your child show you things by bringing them to you or holding them up for you to see – not to get help, but just to share?',
    example: 'For example, showing you a flower, a stuffed animal, or a toy truck.',
    reverseScored: false,
  },
  {
    id: 10,
    text: 'Does your child respond when you call his or her name?',
    example: 'For example, does he or she look up, talk or babble, or stop what he or she is doing when you call his or her name?',
    reverseScored: false,
  },
  {
    id: 11,
    text: 'When you smile at your child, does he or she smile back at you?',
    reverseScored: false,
  },
  {
    id: 12,
    text: 'Does your child get upset by everyday noises?',
    example: 'For example, does your child scream or cry to noise such as a vacuum cleaner or loud music?',
    reverseScored: true,  // YES = at-risk
  },
  {
    id: 13,
    text: 'Does your child walk?',
    reverseScored: false,
  },
  {
    id: 14,
    text: 'Does your child look you in the eye when you are talking to him or her, playing with him or her, or dressing him or her?',
    reverseScored: false,
  },
  {
    id: 15,
    text: 'Does your child try to copy what you do?',
    example: 'For example, wave bye-bye, clap, or make a funny noise when you do.',
    reverseScored: false,
  },
  {
    id: 16,
    text: 'If you turn your head to look at something, does your child look around to see what you are looking at?',
    reverseScored: false,
  },
  {
    id: 17,
    text: 'Does your child try to get you to watch him or her?',
    example: 'For example, does your child look at you for praise, or say "look" or "watch me"?',
    reverseScored: false,
  },
  {
    id: 18,
    text: 'Does your child understand when you tell him or her to do something?',
    example: 'For example, if you don\'t point, can your child understand "put the book on the chair" or "bring me the blanket"?',
    reverseScored: false,
  },
  {
    id: 19,
    text: 'If something new happens, does your child look at your face to see how you feel about it?',
    example: 'For example, if he or she hears a strange or funny noise, or sees a new toy, will he or she look at your face?',
    reverseScored: false,
  },
  {
    id: 20,
    text: 'Does your child like movement activities?',
    example: 'For example, being swung or bounced on your knee.',
    reverseScored: false,
  },
]

// ─── Scoring engine ──────────────────────────────────────────────────────────

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH'

export interface MChatScore {
  /** true = YES was the parent's response for each item (0-indexed) */
  answers: boolean[]
  /** true = this item is at-risk per official scoring rules */
  risk_flags: boolean[]
  total_score: number
  risk_band: RiskBand
  completion_time_ms: number
  started_at: string
  completed_at: string
}

/** Score a single item given the YES/NO answer (true=YES). */
function scoreItem(item: MChatItem, yesAnswer: boolean): boolean {
  // Reverse-scored: YES = at-risk; others: NO = at-risk
  return item.reverseScored ? yesAnswer : !yesAnswer
}

/** Compute the full score from a complete array of boolean answers. */
export function computeMChatScore(
  answers: boolean[],
  startedAt: string,
  completedAt: string
): MChatScore {
  if (answers.length !== 20) {
    throw new Error(`computeMChatScore: expected 20 answers, got ${answers.length}`)
  }

  const risk_flags = MCHAT_ITEMS.map((item, i) => scoreItem(item, answers[i]))
  const total_score = risk_flags.filter(Boolean).length

  let risk_band: RiskBand
  if (total_score <= 2) {
    risk_band = 'LOW'
  } else if (total_score <= 7) {
    risk_band = 'MEDIUM'
  } else {
    risk_band = 'HIGH'
  }

  const completion_time_ms =
    new Date(completedAt).getTime() - new Date(startedAt).getTime()

  return {
    answers,
    risk_flags,
    total_score,
    risk_band,
    completion_time_ms,
    started_at: startedAt,
    completed_at: completedAt,
  }
}

// ─── Buddy expression helper ─────────────────────────────────────────────────

type BuddyExpression = 'friendly' | 'attentive' | 'focused'

function getBuddyExpression(questionNumber: number): BuddyExpression {
  if (questionNumber <= 7) return 'friendly'
  if (questionNumber <= 14) return 'attentive'
  return 'focused'
}

const BUDDY_COLORS: Record<BuddyExpression, string> = {
  friendly: '#02C39A',   // mint
  attentive: '#F4A261',  // amber
  focused: '#065A82',    // navy
}

// ─── Buddy mini-avatar (inline SVG, no external assets) ──────────────────────

function BuddyAvatar({ expression }: { expression: BuddyExpression }) {
  const color = BUDDY_COLORS[expression]
  const eyeY = expression === 'focused' ? 34 : 36

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="38" r="30" fill="#FFB347" />
      <ellipse cx="25" cy={eyeY} rx="7" ry="8" fill="white" />
      <ellipse cx="47" cy={eyeY} rx="7" ry="8" fill="white" />
      <circle cx="25" cy={eyeY} r="3.5" fill="#1A2B3C" />
      <circle cx="47" cy={eyeY} r="3.5" fill="#1A2B3C" />
      <circle cx="27" cy={eyeY - 2} r="1.2" fill="white" />
      <circle cx="49" cy={eyeY - 2} r="1.2" fill="white" />
      {expression === 'friendly' && (
        <path d="M26 50 Q36 58 46 50" stroke="#1A2B3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
      {expression === 'attentive' && (
        <path d="M28 50 Q36 56 44 50" stroke="#1A2B3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
      {expression === 'focused' && (
        <>
          <ellipse cx="36" cy="51" rx="7" ry="5" fill="#1A2B3C" />
          <ellipse cx="36" cy="49" rx="5" ry="2.5" fill="white" />
        </>
      )}
      {/* Expression indicator dot */}
      <circle cx="58" cy="16" r="7" fill={color} />
    </svg>
  )
}

// ─── localStorage persistence ────────────────────────────────────────────────

const STORAGE_KEY = 'seed:mchat:progress'

interface PersistedProgress {
  sessionId: string
  answers: (boolean | null)[]
  currentIndex: number
  startedAt: string
}

function saveProgress(sessionId: string, answers: (boolean | null)[], index: number, startedAt: string) {
  try {
    const data: PersistedProgress = { sessionId, answers, currentIndex: index, startedAt }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* quota exceeded — fail silently */ }
}

function loadProgress(sessionId: string): PersistedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PersistedProgress
    if (data.sessionId !== sessionId) return null
    return data
  } catch { return null }
}

function clearProgress() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MChatQuestionnaireProps {
  sessionId: string
  onComplete: (score: MChatScore) => void
  onError?: (message: string) => void
}

export const MChatQuestionnaire: React.FC<MChatQuestionnaireProps> = ({
  sessionId,
  onComplete,
  onError,
}) => {
  const startedAtRef = useRef<string>(new Date().toISOString())
  const [answers, setAnswers] = useState<(boolean | null)[]>(Array(20).fill(null))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resume from localStorage if same session
  useEffect(() => {
    const saved = loadProgress(sessionId)
    if (saved) {
      startedAtRef.current = saved.startedAt
      setAnswers(saved.answers)
      setCurrentIndex(saved.currentIndex)
    }
  }, [sessionId])

  const currentItem = MCHAT_ITEMS[currentIndex]
  const expression = getBuddyExpression(currentIndex + 1)
  const progressPct = (currentIndex / 20) * 100

  const handleAnswer = useCallback(
    async (yesAnswer: boolean) => {
      const newAnswers = [...answers]
      newAnswers[currentIndex] = yesAnswer

      const nextIndex = currentIndex + 1
      setAnswers(newAnswers)

      if (nextIndex < 20) {
        saveProgress(sessionId, newAnswers, nextIndex, startedAtRef.current)
        setCurrentIndex(nextIndex)
        return
      }

      // All 20 answered — score and submit
      const completedAt = new Date().toISOString()
      const score = computeMChatScore(
        newAnswers as boolean[],
        startedAtRef.current,
        completedAt
      )

      // Build the answers object the backend expects: { "1": true, "2": false, ... }
      // Keys are the MCHAT_ITEMS[i].id (1-indexed integers, sent as strings via JSON).
      const answersObject = Object.fromEntries(
        MCHAT_ITEMS.map((item, i) => [String(item.id), score.answers[i]])
      )

      setSubmitting(true)
      try {
        await api.post('/screening/mchat', {
          sessionId,
          answers: answersObject,
          score: score.total_score,
          risk_band: score.risk_band,
          completion_time_ms: score.completion_time_ms,
          started_at: score.started_at,
          completed_at: score.completed_at,
        })

        clearProgress()
        setDone(true)
        onComplete(score)
      } catch (err) {
        const msg = extractApiError(err)
        setError(msg)
        onError?.(msg)
      } finally {
        setSubmitting(false)
      }
    },
    [answers, currentIndex, sessionId, onComplete, onError]
  )

  const handleBack = useCallback(() => {
    if (currentIndex === 0) return
    const prevIndex = currentIndex - 1
    setCurrentIndex(prevIndex)
    saveProgress(sessionId, answers, prevIndex, startedAtRef.current)
  }, [currentIndex, answers, sessionId])

  // Completion screen (same for all risk bands)
  if (done) {
    return (
      <div className="min-h-screen bg-seed-ice flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="seed-card max-w-md w-full text-center"
        >
          <div className="flex justify-center mb-4">
            <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
              <circle cx="44" cy="46" r="36" fill="#FFB347" />
              <ellipse cx="31" cy="42" rx="7" ry="8" fill="white" />
              <ellipse cx="57" cy="42" rx="7" ry="8" fill="white" />
              <circle cx="31" cy="42" r="3.5" fill="#1A2B3C" />
              <circle cx="57" cy="42" r="3.5" fill="#1A2B3C" />
              <circle cx="33" cy="40" r="1.2" fill="white" />
              <circle cx="59" cy="40" r="1.2" fill="white" />
              <path d="M30 60 Q44 70 58 60" stroke="#1A2B3C" strokeWidth="3" fill="none" strokeLinecap="round" />
              <ellipse cx="70" cy="20" rx="8" ry="8" fill="#02C39A" />
              <path d="M65 20 L68.5 23.5 L76 16" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-seed-dark mb-2">
            Thank you for completing the questionnaire
          </h1>
          <p className="text-seed-muted text-sm mb-1">
            Your responses have been saved.
          </p>
          <p className="text-seed-muted text-sm mb-6">
            The next step will gather additional information to complete the screening.
          </p>

          <button
            onClick={() => onComplete({ answers: answers as boolean[], risk_flags: [], total_score: 0, risk_band: 'LOW', completion_time_ms: 0, started_at: startedAtRef.current, completed_at: new Date().toISOString() })}
            className="seed-btn-primary w-full"
          >
            Continue to the next step
          </button>

          <Disclaimer variant="inline" className="text-center mt-4" />
        </motion.div>
      </div>
    )
  }

  if (submitting) {
    return (
      <div className="min-h-screen bg-seed-ice flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-seed-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-seed-muted text-sm">Saving your responses…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-seed-ice flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-white border-b border-seed-muted/10 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-xs text-seed-muted mb-2">
            <span>Question {currentIndex + 1} of 20</span>
            <span>{Math.round(progressPct)}% complete</span>
          </div>
          <div className="w-full h-2 bg-seed-muted/15 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-seed-teal rounded-full"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="seed-card relative"
            >
              {/* Buddy avatar */}
              <div className="absolute bottom-4 right-4 opacity-80">
                <BuddyAvatar expression={expression} />
              </div>

              {/* Question number */}
              <div className="inline-flex items-center gap-1.5 bg-seed-teal/10 text-seed-teal text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <span>#{currentIndex + 1}</span>
              </div>

              {/* Question text */}
              <p className="text-[18px] leading-relaxed font-medium text-seed-dark mb-3 pr-20">
                {currentItem.text}
              </p>

              {/* Example */}
              {currentItem.example && (
                <p className="text-sm text-seed-muted italic mb-6 pr-20">
                  {currentItem.example}
                </p>
              )}

              {!currentItem.example && <div className="mb-6" />}

              {/* Yes / No buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleAnswer(true)}
                  className="flex-1 py-4 rounded-xl text-lg font-bold text-white
                             bg-seed-teal hover:bg-seed-teal/90 active:scale-95
                             transition-all duration-150 focus-visible:ring-2
                             focus-visible:ring-seed-teal focus-visible:ring-offset-2"
                  style={{ minHeight: 60 }}
                >
                  Yes
                </button>
                <button
                  onClick={() => handleAnswer(false)}
                  className="flex-1 py-4 rounded-xl text-lg font-bold text-white
                             bg-seed-navy hover:bg-seed-navy/90 active:scale-95
                             transition-all duration-150 focus-visible:ring-2
                             focus-visible:ring-seed-navy focus-visible:ring-offset-2"
                  style={{ minHeight: 60 }}
                >
                  No
                </button>
              </div>

              {/* Back button */}
              {currentIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="mt-4 text-sm text-seed-muted hover:text-seed-dark
                             transition-colors underline underline-offset-2"
                >
                  ← Back to previous question
                </button>
              )}

              {/* Inline error */}
              {error && (
                <p className="mt-4 text-sm text-seed-alert text-center">{error}</p>
              )}
            </motion.div>
          </AnimatePresence>

          <Disclaimer variant="inline" className="text-center mt-4 text-xs" />
        </div>
      </main>
    </div>
  )
}

export default MChatQuestionnaire
