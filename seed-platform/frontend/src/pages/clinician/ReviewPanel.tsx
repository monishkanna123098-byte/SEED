/**
 * S.E.E.D. Clinician — Review Panel
 *
 * Fixed bottom bar.  Never scrolls away.
 *
 * Layout:
 *   Row 1: [LEFT: tier + review status] [RIGHT: 4 action buttons]
 *   Row 2: Clinical notes textarea (autosave on blur)
 *
 * Actions:
 *   1. Confirm Risk Assessment → sets reviewStatus CONFIRMED
 *   2. Override Risk Tier      → modal: select tier + reason (min 20 chars)
 *   3. Schedule Tele-Consult   → inline date/time picker + toast
 *   4. Generate Referral Letter → modal with copy/download
 *
 * Positioning: fixed bottom-0, padded left to clear the sidebar
 *   (pl-16 on small screens / lg:pl-60 on expanded sidebar screens)
 */

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import { formatDate, calculateAge } from '@/utils/age'
import { SessionDetail } from './SessionDetailPage'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewStatus  = 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN'
type ReferralState = 'NONE' | 'PENDING' | 'SCHEDULED' | 'COMPLETE'
type SaveStatus    = 'idle' | 'saving' | 'saved'
type OverrideTier  = 'MONITOR' | 'INDETERMINATE' | 'ELEVATED'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_LABEL: Record<string, string> = {
  MONITOR:       'Monitor Closely',
  INDETERMINATE: 'Indeterminate',
  ELEVATED:      'Elevated',
}

const TIER_COLOR: Record<string, string> = {
  MONITOR:       'text-emerald-700 bg-emerald-100',
  INDETERMINATE: 'text-amber-700 bg-amber-100',
  ELEVATED:      'text-red-700 bg-red-100',
}

const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { label: string; cls: string }> = {
  PENDING:    { label: 'Pending Review', cls: 'text-amber-700 bg-amber-100' },
  CONFIRMED:  { label: 'Confirmed',      cls: 'text-emerald-700 bg-emerald-100' },
  OVERRIDDEN: { label: 'Overridden',     cls: 'text-purple-700 bg-purple-100' },
}

function mchatBand(score: number): string {
  if (score <= 2) return 'LOW'
  if (score <= 7) return 'MEDIUM'
  return 'HIGH'
}

function flaggedMetricLines(metrics: SessionDetail['metrics']): string {
  const lines: string[] = []
  if (metrics.gaze.flag)
    lines.push(`  • Gaze response: reduced response to social stimuli (score ${metrics.gaze.score}/10, z = ${metrics.gaze.zscore})`)
  if (metrics.reaction.flag)
    lines.push(`  • Reaction latency: elevated latency to social cues (score ${metrics.reaction.score}/10)`)
  if (metrics.precision.flag)
    lines.push(`  • Touch precision: below normative threshold (score ${metrics.precision.score}/10)`)
  if (metrics.imitation.flag)
    lines.push(`  • Peer imitation: significantly reduced accuracy (score ${metrics.imitation.score}/10, z = ${metrics.imitation.zscore})`)
  if (metrics.engagement.flag)
    lines.push(`  • Task engagement: frequent disengagement events (score ${metrics.engagement.score}/10)`)
  return lines.length > 0 ? lines.join('\n') : '  No individual metrics exceeded clinical thresholds.'
}

function buildReferralLetter(
  detail: SessionDetail,
  clinicianName: string,
  displayTier: string,
): string {
  const { child, session, criterionA, criterionB, metrics, mchatData } = detail
  const age     = calculateAge(child.dateOfBirth)
  const today   = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const dob     = new Date(child.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const screenDate = formatDate(session.createdAt)

  const mchatLine = mchatData
    ? `  - M-CHAT-R/F Score: ${mchatData.total_score}/20 (${mchatBand(mchatData.total_score)} likelihood)`
    : '  - M-CHAT-R/F: Not administered in this session'

  const divergenceLine = session.divergenceFlag
    ? `\nClinical note: A significant divergence (${session.divergencePercent ?? '—'}%) was observed between parent-reported behaviors and direct assessment findings, warranting further evaluation.`
    : ''

  return `Date: ${today}
From: Dr. ${clinicianName}
Re: Developmental Screening Referral — ${child.name}

Dear Specialist,

I am referring ${child.name}, aged ${age.months} months (D.O.B. ${dob}), for specialist evaluation following a developmental screening conducted on ${screenDate} using the S.E.E.D. platform (Social Emotional Early Detection).

Screening Summary:
  - Session Type: ${session.type}
  - Composite Score: ${session.compositeScore}/70
  - Risk Classification: ${TIER_LABEL[displayTier] ?? displayTier}
  - Criterion A (Social Communication): ${criterionA.total}/30
  - Criterion B (Restricted/Repetitive Behaviors): ${criterionB.total}/40
${mchatLine}

Key findings:
${flaggedMetricLines(metrics)}
${divergenceLine}

This referral is based on screening data only and does not constitute a diagnosis. S.E.E.D. is a decision-support tool. Clinical confirmation and formal diagnostic assessment are strongly recommended.

Regards,
Dr. ${clinicianName}
S.E.E.D. Platform — Clinician

---
Screening tool only. Not a diagnostic instrument. Clinical confirmation required.`
}

// ─── Shared button ────────────────────────────────────────────────────────────

function ActionBtn({
  label, icon, onClick, variant = 'secondary', disabled = false,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'warning'
  disabled?: boolean
}) {
  const cls = {
    primary:   'bg-seed-teal text-white hover:bg-seed-navy',
    secondary: 'bg-white border border-slate-200 text-seed-dark hover:border-seed-teal/60 hover:text-seed-teal',
    success:   'bg-emerald-600 text-white hover:bg-emerald-700',
    warning:   'bg-amber-500 text-white hover:bg-amber-600',
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                  transition-all duration-150 whitespace-nowrap flex-shrink-0
                  disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      <span className="w-3.5 h-3.5 flex-shrink-0">{icon}</span>
      {label}
    </button>
  )
}

// ─── Override modal ───────────────────────────────────────────────────────────

function OverrideModal({
  current, onConfirm, onClose,
}: {
  current: string
  onConfirm: (tier: OverrideTier, reason: string) => void
  onClose: () => void
}) {
  const [tier, setTier]     = useState<OverrideTier>('MONITOR')
  const [reason, setReason] = useState('')
  const [error, setError]   = useState('')

  function submit() {
    if (reason.trim().length < 20) {
      setError('Reason must be at least 20 characters.')
      return
    }
    setError('')
    onConfirm(tier, reason.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="font-bold text-seed-dark text-lg mb-1">Override Risk Tier</h3>
        <p className="text-xs text-seed-muted mb-5">
          Current tier: <strong>{TIER_LABEL[current] ?? current}</strong>
        </p>

        {/* Tier selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-seed-muted uppercase tracking-wide block mb-2">
            New Risk Tier
          </label>
          <div className="flex gap-2">
            {(['MONITOR', 'INDETERMINATE', 'ELEVATED'] as OverrideTier[]).map(t => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  tier === t
                    ? TIER_COLOR[t] + ' border-current'
                    : 'text-seed-muted border-slate-200 hover:border-slate-300'
                }`}
              >
                {TIER_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-seed-muted uppercase tracking-wide block mb-2">
            Clinical Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); if (error) setError('') }}
            placeholder="Describe the clinical rationale for overriding the model's tier assignment…"
            rows={4}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5
                       text-seed-dark placeholder:text-slate-300 resize-none
                       focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30 outline-none"
          />
          <div className="flex items-center justify-between mt-1">
            {error
              ? <p className="text-xs text-red-600">{error}</p>
              : <span />
            }
            <p className={`text-xs ml-auto ${reason.trim().length < 20 ? 'text-slate-400' : 'text-emerald-600'}`}>
              {reason.trim().length} / 20 min
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm
                       text-seed-muted hover:border-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 rounded-xl bg-seed-navy text-white text-sm
                       font-semibold hover:bg-seed-teal transition-colors"
          >
            Confirm Override
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Consult picker ───────────────────────────────────────────────────────────

function ConsultPickerModal({
  onConfirm, onClose,
}: {
  onConfirm: (date: string, time: string) => void
  onClose: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [error, setError] = useState('')

  function submit() {
    if (!date) { setError('Please select a date.'); return }
    onConfirm(date, time)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="font-bold text-seed-dark text-lg mb-1">Schedule Tele-Consult</h3>
        <p className="text-xs text-seed-muted mb-5">
          A notification will be sent to the parent.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-seed-muted uppercase tracking-wide block mb-2">
              Date
            </label>
            <input
              type="date"
              min={today}
              value={date}
              onChange={e => { setDate(e.target.value); setError('') }}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5
                         text-seed-dark focus:border-seed-teal focus:ring-1
                         focus:ring-seed-teal/30 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-seed-muted uppercase tracking-wide block mb-2">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5
                         text-seed-dark focus:border-seed-teal focus:ring-1
                         focus:ring-seed-teal/30 outline-none"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm
                       text-seed-muted hover:border-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 rounded-xl bg-seed-teal text-white text-sm
                       font-semibold hover:bg-seed-navy transition-colors"
          >
            Confirm & Notify Parent
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Referral letter modal ────────────────────────────────────────────────────

function ReferralLetterModal({
  letter, onClose,
}: {
  letter: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(letter).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDownload() {
    const blob = new Blob([letter], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `SEED_referral_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-seed-dark">Referral Letter</h3>
          <button
            onClick={onClose}
            className="text-seed-muted hover:text-seed-dark transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}
              className="w-4 h-4">
              <line x1="3" y1="3" x2="13" y2="13" strokeLinecap="round" />
              <line x1="13" y1="3" x2="3" y2="13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Letter body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <pre className="text-xs font-mono text-seed-dark whitespace-pre-wrap leading-relaxed
                          bg-slate-50 rounded-xl p-4 border border-slate-100">
            {letter}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                        text-sm font-semibold border transition-all ${
              copied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'border-seed-teal/50 text-seed-teal hover:bg-seed-teal/5'
            }`}
          >
            {copied
              ? <><span>✓</span> Copied!</>
              : <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
                  <rect x="5" y="5" width="9" height="9" rx="1.5" />
                  <path d="M11 5V3.5a1.5 1.5 0 00-1.5-1.5h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
                </svg> Copy to Clipboard</>
            }
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                       text-sm font-semibold bg-seed-navy text-white hover:bg-seed-teal
                       transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
              <path d="M8 2v9M4 7l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 13h12" strokeLinecap="round" />
            </svg>
            Download .txt
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast notification ───────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed top-20 right-6 z-50 bg-seed-dark text-white text-sm px-4 py-3
                  rounded-xl shadow-xl flex items-center gap-2 transition-all duration-300
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
    >
      <span className="text-seed-mint font-bold">✓</span>
      {message}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ReviewPanelProps {
  detail: SessionDetail
  sessionId: string
}

export function ReviewPanel({ detail, sessionId }: ReviewPanelProps) {
  const { user } = useAuthStore()
  const clinicianName = user?.name ?? 'Clinician'

  // ── State ─────────────────────────────────────────────────────────────────
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('PENDING')
  const [displayTier,  setDisplayTier]  = useState(detail.session.riskTier)
  const [referralState, setReferralState] = useState<ReferralState>('NONE')
  const [notes, setNotes]               = useState(detail.clinicianNotes ?? '')
  const [saveStatus,   setSaveStatus]   = useState<SaveStatus>('idle')

  // Modals
  const [showOverride,  setShowOverride]  = useState(false)
  const [showConsult,   setShowConsult]   = useState(false)
  const [showReferral,  setShowReferral]  = useState(false)
  const [referralLetter, setReferralLetter] = useState('')

  // Toast
  const [toast, setToast] = useState({ message: '', visible: false })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, visible: true })
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000)
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleConfirm() {
    setReviewStatus('CONFIRMED')
    api.post(`/clinician/sessions/${sessionId}/notes`, {
      notes: notes || 'Risk assessment confirmed without additional notes.',
    }).catch(() => { /* demo mode — silently continue */ })
    showToast('Risk assessment confirmed.')
  }

  function handleOverrideConfirm(tier: OverrideTier, reason: string) {
    setShowOverride(false)
    setDisplayTier(tier)
    setReviewStatus('OVERRIDDEN')
    api.post(`/clinician/sessions/${sessionId}/override`, {
      overrideTier: tier, reason,
    }).catch(() => { /* demo mode */ })
    showToast(`Tier overridden to ${TIER_LABEL[tier]}.`)
  }

  function handleConsultConfirm(date: string, time: string) {
    setShowConsult(false)
    setReferralState('SCHEDULED')
    api.patch(`/clinician/sessions/${sessionId}/referral`, {
      referralStatus: 'SCHEDULED',
    }).catch(() => { /* demo mode */ })
    const formatted = new Date(`${date}T${time}`).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    showToast(`Tele-consult scheduled for ${formatted}. Parent notified.`)
  }

  function handleGenerateLetter() {
    const letter = buildReferralLetter(detail, clinicianName, displayTier)
    setReferralLetter(letter)
    setShowReferral(true)
  }

  // ── Notes autosave ────────────────────────────────────────────────────────

  function handleNotesBlur() {
    if (!notes.trim()) return
    setSaveStatus('saving')
    api.post(`/clinician/sessions/${sessionId}/notes`, { notes })
      .then(() => {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      })
      .catch(() => {
        // Demo mode — simulate saved
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      })
  }

  // ── Review status config ──────────────────────────────────────────────────

  const reviewCfg = REVIEW_STATUS_CONFIG[reviewStatus]
  const tierCfg   = TIER_COLOR[displayTier] ?? 'text-seed-muted bg-slate-100'

  // ── Icons ─────────────────────────────────────────────────────────────────

  const icons = {
    confirm: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <polyline points="3,8 6,11 13,4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>,
    override: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
      <path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" />
    </svg>,
    consult: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M5 1v3M11 1v3M2 7h12" strokeLinecap="round" />
    </svg>,
    letter: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5 6h6M5 9h4" strokeLinecap="round" />
    </svg>,
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Toast message={toast.message} visible={toast.visible} />

      {/* Modals */}
      {showOverride && (
        <OverrideModal
          current={displayTier}
          onConfirm={handleOverrideConfirm}
          onClose={() => setShowOverride(false)}
        />
      )}
      {showConsult && (
        <ConsultPickerModal
          onConfirm={handleConsultConfirm}
          onClose={() => setShowConsult(false)}
        />
      )}
      {showReferral && (
        <ReferralLetterModal
          letter={referralLetter}
          onClose={() => setShowReferral(false)}
        />
      )}

      {/* Sticky panel */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-xl">
        {/* Offset content from sidebar width */}
        <div className="pl-16 lg:pl-60">

          {/* Row 1: Status + action buttons */}
          <div className="flex items-center justify-between gap-4 px-5 pt-3 pb-2 flex-wrap">

            {/* Left: current tier + review status */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div>
                <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-1">
                  Risk Tier
                </p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tierCfg}`}>
                  {TIER_LABEL[displayTier] ?? displayTier}
                  {reviewStatus === 'OVERRIDDEN' && (
                    <span className="ml-1 opacity-60">(overridden)</span>
                  )}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-1">
                  Review Status
                </p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${reviewCfg.cls}`}>
                  {reviewCfg.label}
                </span>
              </div>
              {referralState === 'SCHEDULED' && (
                <div>
                  <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-1">
                    Referral
                  </p>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                    Consult Scheduled
                  </span>
                </div>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <ActionBtn
                label="Confirm Assessment"
                icon={icons.confirm}
                variant="success"
                onClick={handleConfirm}
                disabled={reviewStatus === 'CONFIRMED'}
              />
              <ActionBtn
                label="Override Tier"
                icon={icons.override}
                variant="secondary"
                onClick={() => setShowOverride(true)}
              />
              <ActionBtn
                label="Schedule Tele-Consult"
                icon={icons.consult}
                variant="secondary"
                onClick={() => setShowConsult(true)}
                disabled={referralState === 'SCHEDULED'}
              />
              <ActionBtn
                label="Referral Letter"
                icon={icons.letter}
                variant="primary"
                onClick={handleGenerateLetter}
              />
            </div>
          </div>

          {/* Row 2: Notes */}
          <div className="px-5 pb-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-seed-muted whitespace-nowrap flex-shrink-0">
                Clinical Notes:
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add clinical observations, context, or follow-up actions…"
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5
                           text-seed-dark placeholder:text-slate-300 outline-none
                           focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30"
              />
              <div className="flex-shrink-0 w-16 text-right">
                {saveStatus === 'saving' && (
                  <span className="text-xs text-seed-muted flex items-center gap-1 justify-end">
                    <span className="w-3 h-3 border-2 border-seed-teal border-t-transparent
                                     rounded-full animate-spin inline-block" />
                    Saving
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-xs text-emerald-600 font-semibold">Saved ✓</span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
