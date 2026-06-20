/**
 * Add Child Page — /parent/children/add
 *
 * Collects first name, date of birth, and gender.
 * Live age calculation updates as the user picks a DOB.
 * Validation gate: child must be 18 months – 6 years old.
 * On success: POST /api/children → update store → redirect to dashboard.
 * Demo / API-unavailable fallback: creates a local mock child so the form
 * works end-to-end even without a backend.
 */

import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useParentStore } from '@/stores/parentStore'
import { calculateAge } from '@/utils/age'
import { api, extractApiError } from '@/utils/api'
import { Disclaimer } from '@/components/Disclaimer'
import { Child } from '@/types'

// ─── Date bounds ─────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

const TODAY = isoDate(new Date())

/** Oldest allowed DOB: 7 years ago (picker cap; real validation is 18 mo – 6 yr) */
function minPickerDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 7)
  return isoDate(d)
}

// ─── Age validation ───────────────────────────────────────────────────────────

const MIN_MONTHS = 18
const MAX_MONTHS = 72 // 6 years

interface AgeValidation {
  totalMonths: number
  display: string
  inRange: boolean
}

function validateDob(dob: string): AgeValidation | null {
  if (!dob) return null
  const age = calculateAge(dob)
  return {
    totalMonths: age.totalMonths,
    display: age.display,
    inRange: age.totalMonths >= MIN_MONTHS && age.totalMonths <= MAX_MONTHS,
  }
}

// ─── Gender options ───────────────────────────────────────────────────────────

type GenderValue = 'MALE' | 'FEMALE' | 'PREFER_NOT_TO_SAY'

const GENDER_OPTIONS: { value: GenderValue; label: string; emoji: string }[] = [
  { value: 'MALE', label: 'Boy', emoji: '👦' },
  { value: 'FEMALE', label: 'Girl', emoji: '👧' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say', emoji: '🧒' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function AddChildPage() {
  const navigate = useNavigate()
  const { children, setChildren, setSelectedChildId } = useParentStore()

  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState<GenderValue | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const ageValidation = useMemo(() => validateDob(dob), [dob])

  const canSubmit =
    name.trim().length > 0 &&
    gender !== '' &&
    ageValidation?.inRange === true &&
    !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setApiError(null)

    const payload = {
      name: name.trim(),
      dateOfBirth: dob,
      gender,
    }

    // Attempt real API call; fall back to local mock on failure (demo mode)
    try {
      const { data } = await api.post<{ child: Child }>('/children', payload)
      setChildren([...children, data.child])
      setSelectedChildId(data.child.id)
      navigate('/parent/dashboard', { replace: true })
    } catch (err) {
      // Demo / API unavailable fallback — create a synthetic child locally
      const message = extractApiError(err)
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('failed')) {
        const mockChild: Child = {
          id: `child-local-${Date.now()}`,
          name: name.trim(),
          dateOfBirth: dob,
          gender: gender as GenderValue,
          parentId: 'parent-local',
          createdAt: new Date().toISOString(),
        }
        setChildren([...children, mockChild])
        setSelectedChildId(mockChild.id)
        navigate('/parent/dashboard', { replace: true })
      } else {
        setApiError(message)
        setSubmitting(false)
      }
    }
  }

  const hasChildren = children.length > 0

  return (
    <div className="min-h-screen bg-seed-ice flex flex-col">
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">🌱</span>
              <h1 className="text-2xl font-bold text-seed-dark">Add Child Profile</h1>
            </div>
            <p className="text-seed-muted text-sm">
              We'll use this to select age-appropriate screenings.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="seed-card space-y-5">

              {/* Child's name */}
              <div>
                <label
                  htmlFor="child-name"
                  className="block text-sm font-medium text-seed-dark mb-1.5"
                >
                  Child's first name <span className="text-seed-alert">*</span>
                </label>
                <input
                  id="child-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aryan"
                  maxLength={50}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200
                             focus:border-seed-teal focus:ring-2 focus:ring-seed-teal/20
                             outline-none text-seed-dark placeholder:text-slate-300
                             transition-all duration-150 text-base"
                  required
                />
              </div>

              {/* Date of birth */}
              <div>
                <label
                  htmlFor="child-dob"
                  className="block text-sm font-medium text-seed-dark mb-1.5"
                >
                  Date of birth <span className="text-seed-alert">*</span>
                </label>
                <input
                  id="child-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={TODAY}
                  min={minPickerDate()}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200
                             focus:border-seed-teal focus:ring-2 focus:ring-seed-teal/20
                             outline-none text-seed-dark transition-all duration-150
                             text-base cursor-pointer"
                  required
                />

                {/* Live age display + range validation */}
                <AnimatePresence mode="wait">
                  {ageValidation && (
                    <motion.div
                      key={ageValidation.inRange ? 'valid' : 'invalid'}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className={`mt-2 flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
                        ageValidation.inRange
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <span className="flex-shrink-0 mt-0.5">
                        {ageValidation.inRange ? '✓' : '⚠'}
                      </span>
                      <span>
                        {ageValidation.inRange ? (
                          <>
                            Age: <strong>{ageValidation.display}</strong>
                          </>
                        ) : (
                          'S.E.E.D. is designed for children aged 18 months to 6 years'
                        )}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Gender */}
              <div>
                <p className="block text-sm font-medium text-seed-dark mb-2">
                  Gender <span className="text-seed-alert">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGender(opt.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2
                                  text-sm font-medium transition-all duration-150
                                  focus-visible:ring-2 focus-visible:ring-seed-teal focus-visible:ring-offset-1
                                  ${
                                    gender === opt.value
                                      ? 'border-seed-teal bg-seed-teal/10 text-seed-teal'
                                      : 'border-slate-200 bg-white text-seed-dark hover:border-seed-teal/50'
                                  }`}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* API error */}
              {apiError && (
                <p className="text-sm text-seed-alert bg-red-50 rounded-lg px-3 py-2">
                  {apiError}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="seed-btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    'Save Child Profile'
                  )}
                </button>

                {hasChildren && (
                  <Link
                    to="/parent/dashboard"
                    className="seed-btn-secondary w-full text-center"
                  >
                    Cancel
                  </Link>
                )}
              </div>
            </div>
          </form>

          <Disclaimer variant="inline" className="text-center mt-4 text-xs" />
        </motion.div>
      </main>
    </div>
  )
}
