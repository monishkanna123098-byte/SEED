/**
 * S.E.E.D. Admin — Clinicians Page
 * Route: /admin/clinicians
 *
 * Table: Name | Email | Children | Total Screenings | Pending Reviews | Last Active
 * Pending Reviews cell turns red when ANY review is overdue (> 72h).
 * Row click → /admin/clinicians/:id
 * Header button → "Assign Patient" modal (manual clinician assignment).
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertTriangle, Search } from 'lucide-react'
import {
  MOCK_CLINICIANS, pendingCount, overduePendingCount, totalScreenings,
} from './mockClinicians'
import type { AdminClinicianRecord } from './mockClinicians'
import { formatDate } from '@/utils/age'

// ─── Assign Patient Modal ─────────────────────────────────────────────────────

interface AssignPatientModalProps {
  clinicians: AdminClinicianRecord[]
  onClose: () => void
  onAssigned: (patientName: string, clinicianName: string) => void
}

function AssignPatientModal({ clinicians, onClose, onAssigned }: AssignPatientModalProps) {
  const [selectedPatientKey, setSelectedPatientKey] = useState('')
  const [selectedClinicianId, setSelectedClinicianId] = useState('')
  const [error, setError] = useState('')

  // Build flat list of all patients: "childId|clinicianId"
  const allPatients = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ key: string; patientName: string; parentName: string; currentClinician: string }> = []
    for (const c of clinicians) {
      for (const p of c.patients) {
        if (!seen.has(p.id)) {
          seen.add(p.id)
          result.push({
            key: `${p.id}|${c.id}`,
            patientName: p.name,
            parentName: p.parentName,
            currentClinician: c.name,
          })
        }
      }
    }
    return result.sort((a, b) => a.patientName.localeCompare(b.patientName))
  }, [clinicians])

  function handleConfirm() {
    if (!selectedPatientKey) { setError('Please select a patient.'); return }
    if (!selectedClinicianId) { setError('Please select a clinician.'); return }

    const patient    = allPatients.find(p => p.key === selectedPatientKey)
    const clinician  = clinicians.find(c => c.id === selectedClinicianId)
    if (!patient || !clinician) return

    if (selectedPatientKey.endsWith(`|${selectedClinicianId}`)) {
      setError('This patient is already assigned to that clinician.')
      return
    }

    onAssigned(patient.patientName, clinician.name)
  }

  const selectedPatient = allPatients.find(p => p.key === selectedPatientKey)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="font-bold text-seed-dark">Manual Clinician Assignment</h3>
          <button onClick={onClose}
            className="text-slate-400 hover:text-seed-dark transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="3" y1="3" x2="13" y2="13" strokeLinecap="round" />
              <line x1="13" y1="3" x2="3"  y2="13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-seed-muted">
            Bypass the invite-code flow to reassign a patient directly.
            Use when a clinician is inactive or a patient needs urgent reassignment.
          </p>

          {/* Patient selector */}
          <div>
            <label className="text-xs font-semibold text-seed-muted uppercase tracking-wide block mb-1.5">
              Patient <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPatientKey}
              onChange={e => { setSelectedPatientKey(e.target.value); setError('') }}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5
                         text-seed-dark bg-white outline-none
                         focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30"
            >
              <option value="">Select a patient…</option>
              {allPatients.map(p => (
                <option key={p.key} value={p.key}>
                  {p.patientName} (Parent: {p.parentName})
                </option>
              ))}
            </select>
          </div>

          {/* Current assignment info */}
          {selectedPatient && (
            <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <span className="text-amber-700">
                Currently assigned to: <strong>{selectedPatient.currentClinician}</strong>
              </span>
            </div>
          )}

          {/* Clinician selector */}
          <div>
            <label className="text-xs font-semibold text-seed-muted uppercase tracking-wide block mb-1.5">
              Assign to Clinician <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClinicianId}
              onChange={e => { setSelectedClinicianId(e.target.value); setError('') }}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5
                         text-seed-dark bg-white outline-none
                         focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30"
            >
              <option value="">Select a clinician…</option>
              {clinicians.filter(c => c.isActive).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.specialty} ({c.patients.length} patients)
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200
                          rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm
                         text-seed-muted hover:border-slate-300 transition-colors">
              Cancel
            </button>
            <button onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-seed-teal text-white text-sm
                         font-semibold hover:bg-seed-navy transition-colors">
              Confirm Assignment
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Pending Reviews cell ─────────────────────────────────────────────────────

function PendingCell({ clinician }: { clinician: AdminClinicianRecord }) {
  const pending  = pendingCount(clinician)
  const overdue  = overduePendingCount(clinician)
  const hasOverdue = overdue > 0

  if (pending === 0) {
    return <span className="text-emerald-600 text-sm font-semibold">0</span>
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-bold ${hasOverdue ? 'text-red-600' : 'text-amber-600'}`}>
        {pending}
      </span>
      {hasOverdue && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                         bg-red-100 text-red-700 whitespace-nowrap">
          {overdue} overdue
        </span>
      )}
    </div>
  )
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryRow({ clinicians }: { clinicians: AdminClinicianRecord[] }) {
  const totalPatients   = new Set(clinicians.flatMap(c => c.patients.map(p => p.id))).size
  const totalSessions   = clinicians.reduce((s, c) => s + totalScreenings(c), 0)
  const totalOverdue    = clinicians.reduce((s, c) => s + overduePendingCount(c), 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Total Clinicians', value: clinicians.length, color: 'text-violet-700' },
        { label: 'Total Patients',   value: totalPatients,     color: 'text-sky-700'    },
        { label: 'Total Screenings', value: totalSessions,     color: 'text-seed-navy'  },
        { label: 'Overdue Reviews',  value: totalOverdue,      color: totalOverdue > 0 ? 'text-red-600' : 'text-emerald-600' },
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

export function CliniciansPage() {
  const navigate = useNavigate()
  const clinicians = MOCK_CLINICIANS
  const [query,  setQuery]  = useState('')
  const [showAssign, setShowAssign] = useState(false)
  const [toast, setToast]   = useState({ message: '', visible: false })

  function showToast(msg: string) {
    setToast({ message: msg, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500)
  }

  function handleAssigned(patientName: string, clinicianName: string) {
    setShowAssign(false)
    showToast(`${patientName} reassigned to ${clinicianName}.`)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clinicians
    return clinicians.filter(c =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) ||
      c.specialty.toLowerCase().includes(q)
    )
  }, [clinicians, query])

  return (
    <>
      {/* Toast */}
      <div className={`fixed top-20 right-6 z-50 bg-slate-900 text-white text-sm
                       px-4 py-3 rounded-xl shadow-xl flex items-center gap-2
                       transition-all duration-300 ${
        toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}>
        <Check size={14} className="text-emerald-400" />
        {toast.message}
      </div>

      <AnimatePresence>
        {showAssign && (
          <AssignPatientModal
            clinicians={clinicians}
            onClose={() => setShowAssign(false)}
            onAssigned={handleAssigned}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="p-6 max-w-7xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-seed-dark">Clinician Management</h1>
            <p className="text-sm text-seed-muted mt-0.5">
              {clinicians.length} active clinicians across the platform
            </p>
          </div>
          <button
            onClick={() => setShowAssign(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-seed-teal
                       text-white text-sm font-semibold hover:bg-seed-navy transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className="w-4 h-4">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" strokeLinecap="round" />
              <line x1="16" y1="11" x2="22" y2="11" strokeLinecap="round" />
            </svg>
            Assign Patient
          </button>
        </div>

        {/* Summary */}
        <SummaryRow clinicians={clinicians} />

        {/* Overdue warning */}
        {clinicians.some(c => overduePendingCount(c) > 0) && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200
                          rounded-xl px-4 py-3 text-sm text-red-800">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p>
              <strong>{clinicians.reduce((s, c) => s + overduePendingCount(c), 0)} overdue reviews</strong>{' '}
              across {clinicians.filter(c => overduePendingCount(c) > 0).length} clinicians
              (sessions completed &gt; 72 hours ago with no clinical review).
            </p>
          </div>
        )}

        {/* Table card */}
        <div className="seed-card p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400">
                <circle cx="6.5" cy="6.5" r="4.5" />
                <path d="M14 14l-3-3" strokeLinecap="round" />
              </svg>
              <input
                type="text" value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, email, or specialty…"
                className="w-full text-sm border border-slate-200 rounded-lg
                           pl-8 pr-3 py-2 text-seed-dark placeholder:text-slate-300
                           focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30 outline-none"
              />
            </div>
            <span className="text-xs text-seed-muted ml-auto">
              {filtered.length} clinician{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Name', 'Specialty', 'Children', 'Screenings', 'Pending Reviews', 'Last Active', ''].map(col => (
                    <th key={col}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold
                                 text-seed-muted uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const overdue   = overduePendingCount(c)
                  const rowAlert  = overdue > 0
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/admin/clinicians/${c.id}`)}
                      className={`border-b border-slate-50 cursor-pointer transition-colors group
                                  ${rowAlert ? 'hover:bg-red-50/40' : 'hover:bg-slate-50/60'}`}
                    >
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center
                                          justify-center text-sm font-bold text-violet-700 flex-shrink-0">
                            {c.name.split(' ').find(w => !w.startsWith('Dr'))?.charAt(0) ?? 'C'}
                          </div>
                          <div>
                            <p className="font-semibold text-seed-dark text-sm
                                           group-hover:text-seed-teal transition-colors">
                              {c.name}
                            </p>
                            <p className="text-xs text-seed-muted">{c.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Specialty */}
                      <td className="px-4 py-3.5 text-sm text-seed-muted">
                        {c.specialty}
                      </td>

                      {/* Children */}
                      <td className="px-4 py-3.5 text-sm font-semibold text-seed-dark text-center">
                        {c.patients.length}
                      </td>

                      {/* Total screenings */}
                      <td className="px-4 py-3.5 text-sm font-semibold text-seed-dark text-center">
                        {totalScreenings(c)}
                      </td>

                      {/* Pending reviews — red if overdue */}
                      <td className={`px-4 py-3.5 ${rowAlert ? 'bg-red-50/60' : ''}`}>
                        <PendingCell clinician={c} />
                      </td>

                      {/* Last active */}
                      <td className="px-4 py-3.5 text-sm text-seed-muted">
                        {formatDate(c.lastActiveAt)}
                      </td>

                      {/* Chevron */}
                      <td className="px-3 py-3.5 text-slate-300 group-hover:text-seed-teal
                                     transition-colors">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}
                          className="w-4 h-4">
                          <polyline points="6,4 10,8 6,12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </td>
                    </tr>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex justify-center mb-3"><Search className="text-seed-muted" size={28} /></div>
                      <p className="font-semibold text-seed-dark">No clinicians found</p>
                      <p className="text-sm text-seed-muted mt-1">No results for "{query}"</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-seed-muted text-center italic">
          Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
        </p>
      </motion.div>
    </>
  )
}
