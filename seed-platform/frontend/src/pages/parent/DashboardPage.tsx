/**
 * S.E.E.D. Parent Dashboard — /parent/dashboard
 *
 * Three sections:
 *   1. Child card  — name, age, gender, last screening, risk tier, CTA
 *   2. Trajectory  — composite score over time (Recharts)
 *   3. Recent sessions — last 3, with "View All" link
 *
 * Seeds from mock data in parentStore when the API is unavailable.
 */

import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useParentStore, selectChild } from '@/stores/parentStore'
import { RiskTierBadge } from '@/components/parent/RiskTierBadge'
import { TrajectoryChart } from '@/components/parent/TrajectoryChart'
import { SessionCard } from '@/components/parent/SessionCard'
import { calculateAge, formatDate } from '@/utils/age'
import { api } from '@/utils/api'
import { ScreeningSession } from '@/types'

const GENDER_LABEL: Record<string, string> = {
  MALE: 'Boy',
  FEMALE: 'Girl',
  PREFER_NOT_TO_SAY: 'Child',
}

// ─── Child card ───────────────────────────────────────────────────────────────

function ChildCard() {
  const child = useParentStore(selectChild)
  const { sessions } = useParentStore()
  const navigate = useNavigate()

  if (!child) {
    return (
      <div className="seed-card flex flex-col items-center gap-4 text-center py-10">
        <div className="w-16 h-16 rounded-full bg-seed-teal/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#028090" strokeWidth={1.5} className="w-8 h-8">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-seed-dark mb-1">No child profile yet</p>
          <p className="text-sm text-seed-muted">Add your child to get started with screening.</p>
        </div>
        <button
          onClick={() => navigate('/parent/children/add')}
          className="seed-btn-primary"
        >
          Add Child Profile
        </button>
      </div>
    )
  }

  const age = calculateAge(child.dateOfBirth)
  const genderLabel = GENDER_LABEL[child.gender] ?? 'Child'

  // Most recent completed session
  const lastSession = [...sessions]
    .filter((s) => s.status === 'COMPLETE')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  return (
    <div className="seed-card">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-seed-teal to-seed-navy flex items-center justify-center text-xl font-extrabold text-white flex-shrink-0">
          {child.name[0]}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-seed-dark">{child.name}</h2>
            <RiskTierBadge tier={lastSession?.riskTier} size="sm" />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-seed-muted">
            <span>{age.display}</span>
            <span className="hidden sm:inline text-slate-300">·</span>
            <span>{genderLabel}</span>
            {lastSession && (
              <>
                <span className="hidden sm:inline text-slate-300">·</span>
                <span>Last screened {formatDate(lastSession.createdAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/parent/screening/new')}
          className="seed-btn-primary flex items-center gap-2 whitespace-nowrap flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Start New Screening
        </button>
      </div>
    </div>
  )
}

// ─── Trajectory section ───────────────────────────────────────────────────────

function TrajectorySection() {
  const { sessions } = useParentStore()

  return (
    <div className="seed-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-seed-dark">Development Trajectory</h3>
          <p className="text-xs text-seed-muted mt-0.5">
            Composite score over time (lower is better)
          </p>
        </div>
      </div>
      <TrajectoryChart sessions={sessions} />
    </div>
  )
}

// ─── Recent sessions section ──────────────────────────────────────────────────

function RecentSessions() {
  const { sessions, isLoadingSessions } = useParentStore()

  const recent = [...sessions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  return (
    <div className="seed-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-seed-dark">Recent Screenings</h3>
        <Link
          to="/parent/history"
          className="text-xs font-medium text-seed-teal hover:text-seed-navy underline underline-offset-2"
        >
          View all history <ArrowRight size={12} className="inline ml-0.5" />
        </Link>
      </div>

      {isLoadingSessions && (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-seed-teal border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoadingSessions && recent.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-seed-muted">No completed screenings yet.</p>
          <Link to="/parent/screening/new" className="text-sm font-medium text-seed-teal hover:text-seed-navy mt-2 inline-block">
            Start your first screening <ArrowRight size={12} className="inline ml-0.5" />
          </Link>
        </div>
      )}

      {!isLoadingSessions && recent.length > 0 && (
        <div>
          {recent.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { selectedChildId, setSessions, setLoadingSessions } = useParentStore()

  // Fetch sessions for selected child whenever selection changes
  useEffect(() => {
    if (!selectedChildId) return

    setLoadingSessions(true)
    api
      .get<{ sessions: ScreeningSession[] }>(`/screening/history/${selectedChildId}`)
      .then(({ data }) => {
        if (data.sessions?.length) setSessions(data.sessions)
      })
      .catch(() => {
        // API unavailable — mock data already in store
      })
      .finally(() => setLoadingSessions(false))
  }, [selectedChildId, setSessions, setLoadingSessions])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 space-y-5 max-w-4xl"
    >
      <ChildCard />
      <TrajectorySection />
      <RecentSessions />
    </motion.div>
  )
}
