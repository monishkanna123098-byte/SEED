/**
 * S.E.E.D. Clinician — Behavioral Analysis Tab
 *
 * Section A: 5 metric cards (Gaze, Reaction, Precision, Imitation, Engagement)
 *   Each card: metric name, DSM-5 criterion, raw score, z-score, risk flag,
 *   mini comparison bar (child vs age norm), plain-English interpretation.
 *
 * Section B: Criterion A breakdown (A1/A2/A3, total 0–30)
 *   Animated horizontal bars + contribution scores.
 *
 * Section C: Criterion B breakdown (B1/B2/B3/B4, total 0–40)
 *   Same pattern as Section B.
 */

import { motion } from 'framer-motion'
import {
  SessionDetail,
  GazeMetric,
  ReactionMetric,
  PrecisionMetric,
  ImitationMetric,
  EngagementMetric,
  CriterionSub,
} from '../SessionDetailPage'

// ─── Risk flag badge ──────────────────────────────────────────────────────────

function FlagBadge({ flagged }: { flagged: boolean }) {
  return flagged ? (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
      YES — Flagged
    </span>
  ) : (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      NO — Not Flagged
    </span>
  )
}

// ─── Mini comparison bar ──────────────────────────────────────────────────────

function ComparisonBar({
  childScore,
  normScore,
  flagged,
  delay = 0,
}: {
  childScore: number
  normScore:  number
  flagged:    boolean
  delay?:     number
}) {
  const max = 10
  const childPct = Math.min((childScore / max) * 100, 100)
  const normPct  = Math.min((normScore  / max) * 100, 100)
  const barColor = flagged ? 'bg-seed-alert' : 'bg-seed-teal'

  return (
    <div className="space-y-1.5">
      {/* Child score bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-seed-muted w-10 flex-shrink-0">Score</span>
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${childPct}%` }}
            transition={{ duration: 0.8, delay, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs font-semibold text-seed-dark w-8 flex-shrink-0 text-right">
          {childScore.toFixed(1)}
        </span>
      </div>
      {/* Age norm bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-seed-muted w-10 flex-shrink-0">Norm</span>
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-slate-400"
            initial={{ width: 0 }}
            animate={{ width: `${normPct}%` }}
            transition={{ duration: 0.7, delay: delay + 0.1, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs text-seed-muted w-8 flex-shrink-0 text-right">
          {normScore.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

// ─── Individual metric cards ──────────────────────────────────────────────────

interface MetricCardProps {
  title:       string
  dsm5:        string
  metric:      { score: number; zscore: number; flag: boolean; norm: number }
  children:    React.ReactNode   // plain-English interpretation
  delay?:      number
}

function MetricCard({ title, dsm5, metric, children, delay = 0 }: MetricCardProps) {
  const ringCls = metric.flag
    ? 'ring-1 ring-seed-alert/40'
    : 'ring-1 ring-emerald-200'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`seed-card space-y-3 ${ringCls}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h4 className="font-semibold text-seed-dark">{title}</h4>
          <span className="text-[10px] font-medium text-seed-muted bg-slate-100
                            px-2 py-0.5 rounded-full mt-1 inline-block">
            {dsm5}
          </span>
        </div>
        <FlagBadge flagged={metric.flag} />
      </div>

      {/* Score row */}
      <div className="flex items-center gap-5 text-sm">
        <div>
          <span className="text-xs text-seed-muted">Raw score</span>
          <p className="text-xl font-extrabold text-seed-dark leading-tight">
            {metric.score.toFixed(1)}
            <span className="text-xs font-normal text-seed-muted">/10</span>
          </p>
        </div>
        <div>
          <span className="text-xs text-seed-muted">Z-score</span>
          <p className={`text-xl font-extrabold leading-tight ${
            metric.zscore >= 2 ? 'text-seed-alert' :
            metric.zscore >= 1 ? 'text-amber-600'  : 'text-emerald-600'
          }`}>
            {metric.zscore >= 0 ? '+' : ''}{metric.zscore.toFixed(1)}σ
          </p>
        </div>
      </div>

      {/* Comparison bar */}
      <ComparisonBar
        childScore={metric.score}
        normScore={metric.norm}
        flagged={metric.flag}
        delay={delay + 0.2}
      />

      {/* Plain-English interpretation */}
      <p className="text-xs text-seed-muted leading-relaxed italic border-t
                    border-slate-100 pt-2">
        {children}
      </p>
    </motion.div>
  )
}

// ─── Criterion breakdown bar ──────────────────────────────────────────────────

function CriterionBar({ sub, delay = 0, color = 'bg-seed-teal' }: {
  sub:   CriterionSub
  delay?: number
  color?: string
}) {
  const pct = Math.min((sub.score / sub.max) * 100, 100)

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-seed-dark w-44 truncate flex-shrink-0">{sub.name}</span>
      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.85, delay, ease: 'easeOut' }}
        />
      </div>
      <span className="text-sm font-bold text-seed-dark w-12 text-right flex-shrink-0">
        {sub.score}
        <span className="font-normal text-seed-muted">/{sub.max}</span>
      </span>
    </div>
  )
}

function CriterionSection({
  title, total, max, subs, color, startDelay,
}: {
  title:       string
  total:       number
  max:         number
  subs:        CriterionSub[]
  color:       string
  startDelay:  number
}) {
  const pct = Math.round((total / max) * 100)

  return (
    <div className="seed-card space-y-4">
      {/* Title + total */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-seed-dark">{title}</h3>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-seed-dark">{total}</span>
          <span className="text-sm text-seed-muted">/{max}</span>
          <span className="ml-2 text-xs text-seed-muted">({pct}%)</span>
        </div>
      </div>

      {/* Aggregate bar */}
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color} opacity-40`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: startDelay, ease: 'easeOut' }}
        />
      </div>

      {/* Sub-criterion bars */}
      <div className="space-y-2.5">
        {subs.map((sub, i) => (
          <CriterionBar
            key={sub.name}
            sub={sub}
            delay={startDelay + 0.1 + i * 0.1}
            color={color}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Tab 1 root ───────────────────────────────────────────────────────────────

export function BehavioralAnalysis({ detail }: { detail: SessionDetail }) {
  const { metrics, criterionA, criterionB } = detail
  const m = metrics

  return (
    <div className="space-y-6">
      {/* ── Section A: Metric cards ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold text-seed-dark mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-seed-teal/15 text-seed-teal text-xs
                            font-bold flex items-center justify-center">A</span>
          Metric Scores
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Gaze Tracking"
            dsm5="DSM-5: A1 Social reciprocity · A2 Nonverbal"
            metric={m.gaze}
            delay={0}
          >
            Child maintained eye contact with social stimuli{' '}
            <strong>{(m.gaze as GazeMetric).gazePct}%</strong> of prompted interactions
          </MetricCard>

          <MetricCard
            title="Reaction Latency"
            dsm5="DSM-5: A1 Social reciprocity"
            metric={m.reaction}
            delay={0.07}
          >
            Mean response latency to social stimuli:{' '}
            <strong>{(m.reaction as ReactionMetric).latencyMs.toLocaleString()}ms</strong>{' '}
            (<strong>{(m.reaction as ReactionMetric).sigma.toFixed(1)}σ</strong> above age norm)
          </MetricCard>

          <MetricCard
            title="Touch Precision"
            dsm5="DSM-5: B1 Stereotyped movements (proxy)"
            metric={m.precision}
            delay={0.14}
          >
            Touch accuracy:{' '}
            <strong>{(m.precision as PrecisionMetric).accuracyPct}%</strong>{' '}
            on age-calibrated motor tasks
          </MetricCard>

          <MetricCard
            title="Peer Imitation"
            dsm5="DSM-5: A3 Relationships"
            metric={m.imitation}
            delay={0.21}
          >
            Avatar gesture reproduction:{' '}
            <strong>{(m.imitation as ImitationMetric).accuracyPct}%</strong> accuracy across{' '}
            <strong>{(m.imitation as ImitationMetric).trials}</strong> trials
          </MetricCard>

          <MetricCard
            title="Engagement"
            dsm5="DSM-5: A2 Nonverbal · B4 Sensory reactivity"
            metric={m.engagement}
            delay={0.28}
          >
            <strong>{(m.engagement as EngagementMetric).disengageCount}</strong>{' '}
            disengagement events detected. Session completion:{' '}
            <strong>{(m.engagement as EngagementMetric).completionPct}%</strong>
          </MetricCard>
        </div>
      </div>

      {/* ── Section B: Criterion A breakdown ──────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold text-seed-dark mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-seed-teal/15 text-seed-teal text-xs
                            font-bold flex items-center justify-center">B</span>
          DSM-5 Criterion A Breakdown
        </h2>

        <CriterionSection
          title="Criterion A — Social Communication"
          total={criterionA.total}
          max={criterionA.max}
          subs={[criterionA.a1, criterionA.a2, criterionA.a3]}
          color="bg-seed-teal"
          startDelay={0.2}
        />
      </div>

      {/* ── Section C: Criterion B breakdown ──────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold text-seed-dark mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-seed-amber/30 text-amber-700 text-xs
                            font-bold flex items-center justify-center">C</span>
          DSM-5 Criterion B Breakdown
        </h2>

        <CriterionSection
          title="Criterion B — Restricted & Repetitive Behaviours"
          total={criterionB.total}
          max={criterionB.max}
          subs={[criterionB.b1, criterionB.b2, criterionB.b3, criterionB.b4]}
          color="bg-seed-amber"
          startDelay={0.3}
        />
      </div>
    </div>
  )
}
