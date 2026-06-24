/**
 * S.E.E.D. Admin — Overview Dashboard
 * Route: /admin/dashboard
 *
 * Six stat cards + platform-wide trajectory LineChart.
 * All data is self-contained mock — no store dependency.
 *
 * Trajectory chart:
 *   Line 1 — Total screenings per week (teal)
 *   Line 2 — Elevated cases per week   (red)
 *   X axis: last 12 weeks (Apr 6 → Jun 22, 2026)
 */

import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'

// ─── Mock data ────────────────────────────────────────────────────────────────

const STAT_DATA = {
  totalUsers:           847,
  totalChildren:        412,
  totalScreenings:     1284,
  screeningsThisMonth:   89,
  elevatedThisMonth:     27,
  activeClinicians:      34,
}

// 12 weeks ending Jun 22 2026 (week-ending Monday labels)
const TRAJECTORY_DATA = [
  { week: 'Apr 6',  total: 24, elevated: 7  },
  { week: 'Apr 13', total: 28, elevated: 8  },
  { week: 'Apr 20', total: 22, elevated: 6  },
  { week: 'Apr 27', total: 31, elevated: 9  },
  { week: 'May 4',  total: 27, elevated: 7  },
  { week: 'May 11', total: 35, elevated: 11 },
  { week: 'May 18', total: 29, elevated: 9  },
  { week: 'May 25', total: 33, elevated: 10 },
  { week: 'Jun 1',  total: 38, elevated: 12 },
  { week: 'Jun 8',  total: 31, elevated: 9  },
  { week: 'Jun 15', total: 36, elevated: 11 },
  { week: 'Jun 22', total: 22, elevated: 7  },
]

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:    string
  value:    number | string
  sub?:     string
  icon:     React.ReactNode
  accent:   string   // Tailwind bg class
  valueColor?: string
  delay?:   number
}

function StatCard({ label, value, sub, icon, accent, valueColor = 'text-seed-dark', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      className="seed-card flex items-start gap-4"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center
                       flex-shrink-0 mt-0.5 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-seed-muted leading-snug">{label}</p>
        <p className={`text-2xl font-extrabold leading-tight mt-0.5 ${valueColor}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {sub && <p className="text-xs text-seed-muted mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function TrajectoryTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-seed-dark mb-2">
        Week of {label}
      </p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color }} />
            <span className="text-seed-muted">{p.name}</span>
          </div>
          <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
      {payload.length === 2 && payload[0].value > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-seed-muted">
          Elevated rate:{' '}
          <span className="font-semibold text-red-600">
            {((payload[1].value / payload[0].value) * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Trajectory chart ─────────────────────────────────────────────────────────

function TrajectoryChart() {
  const maxTotal    = Math.max(...TRAJECTORY_DATA.map(d => d.total))
  const weeklyMean  = Math.round(
    TRAJECTORY_DATA.reduce((s, d) => s + d.total, 0) / TRAJECTORY_DATA.length
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.18 }}
      className="seed-card"
    >
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-seed-dark">Platform-wide Screening Trajectory</h2>
          <p className="text-xs text-seed-muted mt-0.5">
            Weekly screenings vs. elevated cases — last 12 weeks
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-seed-muted">
          <span>
            Peak: <strong className="text-seed-dark">{maxTotal}</strong>/wk
          </span>
          <span>
            Avg: <strong className="text-seed-dark">{weeklyMean}</strong>/wk
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={TRAJECTORY_DATA}
          margin={{ top: 8, right: 16, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />

          <Tooltip content={<TrajectoryTooltip />} />

          <Legend
            wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: '#64748b' }}
            iconType="circle"
            iconSize={8}
          />

          {/* Weekly mean reference */}
          <ReferenceLine
            y={weeklyMean}
            stroke="#94a3b8"
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{
              value: `avg ${weeklyMean}`,
              position: 'right',
              fontSize: 10,
              fill: '#94a3b8',
            }}
          />

          <Line
            type="monotone"
            dataKey="total"
            name="Total Screenings"
            stroke="#028090"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#028090', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#028090' }}
          />
          <Line
            type="monotone"
            dataKey="elevated"
            name="Elevated Cases"
            stroke="#E63946"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 3, fill: '#E63946', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#E63946' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const elevatedPct = Math.round(
    (STAT_DATA.elevatedThisMonth / STAT_DATA.screeningsThisMonth) * 100
  )

  return (
    <div className="p-6 max-w-7xl space-y-6">

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-xl font-bold text-seed-dark">Platform Overview</h1>
        <p className="text-sm text-seed-muted mt-0.5">
          All organisations · All time
        </p>
      </motion.div>

      {/* Six stat cards — 3 col on md+, 2 on sm, 1 on xs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <StatCard
          label="Total Users"
          value={STAT_DATA.totalUsers}
          sub="Admins + Clinicians + Parents"
          accent="bg-violet-100"
          valueColor="text-violet-700"
          delay={0}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={1.8} className="w-5 h-5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
        />

        <StatCard
          label="Total Children"
          value={STAT_DATA.totalChildren}
          sub="Registered across all parents"
          accent="bg-sky-100"
          valueColor="text-sky-700"
          delay={0.04}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth={1.8} className="w-5 h-5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          }
        />

        <StatCard
          label="Total Screenings"
          value={STAT_DATA.totalScreenings}
          sub="All time · all modalities"
          accent="bg-seed-teal/10"
          valueColor="text-seed-navy"
          delay={0.08}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#028090" strokeWidth={1.8} className="w-5 h-5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
            </svg>
          }
        />

        <StatCard
          label="Screenings This Month"
          value={STAT_DATA.screeningsThisMonth}
          sub="June 2026"
          accent="bg-emerald-50"
          valueColor="text-emerald-700"
          delay={0.12}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={1.8} className="w-5 h-5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
              <line x1="8"  y1="2" x2="8"  y2="6" strokeLinecap="round" />
              <line x1="3"  y1="10" x2="21" y2="10" />
            </svg>
          }
        />

        <StatCard
          label="Elevated Cases This Month"
          value={STAT_DATA.elevatedThisMonth}
          sub={`${elevatedPct}% of this month's screenings`}
          accent="bg-red-50"
          valueColor="text-red-600"
          delay={0.16}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth={1.8} className="w-5 h-5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
            </svg>
          }
        />

        <StatCard
          label="Active Clinicians"
          value={STAT_DATA.activeClinicians}
          sub="With ≥1 screening under their codes"
          accent="bg-amber-50"
          valueColor="text-amber-700"
          delay={0.20}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={1.8} className="w-5 h-5">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          }
        />

      </div>

      {/* Trajectory chart */}
      <TrajectoryChart />

      {/* Disclaimer */}
      <p className="text-xs text-seed-muted text-center italic pb-2">
        Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
      </p>
    </div>
  )
}
