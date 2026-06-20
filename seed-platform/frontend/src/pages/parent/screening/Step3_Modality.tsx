/**
 * Step 3 — Choose Screening Modality
 *
 * Two large option cards: Video (left) and Buddy's World game (right).
 * A "Do Both (Recommended)" button below selects both simultaneously.
 *
 * Age-based default:
 *   < 36 months  → Video pre-selected
 *   ≥ 36 months  → Game pre-selected
 *
 * The child's age is read from parentStore using the selectedChildId.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useParentStore } from '@/stores/parentStore'
import { calculateAge } from '@/utils/age'
import { WizardState, ScreeningModality } from './NewScreeningPage'

// ─── Inline icons ─────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 mx-auto" aria-hidden="true">
      <rect x="4" y="14" width="40" height="28" rx="5" stroke="#065A82" strokeWidth="2.5" fill="#EAF4F8" />
      <circle cx="24" cy="28" r="8" stroke="#065A82" strokeWidth="2.5" fill="white" />
      <circle cx="24" cy="28" r="4" fill="#028090" />
      <rect x="18" y="8" width="12" height="6" rx="2" stroke="#065A82" strokeWidth="2" fill="#EAF4F8" />
      <circle cx="38" cy="22" r="2.5" fill="#028090" />
    </svg>
  )
}

function BuddyIcon({ highlighted }: { highlighted: boolean }) {
  const bodyColor = highlighted ? '#FFB347' : '#F0B060'
  const accentColor = highlighted ? '#02C39A' : '#64748b'
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 mx-auto" aria-hidden="true">
      <circle cx="24" cy="26" r="18" fill={bodyColor} />
      <ellipse cx="17" cy="23" rx="4.5" ry="5" fill="white" />
      <ellipse cx="31" cy="23" rx="4.5" ry="5" fill="white" />
      <circle cx="17" cy="23" r="2" fill="#1A2B3C" />
      <circle cx="31" cy="23" r="2" fill="#1A2B3C" />
      <path d="M18 34 Q24 40 30 34" stroke="#1A2B3C" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="38" cy="12" r="8" fill={accentColor} />
      <path d="M33 12 L36.5 15.5 L43 9" stroke="white" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Option card ──────────────────────────────────────────────────────────────

type OptionKey = 'VIDEO' | 'GAME'

interface OptionCardProps {
  id: OptionKey
  selected: boolean
  recommended: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  ageLabel: string
  description: string
  duration: string
}

function OptionCard({
  selected, recommended, onClick,
  icon, title, ageLabel, description, duration,
}: OptionCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex-1 text-left p-5 rounded-2xl border-2 bg-white
                  transition-all duration-200 cursor-pointer relative
                  focus-visible:ring-2 focus-visible:ring-seed-teal focus-visible:ring-offset-1
                  ${selected
                    ? 'border-seed-teal shadow-md ring-2 ring-seed-teal/20'
                    : 'border-slate-200 hover:border-seed-teal/40 hover:shadow-sm'
                  }`}
    >
      {/* Recommended pill */}
      {recommended && !selected && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2
                          text-[10px] font-bold uppercase tracking-wider
                          bg-seed-amber text-white px-2.5 py-0.5 rounded-full">
          Age match
        </span>
      )}

      {/* Selected check */}
      {selected && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-seed-teal
                          flex items-center justify-center">
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
            <polyline points="2,6 5,9 10,3" stroke="white"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}

      <div className="mb-3">{icon}</div>

      <h3 className="font-bold text-seed-dark text-base mb-0.5">{title}</h3>
      <p className={`text-xs font-medium mb-2 ${selected ? 'text-seed-teal' : 'text-seed-muted'}`}>
        {ageLabel}
      </p>
      <p className="text-sm text-seed-muted leading-snug mb-3">{description}</p>
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
          <circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" strokeLinecap="round" />
        </svg>
        {duration}
      </span>
    </motion.button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Step3Props {
  state: WizardState
  onNext: (updates: Partial<WizardState>) => void
}

export function Step3_Modality({ state, onNext }: Step3Props) {
  const { children } = useParentStore()

  const child = children.find((c) => c.id === state.selectedChildId) ?? null
  const ageMonths = child ? calculateAge(child.dateOfBirth).totalMonths : null
  const ageDefault: ScreeningModality = (ageMonths ?? 36) < 36 ? 'VIDEO' : 'GAME'

  // Initialize from state or age-based default
  const [modality, setModality] = useState<ScreeningModality>(
    state.modality ?? ageDefault
  )

  function toggle(key: OptionKey) {
    setModality((prev) => {
      if (prev === 'BOTH') return key           // deselect one
      if (prev === key) return ageDefault       // deselect returns to default
      return 'BOTH'                              // other key adds it
    })
  }

  function selectBoth() {
    setModality('BOTH')
  }

  const videoSelected = modality === 'VIDEO' || modality === 'BOTH'
  const gameSelected  = modality === 'GAME'  || modality === 'BOTH'
  const bothSelected  = modality === 'BOTH'

  function handleContinue() {
    onNext({ modality })
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-seed-dark">Choose how to screen</h2>
          <p className="text-sm text-seed-muted mt-1">
            {ageMonths !== null && ageMonths < 36
              ? 'For children under 3, video works well. You can also add the game.'
              : 'For children 3 and older, the interactive game is great. You can also add video.'}
          </p>
        </div>

        {/* Option cards */}
        <div className="flex gap-4 mb-5">
          <OptionCard
            id="VIDEO"
            selected={videoSelected}
            recommended={ageDefault === 'VIDEO' && !bothSelected}
            onClick={() => toggle('VIDEO')}
            icon={<CameraIcon />}
            title="Play Video"
            ageLabel="Best for ages 18 months – 3 years"
            description="Record your child playing naturally near a screen."
            duration="Takes 5 minutes"
          />
          <OptionCard
            id="GAME"
            selected={gameSelected}
            recommended={ageDefault === 'GAME' && !bothSelected}
            onClick={() => toggle('GAME')}
            icon={<BuddyIcon highlighted={gameSelected} />}
            title="Play Buddy's World"
            ageLabel="Best for ages 3–5 years"
            description="An interactive game that your child plays on the tablet."
            duration="Takes 8–10 minutes"
          />
        </div>

        {/* Do Both button */}
        <button
          onClick={selectBoth}
          className={`w-full py-3.5 rounded-xl border-2 text-sm font-semibold
                       transition-all duration-200
                       ${bothSelected
                         ? 'border-seed-mint bg-seed-mint/10 text-seed-teal ring-2 ring-seed-mint/30'
                         : 'border-seed-mint/50 text-seed-teal hover:bg-seed-mint/5 hover:border-seed-mint'
                       }`}
        >
          {bothSelected ? (
            <span className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <circle cx="8" cy="8" r="7" stroke="#02C39A" strokeWidth="1.5" />
                <polyline points="4,8 7,11 12,5" stroke="#02C39A" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Do Both (Recommended) — selected
            </span>
          ) : (
            '⭐ Do Both (Recommended) — most comprehensive results'
          )}
        </button>

        {/* Current selection summary */}
        <p className="text-xs text-seed-muted text-center mt-3">
          {modality === 'BOTH' && 'You\'ll complete video and the game — in sequence'}
          {modality === 'VIDEO' && 'You\'ll upload a short video of your child'}
          {modality === 'GAME' && 'Your child will play Buddy\'s World interactive game'}
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-white px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <button onClick={handleContinue} className="seed-btn-primary w-full">
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
