/**
 * S.E.E.D. Clinician — My Patients Page
 * Route: /clinician/patients
 *
 * Searchable (by child name) and filterable (by risk tier) table.
 * Each row navigates to /clinician/patients/:childId.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiskTierBadge } from '@/components/parent/RiskTierBadge'
import { calculateAge, formatDate } from '@/utils/age'
import { MOCK_PATIENTS, latestSession, MockRiskTier } from './mockPatients'
import type { MockPatient } from './mockPatients'
import { RiskTier } from '@/types'

// ─── Tier filter options ──────────────────────────────────────────────────────

type TierFilter = 'ALL' | MockRiskTier

const TIER_OPTIONS: Array<{ value: TierFilter; label: string }> = [
  { value: 'ALL',           label: 'All Tiers'         },
  { value: 'MONITOR',       label: 'Monitor Closely'   },
  { value: 'INDETERMINATE', label: 'Indeterminate'     },
  { value: 'ELEVATED',      label: 'Elevated'          },
]

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <tr>
      <td colSpan={7} className="py-16 text-center">
        <p className="text-3xl mb-3">🔍</p>
        <p className="font-semibold text-seed-dark">No patients found</p>
        <p className="text-sm text-seed-muted mt-1">
          {query
            ? `No results for "${query}"`
            : 'No patients match the current filter.'}
        </p>
      </td>
    </tr>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────

function PatientRow({ patient, onClick }: { patient: MockPatient; onClick: () => void }) {
  const age     = calculateAge(patient.dateOfBirth)
  const latest  = latestSession(patient)
  const current = latest?.riskTier as RiskTier | undefined
  const sortedSessions = [...patient.sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const lastDate = sortedSessions[0]?.date

  return (
    <tr
      onClick={onClick}
      className="border-b border-slate-50 hover:bg-seed-ice/60 cursor-pointer
                 transition-colors group"
    >
      {/* Name */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center
                       flex-shrink-0 text-xs font-bold text-white"
            style={{ backgroundColor: patient.gender === 'FEMALE' ? '#028090' : '#065A82' }}
          >
            {patient.name[0]}
          </div>
          <span className="font-semibold text-seed-dark group-hover:text-seed-teal
                           transition-colors text-sm">
            {patient.name}
          </span>
        </div>
      </td>

      {/* Age */}
      <td className="px-4 py-3.5 text-sm text-seed-dark">
        {age.compact}
        <span className="text-xs text-seed-muted ml-1">({age.totalMonths}m)</span>
      </td>

      {/* Parent */}
      <td className="px-4 py-3.5 text-sm text-seed-muted">{patient.parentName}</td>

      {/* Registered */}
      <td className="px-4 py-3.5 text-sm text-seed-muted">
        {formatDate(patient.registeredAt)}
      </td>

      {/* Total screenings */}
      <td className="px-4 py-3.5 text-sm text-center">
        <span className="font-semibold text-seed-dark">{patient.sessions.length}</span>
      </td>

      {/* Last screening date */}
      <td className="px-4 py-3.5 text-sm text-seed-muted">
        {lastDate ? formatDate(lastDate) : '—'}
      </td>

      {/* Current risk tier */}
      <td className="px-4 py-3.5">
        {current
          ? <RiskTierBadge tier={current} size="sm" />
          : <span className="text-xs text-slate-400">—</span>
        }
      </td>

      {/* Chevron */}
      <td className="px-3 py-3.5 text-slate-300 group-hover:text-seed-teal transition-colors">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}
          className="w-4 h-4">
          <polyline points="6,4 10,8 6,12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </td>
    </tr>
  )
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards() {
  const monitor       = MOCK_PATIENTS.filter(p => latestSession(p)?.riskTier === 'MONITOR').length
  const indeterminate = MOCK_PATIENTS.filter(p => latestSession(p)?.riskTier === 'INDETERMINATE').length
  const elevated      = MOCK_PATIENTS.filter(p => latestSession(p)?.riskTier === 'ELEVATED').length
  const pending       = MOCK_PATIENTS.reduce((acc, p) => {
    return acc + p.sessions.filter(s => s.reviewStatus === 'PENDING').length
  }, 0)

  const stats = [
    { label: 'Total Children',   value: MOCK_PATIENTS.length, color: 'text-seed-navy',  bg: 'bg-seed-navy/10'   },
    { label: 'Monitor Closely',  value: monitor,              color: 'text-emerald-700', bg: 'bg-emerald-50'     },
    { label: 'Indeterminate',    value: indeterminate,        color: 'text-amber-700',   bg: 'bg-amber-50'       },
    { label: 'Elevated',         value: elevated,             color: 'text-red-700',     bg: 'bg-red-50'         },
    { label: 'Pending Reviews',  value: pending,              color: 'text-purple-700',  bg: 'bg-purple-50'      },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {stats.map(({ label, value, color, bg }) => (
        <div key={label} className={`seed-card py-4 text-center ${bg}`}>
          <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
          <p className="text-xs text-seed-muted mt-1">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PatientsPage() {
  const navigate = useNavigate()
  const [query,      setQuery]      = useState('')
  const [tierFilter, setTierFilter] = useState<TierFilter>('ALL')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MOCK_PATIENTS.filter(p => {
      const matchName = !q || p.name.toLowerCase().includes(q)
      const matchTier =
        tierFilter === 'ALL' ||
        latestSession(p)?.riskTier === tierFilter
      return matchName && matchTier
    })
  }, [query, tierFilter])

  return (
    <div className="p-6 max-w-7xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-seed-dark">My Patients</h1>
        <p className="text-sm text-seed-muted mt-1">
          Children assigned to you for developmental screening and review.
        </p>
      </div>

      {/* Summary cards */}
      <SummaryCards />

      {/* Table card */}
      <div className="seed-card p-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg
              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
            >
              <circle cx="6.5" cy="6.5" r="4.5" />
              <path d="M14 14l-3-3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by child name…"
              className="w-full text-sm border border-slate-200 rounded-lg
                         pl-8 pr-3 py-2 text-seed-dark placeholder:text-slate-300
                         focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30 outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2
                           text-slate-400 hover:text-seed-dark"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}
                  className="w-3 h-3">
                  <line x1="3" y1="3" x2="13" y2="13" strokeLinecap="round" />
                  <line x1="13" y1="3" x2="3" y2="13" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Tier filter */}
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value as TierFilter)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2
                       text-seed-dark bg-white outline-none
                       focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30"
          >
            {TIER_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <span className="text-xs text-seed-muted ml-auto flex-shrink-0">
            {filtered.length} of {MOCK_PATIENTS.length}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {[
                  'Name', 'Age', 'Parent', 'Registered',
                  'Screenings', 'Last Screening', 'Current Tier', '',
                ].map(col => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-left text-[11px] font-semibold
                               text-seed-muted uppercase tracking-wide whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <EmptyState query={query} />
                : filtered.map(patient => (
                    <PatientRow
                      key={patient.id}
                      patient={patient}
                      onClick={() => navigate(`/clinician/patients/${patient.id}`)}
                    />
                  ))
              }
            </tbody>
          </table>
        </div>

      </div>

      {/* Disclaimer */}
      <p className="text-xs text-seed-muted text-center mt-6 italic">
        Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
      </p>
    </div>
  )
}
