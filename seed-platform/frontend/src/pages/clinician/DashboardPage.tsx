/**
 * S.E.E.D. Clinician Dashboard — /clinician/dashboard
 *
 * Three sections:
 *   1. Stat cards (4)  — Total Children, Pending Reviews,
 *                        Elevated Cases (30d), Referrals Scheduled
 *   2. Pending Reviews — sorted ELEVATED → INDETERMINATE → MONITOR,
 *                        date descending within tier, divergence flag
 *   3. Activity Feed   — last 10 actions across all patients
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  useClinicianStore,
  PendingReview,
  ActivityEntry,
  ActivityType,
  relativeTime,
} from '@/stores/clinicianStore'
import { RiskTierBadge } from '@/components/parent/RiskTierBadge'
import { calculateAge, formatDate } from '@/utils/age'
import { api } from '@/utils/api'

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  accent: string   // Tailwind bg class for the icon bubble
  loading?: boolean
}

function StatCard({ label, value, icon, accent, loading }: StatCardProps) {
  return (
    <div className="seed-card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center
                        flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-seed-muted truncate">{label}</p>
        {loading ? (
          <div className="h-7 w-10 bg-slate-100 rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-2xl font-extrabold text-seed-dark leading-none mt-0.5">
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Tier sort weight ─────────────────────────────────────────────────────────

const TIER_WEIGHT: Record<string, number> = {
  ELEVATED: 3, INDETERMINATE: 2, MONITOR: 1, MONITOR_CLOSELY: 1,
}

// ─── Divergence flag tooltip ──────────────────────────────────────────────────

function DivergenceWarning() {
  return (
    <div className="relative group inline-flex items-center">
      <span className="text-amber-500 cursor-help select-none text-base">⚠</span>
      <div
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2
                   mb-2 w-60 rounded-xl bg-seed-dark text-white text-xs px-3 py-2
                   leading-relaxed shadow-lg z-50
                   opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      >
        Parent report and behavioral data diverge significantly.
        Manual review required.
        <span
          className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
                     border-x-4 border-x-transparent border-t-4 border-t-seed-dark"
        />
      </div>
    </div>
  )
}

// ─── Tier left-border class ───────────────────────────────────────────────────

function tierBorderCls(tier: PendingReview['riskTier']): string {
  if (tier === 'ELEVATED')     return 'border-l-4 border-l-seed-alert'
  if (tier === 'INDETERMINATE') return 'border-l-4 border-l-amber-400'
  return ''
}

// ─── Session type label ───────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  VIDEO: 'Video', GAME: 'Game', COMBINED: 'Both', MCHAT_ONLY: 'Questionnaire',
}

// ─── Pending reviews queue ────────────────────────────────────────────────────

function PendingQueue() {
  const { pending, isLoadingPending } = useClinicianStore()

  // Client-side sort guarantee (store may have been replaced by API)
  const sorted = [...pending].sort((a, b) => {
    const tierDiff = (TIER_WEIGHT[b.riskTier] ?? 0) - (TIER_WEIGHT[a.riskTier] ?? 0)
    if (tierDiff !== 0) return tierDiff
    return new Date(b.screeningDate).getTime() - new Date(a.screeningDate).getTime()
  })

  return (
    <div className="seed-card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-seed-dark">Pending Reviews</h2>
        {pending.length > 0 && (
          <span className="text-xs font-semibold text-seed-alert bg-red-50
                            px-2.5 py-0.5 rounded-full">
            {pending.length} waiting
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoadingPending && (
        <div className="divide-y divide-slate-50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-32" />
                <div className="h-2 bg-slate-100 rounded w-20" />
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoadingPending && sorted.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm font-medium text-seed-dark mb-1">All caught up</p>
          <p className="text-xs text-seed-muted">No sessions awaiting review.</p>
        </div>
      )}

      {/* Rows */}
      {!isLoadingPending && sorted.length > 0 && (
        <div className="divide-y divide-slate-50">
          {sorted.map((review, i) => {
            const age = calculateAge(
              // Approximate DOB from ageMonths (good enough for display)
              new Date(Date.now() - review.childAgeMonths * 30.44 * 86400000)
                .toISOString()
                .split('T')[0]
            )

            return (
              <motion.div
                key={review.sessionId}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 px-5 py-3.5
                             hover:bg-slate-50/60 transition-colors duration-100
                             ${tierBorderCls(review.riskTier)}`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-seed-teal/10 text-seed-teal
                                  text-sm font-bold flex items-center justify-center
                                  flex-shrink-0">
                  {review.childName[0]}
                </div>

                {/* Child + date */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-seed-dark truncate">
                      {review.childName}
                    </span>
                    {review.divergenceFlag && <DivergenceWarning />}
                  </div>
                  <p className="text-xs text-seed-muted mt-0.5">
                    {age.compact} · {TYPE_LABEL[review.sessionType] ?? review.sessionType}
                    {' · '}
                    {formatDate(review.screeningDate)}
                  </p>
                </div>

                {/* Risk badge */}
                <div className="flex-shrink-0">
                  <RiskTierBadge tier={review.riskTier} size="sm" showDot />
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <span className="text-sm font-bold text-seed-dark">
                    {review.compositeScore}
                  </span>
                  <span className="text-xs text-seed-muted">/70</span>
                </div>

                {/* Review button */}
                <Link
                  to={`/clinician/session/${review.sessionId}`}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-seed-navy
                              text-white text-xs font-semibold hover:bg-seed-teal
                              transition-colors duration-150"
                >
                  Review
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Footer link */}
      {sorted.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100">
          <Link
            to="/clinician/pending"
            className="text-xs font-medium text-seed-teal hover:text-seed-navy
                       transition-colors"
          >
            View all pending reviews →
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Activity feed ────────────────────────────────────────────────────────────

const ACTIVITY_ICON: Record<ActivityType, { emoji: string; bg: string }> = {
  new_screening:      { emoji: '🔬', bg: 'bg-blue-50'    },
  review_completed:   { emoji: '✅', bg: 'bg-emerald-50' },
  referral_scheduled: { emoji: '📅', bg: 'bg-amber-50'   },
  override_applied:   { emoji: '✏️', bg: 'bg-purple-50'  },
}

const ACTIVITY_TEXT: Record<ActivityType, string> = {
  new_screening:      'New screening submitted',
  review_completed:   'Review completed',
  referral_scheduled: 'Referral scheduled',
  override_applied:   'Risk tier override applied',
}

function ActivityFeed() {
  const { activity } = useClinicianStore()

  return (
    <div className="seed-card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-seed-dark">Recent Activity</h2>
      </div>

      <div className="divide-y divide-slate-50">
        {activity.map((entry: ActivityEntry, i) => {
          const cfg = ACTIVITY_ICON[entry.type]
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/60
                          transition-colors duration-100"
            >
              <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center
                                justify-center flex-shrink-0 text-base mt-0.5`}>
                {cfg.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-seed-dark">
                  {entry.childName}
                </p>
                <p className="text-xs text-seed-muted mt-0.5">
                  {ACTIVITY_TEXT[entry.type]}
                </p>
                {entry.detail && (
                  <p className="text-xs text-slate-400 mt-0.5 italic">{entry.detail}</p>
                )}
              </div>
              <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                {relativeTime(entry.timestamp)}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ClinicianDashboard() {
  const {
    stats,
    setStats,
    setPending,
    setActivity,
    setLoadingStats,
    setLoadingPending,
  } = useClinicianStore()

  // Fetch live data on mount; fall back to mock if unavailable
  useEffect(() => {
    setLoadingStats(true)
    setLoadingPending(true)

    api
      .get('/clinician/dashboard')
      .then(({ data }) => {
        if (data.stats)   setStats(data.stats)
        if (data.pending) setPending(data.pending)
        if (data.activity)setActivity(data.activity)
      })
      .catch(() => { /* API unavailable — mock data stays in store */ })
      .finally(() => {
        setLoadingStats(false)
        setLoadingPending(false)
      })
  }, [setStats, setPending, setActivity, setLoadingStats, setLoadingPending])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="p-6 space-y-6 max-w-7xl"
    >
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-seed-dark">Overview</h1>
        <p className="text-sm text-seed-muted mt-0.5">
          Clinical screening dashboard
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Children"
          value={stats.totalChildren}
          accent="bg-seed-teal/10"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#028090" strokeWidth={1.8} className="w-5 h-5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Pending Reviews"
          value={stats.pendingReviews}
          accent="bg-amber-50"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={1.8} className="w-5 h-5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Elevated (30 days)"
          value={stats.elevatedCases30d}
          accent="bg-red-50"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth={1.8} className="w-5 h-5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Referrals Scheduled"
          value={stats.referralsScheduled}
          accent="bg-emerald-50"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={1.8} className="w-5 h-5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
              <line x1="8"  y1="2" x2="8"  y2="6" strokeLinecap="round" />
              <line x1="3"  y1="10" x2="21" y2="10" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* Main content: 2/3 + 1/3 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PendingQueue />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </motion.div>
  )
}
