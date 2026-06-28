/**
 * S.E.E.D. Admin — Platform Analytics
 * Route: /admin/analytics
 *
 * Layout:
 *   Summary chips (5)
 *   2-col grid: Monthly Volume (12 months) | Risk Distribution (donut)
 *   Full width:  Age Group Distribution (bar)
 *   Full width:  Clinician Activity Heatmap (table, color-coded)
 *   Full width:  Aggregate per-clinician table (sortable, 6 cols)
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle, Check } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  mint:  '#02C39A', amber: '#F4A261', alert: '#E63946',
  teal:  '#028090', navy:  '#065A82', muted: '#64748B',
}

// ─── Mock data ────────────────────────────────────────────────────────────────

// Last 12 months: Jul 2025 – Jun 2026
const MONTHS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun']

const MONTHLY_VOLUME = [
  { month:'Jul 25', sessions: 78  },
  { month:'Aug 25', sessions: 85  },
  { month:'Sep 25', sessions: 92  },
  { month:'Oct 25', sessions: 88  },
  { month:'Nov 25', sessions: 97  },
  { month:'Dec 25', sessions: 71  },
  { month:'Jan 26', sessions: 89  },
  { month:'Feb 26', sessions: 104 },
  { month:'Mar 26', sessions: 98  },
  { month:'Apr 26', sessions: 112 },
  { month:'May 26', sessions: 107 },
  { month:'Jun 26', sessions: 63  },
]

const RISK_DISTRIBUTION = [
  { name: 'Monitor Closely', value: 412, color: C.mint  },
  { name: 'Indeterminate',   value: 518, color: C.amber },
  { name: 'Elevated',        value: 354, color: C.alert },
]

const AGE_DISTRIBUTION = [
  { ageGroup: '18–24m', count: 189 },
  { ageGroup: '24–30m', count: 312 },
  { ageGroup: '30–36m', count: 298 },
  { ageGroup: '36–48m', count: 341 },
  { ageGroup: '48–60m', count: 144 },
]

// Heatmap: 5 clinicians × 12 months (Jul 2025 – Jun 2026)
// Rows correspond to MOCK_CLINICIANS c01–c05
const HEATMAP_ROWS = [
  { id:'c01', name:'Dr. Priya Rajan',       monthly: [4, 5, 5, 4, 6, 3, 5, 6, 5, 7, 6, 3] },
  { id:'c02', name:'Dr. Arjun Mehta',       monthly: [3, 3, 4, 3, 4, 2, 3, 4, 3, 5, 4, 2] },
  { id:'c03', name:'Dr. Sunitha K.',        monthly: [2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 1] },
  { id:'c04', name:'Dr. Ravi Prasad',       monthly: [6, 7, 7, 7, 8, 5, 7, 8, 8, 9, 8, 4] },
  { id:'c05', name:'Dr. Meera Nambiar',     monthly: [1, 1, 2, 1, 2, 1, 2, 2, 2, 3, 2, 2] },
]

// Aggregate table — all-time metrics per clinician
interface AggRow {
  id:              string
  name:            string
  totalPatients:   number
  totalScreenings: number
  pctElevated:     number   // 0–100
  avgReviewHours:  number
  overdueReviews:  number
}

const AGGREGATE: AggRow[] = [
  { id:'c01', name:'Dr. Priya Rajan',    totalPatients:5, totalScreenings: 59, pctElevated:28.8, avgReviewHours:18.4, overdueReviews:2 },
  { id:'c02', name:'Dr. Arjun Mehta',    totalPatients:5, totalScreenings: 40, pctElevated:32.5, avgReviewHours:22.1, overdueReviews:2 },
  { id:'c03', name:'Dr. Sunitha K.',     totalPatients:3, totalScreenings: 25, pctElevated: 0.0, avgReviewHours:12.8, overdueReviews:0 },
  { id:'c04', name:'Dr. Ravi Prasad',    totalPatients:4, totalScreenings: 84, pctElevated:41.7, avgReviewHours:54.3, overdueReviews:3 },
  { id:'c05', name:'Dr. Meera Nambiar',  totalPatients:2, totalScreenings: 21, pctElevated: 0.0, avgReviewHours: 8.2, overdueReviews:0 },
]

const SUMMARY = {
  totalScreenings:  1284,
  elevatedRate:     27.6,
  activeClinicians: 34,
  avgReviewHours:   23.2,
  overdueReviews:   7,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEAT_MAX = Math.max(...HEATMAP_ROWS.flatMap(r => r.monthly))

function heatStyle(count: number): { background: string; color: string } {
  if (count === 0) return { background: '#f8fafc', color: '#cbd5e1' }
  const t = count / HEAT_MAX                         // 0..1
  if (t < 0.20) return { background: '#cffafe', color: '#0e7490' }  // cyan-100
  if (t < 0.40) return { background: '#67e8f9', color: '#0c4a6e' }  // cyan-300
  if (t < 0.65) return { background: C.teal,    color: 'white'   }  // seed-teal
  return                { background: C.navy,    color: 'white'   }  // seed-navy
}

// ─── Shared tooltip ───────────────────────────────────────────────────────────

function ChartTip({ active, payload, label, unit = '' }: {
  active?:  boolean
  payload?: Array<{ value?: number | string; color?: string; name?: string }>
  label?:   string
  unit?:    string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      {label && <p className="font-semibold text-seed-dark mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? C.teal }}>
          {p.name ? `${p.name}: ` : ''}
          <span className="font-bold">{p.value ?? ''}</span>
          {unit && <span className="text-xs text-seed-muted ml-1">{unit}</span>}
        </p>
      ))}
    </div>
  )
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────

function Card({ title, sub, children }: {
  title: string; sub?: string; children: React.ReactNode
}) {
  return (
    <div className="seed-card">
      <div className="mb-4">
        <h3 className="font-semibold text-seed-dark">{title}</h3>
        {sub && <p className="text-xs text-seed-muted mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Summary chips ────────────────────────────────────────────────────────────

function SummaryChips() {
  const chips = [
    { label: 'Total Screenings',    value: SUMMARY.totalScreenings.toLocaleString(), color: 'text-seed-navy'   },
    { label: 'Elevated Rate',       value: `${SUMMARY.elevatedRate}%`,               color: 'text-red-600'     },
    { label: 'Active Clinicians',   value: String(SUMMARY.activeClinicians),          color: 'text-violet-700'  },
    { label: 'Avg Review Time',     value: `${SUMMARY.avgReviewHours}h`,              color: 'text-amber-700'   },
    { label: 'Overdue Reviews',     value: String(SUMMARY.overdueReviews),            color: 'text-red-600'     },
  ]
  return (
    <div className="flex flex-wrap gap-3">
      {chips.map(({ label, value, color }) => (
        <div key={label} className="seed-card py-4 text-center flex-1 min-w-[140px]">
          <p className={`text-2xl font-extrabold leading-none ${color}`}>{value}</p>
          <p className="text-xs text-seed-muted mt-1.5">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Chart 1 — Monthly Screening Volume ──────────────────────────────────────

function MonthlyVolumeChart() {
  const peak = Math.max(...MONTHLY_VOLUME.map(d => d.sessions))
  const avg  = Math.round(MONTHLY_VOLUME.reduce((s, d) => s + d.sessions, 0) / MONTHLY_VOLUME.length)

  return (
    <Card
      title="Monthly Screening Volume"
      sub={`Last 12 months · Peak ${peak} · Avg ${avg}/month`}
    >
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={MONTHLY_VOLUME} margin={{ top:4, right:8, left:-20, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize:10, fill:C.muted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={({ active, payload, label }) => (
            <ChartTip active={active}
              payload={payload as Parameters<typeof ChartTip>[0]['payload']}
              label={label as string} unit="sessions" />
          )} />
          <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1}
            label={{ value:`avg ${avg}`, position:'right', fontSize:9, fill:'#94a3b8' }} />
          <Bar dataKey="sessions" fill={C.teal} radius={[4,4,0,0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ─── Chart 2 — Risk Tier Distribution (Donut) ────────────────────────────────

function RiskDonutChart() {
  const total = RISK_DISTRIBUTION.reduce((s, d) => s + d.value, 0)

  return (
    <Card
      title="Risk Tier Distribution"
      sub={`All-time · ${total.toLocaleString()} total sessions`}
    >
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie data={RISK_DISTRIBUTION} dataKey="value" cx="50%" cy="50%"
              innerRadius={52} outerRadius={76} paddingAngle={3} strokeWidth={0}>
              {RISK_DISTRIBUTION.map(d => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as typeof RISK_DISTRIBUTION[0]
              return (
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
                  <p className="font-semibold text-seed-dark">{d.name}</p>
                  <p className="text-seed-muted">
                    <span className="font-bold text-seed-dark">{d.value.toLocaleString()}</span>
                    {' · '}
                    <span className="font-bold">{((d.value / total) * 100).toFixed(1)}%</span>
                  </p>
                </div>
              )
            }} />
          </PieChart>
        </ResponsiveContainer>

        {/* Custom legend */}
        <div className="space-y-2 w-full mt-1">
          {RISK_DISTRIBUTION.map(d => (
            <div key={d.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.color }} />
                <span className="text-xs text-seed-muted">{d.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-seed-dark text-xs">
                  {d.value.toLocaleString()}
                </span>
                <span className="text-xs text-seed-muted w-12 text-right">
                  {((d.value / total) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-1.5 flex justify-between text-xs">
            <span className="text-seed-muted">Total</span>
            <span className="font-bold text-seed-dark">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Chart 3 — Age Group Distribution ────────────────────────────────────────

function AgeDistributionChart() {
  const total = AGE_DISTRIBUTION.reduce((s, d) => s + d.count, 0)

  return (
    <Card
      title="Age Group Distribution of Screenings"
      sub={`${total.toLocaleString()} sessions across age bands`}
    >
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={AGE_DISTRIBUTION} margin={{ top:4, right:24, left:-20, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="ageGroup" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={({ active, payload, label }) => (
            <ChartTip active={active}
              payload={payload as Parameters<typeof ChartTip>[0]['payload']}
              label={label as string} unit="screenings" />
          )} />
          <Bar dataKey="count" name="Screenings" radius={[4,4,0,0]} maxBarSize={52}>
            {AGE_DISTRIBUTION.map(d => (
              <Cell key={d.ageGroup} fill={C.navy} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Mini percentage row */}
      <div className="flex gap-1 mt-3">
        {AGE_DISTRIBUTION.map(d => (
          <div key={d.ageGroup} className="flex-1 text-center">
            <div className="text-[10px] font-semibold text-seed-dark">
              {((d.count / total) * 100).toFixed(0)}%
            </div>
            <div className="text-[9px] text-seed-muted">{d.ageGroup}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Chart 4 — Clinician Activity Heatmap ────────────────────────────────────

function ActivityHeatmap() {
  const monthlyTotals = MONTHS.map((_, i) =>
    HEATMAP_ROWS.reduce((s, r) => s + r.monthly[i], 0)
  )

  return (
    <Card
      title="Clinician Activity Heatmap"
      sub="Screenings per clinician per month · darker = higher volume"
    >
      {/* Legend */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {[
          { style: { background: '#f8fafc', border: '1px solid #e2e8f0' }, label: '0' },
          { style: { background: '#cffafe' }, label: '1–2' },
          { style: { background: '#67e8f9' }, label: '3–4' },
          { style: { background: C.teal, color: 'white' }, label: '5–7' },
          { style: { background: C.navy, color: 'white' }, label: '8+' },
        ].map(({ style, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center
                             font-semibold" style={style}>
              {label.includes('+') || label === '0' ? '' : ''}
            </span>
            <span className="text-xs text-seed-muted">{label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[640px]">
          <thead>
            <tr>
              <th className="text-left py-2 pr-3 text-[11px] font-semibold text-seed-muted
                             uppercase tracking-wide w-44 sticky left-0 bg-white">
                Clinician
              </th>
              {MONTHS.map((m) => (
                <th key={m} className="text-center py-2 px-1 text-[10px] font-semibold
                                       text-seed-muted w-10">
                  {m}
                </th>
              ))}
              <th className="text-center py-2 px-2 text-[10px] font-semibold text-seed-muted w-12">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {HEATMAP_ROWS.map(row => {
              const rowTotal = row.monthly.reduce((s, v) => s + v, 0)
              return (
                <tr key={row.id} className="group">
                  <td className="py-1 pr-3 font-medium text-seed-dark text-[11px]
                                  sticky left-0 bg-white group-hover:text-seed-teal
                                  transition-colors whitespace-nowrap">
                    {row.name}
                  </td>
                  {row.monthly.map((count, i) => {
                    const style = heatStyle(count)
                    return (
                      <td key={i} className="py-0.5 px-0.5">
                        <div
                          className="w-full h-8 rounded flex items-center justify-center
                                     text-[11px] font-semibold transition-all"
                          style={style}
                          title={`${row.name} — ${MONTHS[i]}: ${count} sessions`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      </td>
                    )
                  })}
                  <td className="py-1 px-2 text-center font-bold text-seed-navy text-xs">
                    {rowTotal}
                  </td>
                </tr>
              )
            })}

            {/* Monthly totals row */}
            <tr className="border-t border-slate-200">
              <td className="py-2 pr-3 text-[11px] font-bold text-seed-muted sticky left-0 bg-white">
                Total / month
              </td>
              {monthlyTotals.map((t, i) => (
                <td key={i} className="py-2 px-1 text-center text-[11px] font-semibold text-seed-dark">
                  {t}
                </td>
              ))}
              <td className="py-2 px-2 text-center text-xs font-extrabold text-seed-navy">
                {monthlyTotals.reduce((s, v) => s + v, 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── Aggregate Table ──────────────────────────────────────────────────────────

type SortField = keyof Omit<AggRow, 'id'>
type SortDir   = 'asc' | 'desc'

function SortTH({ label, field, active, dir, onSort }: {
  label: string; field: SortField; active: boolean
  dir: SortDir; onSort: (f: SortField) => void
}) {
  return (
    <th
      onClick={() => onSort(field)}
      className="px-4 py-2.5 text-left text-[11px] font-semibold text-seed-muted
                 uppercase tracking-wide whitespace-nowrap cursor-pointer
                 hover:text-seed-dark select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${active ? 'text-seed-teal' : 'text-slate-300'}`}>
          {active ? (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} />}
        </span>
      </span>
    </th>
  )
}

function AggregateTable() {
  const [sortField, setSortField] = useState<SortField>('overdueReviews')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sorted = [...AGGREGATE].sort((a, b) => {
    const av = a[sortField]
    const bv = b[sortField]
    const cmp = typeof av === 'string'
      ? (av as string).localeCompare(bv as string)
      : (av as number) - (bv as number)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const cols: Array<{ label: string; field: SortField }> = [
    { label: 'Clinician',         field: 'name'            },
    { label: 'Patients',          field: 'totalPatients'   },
    { label: 'Screenings',        field: 'totalScreenings' },
    { label: '% Elevated',        field: 'pctElevated'     },
    { label: 'Avg Review Time',   field: 'avgReviewHours'  },
    { label: 'Overdue Reviews',   field: 'overdueReviews'  },
  ]

  return (
    <div className="seed-card p-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h3 className="font-semibold text-seed-dark">Per-Clinician Summary</h3>
        <p className="text-xs text-seed-muted mt-0.5">Click any column header to sort</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {cols.map(({ label, field }) => (
                <SortTH key={field} label={label} field={field}
                  active={sortField === field} dir={sortDir} onSort={toggleSort} />
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              const isOverdue = row.overdueReviews > 0
              return (
                <tr key={row.id}
                  className={`border-b border-slate-50 transition-colors ${
                    isOverdue ? 'hover:bg-red-50/40' : 'hover:bg-slate-50/40'
                  }`}
                >
                  {/* Name */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center
                                      justify-center text-xs font-bold text-violet-700 flex-shrink-0">
                        {row.name.split(' ').find(w => !w.startsWith('Dr'))?.charAt(0) ?? 'C'}
                      </div>
                      <span className="font-semibold text-seed-dark text-sm">{row.name}</span>
                    </div>
                  </td>

                  {/* Patients */}
                  <td className="px-4 py-3.5 text-sm font-semibold text-seed-dark text-center">
                    {row.totalPatients}
                  </td>

                  {/* Screenings */}
                  <td className="px-4 py-3.5 text-sm font-semibold text-seed-dark text-center">
                    {row.totalScreenings}
                  </td>

                  {/* % Elevated */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[60px]">
                        <div className="h-full rounded-full bg-red-400"
                          style={{ width: `${row.pctElevated}%` }} />
                      </div>
                      <span className={`text-xs font-semibold ${
                        row.pctElevated > 35 ? 'text-red-600'
                        : row.pctElevated > 20 ? 'text-amber-600'
                        : 'text-emerald-600'
                      }`}>
                        {row.pctElevated === 0 ? '0%' : `${row.pctElevated.toFixed(1)}%`}
                      </span>
                    </div>
                  </td>

                  {/* Avg review time */}
                  <td className="px-4 py-3.5">
                    <span className={`text-sm font-semibold ${
                      row.avgReviewHours > 48 ? 'text-red-600'
                      : row.avgReviewHours > 24 ? 'text-amber-600'
                      : 'text-emerald-600'
                    }`}>
                      {row.avgReviewHours.toFixed(1)}h
                    </span>
                  </td>

                  {/* Overdue reviews */}
                  <td className="px-4 py-3.5">
                    {row.overdueReviews > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold
                                       text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                        <AlertTriangle size={11} /> {row.overdueReviews}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={12} /> None</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminAnalyticsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 max-w-7xl space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-seed-dark">Platform Analytics</h1>
        <p className="text-sm text-seed-muted mt-0.5">
          All organisations · All time
        </p>
      </div>

      {/* Summary chips */}
      <SummaryChips />

      {/* Charts 1 + 2 side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MonthlyVolumeChart />
        <RiskDonutChart />
      </div>

      {/* Chart 3 — Age distribution (full width) */}
      <AgeDistributionChart />

      {/* Chart 4 — Heatmap (full width) */}
      <ActivityHeatmap />

      {/* Aggregate table (full width, sortable) */}
      <AggregateTable />

      <p className="text-xs text-seed-muted text-center italic pb-2">
        Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
      </p>
    </motion.div>
  )
}
