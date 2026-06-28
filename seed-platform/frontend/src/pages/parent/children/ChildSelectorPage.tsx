/**
 * Child Selector Page — /parent/children
 *
 * Shown when a parent has children registered but wants to switch between them
 * or add another. Selecting a card sets the active child and redirects to the
 * dashboard. Used standalone; Step 1 of the screening wizard embeds its own
 * lightweight variant.
 */

import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sprout } from 'lucide-react'
import { useParentStore } from '@/stores/parentStore'
import { RiskTierBadge } from '@/components/parent/RiskTierBadge'
import { calculateAge, formatDate } from '@/utils/age'

const GENDER_DISPLAY: Record<string, string> = {
  MALE: 'Boy',
  FEMALE: 'Girl',
  PREFER_NOT_TO_SAY: 'Child',
}

// Avatar colors keyed by first letter
const AVATAR_COLORS: Record<string, string> = {
  A: 'from-seed-teal to-seed-navy',
  B: 'from-purple-500 to-indigo-600',
  C: 'from-rose-400 to-pink-600',
  D: 'from-amber-400 to-orange-500',
  E: 'from-emerald-400 to-teal-600',
}
function avatarGradient(name: string): string {
  return AVATAR_COLORS[name[0]?.toUpperCase()] ?? 'from-seed-teal to-seed-navy'
}

export function ChildSelectorPage() {
  const navigate = useNavigate()
  const { children, sessions, selectedChildId, setSelectedChildId } = useParentStore()

  function getLastSession(childId: string) {
    return [...sessions]
      .filter((s) => s.childId === childId && s.status === 'COMPLETE')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  }

  function handleSelect(childId: string) {
    setSelectedChildId(childId)
    navigate('/parent/dashboard', { replace: true })
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-seed-ice flex items-center justify-center px-4">
        <div className="seed-card max-w-sm w-full text-center">
          <div className="flex justify-center mb-3"><Sprout className="text-seed-teal" size={32} /></div>
          <h1 className="text-lg font-bold text-seed-dark mb-2">No children yet</h1>
          <p className="text-sm text-seed-muted mb-4">
            Add your child's profile to get started.
          </p>
          <Link to="/parent/children/add" className="seed-btn-primary w-full inline-block text-center">
            Add Child Profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-seed-ice px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-seed-dark">Select Child</h1>
          <p className="text-seed-muted text-sm mt-1">
            Choose which child's profile you want to view.
          </p>
        </div>

        <div className="space-y-3">
          {children.map((child, i) => {
            const age = calculateAge(child.dateOfBirth)
            const lastSession = getLastSession(child.id)
            const isSelected = child.id === selectedChildId
            const gradient = avatarGradient(child.name)

            return (
              <motion.button
                key={child.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleSelect(child.id)}
                className={`w-full text-left seed-card hover:shadow-md active:scale-[0.99]
                            transition-all duration-150 cursor-pointer
                            ${isSelected ? 'ring-2 ring-seed-teal ring-offset-1' : ''}`}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient}
                                flex items-center justify-center text-xl font-bold
                                text-white flex-shrink-0`}
                  >
                    {child.name[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-seed-dark">{child.name}</span>
                      {isSelected && (
                        <span className="text-xs font-medium text-seed-teal bg-seed-teal/10 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-seed-muted mt-0.5">
                      {age.display}
                      <span className="mx-1.5 text-slate-300">·</span>
                      {GENDER_DISPLAY[child.gender] ?? 'Child'}
                    </p>
                    {lastSession ? (
                      <p className="text-xs text-seed-muted mt-0.5">
                        Last screened {formatDate(lastSession.createdAt)}
                      </p>
                    ) : (
                      <p className="text-xs text-seed-muted mt-0.5">No screenings yet</p>
                    )}
                  </div>

                  {/* Risk badge */}
                  <div className="flex-shrink-0">
                    <RiskTierBadge tier={lastSession?.riskTier} size="sm" />
                  </div>

                  {/* Chevron */}
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={2} className="w-4 h-4 text-slate-300 flex-shrink-0"
                  >
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Add another child */}
        <div className="mt-4">
          <Link
            to="/parent/children/add"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                       border-2 border-dashed border-seed-teal/30 text-seed-teal
                       text-sm font-medium hover:bg-seed-teal/5 hover:border-seed-teal/60
                       transition-all duration-150"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add another child
          </Link>
        </div>
      </div>
    </div>
  )
}
