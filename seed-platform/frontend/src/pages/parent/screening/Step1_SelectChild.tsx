/**
 * Step 1 — Select Child
 *
 * Shows the parent's registered children as selectable cards.
 * Selected card gets a teal ring highlight.
 * "Continue" is enabled only when a child is chosen.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useParentStore } from '@/stores/parentStore'
import { RiskTierBadge } from '@/components/parent/RiskTierBadge'
import { calculateAge } from '@/utils/age'
import { WizardState } from './NewScreeningPage'

const GENDER_DISPLAY: Record<string, string> = {
  MALE: 'Boy',
  FEMALE: 'Girl',
  PREFER_NOT_TO_SAY: 'Child',
}

const AVATAR_COLORS = [
  'from-seed-teal to-seed-navy',
  'from-purple-500 to-indigo-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-600',
]

interface Step1Props {
  state: WizardState
  onNext: (updates: Partial<WizardState>) => void
}

export function Step1_SelectChild({ state, onNext }: Step1Props) {
  const { children, sessions } = useParentStore()
  const [selected, setSelected] = useState<string | null>(state.selectedChildId)

  function getLastSession(childId: string) {
    return [...sessions]
      .filter((s) => s.childId === childId && s.status === 'COMPLETE')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  }

  function handleContinue() {
    if (!selected) return
    onNext({ selectedChildId: selected })
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-seed-dark">Which child is this screening for?</h2>
          <p className="text-sm text-seed-muted mt-1">Select a profile to continue.</p>
        </div>

        {children.length === 0 ? (
          <div className="seed-card text-center py-10">
            <p className="text-seed-muted text-sm mb-4">No children registered yet.</p>
            <Link to="/parent/children/add" className="seed-btn-primary">
              Add Child Profile
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map((child, i) => {
              const age = calculateAge(child.dateOfBirth)
              const lastSession = getLastSession(child.id)
              const isSelected = child.id === selected
              const gradient = AVATAR_COLORS[i % AVATAR_COLORS.length]

              return (
                <motion.button
                  key={child.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelected(child.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 bg-white
                               transition-all duration-150 cursor-pointer
                               hover:border-seed-teal/50 hover:shadow-sm
                               ${isSelected
                                 ? 'border-seed-teal shadow-sm ring-2 ring-seed-teal/20'
                                 : 'border-slate-200'
                               }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient}
                                    flex items-center justify-center font-bold text-white
                                    flex-shrink-0`}>
                      {child.name[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-seed-dark">{child.name}</span>
                        {isSelected && (
                          <span className="text-xs font-medium text-seed-teal bg-seed-teal/10
                                           px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-seed-muted mt-0.5">
                        {age.display}
                        <span className="mx-1.5 text-slate-300">·</span>
                        {GENDER_DISPLAY[child.gender] ?? 'Child'}
                      </p>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      <RiskTierBadge tier={lastSession?.riskTier} size="sm" />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center
                                       justify-center flex-shrink-0
                                       ${isSelected
                                         ? 'border-seed-teal bg-seed-teal'
                                         : 'border-slate-300'
                                       }`}>
                        {isSelected && (
                          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                            <polyline points="2,6 5,9 10,3" stroke="white"
                              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              )
            })}

            <Link
              to="/parent/children/add"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                         border-2 border-dashed border-slate-200 text-seed-muted text-sm
                         font-medium hover:border-seed-teal/50 hover:text-seed-teal
                         transition-all duration-150"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add new child
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-white px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="seed-btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
