/**
 * S.E.E.D. Admin Layout — /admin/*
 *
 * Dark-chrome variant of the clinician layout.
 * Sidebar: charcoal (#0F172A), violet active accent.
 * Topbar: dark slate (#1E293B), white text.
 * Main content: light slate (bg-slate-50) — maintains card readability.
 *
 * Nav: Overview | Users | Clinicians | Analytics | System Health | Export
 */

import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// ─── Palette constants ────────────────────────────────────────────────────────

const SIDEBAR_BG  = '#0F172A'   // slate-950
const TOPBAR_BG   = '#1E293B'   // slate-800

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
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    clinicians: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    analytics: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    health: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    export: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <line x1="3" y1="6"  x2="21" y2="6"  />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  }
  return <>{icons[name] ?? null}</>
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Overview',      icon: 'overview',   to: '/admin/dashboard'  },
  { label: 'Users',         icon: 'users',      to: '/admin/users'      },
  { label: 'Clinicians',    icon: 'clinicians', to: '/admin/clinicians' },
  { label: 'Analytics',     icon: 'analytics',  to: '/admin/analytics'  },
  { label: 'System Health', icon: 'health',     to: '/admin/system'     },
  { label: 'Export',        icon: 'export',     to: '/admin/export'     },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const navigate  = useNavigate()
  const { logout } = useAuthStore()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-full flex flex-col transition-all duration-300 z-40
                  ${collapsed ? 'w-16' : 'w-60'}`}
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2 px-4 py-5 ${collapsed ? 'justify-center' : ''}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-2xl font-extrabold tracking-tight text-white flex-shrink-0">
          S<span className="text-amber-400">.</span>
        </span>
        {!collapsed && (
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              E<span className="text-amber-400">.</span>E
              <span className="text-amber-400">.</span>D
              <span className="text-amber-400">.</span>
            </span>
            <p className="text-[9px] text-violet-300 tracking-widest uppercase -mt-0.5 font-semibold">
              Admin
            </p>
          </div>
        )}
      </div>

      {/* Shield badge — collapsed state */}
      {collapsed && (
        <div className="flex justify-center mt-2 mb-1">
          <span className="text-violet-300 opacity-70">
            <Icon name="shield" />
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 pt-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, icon, to }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
               transition-all duration-150
               ${collapsed ? 'justify-center' : ''}
               ${isActive
                 ? 'bg-violet-500/20 text-violet-300'
                 : 'text-white/60 hover:bg-white/10 hover:text-white'
               }`
            }
          >
            <span className="flex-shrink-0">
              <Icon name={icon} />
            </span>
            {!collapsed && <span className="flex-1">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle + Logout */}
      <div className="px-2 pb-2 space-y-0.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
                     text-white/30 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name="menu" />
        </button>
      </div>

      {/* Disclaimer */}
      {!collapsed && (
        <div className="mx-3 mb-4 px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] text-center leading-tight"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
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

function TopBar({ sidebarWidth }: { sidebarWidth: number }) {
  const { user } = useAuthStore()

  return (
    <header
      className="fixed top-0 right-0 h-14 flex items-center justify-between
                 px-5 z-30 transition-all duration-300"
      style={{
        left:            sidebarWidth,
        backgroundColor: TOPBAR_BG,
        borderBottom:    '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Left: context label */}
      <div className="flex items-center gap-2">
        <span className="text-violet-300 opacity-80">
          <Icon name="shield" />
        </span>
        <span className="text-sm font-semibold text-white/80">
          Admin Panel
        </span>
      </div>

      {/* Right: user avatar */}
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm text-white/60 hidden sm:block">
              {user.name}
            </span>
            <div
              className="w-8 h-8 rounded-full text-white text-xs font-bold
                         flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(139,92,246,0.20)", border: "1.5px solid #c4b5fd" }}
            >
              {user.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
          </>
        )}
      </div>
    </header>
  )
}

// ─── Layout root ──────────────────────────────────────────────────────────────

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 64 : 240

  useEffect(() => {
    const mq     = window.matchMedia('(max-width: 1023px)')
    const handle = (e: MediaQueryListEvent) => setCollapsed(e.matches)
    setCollapsed(mq.matches)
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
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
