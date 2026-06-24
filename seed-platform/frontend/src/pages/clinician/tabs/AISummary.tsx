/**
 * S.E.E.D. Clinician — AI Summary Tab
 *
 * Pure string-interpolation template engine.  No LLM.
 * All paragraphs are generated deterministically from session data.
 *
 * Template structure:
 *   P1 — Child + session overview
 *   P2 — Criterion A interpretation
 *   P3 — Criterion B interpretation
 *   P4 — Divergence note
 *   P5 — Confidence + low-confidence caveat
 *   P6 — Recommended action
 *
 * Followed by a collapsible table of every raw value used.
 */

import { useState } from 'react'
import { SessionDetail } from '../SessionDetailPage'
import { calculateAge, formatDate } from '@/utils/age'

// ─── Template helpers ─────────────────────────────────────────────────────────

const SESSION_TYPE_LABEL: Record<string, string> = {
  VIDEO:       'video-based',
  GAME:        'game-based',
  COMBINED:    'video and game-based combined',
  MCHAT_ONLY:  'questionnaire-based',
}

const TIER_LABEL: Record<string, string> = {
  MONITOR:       'Monitor Closely',
  INDETERMINATE: 'Indeterminate',
  ELEVATED:      'Elevated',
}

function mchatBand(score: number): string {
  if (score <= 2) return 'LOW likelihood — no follow-up indicated'
  if (score <= 7) return 'MEDIUM likelihood — follow-up interview recommended'
  return 'HIGH likelihood — specialist referral recommended'
}

function flaggedBNames(criterionB: SessionDetail['criterionB']): string[] {
  return [criterionB.b1, criterionB.b2, criterionB.b3, criterionB.b4]
    .filter(b => b.score > b.max * 0.5)
    .map(b => b.name.toLowerCase())
}

function defaultAction(tier: string): string {
  switch (tier) {
    case 'ELEVATED':
      return 'Refer for specialist evaluation. Consultation should be scheduled within 2 weeks.'
    case 'INDETERMINATE':
      return 'Administer the M-CHAT-R/F Follow-Up Interview. Developmental monitoring every 1–2 months.'
    case 'MONITOR':
      return 'Continue routine developmental monitoring. Rescreening recommended in 3–6 months.'
    default:
      return 'Clinical review recommended.'
  }
}

// ─── Core template builder ────────────────────────────────────────────────────

interface SummaryParagraph {
  text: string
  variant: 'normal' | 'highlight' | 'warning' | 'action'
}

function buildSummary(detail: SessionDetail): SummaryParagraph[] {
  const { child, session, criterionA, criterionB, mchatData } = detail
  const ageMonths = calculateAge(child.dateOfBirth).months
  const sessionType = SESSION_TYPE_LABEL[session.type] ?? session.type.toLowerCase()
  const date = formatDate(session.createdAt)
  const tier = TIER_LABEL[session.riskTier] ?? session.riskTier
  const confidencePct = Math.round(session.confidence * 100)

  const paragraphs: SummaryParagraph[] = []

  // P1 — Overview
  paragraphs.push({
    text: `${child.name}, aged ${ageMonths} months, completed a ${sessionType} screening on ${date}. The composite behavioral score was ${session.compositeScore}/70, placing the child in the ${tier} tier.`,
    variant: 'normal',
  })

  // P2 — Criterion A
  const aNote = criterionA.total > 15
    ? 'Notable patterns were observed in social-emotional reciprocity and nonverbal communication.'
    : 'Social communication patterns were within expected ranges for this age group.'
  paragraphs.push({
    text: `Criterion A (Social Communication) scored ${criterionA.total}/30. ${aNote}`,
    variant: 'normal',
  })

  // P3 — Criterion B
  const bFlagged = flaggedBNames(criterionB)
  const bNote = criterionB.total > 20
    ? `Elevated patterns were observed in ${bFlagged.length > 0 ? bFlagged.join(', ') : 'restricted and repetitive behaviors'}.`
    : 'Repetitive behavior patterns did not exceed clinical thresholds.'
  paragraphs.push({
    text: `Criterion B (Restricted/Repetitive Behaviors) scored ${criterionB.total}/40. ${bNote}`,
    variant: 'normal',
  })

  // P4 — Divergence
  if (session.divergenceFlag) {
    paragraphs.push({
      text: `Note: A significant divergence (${session.divergencePercent ?? '—'}%) was detected between parent-reported responses and direct behavioral measurement. This discrepancy warrants clinical attention and may affect the reliability of the composite score.`,
      variant: 'warning',
    })
  } else {
    paragraphs.push({
      text: 'Parent-reported responses and behavioral measurements were broadly consistent.',
      variant: 'normal',
    })
  }

  // P5 — Confidence
  let confText = `Model confidence: ${confidencePct}%.`
  if (session.confidence < 0.70) {
    let reason: string
    if (session.type === 'VIDEO')      reason = 'poor video quality or insufficient behavioral signal'
    else if (session.type === 'GAME')  reason = 'incomplete game session or high disengagement rate'
    else                               reason = 'reduced signal quality in one or more assessment modalities'
    confText += ` Low confidence due to ${reason}. Results should be interpreted with caution and supplemented by direct clinical observation.`
    paragraphs.push({ text: confText, variant: 'highlight' })
  } else {
    paragraphs.push({ text: confText, variant: 'normal' })
  }

  // P6 — M-CHAT-R (if available)
  if (mchatData) {
    const band = mchatBand(mchatData.total_score)
    paragraphs.push({
      text: `M-CHAT-R/F score: ${mchatData.total_score}/20 (${band}).`,
      variant: 'normal',
    })
  }

  // P7 — Recommended action
  const action = detail.session.recommendedAction ?? defaultAction(session.riskTier)
  paragraphs.push({
    text: `Recommended action: ${action}`,
    variant: 'action',
  })

  return paragraphs
}

// ─── Raw values table ─────────────────────────────────────────────────────────

function buildRawValues(detail: SessionDetail): Array<{ label: string; value: string }> {
  const { session, criterionA, criterionB, metrics, mchatData } = detail
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Session Type',             value: session.type },
    { label: 'Session Date',             value: formatDate(session.createdAt) },
    { label: 'Composite Score',          value: `${session.compositeScore} / 70` },
    { label: 'Risk Tier',                value: session.riskTier },
    { label: 'Model Confidence',         value: `${Math.round(session.confidence * 100)}%` },
    { label: 'Divergence Flag',          value: session.divergenceFlag ? `Yes — ${session.divergencePercent ?? '—'}%` : 'No' },
    { label: '─── Criterion A ───',      value: '' },
    { label: 'A Total',                  value: `${criterionA.total} / 30` },
    { label: 'A1 Social reciprocity',    value: `${criterionA.a1.score} / ${criterionA.a1.max}` },
    { label: 'A2 Nonverbal comm.',       value: `${criterionA.a2.score} / ${criterionA.a2.max}` },
    { label: 'A3 Relationships',         value: `${criterionA.a3.score} / ${criterionA.a3.max}` },
    { label: '─── Criterion B ───',      value: '' },
    { label: 'B Total',                  value: `${criterionB.total} / 40` },
    { label: 'B1 Stereotyped mov.',      value: `${criterionB.b1.score} / ${criterionB.b1.max}` },
    { label: 'B2 Insistence/sameness',   value: `${criterionB.b2.score} / ${criterionB.b2.max}` },
    { label: 'B3 Restricted interests',  value: `${criterionB.b3.score} / ${criterionB.b3.max}` },
    { label: 'B4 Sensory reactivity',    value: `${criterionB.b4.score} / ${criterionB.b4.max}` },
    { label: '─── Behavioral Metrics ─', value: '' },
    { label: 'Gaze score',               value: `${metrics.gaze.score} / 10  (z = ${metrics.gaze.zscore})  ${metrics.gaze.flag ? '⚑ Flagged' : ''}` },
    { label: 'Reaction score',           value: `${metrics.reaction.score} / 10  (z = ${metrics.reaction.zscore})  ${metrics.reaction.flag ? '⚑ Flagged' : ''}` },
    { label: 'Touch precision',          value: `${metrics.precision.score} / 10  ${metrics.precision.flag ? '⚑ Flagged' : ''}` },
    { label: 'Imitation score',          value: `${metrics.imitation.score} / 10  (z = ${metrics.imitation.zscore})  ${metrics.imitation.flag ? '⚑ Flagged' : ''}` },
    { label: 'Engagement score',         value: `${metrics.engagement.score} / 10  (z = ${metrics.engagement.zscore})  ${metrics.engagement.flag ? '⚑ Flagged' : ''}` },
  ]

  if (mchatData) {
    rows.push(
      { label: '─── M-CHAT-R/F ───',  value: '' },
      { label: 'Total Score',          value: `${mchatData.total_score} / 20` },
      { label: 'Critical Items Flagged', value: `${mchatData.critical_flagged} / 3` },
      { label: 'Risk Band',            value: mchatBand(mchatData.total_score).split(' ')[0] },
    )
  }

  return rows
}

// ─── Paragraph component ──────────────────────────────────────────────────────

function SummaryPara({ para }: { para: SummaryParagraph }) {
  const styles = {
    normal:    'text-slate-700',
    highlight: 'text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2',
    warning:   'text-amber-900 bg-amber-50 border-l-4 border-amber-400 pl-3 py-1',
    action:    'text-seed-navy font-semibold',
  }

  return (
    <p className={`text-sm leading-relaxed ${styles[para.variant]}`}>
      {para.variant === 'warning' && (
        <span className="font-bold mr-1">⚠</span>
      )}
      {para.text}
    </p>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AISummaryProps {
  detail: SessionDetail
}

export function AISummary({ detail }: AISummaryProps) {
  const [rawOpen, setRawOpen] = useState(false)
  const paragraphs = buildSummary(detail)
  const rawValues  = buildRawValues(detail)

  return (
    <div className="space-y-4">

      {/* Summary card */}
      <div className="seed-card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-seed-dark">Clinical Summary</h3>
          <span className="flex items-center gap-1.5 text-xs text-seed-muted
                           bg-slate-100 px-2.5 py-1 rounded-full">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
              strokeWidth={1.5} className="w-3 h-3">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <path d="M5 6h6M5 9h4" strokeLinecap="round" />
            </svg>
            Template-generated · No AI
          </span>
        </div>

        <div className="space-y-3">
          {paragraphs.map((para, i) => (
            <SummaryPara key={i} para={para} />
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs text-seed-muted italic leading-relaxed">
            This summary is generated deterministically from screening data. It does not
            constitute a medical diagnosis. Clinical confirmation is required.
          </p>
        </div>
      </div>

      {/* Raw values — collapsible */}
      <div className="seed-card">
        <button
          onClick={() => setRawOpen(v => !v)}
          className="w-full flex items-center justify-between text-sm font-semibold
                     text-seed-dark hover:text-seed-teal transition-colors"
        >
          <span>Raw Values Used in Summary</span>
          <svg
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}
            className={`w-4 h-4 transition-transform duration-200 ${rawOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="4,6 8,10 12,6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {rawOpen && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-6 text-xs font-semibold text-seed-muted
                                 uppercase tracking-wide w-56">
                    Field
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-seed-muted
                                 uppercase tracking-wide">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {rawValues.map(({ label, value }, i) => {
                  const isSeparator = label.startsWith('───')
                  if (isSeparator) {
                    return (
                      <tr key={i}>
                        <td colSpan={2} className="py-2 pt-4">
                          <span className="text-[10px] font-bold text-seed-muted uppercase
                                           tracking-widest">
                            {label.replace(/─/g, '').trim()}
                          </span>
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-1.5 pr-6 text-xs text-seed-muted">{label}</td>
                      <td className="py-1.5 font-mono text-xs text-seed-dark whitespace-pre">
                        {value}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
