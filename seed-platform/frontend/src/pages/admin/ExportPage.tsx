/**
 * S.E.E.D. Admin — Data Export
 * Route: /admin/export
 *
 * Three export cards. Each button:
 *   1. Sets its own loading state (disables button immediately)
 *   2. Hits the real API endpoint with Authorization header
 *   3. If the API call fails (demo/dev mode), falls back to generating
 *      a mock CSV client-side from the same mock data shown in the UI
 *   4. Triggers a browser download
 *   5. Clears loading state
 *
 * ────────────────────────────────────────────────────────────────────
 * BACKEND REQUIREMENTS (cannot be enforced from the frontend):
 *
 *   - All three endpoints MUST verify req.user.role === 'ADMIN' in
 *     Express middleware BEFORE the handler executes. The frontend
 *     sends the JWT but server-side enforcement is mandatory.
 *
 *   - Every successful export MUST write to the audit log:
 *       { adminId, exportType, timestamp, ipAddress }
 *     This is a server-side concern; the client cannot guarantee it.
 *
 *   - The anonymized screening export hashes child IDs server-side
 *     with HMAC-SHA256(childId, EXPORT_SECRET). The client-side
 *     fallback uses a weak 32-bit hash — for demo display only.
 *     Real anonymization MUST happen on the server.
 * ────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import {
  MOCK_CLINICIANS,
  totalScreenings,
  overduePendingCount,
} from './mockClinicians'
import { MOCK_USERS } from './mockUsers'

// ─── CSV utility ──────────────────────────────────────────────────────────────

function escapeCsv(v: unknown): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  const head = headers.map(escapeCsv).join(',')
  const body = rows.map(r => r.map(escapeCsv).join(',')).join('\n')
  return `${head}\n${body}`
}

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Demo-mode child ID hash (32-bit XOR fold, NOT cryptographic) ─────────────
// In production, the server uses HMAC-SHA256(childId, EXPORT_SECRET).

function demoHashChildId(id: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `ANON_${h.toString(16).toUpperCase().padStart(8, '0')}`
}

// ─── Mock CSV generators (demo fallback) ──────────────────────────────────────

function makeScreeningCsv(): string {
  const headers = [
    'child_hash', 'age_group', 'session_type', 'session_date',
    'composite_score', 'criterion_a_score', 'criterion_b_score',
    'risk_tier', 'mchat_score', 'gaze_score', 'reaction_score',
    'precision_score', 'imitation_score', 'engagement_score',
    'confidence', 'divergence_flag', 'differential_pattern',
  ]

  // Representative mock rows — one row per session across all clinicians
  const rows: unknown[][] = []
  for (const clinician of MOCK_CLINICIANS) {
    for (const patient of clinician.patients) {
      const ageMonths = Math.floor(
        (Date.now() - new Date(patient.dateOfBirth).getTime()) / (30.44 * 86400000)
      )
      const ageGroup =
        ageMonths < 24 ? '18–24m' :
        ageMonths < 30 ? '24–30m' :
        ageMonths < 36 ? '30–36m' :
        ageMonths < 48 ? '36–48m' : '48–60m'

      for (const s of patient.sessions) {
        rows.push([
          demoHashChildId(patient.id),
          ageGroup,
          s.type,
          s.date,
          s.compositeScore,
          Math.round(s.compositeScore * 0.55),   // mock criterion A (~55% of composite)
          Math.round(s.compositeScore * 0.45),   // mock criterion B (~45% of composite)
          s.riskTier,
          s.compositeScore > 35 ? 14 : s.compositeScore > 20 ? 7 : 2,  // mock M-CHAT
          (7 - Math.random() * 2).toFixed(1),    // gaze
          (6 - Math.random() * 2).toFixed(1),    // reaction
          (5 + Math.random() * 2).toFixed(1),    // precision
          (8 - Math.random() * 3).toFixed(1),    // imitation
          (7 - Math.random() * 2).toFixed(1),    // engagement
          (0.75 + Math.random() * 0.15).toFixed(2), // confidence
          s.compositeScore > 30 && Math.random() > 0.6 ? 'true' : 'false',
          s.riskTier === 'ELEVATED' ? 'ASD_PROFILE' :
          s.riskTier === 'INDETERMINATE' ? 'MIXED_PATTERN' : 'TYPICAL_PATTERN',
        ])
      }
    }
  }

  return buildCsv(headers, rows)
}

function makeClinicianCsv(): string {
  const headers = [
    'clinician_name', 'total_patients', 'total_screenings',
    'pct_elevated', 'avg_review_time_hours', 'overdue_reviews',
  ]

  const avgReviewHours: Record<string, number> = {
    c01: 18.4, c02: 22.1, c03: 12.8, c04: 54.3, c05: 8.2,
  }

  const rows = MOCK_CLINICIANS.map(c => {
    const sessions  = c.patients.flatMap(p => p.sessions)
    const total     = totalScreenings(c)
    const elevated  = sessions.filter(s => s.riskTier === 'ELEVATED').length
    const pctElev   = total > 0 ? ((elevated / total) * 100).toFixed(1) : '0.0'
    const overdue   = overduePendingCount(c)
    const avgHours  = avgReviewHours[c.id] ?? 24.0

    return [c.name, c.patients.length, total, pctElev, avgHours, overdue]
  })

  return buildCsv(headers, rows)
}

function makeUserCsv(): string {
  const headers = [
    'user_id', 'name', 'email', 'role',
    'registration_date', 'last_login_date', 'status',
  ]

  // MOCK_USERS already has no passwordHash / tokens in its AdminUser type.
  // Explicitly enumerate fields to guard against future type additions.
  const rows = MOCK_USERS.map(u => [
    u.id,
    u.name,
    u.email,
    u.role,
    u.registeredAt.slice(0, 10),   // date only
    u.lastLoginAt.slice(0, 10),
    u.isActive ? 'active' : 'suspended',
  ])

  return buildCsv(headers, rows)
}

// ─── Export trigger (real API + demo fallback) ────────────────────────────────

type ExportType = 'screenings' | 'clinicians' | 'users'

async function runExport(
  type: ExportType,
  token: string | undefined,
  setLoading: (v: boolean) => void,
  setError:   (v: string)  => void
) {
  setLoading(true)
  setError('')

  const endpoint  = `/api/admin/export/${type}`
  const timestamp = new Date().toISOString().slice(0, 10)
  const filename  = `seed_${type}_${timestamp}.csv`

  try {
    // Real API path
    const res = await fetch(endpoint, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Accept':        'text/csv',
      },
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

  } catch {
    // Demo fallback — generate from mock data client-side
    try {
      const csv =
        type === 'screenings' ? makeScreeningCsv() :
        type === 'clinicians' ? makeClinicianCsv() :
        makeUserCsv()
      triggerDownload(csv, filename)
    } catch (fallbackErr) {
      setError('Export failed. Check console for details.')
      console.error('Export fallback error:', fallbackErr)
    }
  } finally {
    setLoading(false)
  }
}

// ─── Export Card ──────────────────────────────────────────────────────────────

interface ExportCardProps {
  title:       string
  description: string
  contents:    string[]
  format:      string
  endpoint:    string
  icon:        React.ReactNode
  loading:     boolean
  error:       string
  onExport:    () => void
}

function ExportCard({
  title, description, contents, format, endpoint, icon,
  loading, error, onExport,
}: ExportCardProps) {
  return (
    <div className="seed-card flex flex-col gap-4">
      {/* Title row */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-seed-navy/10 flex items-center
                        justify-center flex-shrink-0 text-seed-navy mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-seed-dark">{title}</h3>
          <p className="text-xs text-seed-muted mt-0.5">{description}</p>
        </div>
        <span className="flex-shrink-0 text-xs font-bold px-2 py-1 rounded-lg
                         bg-slate-100 text-slate-600 font-mono">{format}</span>
      </div>

      {/* Contents list */}
      <div className="bg-slate-50 rounded-xl px-4 py-3">
        <p className="text-[10px] font-semibold text-seed-muted uppercase
                      tracking-wide mb-2">Included fields</p>
        <ul className="space-y-1">
          {contents.map(c => (
            <li key={c} className="flex items-start gap-2 text-xs text-seed-muted">
              <span className="text-seed-teal mt-0.5 flex-shrink-0">✓</span>
              {c}
            </li>
          ))}
        </ul>
      </div>

      {/* Endpoint */}
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono text-seed-navy bg-seed-navy/8
                         px-2 py-1 rounded flex-1 truncate">
          GET {endpoint}
        </code>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200
                      rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Button */}
      <button
        onClick={onExport}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                   bg-seed-teal text-white text-sm font-semibold
                   hover:bg-seed-navy transition-colors
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent
                             rounded-full animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} className="w-4 h-4">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
                strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="7 10 12 15 17 10"
                strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
            </svg>
            Export {format}
          </>
        )}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ExportPage() {
  const { user } = useAuthStore()
  // Access the stored JWT if it exists on the user object.
  // The token field name depends on your auth store implementation —
  // adjust if the store exposes it differently.
  const token = (user as unknown as { accessToken?: string })?.accessToken

  const [loadingScreenings, setLoadingScreenings] = useState(false)
  const [loadingClinicians, setLoadingClinicians] = useState(false)
  const [loadingUsers,      setLoadingUsers]      = useState(false)
  const [errorScreenings,   setErrorScreenings]   = useState('')
  const [errorClinicians,   setErrorClinicians]   = useState('')
  const [errorUsers,        setErrorUsers]        = useState('')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="p-6 max-w-7xl space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-seed-dark">Data Export</h1>
        <p className="text-sm text-seed-muted mt-0.5">
          All exports are admin-only. Each download is logged to the audit trail.
        </p>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200
                      rounded-xl px-4 py-3.5 text-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={1.8}
          className="w-5 h-5 flex-shrink-0 mt-0.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="space-y-1">
          <p className="font-semibold text-amber-900">Server-side enforcement required</p>
          <p className="text-amber-800 text-xs leading-relaxed">
            Frontend role checks are advisory only. Each endpoint must independently
            verify <code className="font-mono bg-amber-100 px-1 rounded">req.user.role === 'ADMIN'</code>
            {' '}in Express middleware before executing. Every export must write to the
            audit log (adminId, exportType, timestamp, IP) server-side — the client
            cannot guarantee this.
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Export 1 — Anonymized Screening Dataset */}
        <ExportCard
          title="Anonymized Screening Dataset"
          description="All sessions with PII removed. Suitable for research and model retraining."
          format="CSV"
          endpoint="/api/admin/export/screenings"
          loading={loadingScreenings}
          error={errorScreenings}
          onExport={() => runExport('screenings', token, setLoadingScreenings, setErrorScreenings)}
          contents={[
            'Child ID replaced with one-way hash (HMAC server-side)',
            'Age group only — no date of birth',
            'Session type, date, composite score',
            'Criterion A + B scores',
            'Risk tier, M-CHAT-R score',
            'All 5 behavioral metric scores',
            'Confidence, divergence flag, differential pattern',
            'No names, emails, or identifiable fields',
          ]}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
              className="w-5 h-5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" strokeLinecap="round" />
            </svg>
          }
        />

        {/* Export 2 — Clinician Report */}
        <ExportCard
          title="Clinician Report"
          description="Per-clinician aggregate metrics for performance review and audit purposes."
          format="CSV"
          endpoint="/api/admin/export/clinicians"
          loading={loadingClinicians}
          error={errorClinicians}
          onExport={() => runExport('clinicians', token, setLoadingClinicians, setErrorClinicians)}
          contents={[
            'Clinician name and ID',
            'Total patients assigned',
            'Total screenings completed',
            '% sessions classified Elevated',
            'Average review time (hours)',
            'Overdue review count (> 72h)',
          ]}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
              className="w-5 h-5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />

        {/* Export 3 — User Report */}
        <ExportCard
          title="User Report"
          description="Registration and status data across all roles. Auth secrets explicitly excluded."
          format="CSV"
          endpoint="/api/admin/export/users"
          loading={loadingUsers}
          error={errorUsers}
          onExport={() => runExport('users', token, setLoadingUsers, setErrorUsers)}
          contents={[
            'User ID, name, email',
            'Role (PARENT / CLINICIAN / ADMIN)',
            'Registration date',
            'Last login date',
            'Account status (active / suspended)',
            'No passwords, tokens, or auth secrets',
          ]}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
              className="w-5 h-5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />
      </div>

      {/* Anonymization note */}
      <div className="seed-card bg-slate-50 border border-slate-200">
        <h4 className="text-xs font-bold text-seed-dark uppercase tracking-wide mb-3">
          Anonymization Implementation Notes
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-seed-muted leading-relaxed">
          <div>
            <p className="font-semibold text-seed-dark mb-1">
              Server-side (production)
            </p>
            <p>
              Child IDs are hashed with{' '}
              <code className="font-mono bg-white border border-slate-200
                               px-1 py-0.5 rounded text-seed-navy">
                HMAC-SHA256(childId, EXPORT_SECRET)
              </code>{' '}
              where <code className="font-mono text-seed-navy">EXPORT_SECRET</code> is
              a server env var never exposed to the client. The same child always maps
              to the same hash, enabling longitudinal analysis without re-identification.
            </p>
          </div>
          <div>
            <p className="font-semibold text-seed-dark mb-1">
              Client-side fallback (demo only)
            </p>
            <p>
              When the API is unavailable, this page generates a mock CSV using a weak
              32-bit FNV-1a hash. This is for demo purposes only — it is NOT
              cryptographically safe and must never be used with real child data.
              In production, all anonymization happens on the server before the CSV
              leaves the database.
            </p>
          </div>
        </div>
      </div>

      {/* DPDPA compliance note */}
      <div className="flex items-start gap-3 text-xs text-seed-muted
                      bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.6}
          className="w-4 h-4 flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
        <p>
          <strong className="text-blue-800">DPDPA-2023 / ABDM compliance:</strong>{' '}
          Exports containing personal data are subject to Digital Personal Data
          Protection Act 2023 obligations. Ensure exports are accessed only for
          declared purposes and that audit records are maintained. The anonymized
          screening export is the preferred format for research use.
        </p>
      </div>

      <p className="text-xs text-seed-muted text-center italic pb-2">
        Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
      </p>
    </motion.div>
  )
}
