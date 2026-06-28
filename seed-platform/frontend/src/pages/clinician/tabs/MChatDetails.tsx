/**
 * S.E.E.D. Clinician — M-CHAT-R Details Tab
 *
 * Renders all 20 M-CHAT-R/F items with the parent's response,
 * at-risk direction, and risk flag for each item.
 * Items 2, 5, 12 (reverse-scored) are marked "critical" per spec.
 *
 * Summary below the list: total score, critical items flagged, risk band.
 *
 * Source: Robins, Fein & Barton 2009. mchatscreen.com
 * Items imported from MChatQuestionnaire — verify wording against
 * licensed copy before production deployment.
 */

import { Star, ClipboardList } from 'lucide-react'
import { MCHAT_ITEMS } from '@/components/MChatQuestionnaire'
import { MChatData } from '../SessionDetailPage'

// ─── Risk band computation ────────────────────────────────────────────────────

type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH'

function computeBand(score: number, criticalFlagged: number): RiskBand {
  if (score >= 8 || criticalFlagged >= 2) return 'HIGH'
  if (score >= 3 || criticalFlagged >= 1) return 'MEDIUM'
  return 'LOW'
}

const BAND_CONFIG: Record<RiskBand, { label: string; bg: string; text: string; border: string }> = {
  LOW:    { label: 'Low Risk',    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  MEDIUM: { label: 'Medium Risk (Follow-Up Recommended)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  HIGH:   { label: 'High Risk',   bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="seed-card py-12 text-center">
      <div className="flex justify-center mb-2"><ClipboardList className="text-seed-muted" size={32} /></div>
      <p className="font-medium text-seed-dark mb-1">M-CHAT-R not completed</p>
      <p className="text-sm text-seed-muted">
        No questionnaire data is available for this session.
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MChatDetailsProps {
  data?: MChatData
}

export function MChatDetails({ data }: MChatDetailsProps) {
  if (!data || data.answers.length !== 20) return <EmptyState />

  const band = computeBand(data.total_score, data.critical_flagged)
  const cfg  = BAND_CONFIG[band]

  // Critical item indices (0-based): items 2, 5, 12 of the 1-indexed list
  const CRITICAL_INDICES = new Set([1, 4, 11])

  return (
    <div className="space-y-5">
      {/* Licensing notice for clinicians */}
      <p className="text-[10px] text-slate-400 italic">
        M-CHAT-R/F™ © Robins, Fein &amp; Barton 2009. mchatscreen.com.
        Verify item wording against licensed copy before clinical use.
      </p>

      {/* Item table */}
      <div className="seed-card p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h3 className="font-semibold text-seed-dark">
            Item-Level Responses
          </h3>
          <p className="text-xs text-seed-muted mt-0.5">
            Items marked{' '}
            <span className="inline-flex items-center gap-0.5 font-bold text-amber-600"><Star size={11} className="fill-amber-500 text-amber-500" />Critical</span>{' '}
            are reverse-scored (YES = at-risk).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['#', 'Question', 'Answer', 'At-risk if', 'Flagged'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold
                                          text-seed-muted uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {MCHAT_ITEMS.map((item, idx) => {
                const isCritical = CRITICAL_INDICES.has(idx)
                const answer     = data.answers[idx]
                const flagged    = data.risk_flags[idx]

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/60 transition-colors duration-100 ${
                      isCritical ? 'border-l-[3px] border-l-amber-400' : ''
                    }`}
                  >
                    {/* Number */}
                    <td className="px-4 py-3 text-center align-top w-10">
                      <span className="text-sm font-bold text-seed-dark">{item.id}</span>
                      {isCritical && (
                        <div className="flex justify-center mt-0.5">
                          <Star size={10} className="fill-amber-500 text-amber-500" />
                        </div>
                      )}
                    </td>

                    {/* Question text */}
                    <td className="px-4 py-3 align-top max-w-xs">
                      <p className={`text-sm text-seed-dark leading-snug ${
                        isCritical ? 'font-medium' : ''
                      }`}>
                        {item.text}
                      </p>
                      {item.example && (
                        <p className="text-[11px] text-seed-muted mt-0.5 italic">
                          {item.example}
                        </p>
                      )}
                    </td>

                    {/* Parent's answer */}
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className={`text-sm font-bold ${
                        answer ? 'text-seed-teal' : 'text-seed-navy'
                      }`}>
                        {answer ? 'YES' : 'NO'}
                      </span>
                    </td>

                    {/* At-risk direction */}
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className="text-xs text-seed-muted">
                        {item.reverseScored ? 'YES' : 'NO'}
                      </span>
                    </td>

                    {/* Flagged badge */}
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {flagged ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold
                                          px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          YES
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold
                                          px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          NO
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className={`rounded-2xl border-2 ${cfg.bg} ${cfg.border} p-5`}>
        <h3 className={`font-bold mb-3 ${cfg.text}`}>Questionnaire Summary</h3>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className={`text-3xl font-extrabold ${cfg.text}`}>{data.total_score}</p>
            <p className="text-xs text-seed-muted mt-0.5">Items flagged<br />out of 20</p>
          </div>
          <div className="text-center">
            <p className={`text-3xl font-extrabold ${cfg.text}`}>{data.critical_flagged}</p>
            <p className="text-xs text-seed-muted mt-0.5">Critical items<br />flagged</p>
          </div>
          <div className="text-center flex flex-col items-center justify-center">
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
        </div>

        <p className="text-xs text-seed-muted leading-relaxed border-t border-current/10 pt-3">
          <strong>Official M-CHAT-R/F bands:</strong>{' '}
          0–2 flagged = Low likelihood (no follow-up needed) ·{' '}
          3–7 flagged = Moderate likelihood (administer follow-up) ·{' '}
          8–20 flagged = High likelihood (refer immediately). Source: Robins et al. 2014 (M-CHAT-R/F).
        </p>
      </div>
    </div>
  )
}
