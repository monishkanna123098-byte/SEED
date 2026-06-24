/**
 * S.E.E.D. Screening History — /parent/history
 *
 * Table of all screening sessions for the currently selected child.
 *
 * Features:
 *   • Date-range filter (from / to date pickers)
 *   • Risk tier filter (pill buttons: All | Monitor Closely | Indeterminate | Elevated)
 *   • Modality filter  (pill buttons: All | Video | Game | Both)
 *   • Sortable columns (click header → asc, click again → desc)
 *   • Pagination       (10 rows / page with page-number controls)
 *   • Empty states for no sessions and no matching filters
 *
 * Seeded with 12 mock sessions in parentStore covering all tiers,
 * modalities, and dates (Mar 2024 – Mar 2025) to exercise all features.
 */

import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useParentStore } from '@/stores/parentStore'
import { RiskTierBadge } from '@/components/parent/RiskTierBadge'
import { formatDate, durationMinutes } from '@/utils/age'
import { ScreeningSession } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS_PER_PAGE = 10

const SESSION_TYPE_LABEL: Record<string, string> = {
  VIDEO:       'Video',
  GAME:        'Game',
  COMBINED:    'Both',
  MCHAT_ONLY:  'Questionnaire',
}

const STATUS_CONFIG: Record<string, { label: string; dotCls: string; textCls: string }> = {
  COMPLETE:   { label: 'Complete',   dotCls: 'bg-emerald-500', textCls: 'text-emerald-700' },
  PROCESSING: { label: 'Processing', dotCls: 'bg-amber-500',   textCls: 'text-amber-700'   },
  PENDING:    { label: 'Pending',    dotCls: 'bg-slate-400',   textCls: 'text-slate-500'   },
  FAILED:     { label: 'Failed',     dotCls: 'bg-red-500',     textCls: 'text-red-700'     },
}

// Tier sort weight (higher = more severe)
const TIER_WEIGHT: Record<string, number> = {
  MONITOR: 1, INDETERMINATE: 2, ELEVATED: 3,
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortColumn = 'date' | 'modality' | 'tier' | 'score' | 'status'
type SortDir    = 'asc' | 'desc'

interface SortState   { col: SortColumn; dir: SortDir }
interface FilterState { dateFrom: string; dateTo: string; tier: string; modality: string }

const DEFAULT_SORT:   SortState   = { col: 'date', dir: 'desc' }
const DEFAULT_FILTER: FilterState = { dateFrom: '', dateTo: '', tier: '', modality: '' }

// ─── Pill filter button ───────────────────────────────────────────────────────

function FilterPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150
                  ${active
                    ? 'bg-seed-teal text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-seed-muted hover:border-seed-teal/50 hover:text-seed-dark'
                  }`}
    >
      {label}
    </button>
  )
}

// ─── Sortable column header ───────────────────────────────────────────────────

function Th({
  label, col, sort, onSort, className = '',
}: { label: string; col: SortColumn; sort: SortState; onSort: (c: SortColumn) => void; className?: string }) {
  const active = sort.col === col
  return (
    <th className={`px-4 py-3 text-left ${className}`}>
      <button
        onClick={() => onSort(col)}
        className="flex items-center gap-1 text-xs font-semibold text-seed-muted
                   uppercase tracking-wide hover:text-seed-dark transition-colors"
      >
        {label}
        <span className={`text-[10px] ${active ? 'text-seed-teal' : 'text-slate-300'}`}>
          {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  if (current > 3) out.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) out.push(p)
  if (current < total - 2) out.push('…')
  out.push(total)
  return out
}

function Pagination({
  current, total, onChange,
}: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="px-3 py-1.5 rounded-lg text-sm text-seed-muted border border-slate-200
                   hover:border-seed-teal/50 disabled:opacity-40 disabled:cursor-not-allowed
                   transition-all"
      >
        ←
      </button>

      {pageNumbers(current, total).map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-slate-300 text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
              p === current
                ? 'bg-seed-teal text-white shadow-sm'
                : 'text-seed-muted border border-slate-200 hover:border-seed-teal/50 hover:text-seed-dark'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="px-3 py-1.5 rounded-lg text-sm text-seed-muted border border-slate-200
                   hover:border-seed-teal/50 disabled:opacity-40 disabled:cursor-not-allowed
                   transition-all"
      >
        →
      </button>
    </div>
  )
}

// ─── Date within range helper ─────────────────────────────────────────────────

function inDateRange(iso: string, from: string, to: string): boolean {
  const d = new Date(iso).getTime()
  if (from && new Date(from).getTime() > d) return false
  if (to   && new Date(`${to}T23:59:59`).getTime() < d) return false
  return true
}

// ─── Sort function ────────────────────────────────────────────────────────────

function sortSessions(sessions: ScreeningSession[], { col, dir }: SortState): ScreeningSession[] {
  const m = dir === 'asc' ? 1 : -1
  return [...sessions].sort((a, b) => {
    switch (col) {
      case 'date':
        return m * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case 'modality':
        return m * ((SESSION_TYPE_LABEL[a.sessionType] ?? '').localeCompare(SESSION_TYPE_LABEL[b.sessionType] ?? ''))
      case 'tier':
        return m * ((TIER_WEIGHT[a.riskTier ?? ''] ?? 0) - (TIER_WEIGHT[b.riskTier ?? ''] ?? 0))
      case 'score':
        return m * ((a.compositeScore ?? 0) - (b.compositeScore ?? 0))
      case 'status':
        return m * (a.status ?? '').localeCompare(b.status ?? '')
      default:
        return 0
    }
  })
}

// ─── Page component ───────────────────────────────────────────────────────────

export function HistoryPage() {
  const navigate = useNavigate()
  const { sessions, selectedChildId } = useParentStore()

  const [filter, setFilter]   = useState<FilterState>(DEFAULT_FILTER)
  const [sort, setSort]       = useState<SortState>(DEFAULT_SORT)
  const [page, setPage]       = useState(1)

  // Filter + sort
  const processed = useMemo(() => {
    const forChild = sessions.filter((s) => s.childId === selectedChildId)

    const filtered = forChild.filter((s) => {
      if (!inDateRange(s.createdAt, filter.dateFrom, filter.dateTo)) return false
      if (filter.tier) {
        if (s.riskTier !== filter.tier) return false
      }
      if (filter.modality && s.sessionType !== filter.modality) return false
      return true
    })

    return sortSessions(filtered, sort)
  }, [sessions, selectedChildId, filter, sort])

  const totalPages = Math.max(1, Math.ceil(processed.length / ROWS_PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const pageData   = processed.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE)

  function handleSort(col: SortColumn) {
    setSort((prev) => ({
      col,
      dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
    setPage(1)
  }

  function updateFilter(patch: Partial<FilterState>) {
    setFilter((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }

  function resetFilters() {
    setFilter(DEFAULT_FILTER)
    setPage(1)
  }

  const hasFilters =
    filter.dateFrom || filter.dateTo || filter.tier || filter.modality

  const totalForChild = sessions.filter((s) => s.childId === selectedChildId).length

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="p-6 max-w-5xl"
    >
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-seed-dark">Screening History</h1>
          <p className="text-sm text-seed-muted mt-0.5">
            {totalForChild} session{totalForChild !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button
          onClick={() => navigate('/parent/screening/new')}
          className="seed-btn-primary flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Screening
        </button>
      </div>

      {/* Filters */}
      <div className="seed-card mb-5 space-y-4">
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-seed-muted uppercase tracking-wide w-16">
            Dates
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => updateFilter({ dateFrom: e.target.value })}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5
                         text-seed-dark focus:border-seed-teal focus:ring-1
                         focus:ring-seed-teal/30 outline-none"
            />
            <span className="text-xs text-seed-muted">to</span>
            <input
              type="date"
              value={filter.dateTo}
              min={filter.dateFrom}
              onChange={(e) => updateFilter({ dateTo: e.target.value })}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5
                         text-seed-dark focus:border-seed-teal focus:ring-1
                         focus:ring-seed-teal/30 outline-none"
            />
          </div>
        </div>

        {/* Risk tier pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-seed-muted uppercase tracking-wide w-16">
            Tier
          </span>
          {[
            { value: '',              label: 'All'             },
            { value: 'MONITOR',       label: 'Monitor Closely' },
            { value: 'INDETERMINATE', label: 'Indeterminate'   },
            { value: 'ELEVATED',      label: 'Elevated'        },
          ].map(({ value, label }) => (
            <FilterPill
              key={value}
              label={label}
              active={filter.tier === value}
              onClick={() => updateFilter({ tier: value })}
            />
          ))}
        </div>

        {/* Modality pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-seed-muted uppercase tracking-wide w-16">
            Method
          </span>
          {[
            { value: '',         label: 'All'   },
            { value: 'VIDEO',    label: 'Video' },
            { value: 'GAME',     label: 'Game'  },
            { value: 'COMBINED', label: 'Both'  },
          ].map(({ value, label }) => (
            <FilterPill
              key={value}
              label={label}
              active={filter.modality === value}
              onClick={() => updateFilter({ modality: value })}
            />
          ))}
        </div>

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="text-xs font-medium text-seed-muted hover:text-seed-alert
                       transition-colors"
          >
            ✕ Reset filters
          </button>
        )}
      </div>

      {/* Results count */}
      {hasFilters && (
        <p className="text-xs text-seed-muted mb-3">
          {processed.length} result{processed.length !== 1 ? 's' : ''} match
          {processed.length !== 1 ? '' : 'es'} current filters
          {processed.length !== totalForChild && (
            <span className="ml-1 text-slate-400">(of {totalForChild} total)</span>
          )}
        </p>
      )}

      {/* No sessions at all */}
      {totalForChild === 0 && (
        <div className="seed-card py-14 text-center">
          <p className="text-3xl mb-3">🌱</p>
          <h3 className="font-semibold text-seed-dark mb-1">No screenings yet</h3>
          <p className="text-sm text-seed-muted mb-4">
            Complete your first screening to see history here.
          </p>
          <Link to="/parent/screening/new" className="seed-btn-primary inline-block">
            Start First Screening
          </Link>
        </div>
      )}

      {/* No results matching filters */}
      {totalForChild > 0 && processed.length === 0 && (
        <div className="seed-card py-12 text-center">
          <p className="text-2xl mb-2">🔍</p>
          <h3 className="font-semibold text-seed-dark mb-1">No matching sessions</h3>
          <p className="text-sm text-seed-muted mb-4">
            Try adjusting or removing the active filters.
          </p>
          <button onClick={resetFilters} className="seed-btn-secondary">
            Reset Filters
          </button>
        </div>
      )}

      {/* Table */}
      {processed.length > 0 && (
        <div className="seed-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <Th label="Date"          col="date"     sort={sort} onSort={handleSort} className="pl-5" />
                  <Th label="Method"        col="modality" sort={sort} onSort={handleSort} />
                  <Th label="Risk Tier"     col="tier"     sort={sort} onSort={handleSort} />
                  <Th label="Score"         col="score"    sort={sort} onSort={handleSort} />
                  <Th label="Status"        col="status"   sort={sort} onSort={handleSort} />
                  <th className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold text-seed-muted uppercase tracking-wide">
                      Actions
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {pageData.map((session, i) => {
                  const statusCfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.PENDING
                  const typeLabel = SESSION_TYPE_LABEL[session.sessionType] ?? session.sessionType
                  const duration  = session.completedAt
                    ? durationMinutes(session.createdAt, session.completedAt)
                    : null

                  return (
                    <motion.tr
                      key={session.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-slate-50/60 transition-colors duration-100"
                    >
                      {/* Date */}
                      <td className="px-4 pl-5 py-3.5">
                        <div className="text-sm font-medium text-seed-dark">
                          {formatDate(session.createdAt)}
                        </div>
                        {duration !== null && (
                          <div className="text-xs text-seed-muted mt-0.5">
                            {duration} min
                          </div>
                        )}
                      </td>

                      {/* Modality */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-sm text-seed-dark">
                          {session.sessionType === 'VIDEO' && (
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-seed-muted">
                              <path d="M10 6.5l3-1.8v6.6L10 9.5M2 5h7a1 1 0 011 1v4a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1z" />
                            </svg>
                          )}
                          {(session.sessionType === 'GAME') && (
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-seed-muted">
                              <circle cx="8" cy="8" r="6" />
                              <path d="M6 8h4M8 6v4" strokeLinecap="round" />
                            </svg>
                          )}
                          {session.sessionType === 'COMBINED' && (
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-seed-muted">
                              <path d="M2 4h5v8H2zM9 4h5v8H9z" />
                            </svg>
                          )}
                          {typeLabel}
                        </span>
                      </td>

                      {/* Risk tier */}
                      <td className="px-4 py-3.5">
                        <RiskTierBadge tier={session.riskTier} size="sm" />
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3.5">
                        {typeof session.compositeScore === 'number' ? (
                          <span className="text-sm font-semibold text-seed-dark">
                            {session.compositeScore}
                            <span className="text-xs font-normal text-seed-muted ml-0.5">/70</span>
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusCfg.dotCls}`} />
                          <span className={`text-xs font-medium ${statusCfg.textCls}`}>
                            {statusCfg.label}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        {session.status === 'COMPLETE' ? (
                          <Link
                            to={`/clinician/session/${session.id}`}
                            className="text-xs font-medium text-seed-teal hover:text-seed-navy
                                       underline underline-offset-2 transition-colors"
                          >
                            View report
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
              <p className="text-xs text-seed-muted">
                Showing {(safePage - 1) * ROWS_PER_PAGE + 1}–
                {Math.min(safePage * ROWS_PER_PAGE, processed.length)} of {processed.length}
              </p>
              <Pagination
                current={safePage}
                total={totalPages}
                onChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
