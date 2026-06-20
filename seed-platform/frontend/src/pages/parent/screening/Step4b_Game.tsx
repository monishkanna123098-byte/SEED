/**
 * Step 4B — Launch Buddy's World
 *
 * Shows parent instructions, then renders BuddysWorld in fullscreen
 * when the parent taps "Start Buddy's World".
 *
 * BuddysWorld handles its own fullscreen request and age selection.
 * On game completion, `onFinished` fires and the wizard advances to Step 5.
 */

import { useState } from 'react'
import { useParentStore } from '@/stores/parentStore'
import { BuddysWorld } from '@/game/BuddysWorld'
import { WizardState } from './NewScreeningPage'

interface Step4bProps {
  state: WizardState
  onNext: (updates: Partial<WizardState>) => void
}

export function Step4b_Game({ state, onNext }: Step4bProps) {
  const { children } = useParentStore()
  const child = children.find((c) => c.id === state.selectedChildId)
  const [gameStarted, setGameStarted] = useState(false)

  // BuddysWorld calls onFinished when all modules are done
  function handleGameFinished(_sessionId: string) {
    setGameStarted(false)
    onNext({ gameCompleted: true })
  }

  // If game is running, BuddysWorld takes full control (requests fullscreen)
  if (gameStarted) {
    return (
      <BuddysWorld
        sessionId={state.sessionId ?? `demo-${Date.now()}`}
        onFinished={handleGameFinished}
        onCancel={() => setGameStarted(false)}
      />
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col items-center justify-center gap-7
                      p-6 max-w-2xl mx-auto w-full">

        {/* Buddy illustration */}
        <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="46" r="36" fill="#FFB347" stroke="#E6963D" strokeWidth="2" />
          <ellipse cx="30" cy="42" rx="9" ry="10" fill="white" />
          <ellipse cx="58" cy="42" rx="9" ry="10" fill="white" />
          <circle cx="30" cy="42" r="4.5" fill="#1A2B3C" />
          <circle cx="58" cy="42" r="4.5" fill="#1A2B3C" />
          <circle cx="32" cy="40" r="1.8" fill="white" />
          <circle cx="60" cy="40" r="1.8" fill="white" />
          <path d="M31 62 Q44 73 57 62" stroke="#1A2B3C" strokeWidth="3"
            fill="none" strokeLinecap="round" />
          {/* Stars */}
          <circle cx="72" cy="16" r="6" fill="#02C39A" />
          <text x="72" y="20" textAnchor="middle" fontSize="8" fill="white">★</text>
        </svg>

        <h2 className="text-2xl font-bold text-seed-dark text-center">Ready to Play?</h2>

        {/* Parent instructions card */}
        <div className="w-full bg-seed-ice border border-seed-teal/25 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-seed-teal/15 flex items-center
                              justify-center flex-shrink-0">
              <svg viewBox="0 0 16 16" fill="none" stroke="#028090" strokeWidth={1.5}
                className="w-3.5 h-3.5">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5v3M8 11h.01" strokeLinecap="round" />
              </svg>
            </span>
            <p className="text-sm font-semibold text-seed-dark">For the parent</p>
          </div>
          <p className="text-sm text-seed-dark leading-relaxed">
            Hand the tablet to your child. Let them play on their own.{' '}
            <strong>Do not show them how to play or help them during the game.</strong>{' '}
            Just watch.
          </p>
          {child && (
            <p className="text-xs text-seed-muted mt-3 pt-3 border-t border-seed-teal/10">
              The game will adapt to {child.name}'s age group automatically.
            </p>
          )}
        </div>

        {/* Duration note */}
        <div className="flex items-center gap-2 text-sm text-seed-muted">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}
            className="w-4 h-4 flex-shrink-0">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3l2 2" strokeLinecap="round" />
          </svg>
          The game takes approximately 8–10 minutes
        </div>
      </div>

      {/* Sticky footer */}
      <div className="border-t border-slate-100 bg-white px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setGameStarted(true)}
            className="seed-btn-primary w-full py-4 text-base font-bold"
          >
            <span className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
              Start Buddy's World
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
