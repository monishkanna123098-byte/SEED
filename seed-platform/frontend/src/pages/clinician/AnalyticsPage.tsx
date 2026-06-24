/**
 * S.E.E.D. Clinician — Analytics Page
 * Route: /clinician/analytics
 *
 * Layout
 *   ① Summary stats row (5 chips)
 *   ② 2×2 chart grid
 *       [Monthly Volume BarChart]  [Risk Distribution DonutChart]
 *       [Score by Age Group Bar]   [Metric Flag Frequency HBar]
 */

import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ─── Palette (matches SEED design tokens) ─────────────────────────────────────

const COLOR = {
  mint:  '#02C39A',
  amber: '#F4A261',
  alert: '#E63946',
  navy:  '#065A82',
  teal:  '#028090',
  muted: '#64748B',
}

// ─── Mock analytics data ───────────────────────────────────────────────────────
// Represents aggregated data across all 61 sessions for this clinician.

// Chart 1 — Monthly volume: last 6 months (Jan–Jun 2026)
const MONTHLY_VOLUME = [
  { month: 'Jan', sessions: 8  },
  { month: 'Feb', sessions: 12 },
  { month: 'Mar', sessions: 9  },
  { month: 'Apr', sessions: 15 },
  { month: 'May', sessions: 11 },
  { month: 'Jun', sessions: 6  },
]

// Chart 2 — Risk distribution (total 61)
const RISK_DISTRIBUTION = [
  { name: 'Monitor Closely', value: 18, pct: 29.5, color: COLOR.mint  },
  { name: 'Indeterminate',   value: 24, pct: 39.3, color: COLOR.amber },
  { name: 'Elevated',        value: 19, pct: 31.1, color: COLOR.alert },
]

// Chart 3 — Average composite score by age group
const SCORE_BY_AGE = [
  { ageGroup: '18–24m', avgScore: 19 },
  { ageGroup: '24–30m', avgScore: 26 },
  { ageGroup: '30–36m', avgScore: 33 },
  { ageGroup: '36–48m', avgScore: 38 },
  { ageGroup: '48–60m', avgScore: 29 },
]

// Chart 4 — Metric flag frequency (horizontal)
const FLAG_FREQUENCY = [
  { metric: 'Imitation',  count: 31 },
  { metric: 'Engagement', count: 27 },
  { metric: 'Gaze',       count: 24 },
  { metric: 'Reaction',   count: 18 },
  { metric: 'Precision',  count: 12 },
]

// Summary stats
const STATS = {
  totalScreened:  61,
  pctElevated:    31.1,
  pctDivergence:  18.0,
  meanComposite:  28.4,
  meanConfidence: 82,
}

// ─── Shared tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active, payload, label, unit = '',
}: {
  active?: boolean
  payload?: Array<{ value: number; name?: string; color?: string }>
  label?: string
  unit?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      {label && <p className="font-semibold text-seed-dark mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? COLOR.teal }}>
          {p.name ? `${p.name}: ` : ''}
          <span className="font-bold">{p.value}</span>
          {unit && <span className="text-xs text-seed-muted"> {unit}</span>}
        </p>
      ))}
    </div>
  )
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────

function ChartCard({
  title, subtitle, children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="seed-card">
      <div className="mb-4">
        <h3 className="font-semibold text-seed-dark">{title}</h3>
        {subtitle && <p className="text-xs text-seed-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Summary stat chip ────────────────────────────────────────────────────────

function StatChip({
  label, value, color = 'text-seed-navy',
}: {
  label: string; value: string; color?: string
}) {
  return (
    <div className="seed-card py-4 text-center flex-1 min-w-[140px]">
      <p className={`text-2xl font-extrabold leading-none ${color}`}>{value}</p>
      <p className="text-xs text-seed-muted mt-1.5 leading-snug">{label}</p>
    </div>
  )
}

// ─── Chart 1: Monthly Volume ──────────────────────────────────────────────────

function MonthlyVolumeChart() {
  return (
    <ChartCard
      title="Monthly Screening Volume"
      subtitle="Sessions completed — last 6 months"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={MONTHLY_VOLUME} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: COLOR.muted }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: COLOR.muted }}
            axisLine={false} tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload as Parameters<typeof ChartTooltip>[0]['payload']}
                label={label as string}
                unit="sessions"
              />
            )}
          />
          <Bar dataKey="sessions" fill={COLOR.teal} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Chart 2: Risk Distribution Donut ────────────────────────────────────────

function RiskDonutCustomLegend() {
  const total = RISK_DISTRIBUTION.reduce((s, d) => s + d.value, 0)
  return (
    <div className="space-y-2 mt-3">
      {RISK_DISTRIBUTION.map(d => (
        <div key={d.name} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-seed-muted text-xs">{d.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-seed-dark">{d.value}</span>
            <span className="text-xs text-seed-muted w-12 text-right">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
      <div className="border-t border-slate-100 pt-2 flex justify-between text-xs">
        <span className="text-seed-muted">Total</span>
        <span className="font-bold text-seed-dark">{total}</span>
      </div>
    </div>
  )
}

function RiskDistributionChart() {
  return (
    <ChartCard
      title="Risk Distribution"
      subtitle="All sessions — proportion by tier"
    >
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={RISK_DISTRIBUTION}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={3}
              strokeWidth={0}
            >
              {RISK_DISTRIBUTION.map(d => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as typeof RISK_DISTRIBUTION[0]
                return (
                  <div className="bg-white border border-slate-200 rounded-xl
                                  shadow-lg px-3 py-2 text-sm">
                    <p className="font-semibold text-seed-dark">{d.name}</p>
                    <p className="text-seed-muted">
                      <span className="font-bold text-seed-dark">{d.value}</span>
                      {' sessions · '}
                      <span className="font-bold">{d.pct}%</span>
                    </p>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <RiskDonutCustomLegend />
      </div>
    </ChartCard>
  )
}

// ─── Chart 3: Score by Age Group ─────────────────────────────────────────────

function ScoreByAgeChart() {
  return (
    <ChartCard
      title="Avg. Composite Score by Age Group"
      subtitle="Reference lines at clinical zone boundaries (23 / 46)"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={SCORE_BY_AGE} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="ageGroup"
            tick={{ fontSize: 10, fill: COLOR.muted }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            domain={[0, 70]}
            ticks={[0, 23, 46, 70]}
            tick={{ fontSize: 11, fill: COLOR.muted }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload as Parameters<typeof ChartTooltip>[0]['payload']}
                label={label as string}
                unit="avg score"
              />
            )}
          />
          {/* Zone boundary reference lines */}
          <ReferenceLine
            y={23}
            stroke={COLOR.mint}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: '23', position: 'right', fontSize: 10, fill: COLOR.mint }}
          />
          <ReferenceLine
            y={46}
            stroke={COLOR.alert}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: '46', position: 'right', fontSize: 10, fill: COLOR.alert }}
          />
          <Bar
            dataKey="avgScore"
            name="Avg Score"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          >
            {SCORE_BY_AGE.map(d => (
              <Cell
                key={d.ageGroup}
                fill={
                  d.avgScore < 24 ? COLOR.mint
                  : d.avgScore < 47 ? COLOR.amber
                  : COLOR.alert
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Chart 4: Flag Frequency (horizontal) ────────────────────────────────────

function FlagFrequencyChart() {
  return (
    <ChartCard
      title="Metric Flag Frequency"
      subtitle="Times each metric exceeded threshold — all sessions"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={FLAG_FREQUENCY}
          layout="vertical"
          margin={{ top: 4, right: 20, left: 20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: COLOR.muted }}
            axisLine={false} tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="metric"
            tick={{ fontSize: 11, fill: COLOR.muted }}
            axisLine={false} tickLine={false}
            width={68}
          />
          <Tooltip
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload as Parameters<typeof ChartTooltip>[0]['payload']}
                label={label as string}
                unit="flags"
              />
            )}
          />
          <Bar dataKey="count" name="Flags" fill={COLOR.navy} radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="p-6 max-w-7xl space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-seed-dark">Analytics</h1>
        <p className="text-sm text-seed-muted mt-0.5">
          Aggregate screening outcomes across your patient cohort
        </p>
      </div>

      {/* Summary stat chips */}
      <div className="flex flex-wrap gap-3">
        <StatChip
          label="Total Screened"
          value={String(STATS.totalScreened)}
          color="text-seed-navy"
        />
        <StatChip
          label="% Elevated"
          value={`${STATS.pctElevated}%`}
          color="text-red-600"
        />
        <StatChip
          label="% with Divergence Flag"
          value={`${STATS.pctDivergence}%`}
          color="text-amber-600"
        />
        <StatChip
          label="Mean Composite Score"
          value={String(STATS.meanComposite)}
          color="text-seed-teal"
        />
        <StatChip
          label="Mean Confidence"
          value={`${STATS.meanConfidence}%`}
          color="text-emerald-600"
        />
      </div>

      {/* Chart grid — 2 × 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MonthlyVolumeChart />
        <RiskDistributionChart />
        <ScoreByAgeChart />
        <FlagFrequencyChart />
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-seed-muted text-center italic">
        Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
      </p>
    </motion.div>
  )
}
