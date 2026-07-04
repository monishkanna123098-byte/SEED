/**
 * Step 6 — Results Screen
 *
 * Fetches the completed session from /api/screening/:id/results.
 * Falls back to mock data in demo mode if the API is unavailable.
 *
 * Layout (top → bottom):
 *   Risk tier card      — animated entrance (spring scale-up)
 *   Composite score bar — colored zones 0-20/20-35/35-70, animated fill
 *   5-metric breakdown  — plain-English labels, no raw numbers shown
 *   Session info row
 *   Action buttons      — PDF, Share with Clinician, Back to Dashboard
 *   Disclaimer box      — always visible, red border
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '@/utils/api'
import { useParentStore } from '@/stores/parentStore'
import { formatDate } from '@/utils/age'
import { WizardState } from './NewScreeningPage'
import { RiskTierBadge } from '@/components/parent/RiskTierBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

type DisplayTier = 'MONITOR' | 'INDETERMINATE' | 'ELEVATED'

interface MetricScores {
  gaze:       number   // 0–10, higher = more concern
  reaction:   number
  touch:      number
  imitation:  number
  engagement: number
}

interface ResultsData {
  riskTier:       DisplayTier
  compositeScore: number
  sessionType:    string
  createdAt:      string
  metrics:        MetricScores
}

// ─── Mock results (demo / API-unavailable fallback) ───────────────────────────

const MOCK_RESULTS: ResultsData = {
  riskTier:       'INDETERMINATE',
  compositeScore: 22,
  sessionType:    'COMBINED',
  createdAt:      new Date().toISOString(),
  metrics: {
    gaze:       2.4,
    reaction:   4.1,
    touch:      2.0,
    imitation:  5.6,
    engagement: 3.8,
  },
}

// ─── Risk tier display config ─────────────────────────────────────────────────
// Colors are derived from RiskTierBadge.tsx — single source of truth.
// Narrative text is parent-facing (plain language, non-alarming).

interface TierCard {
  title:    string
  body:     string
  bg:       string
  border:   string
  titleCls: string
  bodyCls:  string
}

// These colors match RiskTierBadge CONFIG exactly — no divergence.
const TIER_CARD: Record<string, TierCard> = {
  MONITOR: {
    title:    'Development Looks Typical',
    body:     'Your child\'s responses are within expected ranges. Continue monthly check-ins and contact your paediatrician if you have any concerns.',
    bg:       'bg-emerald-50',
    border:   'border-emerald-200',
    titleCls: 'text-emerald-800',
    bodyCls:  'text-emerald-700',
  },
  INDETERMINATE: {
    title:    'Some Patterns Worth Discussing',
    body:     'We noticed some responses worth reviewing with your child\'s doctor. This is not a diagnosis — many children in this range develop typically.',
    bg:       'bg-amber-50',
    border:   'border-amber-200',
    titleCls: 'text-amber-800',
    bodyCls:  'text-amber-700',
  },
  ELEVATED: {
    title:    'We Recommend Speaking with a Specialist',
    body:     'Your child\'s responses suggest some developmental patterns a specialist should review. Your clinician will reach out within 72 hours to schedule a consultation.',
    bg:       'bg-red-50',
    border:   'border-red-200',
    titleCls: 'text-red-800',
    bodyCls:  'text-red-700',
  },
}

function getTierCard(tier: DisplayTier): TierCard {
  return TIER_CARD[tier] ?? TIER_CARD.INDETERMINATE
}

// ─── Metric helpers ───────────────────────────────────────────────────────────

const METRIC_DEFS: Array<{ key: keyof MetricScores; label: string }> = [
  { key: 'gaze',       label: 'Gaze Tracking' },
  { key: 'reaction',   label: 'Reaction Latency' },
  { key: 'touch',      label: 'Touch Precision' },
  { key: 'imitation',  label: 'Peer Imitation' },
  { key: 'engagement', label: 'Engagement' },
]

interface MetricLabel {
  text:   string
  color:  string
  bg:     string
  width:  string  // % bar fill
}

function metricLabel(score: number): MetricLabel {
  const pct = `${Math.round((score / 10) * 100)}%`
  if (score < 3.5)  return { text: 'Not Flagged',        color: 'text-emerald-700', bg: 'bg-emerald-500', width: pct }
  if (score < 6.5)  return { text: 'Watch',              color: 'text-amber-700',   bg: 'bg-amber-500',   width: pct }
  return               { text: 'Review Recommended', color: 'text-red-700',     bg: 'bg-red-500',     width: pct }
}

// ─── Raw metric extractor ─────────────────────────────────────────────────────

function extractMetrics(rawMetrics: Record<string, unknown> | null | undefined): MetricScores {
  if (!rawMetrics) return MOCK_RESULTS.metrics
  return {
    gaze:       Number(rawMetrics.gaze_score       ?? rawMetrics.gaze       ?? 3),
    reaction:   Number(rawMetrics.reaction_score   ?? rawMetrics.reaction   ?? 3),
    touch:      Number(rawMetrics.touch_score      ?? rawMetrics.touch      ?? 3),
    imitation:  Number(rawMetrics.imitation_score  ?? rawMetrics.imitation  ?? 3),
    engagement: Number(rawMetrics.engagement_score ?? rawMetrics.engagement ?? 3),
  }
}

// ─── Session type label ───────────────────────────────────────────────────────

const SESSION_TYPE_LABEL: Record<string, string> = {
  VIDEO: 'Video only',
  GAME: 'Game only',
  COMBINED: 'Video + Game',
  MCHAT_ONLY: 'Questionnaire only',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RiskTierCard({ tier }: { tier: DisplayTier }) {
  const cfg = getTierCard(tier)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-2xl border-2 ${cfg.bg} ${cfg.border} p-5`}
    >
      {/* RiskTierBadge at top — canonical label/color, no duplication */}
      <div className="mb-3">
        <RiskTierBadge tier={tier} size="md" />
      </div>
      <h2 className={`text-lg font-bold mb-1 ${cfg.titleCls}`}>{cfg.title}</h2>
      <p className={`text-sm leading-relaxed ${cfg.bodyCls}`}>{cfg.body}</p>
    </motion.div>
  )
}

function ScoreBar({ score }: { score: number }) {
  // Zone widths as % of 0–70 total
  const greenWidth  = (20 / 70) * 100   // 28.57%
  const amberWidth  = (15 / 70) * 100   // 21.43%
  const redWidth    = (35 / 70) * 100   // 50.00%
  const markerPct   = Math.min((score / 70) * 100, 99)

  return (
    <div className="seed-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-seed-dark">Overall Score</h3>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-2xl font-extrabold text-seed-dark"
        >
          {score}
          <span className="text-sm font-normal text-seed-muted ml-1">/ 70</span>
        </motion.span>
      </div>

      {/* Colored zone bar */}
      <div className="relative h-5 rounded-full overflow-hidden bg-slate-100 mb-2">
        {/* Zones */}
        <div className="absolute inset-0 flex">
          <div style={{ width: `${greenWidth}%` }} className="bg-emerald-200" />
          <div style={{ width: `${amberWidth}%` }} className="bg-amber-200"   />
          <div style={{ width: `${redWidth}%`   }} className="bg-red-200"     />
        </div>

        {/* Animated overlay fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-seed-dark/25 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${markerPct}%` }}
          transition={{ duration: 1.4, delay: 0.4, ease: 'easeOut' }}
        />

        {/* Score needle */}
        <motion.div
          className="absolute top-0 bottom-0 w-1.5 bg-seed-navy rounded-full shadow"
          initial={{ left: '0%' }}
          animate={{ left: `calc(${markerPct}% - 3px)` }}
          transition={{ duration: 1.4, delay: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Zone legend */}
      <div className="flex justify-between text-[10px] text-seed-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-emerald-300 inline-block" />
          0–20 Typical
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-amber-300 inline-block" />
          20–35 Watch
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-300 inline-block" />
          35–70 Elevated
        </span>
      </div>
    </div>
  )
}

function MetricBreakdown({ metrics }: { metrics: MetricScores }) {
  return (
    <div className="seed-card">
      <h3 className="font-semibold text-seed-dark mb-4">Detailed Breakdown</h3>
      <div className="space-y-3">
        {METRIC_DEFS.map(({ key, label }, i) => {
          const score = metrics[key]
          const lbl   = metricLabel(score)

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-seed-dark">{label}</span>
                <span className={`text-xs font-semibold ${lbl.color}`}>{lbl.text}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${lbl.bg}`}
                  initial={{ width: 0 }}
                  animate={{ width: lbl.width }}
                  transition={{ duration: 0.9, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Step6Props {
  state: WizardState
}

export function Step6_Results({ state }: Step6Props) {
  const { children } = useParentStore()
  const child  = children.find((c) => c.id === state.selectedChildId)
  const printRef = useRef<HTMLDivElement>(null)

  const [results, setResults] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch session results
  useEffect(() => {
    if (!state.sessionId) {
      setResults(MOCK_RESULTS)
      setLoading(false)
      return
    }

    // GET /screening/:id/results returns flat shape:
    // { sessionId, status, sessionType, riskTier, compositeScore, rawMetrics, completedAt, ... }
    // NOT { session: { ... } }
    api
      .get<{
        sessionId:      string
        status:         string
        sessionType?:   string
        riskTier?:      string
        compositeScore?: number
        rawMetrics?:    Record<string, unknown>
        completedAt?:   string
      }>(`/screening/${state.sessionId}/results`)
      .then(({ data }) => {
        setResults({
          riskTier:       (data.riskTier ?? 'INDETERMINATE') as DisplayTier,
          compositeScore: data.compositeScore ?? 0,
          sessionType:    data.sessionType    ?? state.modality ?? 'COMBINED',
          createdAt:      data.completedAt    ?? new Date().toISOString(),
          metrics:        extractMetrics(data.rawMetrics),
        })
      })
      .catch(() => {
        // Demo mode — use mock results
        setResults(MOCK_RESULTS)
      })
      .finally(() => setLoading(false))
  }, [state.sessionId, state.modality])

  // Print / Save as PDF
  function handlePrint() {
    window.print()
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-seed-teal border-t-transparent
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (!results) return null

  const tier   = results.riskTier
  const typeLabel = SESSION_TYPE_LABEL[results.sessionType] ?? results.sessionType

  // ── Results ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Print-only header injected into <head> via a style tag */}
      <style>{`
        @media print {
          aside, header { display: none !important; }
          main { margin-left: 0 !important; padding-top: 0 !important; }
          #seed-print-root { display: block !important; }
          .no-print { display: none !important; }
          .seed-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}</style>

      <div
        id="seed-print-root"
        ref={printRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="p-6 max-w-2xl mx-auto w-full space-y-5 pb-10">

          {/* Risk tier card */}
          <RiskTierCard tier={tier} />

          {/* Composite score */}
          <ScoreBar score={results.compositeScore} />

          {/* 5-metric breakdown */}
          <MetricBreakdown metrics={results.metrics} />

          {/* Session info */}
          <div className="seed-card">
            <h3 className="font-semibold text-seed-dark mb-3">Screening Details</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-seed-muted text-xs mb-0.5">Date</p>
                <p className="font-medium text-seed-dark">{formatDate(results.createdAt)}</p>
              </div>
              <div>
                <p className="text-seed-muted text-xs mb-0.5">Method</p>
                <p className="font-medium text-seed-dark">{typeLabel}</p>
              </div>
              <div>
                <p className="text-seed-muted text-xs mb-0.5">Child</p>
                <p className="font-medium text-seed-dark">{child?.name ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 no-print">
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         border-2 border-seed-teal/40 text-seed-teal font-medium text-sm
                         hover:bg-seed-teal/5 transition-all duration-150"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.8} className="w-4 h-4">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012
                         2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />
              </svg>
              Save Report as PDF
            </button>

            <Link
              to="/parent/dashboard"
              className="seed-btn-primary w-full text-center"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Mandatory disclaimer */}
          <div className="rounded-2xl border-2 border-seed-alert/30 bg-red-50 p-4">
            <div className="flex items-start gap-2.5">
              <svg viewBox="0 0 20 20" fill="none" stroke="#E63946"
                strokeWidth={1.6} className="w-5 h-5 flex-shrink-0 mt-0.5">
                <path d="M10 2L2 17h16L10 2z" />
                <line x1="10" y1="9" x2="10" y2="12" strokeLinecap="round" />
                <circle cx="10" cy="14.5" r="0.6" fill="#E63946" />
              </svg>
              <p className="text-xs text-red-700 leading-relaxed">
                <strong>This screening result is not a medical diagnosis.</strong>{' '}
                S.E.E.D. is a decision-support tool for healthcare professionals.
                Always consult a qualified clinician before making any healthcare decisions.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
