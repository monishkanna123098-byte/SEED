/**
 * S.E.E.D. Clinician — Patient Detail Page
 * Route: /clinician/patients/:childId
 *
 * Child summary header + full session history table.
 * Clicking any session row navigates to /clinician/session/:sessionId.
 */

import { useParams, useNavigate, Link } from 'react-router-dom'
import { Sprout, AlertTriangle } from 'lucide-react'
import { RiskTierBadge } from '@/components/parent/RiskTierBadge'
import { calculateAge, formatDate } from '@/utils/age'
import { MOCK_PATIENTS } from './mockPatients'
import type { MockSession } from './mockPatients'
import { RiskTier } from '@/types'

// ─── Session type badge ───────────────────────────────────────────────────────

const SESSION_TYPE_LABEL: Record<string, string> = {
  VIDEO:    'Video',
  GAME:     'Game',
  COMBINED: 'Video + Game',
}

const SESSION_TYPE_COLOR: Record<string, string> = {
  VIDEO:    'bg-blue-100 text-blue-700',
  GAME:     'bg-purple-100 text-purple-700',
  COMBINED: 'bg-seed-navy/10 text-seed-navy',
}

// ─── Review status badge ──────────────────────────────────────────────────────

const REVIEW_CFG = {
  PENDING:    { label: 'Pending',    cls: 'bg-amber-100  text-amber-700'  },
  CONFIRMED:  { label: 'Confirmed',  cls: 'bg-emerald-100 text-emerald-700' },
  OVERRIDDEN: { label: 'Overridden', cls: 'bg-purple-100 text-purple-700' },
} as const

function ReviewBadge({ status }: { status: keyof typeof REVIEW_CFG }) {
  const cfg = REVIEW_CFG[status]
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct   = Math.round((score / 70) * 100)
  const color =
    score < 24 ? 'bg-emerald-400'
    : score < 47 ? 'bg-amber-400'
    : 'bg-red-400'

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-seed-dark w-7 text-right">
        {score}<span className="text-seed-muted font-normal text-[10px]">/70</span>
      </span>
    </div>
  )
}

// ─── Trajectory mini sparkline ────────────────────────────────────────────────

function Sparkline({ sessions }: { sessions: MockSession[] }) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  if (sorted.length < 2) return null

  const scores = sorted.map(s => s.compositeScore)
  const min = 0
  const max = 70
  const W = 120
  const H = 32
  const pad = 4

  const points = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (W - pad * 2)
    const y = H - pad - ((s - min) / (max - min)) * (H - pad * 2)
    return `${x},${y}`
  })

  const first = scores[0]
  const last  = scores[scores.length - 1]
  const delta = last - first
  const color = delta > 5 ? '#ef4444' : delta < -5 ? '#10b981' : '#f59e0b'

  return (
    <div className="flex items-center gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        {/* Zone bands */}
        <rect x={0} y={H - pad - (23 / 70) * (H - pad * 2)} width={W}
          height={(23 / 70) * (H - pad * 2)} fill="#dcfce7" fillOpacity={0.5} />
        <rect x={0} y={H - pad - (46 / 70) * (H - pad * 2)} width={W}
          height={((46 - 23) / 70) * (H - pad * 2)} fill="#fef9c3" fillOpacity={0.5} />
        <rect x={0} y={pad} width={W}
          height={((70 - 46) / 70) * (H - pad * 2)} fill="#fee2e2" fillOpacity={0.5} />
        {/* Line */}
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        <circle
          cx={Number(points[points.length - 1].split(',')[0])}
          cy={Number(points[points.length - 1].split(',')[1])}
          r={3}
          fill={color}
        />
      </svg>
      <span className={`text-xs font-semibold ${
        delta > 5 ? 'text-red-600' : delta < -5 ? 'text-emerald-600' : 'text-amber-600'
      }`}>
        {delta > 0 ? `+${delta}` : delta}
      </span>
    </div>
  )
}

// ─── Session table row ────────────────────────────────────────────────────────

function SessionRow({ session, onClick }: { session: MockSession; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-slate-50 hover:bg-seed-ice/60 cursor-pointer
                 transition-colors group"
    >
      {/* Date */}
      <td className="px-4 py-3.5 text-sm text-seed-dark font-medium">
        {formatDate(session.date)}
      </td>

      {/* Session type */}
      <td className="px-4 py-3.5">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                          ${SESSION_TYPE_COLOR[session.type] ?? 'bg-slate-100 text-slate-600'}`}>
          {SESSION_TYPE_LABEL[session.type] ?? session.type}
        </span>
      </td>

      {/* Composite score */}
      <td className="px-4 py-3.5 min-w-[140px]">
        <ScoreBar score={session.compositeScore} />
      </td>

      {/* Risk tier */}
      <td className="px-4 py-3.5">
        <RiskTierBadge tier={session.riskTier as RiskTier} size="sm" />
      </td>

      {/* Review status */}
      <td className="px-4 py-3.5">
        <ReviewBadge status={session.reviewStatus} />
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

// ─── Child header ─────────────────────────────────────────────────────────────

function ChildHeader({
  name, dateOfBirth, gender, parentName, parentEmail, registeredAt, sessions,
}: {
  name: string; dateOfBirth: string; gender: string; parentName: string
  parentEmail: string; registeredAt: string; sessions: MockSession[]
}) {
  const age = calculateAge(dateOfBirth)
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const currentTier = sorted[0]?.riskTier as RiskTier | undefined
  const genderLabel = gender === 'MALE' ? 'Boy' : gender === 'FEMALE' ? 'Girl' : 'Child'

  return (
    <div className="bg-white border-b border-slate-100">
      <div className="px-6 py-5">
        {/* Back link */}
        <Link
          to="/clinician/patients"
          className="inline-flex items-center gap-1 text-xs text-seed-muted
                     hover:text-seed-dark transition-colors mb-4"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}
            className="w-3.5 h-3.5">
            <polyline points="10,3 5,8 10,13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to My Patients
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: identity */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center
                         text-xl font-extrabold text-white flex-shrink-0"
              style={{ backgroundColor: gender === 'FEMALE' ? '#028090' : '#065A82' }}
            >
              {name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-seed-dark">{name}</h1>
              <p className="text-sm text-seed-muted mt-0.5">
                {age.display}
                <span className="mx-1.5 text-slate-300">·</span>
                {genderLabel}
                <span className="mx-1.5 text-slate-300">·</span>
                Registered {formatDate(registeredAt)}
              </p>
            </div>
          </div>

          {/* Right: parent + current tier */}
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-1">Parent</p>
              <p className="text-sm font-semibold text-seed-dark">{parentName}</p>
              <p className="text-xs text-seed-muted">{parentEmail}</p>
            </div>
            {currentTier && (
              <div>
                <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-1">
                  Current Tier
                </p>
                <RiskTierBadge tier={currentTier} />
              </div>
            )}
            <div>
              <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-1">
                Trajectory
              </p>
              <Sparkline sessions={sessions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PatientDetailPage() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()

  const patient = MOCK_PATIENTS.find(p => p.id === childId)

  if (!patient) {
    return (
      <div className="p-6 text-center">
        <div className="seed-card max-w-sm mx-auto py-14">
          <div className="flex justify-center mb-3"><Sprout className="text-seed-teal" size={28} /></div>
          <h2 className="font-bold text-seed-dark mb-2">Patient not found</h2>
          <p className="text-sm text-seed-muted mb-4">
            No patient with ID "{childId}" is assigned to you.
          </p>
          <Link
            to="/clinician/patients"
            className="seed-btn-primary inline-block text-sm px-4 py-2"
          >
            Back to Patients
          </Link>
        </div>
      </div>
    )
  }

  const sortedSessions = [...patient.sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const pendingCount = sortedSessions.filter(s => s.reviewStatus === 'PENDING').length

  return (
    <div className="flex flex-col">
      <ChildHeader
        name={patient.name}
        dateOfBirth={patient.dateOfBirth}
        gender={patient.gender}
        parentName={patient.parentName}
        parentEmail={patient.parentEmail}
        registeredAt={patient.registeredAt}
        sessions={patient.sessions}
      />

      <div className="p-6 max-w-5xl">

        {/* Pending review notice */}
        {pendingCount > 0 && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200
                          rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>{pendingCount} session{pendingCount !== 1 ? 's' : ''}</strong> pending
              clinical review. Click each session to open the review panel.
            </p>
          </div>
        )}

        {/* Sessions card */}
        <div className="seed-card p-0 overflow-hidden">

          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-3
                          border-b border-slate-100">
            <h2 className="font-semibold text-seed-dark">
              Screening History
            </h2>
            <span className="text-xs text-seed-muted">
              {sortedSessions.length} session{sortedSessions.length !== 1 ? 's' : ''}
              {pendingCount > 0 && (
                <span className="ml-2 text-amber-600 font-semibold">
                  · {pendingCount} pending
                </span>
              )}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Date', 'Type', 'Composite Score', 'Risk Tier', 'Review Status', ''].map(col => (
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
                {sortedSessions.map(session => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onClick={() => navigate(`/clinician/session/${session.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-seed-muted text-center mt-6 italic">
          Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
        </p>
      </div>
    </div>
  )
}
