/**
 * S.E.E.D. Clinician — Profile Page
 * Route: /clinician/profile
 *
 * Displays read-only clinician profile info from authStore.
 * Edit functionality planned for a future stage.
 */

import { motion } from 'framer-motion'
import { UserCircle, Mail, Shield } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

// ─── Strip leading "Dr." if already present to avoid "Dr. Dr. Name" ───────────

function formatClinicianName(name: string): string {
  const stripped = name.replace(/^Dr\.?\s+/i, '').trim()
  return `Dr. ${stripped}`
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-4 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-seed-ice flex items-center justify-center
                      flex-shrink-0 text-seed-teal mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-xs text-seed-muted mb-0.5">{label}</p>
        <p className="text-sm font-medium text-seed-dark">{value}</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ClinicianProfilePage() {
  const { user } = useAuthStore()

  if (!user) return null

  const displayName = formatClinicianName(user.name)

  return (
    <motion.div
      className="p-6 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-seed-dark">My Profile</h1>
        <p className="text-sm text-seed-muted">Account details and credentials.</p>
      </div>

      {/* Avatar + name card */}
      <div className="seed-card mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-seed-navy text-white
                        text-2xl font-bold flex items-center justify-center flex-shrink-0">
          {user.name[0]?.toUpperCase() ?? 'C'}
        </div>
        <div>
          <p className="text-lg font-bold text-seed-dark">{displayName}</p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold
                           px-2 py-0.5 rounded-full bg-seed-teal/10 text-seed-teal mt-1">
            <Shield size={11} />
            Clinician
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="seed-card">
        <InfoRow
          icon={<UserCircle size={16} />}
          label="Full name"
          value={displayName}
        />
        <InfoRow
          icon={<Mail size={16} />}
          label="Email address"
          value={user.email}
        />
        <InfoRow
          icon={<Shield size={16} />}
          label="Email verified"
          value={user.isEmailVerified ? 'Verified' : 'Not verified'}
        />
      </div>

      {/* Future edit notice */}
      <p className="text-xs text-seed-muted text-center mt-4">
        Profile editing and license details coming in a future update.
      </p>
    </motion.div>
  )
}
