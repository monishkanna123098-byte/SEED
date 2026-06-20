/**
 * S.E.E.D. Clinician — Game Data Tab
 *
 * Shows per-module behavioral metrics from Buddy's World:
 *   Module 1  Gaze Tracking    — accuracy, reaction time, social following ratio, trial LineChart
 *   Module 2  Peer Imitation   — accuracy, latency, trial accuracy BarChart
 *   Module 3  Sort Task        — precision, drag smoothness, fixation pattern flag
 *   Module 4  Sequence Follow  — accuracy, flexibility/rigidity scores, trial BarChart
 *   Overall   — completion rate + disengagement event log
 *
 * Visible only when session type includes a game component.
 */

import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { GameData as GameDataType, DisengagementEvent } from '../SessionDetailPage'

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatBadge({ value, unit, label }: { value: number | string; unit?: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-extrabold text-seed-dark leading-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-sm font-normal text-seed-muted ml-0.5">{unit}</span>}
      </p>
      <p className="text-[11px] text-seed-muted mt-0.5">{label}</p>
    </div>
  )
}

function ScoreBar({ score, max = 10, color = 'bg-seed-teal', delay = 0 }: {
  score: number; max?: number; color?: string; delay?: number
}) {
  const pct = Math.min((score / max) * 100, 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-semibold text-seed-dark w-8 text-right">
        {score.toFixed(1)}
      </span>
    </div>
  )
}

function ModuleCard({ title, icon, children }: {
  title: string; icon: string; children: React.ReactNode
}) {
  return (
    <div className="seed-card space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-seed-dark">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ─── Chart tooltips ───────────────────────────────────────────────────────────

function ReactionTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow">
      <p className="font-medium text-seed-dark">Trial {label}</p>
      <p className="text-seed-muted">
        {payload[0].value === 0 ? 'No response / Incorrect' : `${payload[0].value.toLocaleString()} ms`}
      </p>
    </div>
  )
}

function AccuracyTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow">
      <p className="font-medium text-seed-dark">Trial {label}</p>
      <p className={payload[0].value ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
        {payload[0].value ? '✓ Correct' : '✗ Incorrect'}
      </p>
    </div>
  )
}

// ─── Module 1 — Gaze Tracking ─────────────────────────────────────────────────

function Module1({ m }: { m: GameDataType['module1'] }) {
  return (
    <ModuleCard title="Module 1 — Gaze Tracking" icon="👁">
      <div className="grid grid-cols-3 gap-4 pb-3 border-b border-slate-50">
        <StatBadge value={m.accuracy_pct.toFixed(1)} unit="%" label="Accuracy" />
        <StatBadge value={m.mean_reaction_ms.toLocaleString()} unit="ms" label="Mean reaction" />
        <StatBadge value={m.social_following_ratio.toFixed(2)} label="Social follow ratio" />
      </div>

      <div>
        <p className="text-xs font-medium text-seed-muted mb-2">
          Reaction time per trial (ms) — 0 = no response
        </p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={m.trials} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="trial" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 4000]} />
            <ReferenceLine y={1500} stroke="#10b981" strokeDasharray="4 2"
              label={{ value: 'norm', fontSize: 9, fill: '#10b981', position: 'right' }} />
            <Tooltip content={<ReactionTooltip />} />
            <Line type="monotone" dataKey="value" stroke="#065A82" strokeWidth={2}
              dot={{ fill: '#065A82', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ModuleCard>
  )
}

// ─── Module 2 — Peer Imitation ────────────────────────────────────────────────

function Module2({ m }: { m: GameDataType['module2'] }) {
  return (
    <ModuleCard title="Module 2 — Peer Imitation" icon="🤝">
      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-50">
        <StatBadge value={m.accuracy_pct.toFixed(1)} unit="%" label="Accuracy" />
        <StatBadge value={m.mean_latency_ms.toLocaleString()} unit="ms" label="Mean latency" />
      </div>

      <div>
        <p className="text-xs font-medium text-seed-muted mb-2">
          Sequence accuracy per trial (1 = correct, 0 = incorrect)
        </p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={m.trials} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="trial" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 1]} ticks={[0, 1]} />
            <Tooltip content={<AccuracyTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}
              fill="#028090"
              // Color bars individually by value
              label={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ModuleCard>
  )
}

// ─── Module 3 — Sort Task ─────────────────────────────────────────────────────

function Module3({ m }: { m: GameDataType['module3'] }) {
  return (
    <ModuleCard title="Module 3 — Sort Task" icon="🔵">
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-seed-dark">Precision score</span>
            <span className="text-xs text-seed-muted">0–10</span>
          </div>
          <ScoreBar score={m.precision_score}
            color={m.precision_score >= 6.5 ? 'bg-seed-alert' : m.precision_score >= 3.5 ? 'bg-amber-400' : 'bg-seed-teal'}
            delay={0.2} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-seed-dark">Drag smoothness</span>
            <span className="text-xs text-seed-muted">0–10</span>
          </div>
          <ScoreBar score={m.drag_smoothness}
            color={m.drag_smoothness >= 6.5 ? 'bg-seed-alert' : m.drag_smoothness >= 3.5 ? 'bg-amber-400' : 'bg-seed-teal'}
            delay={0.3} />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-seed-dark">Restricted interest pattern</span>
          {m.fixation_pattern_flag ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
              ⚠ Detected
            </span>
          ) : (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              Not detected
            </span>
          )}
        </div>
      </div>
    </ModuleCard>
  )
}

// ─── Module 4 — Sequence Following ───────────────────────────────────────────

function Module4({ m }: { m: GameDataType['module4'] }) {
  return (
    <ModuleCard title="Module 4 — Sequence Following" icon="🔢">
      <div className="grid grid-cols-3 gap-3 pb-3 border-b border-slate-50">
        <StatBadge value={m.accuracy_pct.toFixed(1)} unit="%" label="Accuracy" />
        <StatBadge value={m.flexibility_score.toFixed(1)} unit="/10" label="Flexibility" />
        <StatBadge value={m.rigidity_score.toFixed(1)} unit="/10" label="Rigidity" />
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-seed-muted">Flexibility (higher = more adaptive)</span>
          </div>
          <ScoreBar score={m.flexibility_score}
            color={m.flexibility_score >= 5 ? 'bg-seed-teal' : 'bg-amber-400'}
            delay={0.2} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-seed-muted">Rigidity (higher = more concern)</span>
          </div>
          <ScoreBar score={m.rigidity_score}
            color={m.rigidity_score >= 6.5 ? 'bg-seed-alert' : m.rigidity_score >= 3.5 ? 'bg-amber-400' : 'bg-seed-teal'}
            delay={0.3} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-seed-muted mb-2">Trial accuracy</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={m.trials} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="trial" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 1]} ticks={[0, 1]} />
            <Tooltip content={<AccuracyTooltip />} />
            <Bar dataKey="value" fill="#028090" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ModuleCard>
  )
}

// ─── Overall ──────────────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  const secs = Math.floor(ms / 1000)
  const m    = Math.floor(secs / 60)
  const s    = secs % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

function OverallSection({ o }: { o: GameDataType['overall'] }) {
  const pct = o.completion_rate_pct

  return (
    <div className="seed-card space-y-4">
      <h3 className="font-semibold text-seed-dark border-b border-slate-100 pb-3">
        Overall Session
      </h3>

      {/* Completion bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-seed-dark">Session completion</span>
          <span className="text-sm font-bold text-seed-dark">{pct}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${pct >= 80 ? 'bg-seed-teal' : pct >= 50 ? 'bg-amber-400' : 'bg-seed-alert'}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Disengagement events */}
      <div>
        <p className="text-sm font-medium text-seed-dark mb-2">
          Disengagement events ({o.disengagement_events.length})
        </p>

        {o.disengagement_events.length === 0 ? (
          <p className="text-sm text-seed-muted italic">None detected.</p>
        ) : (
          <div className="space-y-2">
            {o.disengagement_events.map((ev: DisengagementEvent, i: number) => (
              <div key={i}
                className="flex items-center gap-3 text-sm bg-amber-50 border
                            border-amber-100 rounded-xl px-3 py-2.5">
                <span className="text-amber-500 flex-shrink-0">⚡</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-seed-dark truncate">{ev.module}</p>
                  <p className="text-xs text-seed-muted">
                    At {formatMs(ev.timestamp_ms)} into session
                    · auto-advanced after {Math.round(ev.duration_ms / 1000)}s
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

interface GameDataProps {
  data?:        GameDataType
  sessionType?: string
}

export function GameData({ data, sessionType }: GameDataProps) {
  const hasGame = sessionType === 'GAME' || sessionType === 'COMBINED'

  if (!hasGame) {
    return (
      <div className="seed-card py-12 text-center">
        <p className="text-3xl mb-2">🎮</p>
        <p className="font-medium text-seed-dark mb-1">No game data</p>
        <p className="text-sm text-seed-muted">
          This session did not include Buddy's World.
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="seed-card py-12 text-center">
        <p className="text-3xl mb-2">⏳</p>
        <p className="font-medium text-seed-dark mb-1">Game data unavailable</p>
        <p className="text-sm text-seed-muted">
          Game data has not been processed for this session yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Module1 m={data.module1} />
      <Module2 m={data.module2} />
      <Module3 m={data.module3} />
      <Module4 m={data.module4} />
      <OverallSection o={data.overall} />
    </div>
  )
}
