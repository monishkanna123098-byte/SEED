/**
 * S.E.E.D. Admin — User Management
 * Route: /admin/users
 *
 * Three tabs: Parents | Clinicians | Admins
 * Each tab mounts a fresh UserTable (key={activeTab}) with
 * independent search / filter / sort / pagination state.
 *
 * UserTable  → manages local filter/sort/page state
 * UsersPage  → owns user list mutations + modal state
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, User, Lock, Unlock, KeyRound,
  Trash2, AlertTriangle, CheckCircle, Search, X,
} from 'lucide-react'
import { MOCK_USERS }    from './mockUsers'
import type { AdminUser, UserRole } from './mockUsers'
import { formatDate }    from '@/utils/age'
import { api }           from '@/utils/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const ROLE_CFG: Record<UserRole, { label: string; cls: string }> = {
  PARENT:    { label: 'Parent',    cls: 'bg-blue-100 text-blue-700'     },
  CLINICIAN: { label: 'Clinician', cls: 'bg-violet-100 text-violet-700' },
  ADMIN:     { label: 'Admin',     cls: 'bg-amber-100 text-amber-700'   },
}

const TABS: Array<{ label: string; role: UserRole }> = [
  { label: 'Parents',    role: 'PARENT'    },
  { label: 'Clinicians', role: 'CLINICIAN' },
  { label: 'Admins',     role: 'ADMIN'     },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function generateTempPassword(): string {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghjkmnpqrstuvwxyz', '23456789', '!@#$']
  const all  = sets.join('')
  const chars = [
    ...sets.map(s => s[Math.floor(Math.random() * s.length)]),
    ...Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]),
  ]
  return chars.sort(() => Math.random() - 0.5).join('')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

type SortField = 'name' | 'registeredAt' | 'screeningCount'
type SortDir   = 'asc' | 'desc'

function sortUsers(list: AdminUser[], field: SortField, dir: SortDir): AdminUser[] {
  return [...list].sort((a, b) => {
    let cmp = 0
    if (field === 'name')           cmp = a.name.localeCompare(b.name)
    else if (field === 'registeredAt') cmp = new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()
    else if (field === 'screeningCount') cmp = (a.screeningCount ?? 0) - (b.screeningCount ?? 0)
    return dir === 'asc' ? cmp : -cmp
  })
}

function buildPageRange(cur: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (cur <= 4)          return [1, 2, 3, 4, 5, '…', total]
  if (cur >= total - 3)  return [1, '…', total-4, total-3, total-2, total-1, total]
  return [1, '…', cur-1, cur, cur+1, '…', total]
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={`fixed top-20 right-6 z-50 bg-slate-900 text-white text-sm
                     px-4 py-3 rounded-xl shadow-xl flex items-center gap-2
                     transition-all duration-300 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
    }`}>
      <Check size={14} className="text-emerald-400" />
      {message}
    </div>
  )
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CFG[role]
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
      active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {active ? 'Active' : 'Suspended'}
    </span>
  )
}

// ─── Sortable header ──────────────────────────────────────────────────────────

function SortTH({
  label, field, active, dir, onSort,
}: {
  label: string; field: SortField; active: boolean
  dir: SortDir; onSort: (f: SortField) => void
}) {
  return (
    <th
      onClick={() => onSort(field)}
      className="px-4 py-2.5 text-left text-[11px] font-semibold text-seed-muted
                 uppercase tracking-wide whitespace-nowrap cursor-pointer
                 hover:text-seed-dark select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${active ? 'text-seed-teal' : 'text-slate-300'}`}>
          {active ? (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} />}
        </span>
      </span>
    </th>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, total, onChange }: {
  page: number; total: number; onChange: (p: number) => void
}) {
  if (total <= 1) return null
  const range = buildPageRange(page, total)
  return (
    <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-slate-100">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-seed-muted
                   hover:border-seed-teal/50 hover:text-seed-teal transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={14} />
      </button>
      {range.map((r, i) =>
        r === '…'
          ? <span key={`e${i}`} className="px-2 text-slate-400 text-xs">…</span>
          : (
            <button
              key={r}
              onClick={() => onChange(r as number)}
              className={`w-8 h-8 text-xs rounded-lg border transition-colors ${
                r === page
                  ? 'border-seed-teal bg-seed-teal text-white font-semibold'
                  : 'border-slate-200 text-seed-muted hover:border-seed-teal/50 hover:text-seed-teal'
              }`}
            >
              {r}
            </button>
          )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === total}
        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-seed-muted
                   hover:border-seed-teal/50 hover:text-seed-teal transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ─── Action menu (row ⋮ dropdown) ─────────────────────────────────────────────

function ActionMenu({
  user, open, onOpen, onClose,
  onViewProfile, onSuspend, onResetPassword, onDeleteRequest,
}: {
  user: AdminUser; open: boolean
  onOpen: () => void; onClose: () => void
  onViewProfile: () => void
  onSuspend: () => void
  onResetPassword: () => void
  onDeleteRequest: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  const items = [
    { label: 'View Profile',           icon: <User     size={14} />, action: onViewProfile,    cls: 'text-seed-dark' },
    { label: user.isActive ? 'Suspend' : 'Reactivate',
                                        icon: user.isActive ? <Lock size={14} /> : <Unlock size={14} />,
                                                   action: onSuspend,         cls: user.isActive ? 'text-amber-700' : 'text-emerald-700' },
    { label: 'Reset Password',          icon: <KeyRound size={14} />, action: onResetPassword,  cls: 'text-blue-700' },
    { label: 'Delete Account',          icon: <Trash2   size={14} />, action: onDeleteRequest,  cls: 'text-red-600'  },
  ]

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={open ? onClose : onOpen}
        className="w-8 h-8 flex items-center justify-center rounded-lg
                   text-seed-muted hover:bg-slate-100 hover:text-seed-dark
                   transition-colors text-base"
        title="Actions"
      >
        ⋯
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.95, y: -4  }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-xl
                       border border-slate-100 py-1 min-w-[168px]"
          >
            {items.map(({ label, icon, action, cls }) => (
              <button
                key={label}
                onClick={() => { onClose(); action() }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm
                             hover:bg-slate-50 transition-colors text-left ${cls}`}
              >
                <span className="flex-shrink-0">{icon}</span>
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── View Profile Modal ───────────────────────────────────────────────────────

function ViewProfileModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const roleColor = { PARENT: '#0284c7', CLINICIAN: '#7c3aed', ADMIN: '#d97706' }[user.role]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{    opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="font-bold text-seed-dark">User Profile</h3>
          <button onClick={onClose}
            className="text-slate-400 hover:text-seed-dark transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="3" y1="3" x2="13" y2="13" strokeLinecap="round" />
              <line x1="13" y1="3" x2="3"  y2="13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center
                            text-2xl font-extrabold text-white flex-shrink-0"
              style={{ backgroundColor: roleColor }}>
              {user.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-seed-dark text-lg leading-tight">{user.name}</p>
              <p className="text-sm text-seed-muted">{user.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <RoleBadge role={user.role} />
                <StatusBadge active={user.isActive} />
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-0.5">Registered</p>
              <p className="font-medium text-seed-dark">{formatDate(user.registeredAt)}</p>
            </div>
            <div>
              <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-0.5">Last Login</p>
              <p className="font-medium text-seed-dark">{formatDate(user.lastLoginAt)}</p>
            </div>

            {user.role === 'PARENT' && (
              <>
                <div>
                  <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-0.5">Children</p>
                  <p className="font-medium text-seed-dark">{user.childCount ?? 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-0.5">Total Screenings</p>
                  <p className="font-medium text-seed-dark">{user.screeningCount ?? 0}</p>
                </div>
              </>
            )}

            {user.role === 'CLINICIAN' && (
              <>
                <div className="col-span-2">
                  <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-0.5">Specialty</p>
                  <p className="font-medium text-seed-dark">{user.specialty ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-0.5">License</p>
                  <p className="font-mono text-sm text-seed-dark">{user.licenseNumber ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-seed-muted uppercase tracking-wide mb-0.5">Invite Codes Used</p>
                  <p className="font-medium text-seed-dark">{user.inviteCodesUsed ?? 0}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-6 pb-5">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-sm font-semibold
                       text-seed-muted hover:bg-slate-200 transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({
  onClose, onCreated,
}: {
  onClose: () => void
  onCreated: (user: AdminUser) => void
}) {
  type ModalState = 'form' | 'success'
  const [state,    setState]    = useState<ModalState>('form')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [role,     setRole]     = useState<UserRole | ''>('')
  const [errors,   setErrors]   = useState({ name: '', email: '', role: '' })
  const [tempPwd,  setTempPwd]  = useState('')
  const [newUser,  setNewUser]  = useState<AdminUser | null>(null)
  const [copied,   setCopied]   = useState(false)

  function validate(): boolean {
    const e = { name: '', email: '', role: '' }
    if (name.trim().length < 2) e.name = 'Name must be at least 2 characters.'
    if (!isValidEmail(email))   e.email = 'Enter a valid email address.'
    if (!role)                  e.role = 'Select a role.'
    setErrors(e)
    return !e.name && !e.email && !e.role
  }

  function handleCreate() {
    if (!validate()) return
    const pwd  = generateTempPassword()
    const user: AdminUser = {
      id:           generateId(),
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      role:         role as UserRole,
      registeredAt: new Date().toISOString(),
      lastLoginAt:  new Date().toISOString(),
      isActive:     true,
      deletedAt:    null,
      ...(role === 'PARENT'    && { childCount: 0, screeningCount: 0 }),
      ...(role === 'CLINICIAN' && { specialty: '', licenseNumber: '', inviteCodesUsed: 0 }),
    }
    api.post('/admin/users', { name: user.name, email: user.email, role: user.role })
       .catch(() => { /* demo mode */ })
    setTempPwd(pwd)
    setNewUser(user)
    setState('success')
    onCreated(user)
  }

  function handleCopyPwd() {
    navigator.clipboard.writeText(tempPwd).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="font-bold text-seed-dark">
            {state === 'form' ? 'Add New User' : 'User Created'}
          </h3>
          {state === 'form' && (
            <button onClick={onClose}
              className="text-slate-400 hover:text-seed-dark transition-colors">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <line x1="3" y1="3" x2="13" y2="13" strokeLinecap="round" />
                <line x1="13" y1="3" x2="3"  y2="13" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {state === 'form' ? (
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-seed-muted uppercase tracking-wide block mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Dr. Priya Rajan"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5
                           text-seed-dark placeholder:text-slate-300 outline-none
                           focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30"
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-seed-muted uppercase tracking-wide block mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5
                           text-seed-dark placeholder:text-slate-300 outline-none
                           focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30"
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-semibold text-seed-muted uppercase tracking-wide block mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {(['PARENT', 'CLINICIAN', 'ADMIN'] as UserRole[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      role === r
                        ? ROLE_CFG[r].cls + ' border-current'
                        : 'text-seed-muted border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {ROLE_CFG[r].label}
                  </button>
                ))}
              </div>
              {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
            </div>

            <p className="text-xs text-seed-muted">
              A temporary password will be generated and displayed once after creation.
            </p>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm
                           text-seed-muted hover:border-slate-300 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate}
                className="flex-1 py-2.5 rounded-xl bg-seed-teal text-white text-sm
                           font-semibold hover:bg-seed-navy transition-colors">
                Create User
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Success header */}
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl
                            border border-emerald-200">
              <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800 text-sm">Account created</p>
                <p className="text-xs text-emerald-700">{newUser?.name} · {newUser?.email}</p>
              </div>
            </div>

            {/* Temp password */}
            <div className="bg-slate-900 rounded-xl p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">
                Temporary Password — Shown Once
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-amber-400 text-base font-bold
                                 tracking-widest break-all">
                  {tempPwd}
                </code>
                <button
                  onClick={handleCopyPwd}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold
                               transition-all ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  {copied ? <><Check size={12} className="inline mr-0.5" />Copied</> : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-800
                            bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p>
                This password cannot be retrieved after closing this window.
                Share it with the user through a secure channel.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-seed-teal text-white text-sm
                         font-semibold hover:bg-seed-navy transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  user, onClose, onConfirm,
}: {
  user: AdminUser; onClose: () => void; onConfirm: () => void
}) {
  const [input, setInput] = useState('')
  const ready = input === 'DELETE'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
      >
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="font-bold text-seed-dark">Delete Account</h3>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-red-800">{user.name}</p>
              <p className="text-red-700 text-xs mt-0.5">
                The account will be soft-deleted. The user will lose access immediately
                but their data is preserved in the database.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-seed-muted uppercase
                               tracking-wide block mb-1.5">
              Type <span className="font-mono text-red-600">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="DELETE"
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5
                         font-mono tracking-wider text-seed-dark placeholder:text-slate-300
                         outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm
                         text-seed-muted hover:border-slate-300 transition-colors">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!ready}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm
                         font-semibold hover:bg-red-700 transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Delete Account
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── User Table ───────────────────────────────────────────────────────────────

interface UserTableCallbacks {
  onViewProfile:    (u: AdminUser) => void
  onSuspend:        (id: string)   => void
  onResetPassword:  (id: string, name: string) => void
  onDeleteRequest:  (u: AdminUser) => void
}

function UserTable({
  users, role, ...cb
}: { users: AdminUser[]; role: UserRole } & UserTableCallbacks) {
  const [query,     setQuery]     = useState('')
  const [status,    setStatus]    = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [sortField, setSortField] = useState<SortField>('registeredAt')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')
  const [page,      setPage]      = useState(1)
  const [menuId,    setMenuId]    = useState<string | null>(null)

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let list = users
    const q = query.trim().toLowerCase()
    if (q) list = list.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
    if (status === 'ACTIVE')    list = list.filter(u =>  u.isActive)
    if (status === 'SUSPENDED') list = list.filter(u => !u.isActive)
    if (dateFrom) list = list.filter(u => u.registeredAt >= dateFrom)
    if (dateTo)   list = list.filter(u => u.registeredAt <= dateTo + 'T23:59:59Z')
    return sortUsers(list, sortField, sortDir)
  }, [users, query, status, dateFrom, dateTo, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [query, status, dateFrom, dateTo, sortField, sortDir])

  const showScreeningCol = role === 'PARENT'

  return (
    <div className="seed-card p-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M14 14l-3-3" strokeLinecap="round" />
          </svg>
          <input
            type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full text-sm border border-slate-200 rounded-lg
                       pl-8 pr-8 py-2 text-seed-dark placeholder:text-slate-300
                       focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400
                         hover:text-seed-dark">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value as typeof status)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2
                     text-seed-dark bg-white outline-none
                     focus:border-seed-teal focus:ring-1 focus:ring-seed-teal/30"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2
                       text-seed-dark outline-none focus:border-seed-teal
                       focus:ring-1 focus:ring-seed-teal/30 w-36"
            title="From date"
          />
          <ChevronRight size={14} className="text-slate-400" />
          <input
            type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2
                       text-seed-dark outline-none focus:border-seed-teal
                       focus:ring-1 focus:ring-seed-teal/30 w-36"
            title="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-xs text-seed-muted hover:text-seed-dark transition-colors px-1"
            >
              Clear
            </button>
          )}
        </div>

        <span className="text-xs text-seed-muted ml-auto flex-shrink-0">
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <SortTH label="Name"          field="name"           active={sortField==='name'}           dir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-seed-muted uppercase tracking-wide">Email</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-seed-muted uppercase tracking-wide">Role</th>
              <SortTH label="Registered"    field="registeredAt"   active={sortField==='registeredAt'}   dir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-seed-muted uppercase tracking-wide">Status</th>
              {showScreeningCol && (
                <SortTH label="Screenings"  field="screeningCount" active={sortField==='screeningCount'} dir={sortDir} onSort={toggleSort} />
              )}
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-seed-muted uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={showScreeningCol ? 7 : 6} className="py-16 text-center">
                  <div className="flex justify-center mb-3"><Search className="text-seed-muted" size={28} /></div>
                  <p className="font-semibold text-seed-dark">No users found</p>
                  <p className="text-sm text-seed-muted mt-1">
                    {query ? `No results for "${query}"` : 'No users match the current filters.'}
                  </p>
                </td>
              </tr>
            ) : paginated.map(user => (
              <tr key={user.id}
                className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                {/* Name */}
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center
                                    text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: { PARENT: '#0284c7', CLINICIAN: '#7c3aed', ADMIN: '#d97706' }[user.role] }}>
                      {user.name[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-seed-dark">{user.name}</span>
                  </div>
                </td>
                {/* Email */}
                <td className="px-4 py-3 text-sm text-seed-muted">
                  {user.email}
                </td>
                {/* Role */}
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                {/* Registered */}
                <td className="px-4 py-3 text-sm text-seed-muted">
                  {formatDate(user.registeredAt)}
                </td>
                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge active={user.isActive} />
                </td>
                {/* Screenings (Parents only) */}
                {showScreeningCol && (
                  <td className="px-4 py-3 text-sm text-center font-semibold text-seed-dark">
                    {user.screeningCount ?? 0}
                  </td>
                )}
                {/* Actions */}
                <td className="px-4 py-3">
                  <ActionMenu
                    user={user}
                    open={menuId === user.id}
                    onOpen={() => setMenuId(user.id)}
                    onClose={() => setMenuId(null)}
                    onViewProfile={() => cb.onViewProfile(user)}
                    onSuspend={() => cb.onSuspend(user.id)}
                    onResetPassword={() => cb.onResetPassword(user.id, user.name)}
                    onDeleteRequest={() => cb.onDeleteRequest(user)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100
                      text-xs text-seed-muted">
        <span>
          Showing{' '}
          <strong className="text-seed-dark">
            {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}
          </strong>{' '}
          of <strong className="text-seed-dark">{filtered.length}</strong>
        </span>
        <Pagination page={page} total={totalPages} onChange={setPage} />
      </div>
    </div>
  )
}

// ─── Page root ────────────────────────────────────────────────────────────────

export function UsersPage() {
  const [users,       setUsers]       = useState<AdminUser[]>(MOCK_USERS)
  const [activeTab,   setActiveTab]   = useState<UserRole>('PARENT')
  const [profileUser, setProfileUser] = useState<AdminUser | null>(null)
  const [deleteUser,  setDeleteUser]  = useState<AdminUser | null>(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [toast,       setToast]       = useState({ message: '', visible: false })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message: msg, visible: true })
    toastTimer.current = setTimeout(
      () => setToast(t => ({ ...t, visible: false })),
      3000
    )
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  function handleSuspend(id: string) {
    const user = users.find(u => u.id === id)
    if (!user) return
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u))
    api.put(`/admin/users/${id}/${user.isActive ? 'suspend' : 'reactivate'}`, {})
       .catch(() => { /* demo */ })
    showToast(user.isActive ? `${user.name} suspended.` : `${user.name} reactivated.`)
  }

  function handleResetPassword(id: string, name: string) {
    api.post(`/admin/users/${id}/reset-password`, {}).catch(() => { /* demo */ })
    showToast(`Password reset email sent to ${name}.`)
  }

  function handleDeleteConfirm() {
    if (!deleteUser) return
    setUsers(prev =>
      prev.map(u => u.id === deleteUser.id ? { ...u, deletedAt: new Date().toISOString() } : u)
    )
    api.delete(`/admin/users/${deleteUser.id}`).catch(() => { /* demo */ })
    showToast(`${deleteUser.name}'s account has been deleted.`)
    setDeleteUser(null)
  }

  function handleUserCreated(user: AdminUser) {
    setUsers(prev => [user, ...prev])
  }

  const tabCounts = {
    PARENT:    users.filter(u => u.role === 'PARENT'    && !u.deletedAt).length,
    CLINICIAN: users.filter(u => u.role === 'CLINICIAN' && !u.deletedAt).length,
    ADMIN:     users.filter(u => u.role === 'ADMIN'     && !u.deletedAt).length,
  }

  const tableUsers = users.filter(u => u.role === activeTab && !u.deletedAt)

  return (
    <>
      <Toast message={toast.message} visible={toast.visible} />

      <AnimatePresence>
        {profileUser && (
          <ViewProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
        )}
        {deleteUser && (
          <DeleteConfirmModal
            user={deleteUser}
            onClose={() => setDeleteUser(null)}
            onConfirm={handleDeleteConfirm}
          />
        )}
        {showAdd && (
          <AddUserModal
            onClose={() => setShowAdd(false)}
            onCreated={handleUserCreated}
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
            <h1 className="text-xl font-bold text-seed-dark">User Management</h1>
            <p className="text-sm text-seed-muted mt-0.5">
              {users.filter(u => !u.deletedAt).length} total accounts ·{' '}
              {users.filter(u => !u.isActive && !u.deletedAt).length} suspended
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-seed-teal text-white
                       text-sm font-semibold hover:bg-seed-navy transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="8" y1="2" x2="8" y2="14" strokeLinecap="round" />
              <line x1="2" y1="8" x2="14" y2="8" strokeLinecap="round" />
            </svg>
            Add User
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map(({ label, role }) => (
            <button
              key={role}
              onClick={() => setActiveTab(role)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                          transition-all ${
                activeTab === role
                  ? 'bg-white text-seed-dark shadow-sm'
                  : 'text-seed-muted hover:text-seed-dark'
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === role ? 'bg-seed-teal/15 text-seed-teal' : 'bg-slate-200 text-slate-500'
              }`}>
                {tabCounts[role]}
              </span>
            </button>
          ))}
        </div>

        {/* Table — keyed to tab so internal state resets on tab switch */}
        <UserTable
          key={activeTab}
          users={tableUsers}
          role={activeTab}
          onViewProfile={setProfileUser}
          onSuspend={handleSuspend}
          onResetPassword={handleResetPassword}
          onDeleteRequest={setDeleteUser}
        />

        <p className="text-xs text-seed-muted text-center italic">
          Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
        </p>
      </motion.div>
    </>
  )
}
