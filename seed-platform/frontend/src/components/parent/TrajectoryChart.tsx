/**
 * TrajectoryChart — composite score over time for one child.
 *
 * Colored reference bands:
 *   0–23   green  (Monitor Closely)
 *   24–46  amber  (Indeterminate)
 *   47–70  red    (Elevated)
 *
 * Uses Recharts: ReferenceArea, LineChart, Line, XAxis, YAxis, Tooltip.
 */

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
  Dot,
} from 'recharts'
import { ScreeningSession, RiskTier } from '@/types'
import { formatDate } from '@/utils/age'

interface ChartPoint {
  date: string
  dateLabel: string
  score: number
  tier: RiskTier | null
}

interface TrajectoryChartProps {
  sessions: ScreeningSession[]
}

// ─── Custom tooltip ─────────────────────────────────────────────────────────

const tierLabel: Record<string, string> = {
  MONITOR: 'Typical Development',
  INDETERMINATE: 'Discuss with Clinician',
  ELEVATED: 'Specialist Recommended',
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: ChartPoint }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const score = point.score

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-seed-dark mb-1">{label}</p>
      <p className="text-seed-muted">
        Score: <span className="font-bold text-seed-dark">{score}</span>
        <span className="text-slate-400"> / 70</span>
      </p>
      {point.tier && (
        <p className="text-seed-muted mt-0.5">
          {tierLabel[point.tier] ?? point.tier}
        </p>
      )}
    </div>
  )
}

// ─── Custom dot — color-coded by tier ───────────────────────────────────────

const DOT_COLORS: Record<string, string> = {
  MONITOR: '#10b981',
  INDETERMINATE: '#f59e0b',
  ELEVATED: '#ef4444',
}

function TieredDot(props: {
  cx?: number
  cy?: number
  payload?: ChartPoint
}) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined) return null
  const fill = DOT_COLORS[payload?.tier ?? ''] ?? '#028090'
  return <Dot cx={cx} cy={cy} r={6} fill={fill} stroke="#fff" strokeWidth={2} />
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <svg
        width="80"
        height="72"
        viewBox="0 0 80 72"
        fill="none"
        aria-hidden="true"
        className="mb-4 opacity-40"
      >
        <rect x="4" y="4" width="72" height="64" rx="8" stroke="#028090" strokeWidth="2" strokeDasharray="5 3" />
        <circle cx="20" cy="52" r="5" fill="#10b981" />
        <circle cx="40" cy="38" r="5" fill="#f59e0b" />
        <circle cx="60" cy="24" r="5" fill="#10b981" />
        <line x1="20" y1="52" x2="40" y2="38" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 2" />
        <line x1="40" y1="38" x2="60" y2="24" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 2" />
      </svg>
      <p className="text-sm font-medium text-seed-dark mb-1">No trajectory yet</p>
      <p className="text-xs text-seed-muted max-w-xs">
        Complete 2 or more screenings to see your child's development trajectory over time
      </p>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({ sessions }) => {
  // Only use completed sessions with a composite score
  const completeSessions = sessions
    .filter((s) => s.status === 'COMPLETE' && typeof s.compositeScore === 'number')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  if (completeSessions.length < 2) {
    return <EmptyState />
  }

  const data: ChartPoint[] = completeSessions.map((s) => ({
    date: s.createdAt,
    dateLabel: formatDate(s.createdAt),
    score: s.compositeScore!,
    tier: s.riskTier ?? null,
  }))

  return (
    <div className="w-full">
      {/* Zone legend */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {[
          { color: 'bg-emerald-200', label: '0–23 Typical' },
          { color: 'bg-amber-200', label: '24–46 Watch' },
          { color: 'bg-red-200', label: '47+ Elevated' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-seed-muted">
            <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
            {label}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          {/* Reference bands (rendered behind everything) */}
          <ReferenceArea y1={0} y2={23} fill="#dcfce7" fillOpacity={0.7} />
          <ReferenceArea y1={23} y2={46} fill="#fef9c3" fillOpacity={0.7} />
          <ReferenceArea y1={46} y2={70} fill="#fee2e2" fillOpacity={0.7} />

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 70]}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 23, 46, 70]}
          />

          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone"
            dataKey="score"
            stroke="#028090"
            strokeWidth={2.5}
            dot={(props) => <TieredDot {...props} />}
            activeDot={{ r: 8, fill: '#028090' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
