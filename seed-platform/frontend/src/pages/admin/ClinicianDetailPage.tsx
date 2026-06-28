/**
 * S.E.E.D. Admin — Clinician Detail Page
 * Route: /admin/clinicians/:clinicianId
 *
 * Three tabs:
 *   Patients    — same structure as clinician's own My Patients page
 *   Invite Codes — same structure as clinician's own Invite Codes page
 *   Analytics   — same 4 charts as clinician Analytics, scoped to this clinician
 */

import { useState, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sprout, Search, Check } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { MOCK_CLINICIANS, totalScreenings, pendingCount, overduePendingCount } from './mockClinicians'
import type { AdminClinicianRecord, AdminInviteCode } from './mockClinicians'
import type { MockPatient }   from '../clinician/mockPatients'
import { RiskTierBadge }      from '@/components/parent/RiskTierBadge'
import { calculateAge, formatDate } from '@/utils/age'
import { latestSession }      from '../clinician/mockPatients'
import { RiskTier }           from '@/types'

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = { teal: '#028090', navy: '#065A82', mint: '#02C39A',
            amber: '#F4A261', alert: '#E63946', muted: '#64748B' }

// ─── Tab types ────────────────────────────────────────────────────────────────

type ActiveTab = 'patients' | 'codes' | 'analytics'

// ─── Shared tooltip ───────────────────────────────────────────────────────────

function ChartTip({ active, payload, label, unit = '' }: {
  active?: boolean
  payload?: Array<{ value?: number | string; color?: string; name?: string }>
  label?: string; unit?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      {label && <p className="font-semibold text-seed-dark mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? C.teal }}>
          {p.name ? `${p.name}: ` : ''}
          <span className="font-bold">{p.value ?? ''}</span>
          {unit && <span className="text-xs text-seed-muted"> {unit}</span>}
        </p>
      ))}
    </div>
  )
}

// ─── Analytics tab ────────────────────────────────────────────────────────────

function AnalyticsTab({ clinician }: { clinician: AdminClinicianRecord }) {
  const { analytics } = clinician

  function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="seed-card">
        <h4 className="font-semibold text-seed-dark mb-4 text-sm">{title}</h4>
        {children}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1 — Monthly volume */}
      <ChartCard title="Monthly Screening Volume">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={analytics.monthlyVolume} margin={{ top:4, right:8, left:-24, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={({ active, payload, label }) => (
              <ChartTip active={active}
                payload={payload as Parameters<typeof ChartTip>[0]['payload']}
                label={label as string} unit="sessions" />
            )} />
            <Bar dataKey="sessions" fill={C.teal} radius={[4,4,0,0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 2 — Risk distribution donut */}
      <ChartCard title="Risk Distribution">
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={analytics.riskDistribution} dataKey="value" cx="50%" cy="50%"
                innerRadius={40} outerRadius={62} paddingAngle={3} strokeWidth={0}>
                {analytics.riskDistribution.map(d => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                const total = analytics.riskDistribution.reduce((s,x) => s+x.value, 0)
                return (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
                    <p className="font-semibold text-seed-dark">{d.name}</p>
                    <p className="text-seed-muted">
                      <span className="font-bold text-seed-dark">{d.value}</span>
                      {total > 0 && <span> · {((d.value/total)*100).toFixed(0)}%</span>}
                    </p>
                  </div>
                )
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 w-full mt-2">
            {analytics.riskDistribution.map(d => {
              const total = analytics.riskDistribution.reduce((s,x) => s+x.value, 0)
              return (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-seed-muted">{d.name}</span>
                  </div>
                  <span className="font-semibold text-seed-dark">
                    {d.value}
                    {total > 0 && <span className="text-seed-muted font-normal ml-1">({((d.value/total)*100).toFixed(0)}%)</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </ChartCard>

      {/* Chart 3 — Score by age group */}
      <ChartCard title="Avg. Score by Age Group">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={analytics.scoreByAge} margin={{ top:4, right:24, left:-24, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="ageGroup" tick={{ fontSize:10, fill:C.muted }} axisLine={false} tickLine={false} />
            <YAxis domain={[0,70]} ticks={[0,23,46,70]} tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload, label }) => (
              <ChartTip active={active}
                payload={payload as Parameters<typeof ChartTip>[0]['payload']}
                label={label as string} unit="avg score" />
            )} />
            <ReferenceLine y={23} stroke={C.mint}  strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value:'23', position:'right', fontSize:9, fill:C.mint }} />
            <ReferenceLine y={46} stroke={C.alert} strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value:'46', position:'right', fontSize:9, fill:C.alert }} />
            <Bar dataKey="avgScore" name="Avg Score" radius={[4,4,0,0]} maxBarSize={36}>
              {analytics.scoreByAge.map(d => (
                <Cell key={d.ageGroup}
                  fill={d.avgScore < 24 ? C.mint : d.avgScore < 47 ? C.amber : C.alert} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 4 — Flag frequency (horizontal) */}
      <ChartCard title="Metric Flag Frequency">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={analytics.flagFrequency} layout="vertical"
            margin={{ top:4, right:16, left:20, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="metric" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} width={68} />
            <Tooltip content={({ active, payload, label }) => (
              <ChartTip active={active}
                payload={payload as Parameters<typeof ChartTip>[0]['payload']}
                label={label as string} unit="flags" />
            )} />
            <Bar dataKey="count" name="Flags" fill={C.navy} radius={[0,4,4,0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

// ─── Patients tab ─────────────────────────────────────────────────────────────

function PatientsTab({ patients }: { patients: MockPatient[] }) {
  const navigate  = useNavigate()
  const [query,   setQuery]  = useState('')
  const [tier,    setTier]   = useState('ALL')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return patients.filter(p => {
      const matchQ   = !q || p.name.toLowerCase().includes(q) || p.parentName.toLowerCase().includes(q)
      const latest   = latestSession(p)
      const matchT   = tier === 'ALL' || latest?.riskTier === tier
      return matchQ && matchT
    })
  }, [patients, query, tier])

  if (patients.length === 0) {
    return (
      <div className="seed-card py-14 text-center">
        <div className="flex justify-center mb-3"><Sprout className="text-seed-teal" size={32} /></div>
        <p className="font-semibold text-seed-dark">No patients assigned</p>
      </div>
    )
  }

  return (
    <div className="seed-card p-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="relative flex-1 min-w-[180px]">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400">
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M14 14l-3-3" strokeLinecap="round" />
          </svg>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search patients…"
            className="w-full text-sm border border-slate-200 rounded-lg pl-8 pr-3 py-2
                       text-seed-dark placeholder:text-slate-300 outline-none
                       focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30" />
        </div>
        <select value={tier} onChange={e => setTier(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-seed-dark
                     bg-white outline-none focus:border-seed-teal">
          <option value="ALL">All Tiers</option>
          <option value="MONITOR">Monitor Closely</option>
          <option value="INDETERMINATE">Indeterminate</option>
          <option value="ELEVATED">Elevated</option>
        </select>
        <span className="text-xs text-seed-muted ml-auto">{filtered.length} patients</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Name', 'Age', 'Parent', 'Registered', 'Screenings', 'Last Screening', 'Current Tier', ''].map(col => (
                <th key={col} className="px-4 py-2.5 text-left text-[11px] font-semibold
                                         text-seed-muted uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const age    = calculateAge(p.dateOfBirth)
              const latest = latestSession(p)
              const sorted = [...p.sessions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              return (
                <tr key={p.id}
                  onClick={() => navigate(`/clinician/patients/${p.id}`)}
                  className="border-b border-slate-50 hover:bg-seed-ice/60 cursor-pointer
                             transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center
                                      text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: p.gender === 'FEMALE' ? '#028090' : '#065A82' }}>
                        {p.name[0]}
                      </div>
                      <span className="font-semibold text-seed-dark text-sm
                                       group-hover:text-seed-teal transition-colors">
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-seed-dark">
                    {age.compact}<span className="text-xs text-seed-muted ml-1">({age.totalMonths}m)</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-seed-muted">{p.parentName}</td>
                  <td className="px-4 py-3 text-sm text-seed-muted">{formatDate(p.registeredAt)}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold text-seed-dark">
                    {p.sessions.length}
                  </td>
                  <td className="px-4 py-3 text-sm text-seed-muted">
                    {sorted[0] ? formatDate(sorted[0].date) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {latest?.riskTier
                      ? <RiskTierBadge tier={latest.riskTier as RiskTier} size="sm" />
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-3 text-slate-300 group-hover:text-seed-teal transition-colors">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <polyline points="6,4 10,8 6,12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
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

// ─── Invite Codes tab ─────────────────────────────────────────────────────────

const CODE_STATUS_CFG = {
  ACTIVE:  { label:'Active',  cls:'bg-emerald-100 text-emerald-700' },
  USED:    { label:'Used',    cls:'bg-blue-100 text-blue-700'       },
  EXPIRED: { label:'Expired', cls:'bg-amber-100 text-amber-700'     },
  REVOKED: { label:'Revoked', cls:'bg-red-100 text-red-700'         },
} as const

function InviteCodesTab({ codes: initialCodes }: {
  codes: AdminInviteCode[]
}) {
  const [codes, setCodes] = useState(initialCodes)
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      if (timer.current) clearTimeout(timer.current)
      setCopied(code)
      timer.current = setTimeout(() => setCopied(null), 2000)
    })
  }

  function handleRevoke(id: string) {
    setCodes(prev => prev.map(c => c.id === id ? { ...c, status: 'REVOKED' as const } : c))
  }

  const daysLeft = (expiresAt: string) =>
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)

  return (
    <div className="seed-card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Code', 'Created', 'Used By', 'Expires', 'Status', 'Actions'].map(col => (
                <th key={col} className="px-4 py-2.5 text-left text-[11px] font-semibold
                                         text-seed-muted uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map(c => {
              const cfg     = CODE_STATUS_CFG[c.status]
              const days    = daysLeft(c.expiresAt)
              return (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <code className="font-mono text-sm font-bold text-seed-navy tracking-widest">
                      {c.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-seed-muted">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    {c.usedBy
                      ? <span className="font-medium text-seed-dark">{c.usedBy}</span>
                      : <span className="text-slate-400 italic">Unused</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-seed-muted">
                    {formatDate(c.expiresAt)}
                    {c.status === 'ACTIVE' && days > 0 && (
                      <span className={`ml-1.5 text-xs ${days <= 7 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                        ({days}d)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(c.code)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          copied === c.code
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'border-slate-200 text-seed-muted hover:border-seed-teal/50 hover:text-seed-teal'
                        }`}
                      >
                        {copied === c.code ? <><Check size={12} className="inline mr-0.5" />Copied</> : 'Copy'}
                      </button>
                      {c.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRevoke(c.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border
                                     border-slate-200 text-red-600 hover:bg-red-50
                                     hover:border-red-300 transition-all"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {codes.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-seed-muted">
                  No invite codes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ClinicianDetailPage() {
  const { clinicianId } = useParams<{ clinicianId: string }>()
  const [activeTab, setActiveTab] = useState<ActiveTab>('patients')

  const clinician = MOCK_CLINICIANS.find(c => c.id === clinicianId)

  if (!clinician) {
    return (
      <div className="p-6 text-center">
        <div className="seed-card max-w-sm mx-auto py-14">
          <div className="flex justify-center mb-3"><Search className="text-seed-muted" size={32} /></div>
          <h2 className="font-bold text-seed-dark mb-2">Clinician not found</h2>
          <Link to="/admin/clinicians"
            className="seed-btn-primary inline-block text-sm px-4 py-2 mt-2">
            Back to Clinicians
          </Link>
        </div>
      </div>
    )
  }

  const overdue  = overduePendingCount(clinician)
  const pending  = pendingCount(clinician)
  const sessions = totalScreenings(clinician)

  const TABS: Array<{ key: ActiveTab; label: string; count?: number }> = [
    { key: 'patients',  label: 'Patients',     count: clinician.patients.length },
    { key: 'codes',     label: 'Invite Codes',  count: clinician.inviteCodes.length },
    { key: 'analytics', label: 'Analytics' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col"
    >
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <Link to="/admin/clinicians"
          className="inline-flex items-center gap-1 text-xs text-seed-muted
                     hover:text-seed-dark transition-colors mb-4">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}
            className="w-3.5 h-3.5">
            <polyline points="10,3 5,8 10,13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Clinicians
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center
                            justify-center text-xl font-extrabold text-violet-700 flex-shrink-0">
              {clinician.name.split(' ').find(w => !w.startsWith('Dr'))?.charAt(0) ?? 'C'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-seed-dark">{clinician.name}</h1>
              <p className="text-sm text-seed-muted mt-0.5">
                {clinician.specialty}
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-mono text-xs">{clinician.licenseNumber}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                {clinician.email}
              </p>
            </div>
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: 'Patients',   value: clinician.patients.length, color: 'text-seed-navy' },
              { label: 'Screenings', value: sessions,                  color: 'text-seed-teal' },
              { label: 'Pending',    value: pending,
                color: overdue > 0 ? 'text-red-600' : pending > 0 ? 'text-amber-600' : 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <p className={`text-xl font-extrabold leading-tight ${color}`}>{value}</p>
                <p className="text-[10px] text-seed-muted mt-0.5">{label}</p>
              </div>
            ))}
            {overdue > 0 && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full
                               bg-red-100 text-red-700">
                {overdue} overdue
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-6">
        <div className="flex gap-1">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === key
                  ? 'border-seed-teal text-seed-teal'
                  : 'border-transparent text-seed-muted hover:text-seed-dark'
              }`}
            >
              {label}
              {count !== undefined && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === key ? 'bg-seed-teal/15 text-seed-teal' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6 max-w-6xl">
        {activeTab === 'patients'  && <PatientsTab patients={clinician.patients} />}
        {activeTab === 'codes'     && (
          <InviteCodesTab codes={clinician.inviteCodes} />
        )}
        {activeTab === 'analytics' && <AnalyticsTab clinician={clinician} />}
      </div>
    </motion.div>
  )
}
