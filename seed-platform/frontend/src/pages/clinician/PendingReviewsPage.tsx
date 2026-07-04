/**
 * S.E.E.D. Clinician — Pending Reviews Page
 * Route: /clinician/pending
 *
 * Dedicated full-page view of sessions awaiting clinical review,
 * sorted by risk tier (ELEVATED first) then recency.
 * Each row links to /clinician/session/:id for full detail.
 */

import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ClipboardList, CheckCircle } from 'lucide-react'
import { useClinicianStore } from '@/stores/clinicianStore'
import { RiskTierBadge } from '@/components/parent/RiskTierBadge'
import { calculateAge, formatDate } from '@/utils/age'

// ─── Tier sort weight ─────────────────────────────────────────────────────────

const TIER_WEIGHT: Record<string, number> = {
  ELEVATED: 3,
  INDETERMINATE: 2,
  MONITOR: 1,
}

const TYPE_LABEL: Record<string, string> = {
  VIDEO: 'Video',
  GAME: 'Game',
  COMBINED: 'Both',
  MCHAT_ONLY: 'Questionnaire',
}

// ─── Divergence warning ───────────────────────────────────────────────────────

function DivergenceWarning() {
  return (
    <span
      title="Modality divergence detected — video and game results differ significantly"
      className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5
                 rounded bg-amber-100 text-amber-800 ml-1"
    >
      Δ
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PendingReviewsPage() {
  const { pending, isLoadingPending } = useClinicianStore()

  const sorted = [...pending].sort((a, b) => {
    const tierDiff = (TIER_WEIGHT[b.riskTier] ?? 0) - (TIER_WEIGHT[a.riskTier] ?? 0)
    if (tierDiff !== 0) return tierDiff
    return new Date(b.screeningDate).getTime() - new Date(a.screeningDate).getTime()
  })

  return (
    <motion.div
      className="p-6 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={20} className="text-seed-navy" />
          <h1 className="text-xl font-bold text-seed-dark">Pending Reviews</h1>
          {pending.length > 0 && (
            <span className="text-xs font-semibold text-seed-alert bg-red-50
                              px-2.5 py-0.5 rounded-full ml-1">
              {pending.length} waiting
            </span>
          )}
        </div>
        <p className="text-sm text-seed-muted">
          Sessions requiring clinical review, sorted by risk tier.
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoadingPending && (
        <div className="seed-card p-0 overflow-hidden divide-y divide-slate-50">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-36" />
                <div className="h-2 bg-slate-100 rounded w-24" />
              </div>
              <div className="h-6 w-24 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoadingPending && sorted.length === 0 && (
        <div className="seed-card text-center py-16">
          <CheckCircle size={36} className="text-seed-mint mx-auto mb-3" />
          <p className="font-semibold text-seed-dark mb-1">All caught up</p>
          <p className="text-sm text-seed-muted">No sessions awaiting review.</p>
        </div>
      )}

      {/* Review rows */}
      {!isLoadingPending && sorted.length > 0 && (
        <div className="seed-card p-0 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {sorted.map((review, i) => {
              const age = calculateAge(
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
                  className="flex items-center gap-4 px-5 py-4
                             hover:bg-slate-50/60 transition-colors duration-100"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-seed-teal/10 text-seed-teal
                                  text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {review.childName[0]}
                  </div>

                  {/* Child info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-seed-dark">
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
                  <div className="flex-shrink-0 text-right w-14">
                    <span className="text-sm font-bold text-seed-dark">
                      {review.compositeScore}
                    </span>
                    <span className="text-xs text-seed-muted">/70</span>
                  </div>

                  {/* Review CTA */}
                  <Link
                    to={`/clinician/session/${review.sessionId}`}
                    className="flex-shrink-0 px-4 py-1.5 rounded-lg bg-seed-navy
                               text-white text-xs font-semibold hover:bg-seed-teal
                               transition-colors duration-150"
                  >
                    Review
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}
