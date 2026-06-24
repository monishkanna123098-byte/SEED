/**
 * S.E.E.D. Clinician — Invite Codes Page
 * Route: /clinician/invite-codes
 *
 * Table: Code | Created | Used By | Expiry | Status | Actions
 * Actions: Copy to clipboard, Revoke (ACTIVE only)
 * Generate button: 6-char alphanumeric, 30-day expiry
 *
 * State is local: no store. Mock POST fires silently; table
 * updates immediately on generate and revoke.
 */

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDate } from '@/utils/age'
import { api } from '@/utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type CodeStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED'

interface InviteCode {
  id:        string
  code:      string
  createdAt: string   // ISO
  expiresAt: string   // ISO
  usedBy:    string | null
  status:    CodeStatus
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<CodeStatus, { label: string; cls: string }> = {
  ACTIVE:  { label: 'Active',  cls: 'bg-emerald-100 text-emerald-700' },
  USED:    { label: 'Used',    cls: 'bg-blue-100 text-blue-700'       },
  EXPIRED: { label: 'Expired', cls: 'bg-amber-100 text-amber-700'     },
  REVOKED: { label: 'Revoked', cls: 'bg-red-100 text-red-700'         },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // no I/O/1/0 ambiguity
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function expiryIn30Days(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString()
}

function isExpiredByDate(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now()
}

function daysUntilExpiry(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
}

// ─── Mock seed data ───────────────────────────────────────────────────────────

const SEED_CODES: InviteCode[] = [
  {
    id:        'ic-1',
    code:      'A4PX2T',
    createdAt: '2026-06-11T09:00:00Z',
    expiresAt: '2026-07-11T09:00:00Z',
    usedBy:    null,
    status:    'ACTIVE',
  },
  {
    id:        'ic-2',
    code:      'KS9R1M',
    createdAt: '2026-05-01T10:00:00Z',
    expiresAt: '2026-05-31T10:00:00Z',
    usedBy:    'Kavitha Suresh',
    status:    'USED',
  },
  {
    id:        'ic-3',
    code:      'B7NQ6F',
    createdAt: '2026-06-15T08:30:00Z',
    expiresAt: '2026-07-15T08:30:00Z',
    usedBy:    null,
    status:    'ACTIVE',
  },
  {
    id:        'ic-4',
    code:      'ZREM08',
    createdAt: '2026-05-10T11:00:00Z',
    expiresAt: '2026-06-09T11:00:00Z',
    usedBy:    null,
    status:    'EXPIRED',
  },
  {
    id:        'ic-5',
    code:      'VW3TJ5',
    createdAt: '2026-06-01T14:00:00Z',
    expiresAt: '2026-07-01T14:00:00Z',
    usedBy:    null,
    status:    'REVOKED',
  },
]

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      if (timer.current) clearTimeout(timer.current)
      setCopied(true)
      timer.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy code"
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                  border transition-all duration-150 ${
        copied
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-seed-muted hover:border-seed-teal/50 hover:text-seed-teal'
      }`}
    >
      {copied ? (
        <>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}
            className="w-3 h-3">
            <polyline points="3,8 6,11 13,4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}
            className="w-3 h-3">
            <rect x="5" y="5" width="9" height="9" rx="1.5" />
            <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5"
              strokeLinecap="round" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────

function CodeRow({
  code: c, onRevoke, isNew,
}: {
  code: InviteCode
  onRevoke: (id: string) => void
  isNew?: boolean
}) {
  const statusCfg  = STATUS_CFG[c.status]
  const expiredNow = isExpiredByDate(c.expiresAt)
  const daysLeft   = daysUntilExpiry(c.expiresAt)

  return (
    <motion.tr
      layout
      initial={isNew ? { opacity: 0, y: -12 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className={`border-b border-slate-50 transition-colors ${
        isNew ? 'bg-seed-teal/5' : 'hover:bg-slate-50/60'
      }`}
    >
      {/* Code */}
      <td className="px-4 py-3.5">
        <code className="font-mono text-sm font-bold text-seed-navy tracking-widest">
          {c.code}
        </code>
        {isNew && (
          <span className="ml-2 text-[10px] font-semibold text-seed-teal
                           bg-seed-teal/10 px-1.5 py-0.5 rounded-full">
            New
          </span>
        )}
      </td>

      {/* Created */}
      <td className="px-4 py-3.5 text-sm text-seed-muted">
        {formatDate(c.createdAt)}
      </td>

      {/* Used By */}
      <td className="px-4 py-3.5 text-sm">
        {c.usedBy
          ? <span className="text-seed-dark font-medium">{c.usedBy}</span>
          : <span className="text-slate-400 italic">Unused</span>
        }
      </td>

      {/* Expiry */}
      <td className="px-4 py-3.5 text-sm">
        <span className="text-seed-muted">{formatDate(c.expiresAt)}</span>
        {c.status === 'ACTIVE' && !expiredNow && (
          <span className={`ml-1.5 text-xs ${
            daysLeft <= 7 ? 'text-amber-600 font-semibold' : 'text-slate-400'
          }`}>
            ({daysLeft}d left)
          </span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
          {statusCfg.label}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <CopyButton code={c.code} />

          {c.status === 'ACTIVE' && (
            <button
              onClick={() => onRevoke(c.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                         border border-slate-200 bg-white text-red-600
                         hover:border-red-300 hover:bg-red-50 transition-all duration-150"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}
                className="w-3 h-3">
                <circle cx="8" cy="8" r="6" />
                <line x1="5" y1="8" x2="11" y2="8" strokeLinecap="round" />
              </svg>
              Revoke
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  )
}

// ─── Confirm revoke modal ─────────────────────────────────────────────────────

function RevokeModal({
  code, onConfirm, onClose,
}: {
  code: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="font-bold text-seed-dark text-lg mb-2">Revoke Invite Code?</h3>
        <p className="text-sm text-seed-muted mb-1">
          Code: <code className="font-mono font-bold text-seed-navy tracking-wider">{code}</code>
        </p>
        <p className="text-sm text-seed-muted mb-6">
          This code will no longer be usable. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm
                       text-seed-muted hover:border-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm
                       font-semibold hover:bg-red-700 transition-colors"
          >
            Revoke
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Summary chips ────────────────────────────────────────────────────────────

function CodeSummary({ codes }: { codes: InviteCode[] }) {
  const active  = codes.filter(c => c.status === 'ACTIVE').length
  const used    = codes.filter(c => c.status === 'USED').length
  const expired = codes.filter(c => c.status === 'EXPIRED').length
  const revoked = codes.filter(c => c.status === 'REVOKED').length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Active',  value: active,  color: 'text-emerald-700' },
        { label: 'Used',    value: used,    color: 'text-blue-700'    },
        { label: 'Expired', value: expired, color: 'text-amber-700'   },
        { label: 'Revoked', value: revoked, color: 'text-red-700'     },
      ].map(({ label, value, color }) => (
        <div key={label} className="seed-card py-4 text-center">
          <p className={`text-2xl font-extrabold leading-none ${color}`}>{value}</p>
          <p className="text-xs text-seed-muted mt-1.5">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>(SEED_CODES)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  // Revoke modal
  const [revokeTarget, setRevokeTarget] = useState<InviteCode | null>(null)

  // Generating state
  const [generating, setGenerating] = useState(false)

  function handleGenerate() {
    setGenerating(true)
    const newCode: InviteCode = {
      id:        `ic-${Date.now()}`,
      code:      generateCode(),
      createdAt: new Date().toISOString(),
      expiresAt: expiryIn30Days(),
      usedBy:    null,
      status:    'ACTIVE',
    }

    // Mock POST — fail silently
    api.post('/clinician/invite-code', { code: newCode.code })
      .catch(() => { /* demo mode */ })

    // Update table immediately
    setCodes(prev => [newCode, ...prev])
    setNewIds(prev => new Set([...prev, newCode.id]))

    // Remove "New" badge after 4 s
    setTimeout(() => {
      setNewIds(prev => {
        const next = new Set(prev)
        next.delete(newCode.id)
        return next
      })
    }, 4000)

    setGenerating(false)
  }

  function handleRevoke(id: string) {
    const target = codes.find(c => c.id === id)
    if (target) setRevokeTarget(target)
  }

  function confirmRevoke() {
    if (!revokeTarget) return
    setCodes(prev =>
      prev.map(c =>
        c.id === revokeTarget.id ? { ...c, status: 'REVOKED' as CodeStatus } : c
      )
    )
    api.post(`/clinician/invite-code/${revokeTarget.id}/revoke`, {})
      .catch(() => { /* demo mode */ })
    setRevokeTarget(null)
  }

  return (
    <>
      {/* Revoke confirmation */}
      {revokeTarget && (
        <RevokeModal
          code={revokeTarget.code}
          onConfirm={confirmRevoke}
          onClose={() => setRevokeTarget(null)}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="p-6 max-w-5xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-seed-dark">Invite Codes</h1>
            <p className="text-sm text-seed-muted mt-0.5">
              Share codes with parents to link them to your clinician account.
              Codes expire 30 days after creation.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-seed-teal text-white text-sm font-semibold
                       hover:bg-seed-navy transition-colors disabled:opacity-60
                       disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}
              className="w-4 h-4">
              <line x1="8" y1="2" x2="8" y2="14" strokeLinecap="round" />
              <line x1="2" y1="8" x2="14" y2="8" strokeLinecap="round" />
            </svg>
            Generate New Code
          </button>
        </div>

        {/* Summary chips */}
        <CodeSummary codes={codes} />

        {/* How-to note */}
        <div className="flex items-start gap-2 mb-4 text-sm text-seed-muted
                        bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <svg viewBox="0 0 16 16" fill="none" stroke="#3b82f6" strokeWidth={1.6}
            className="w-4 h-4 flex-shrink-0 mt-0.5">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 7v4M8 5.5v.5" strokeLinecap="round" />
          </svg>
          <p>
            Share the 6-character code with a parent during registration.
            They enter it in the <strong>Invite Code</strong> field when signing up.
            Each code can be used once.
          </p>
        </div>

        {/* Table */}
        <div className="seed-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Code', 'Created', 'Used By', 'Expires', 'Status', 'Actions'].map(col => (
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
                <AnimatePresence initial={false}>
                  {codes.map(c => (
                    <CodeRow
                      key={c.id}
                      code={c}
                      onRevoke={handleRevoke}
                      isNew={newIds.has(c.id)}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-seed-muted text-center mt-6 italic">
          Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
        </p>
      </motion.div>
    </>
  )
}
