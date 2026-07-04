/**
 * S.E.E.D. Clinician Layout
 *
 * Persistent sidebar (navy, 240px desktop / 64px mobile icon-only)
 * wrapping all /clinician/* routes via React Router <Outlet />.
 *
 * Nav: Overview | Pending Reviews | My Patients | Analytics |
 *      Invite Codes | Profile
 */

import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useClinicianStore } from '@/stores/clinicianStore'
import { NotificationBell } from '@/components/NotificationBell'

// ─── Icons ────────────────────────────────────────────────────────────────────

function Icon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    overview: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    pending: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" />
      </svg>
    ),
    patients: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    analytics: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    invite: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10l10 5 10-5" />
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    bell: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  }
  return <>{icons[name] ?? null}</>
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Overview',        icon: 'overview',  to: '/clinician/dashboard'    },
  { label: 'Pending Reviews', icon: 'pending',   to: '/clinician/pending'      },
  { label: 'My Patients',     icon: 'patients',  to: '/clinician/patients'     },
  { label: 'Analytics',       icon: 'analytics', to: '/clinician/analytics'    },
  { label: 'Invite Codes',    icon: 'invite',    to: '/clinician/invite-codes' },
  { label: 'Profile',         icon: 'profile',   to: '/clinician/profile'      },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { pending } = useClinicianStore()
  const pendingCount = pending.length
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-full flex flex-col bg-seed-navy
                  transition-all duration-300 z-40 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2 px-4 py-5 border-b border-white/10
                    ${collapsed ? 'justify-center' : ''}`}
      >
        <span className="text-2xl font-extrabold tracking-tight text-white flex-shrink-0">
          S<span className="text-seed-mint">.</span>
        </span>
        {!collapsed && (
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              E<span className="text-seed-mint">.</span>E
              <span className="text-seed-mint">.</span>D
              <span className="text-seed-mint">.</span>
            </span>
            <p className="text-[9px] text-white/40 tracking-widest uppercase -mt-0.5">
              Clinician
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pt-4 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon, to }) => {
          const isPending = to === '/clinician/pending' && pendingCount > 0

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                 transition-colors relative
                 ${collapsed ? 'justify-center' : ''}
                 ${isActive
                   ? 'bg-white/20 text-white'
                   : 'text-white/70 hover:bg-white/10 hover:text-white'
                 }`
              }
              title={collapsed ? label : undefined}
            >
              <span className="flex-shrink-0">
                <Icon name={icon} />
              </span>

              {!collapsed && <span className="flex-1">{label}</span>}

              {/* Badge for pending reviews */}
              {isPending && (
                <span
                  className={`flex-shrink-0 text-[10px] font-bold rounded-full
                               bg-seed-alert text-white flex items-center justify-center
                               ${collapsed ? 'absolute top-1 right-1 w-4 h-4' : 'w-5 h-5'}`}
                >
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Toggle + Logout */}
      <div className="px-2 pb-2 space-y-0.5">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      text-sm text-white/50 hover:text-white hover:bg-white/10
                      transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Log out' : undefined}
        >
          <Icon name="logout" />
          {!collapsed && <span>Log out</span>}
        </button>

        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center px-3 py-2 rounded-lg
                     text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <Icon name="menu" />
        </button>
      </div>

      {/* Disclaimer */}
      {!collapsed && (
        <div className="mx-3 mb-4 px-3 py-2 rounded-lg bg-white/10 border border-white/10">
          <p className="text-[10px] text-white/50 text-center leading-tight">
            Screening tool only.
            <br />
            Not a medical diagnosis.
          </p>
        </div>
      )}
    </aside>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

/** Strips a leading "Dr." prefix before re-adding it, preventing "Dr. Dr. Name". */
function formatClinicianName(name: string): string {
  const stripped = name.replace(/^Dr\.?\s+/i, '').trim()
  return `Dr. ${stripped}`
}

function TopBar({ sidebarWidth }: { sidebarWidth: number }) {
  const { user } = useAuthStore()

  return (
    <header
      className="fixed top-0 right-0 h-14 flex items-center justify-between px-4
                 bg-white/80 backdrop-blur border-b border-slate-100 z-30
                 transition-all duration-300"
      style={{ left: sidebarWidth }}
    >
      <div>
        {user && (
          <p className="text-sm font-semibold text-seed-dark">
            {formatClinicianName(user.name)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* NotificationBell fetches /api/notifications and manages its own state */}
        {user && <NotificationBell role={user.role as 'PARENT' | 'CLINICIAN' | 'ADMIN'} />}

        {user && (
          <div className="w-8 h-8 rounded-full bg-seed-navy text-white text-xs
                          font-bold flex items-center justify-center flex-shrink-0">
            {user.name?.[0]?.toUpperCase() ?? 'C'}
          </div>
        )}
      </div>
    </header>
  )
}

// ─── Layout root ──────────────────────────────────────────────────────────────

export function ClinicianLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 64 : 240

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const handle = (e: MediaQueryListEvent) => setCollapsed(e.matches)
    setCollapsed(mq.matches)
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [])

  return (
    <div className="min-h-screen bg-seed-ice">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <TopBar sidebarWidth={sidebarWidth} />

      <main
        className="transition-all duration-300 pt-14"
        style={{ marginLeft: sidebarWidth }}
      >
        <Outlet />
      </main>
    </div>
  )
}
