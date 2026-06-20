/**
 * S.E.E.D. Parent Layout
 *
 * Persistent sidebar (navy, 240px desktop / 64px mobile icon-only)
 * wrapping all /parent/* routes via React Router <Outlet />.
 *
 * Sidebar contains:
 *   - S.E.E.D. logo
 *   - Child selector dropdown
 *   - Navigation links
 *   - Disclaimer badge pinned to bottom
 *
 * Top bar: selected child name + age + notification bell.
 */

import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useParentStore, selectChild } from '@/stores/parentStore'
import { calculateAge } from '@/utils/age'
import { api } from '@/utils/api'
import { Child } from '@/types'

// ─── Icons (inline SVG, no external lib needed) ──────────────────────────────

function Icon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    screening: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
      </svg>
    ),
    history: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    chevronDown: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <polyline points="6,9 12,15 18,9" />
      </svg>
    ),
    bell: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
    add: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
  }
  return <>{icons[name] ?? null}</>
}

// ─── Nav items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard', to: '/parent/dashboard' },
  { label: 'New Screening', icon: 'screening', to: '/parent/screening/new' },
  { label: 'History', icon: 'history', to: '/parent/history' },
  { label: 'Profile', icon: 'profile', to: '/parent/profile' },
]

// ─── Child selector ───────────────────────────────────────────────────────────

function ChildSelector({ collapsed }: { collapsed: boolean }) {
  const { children, selectedChildId, setSelectedChildId } = useParentStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const selected = children.find((c) => c.id === selectedChildId)

  if (collapsed) {
    return (
      <button
        className="w-full flex justify-center py-2 text-white/70 hover:text-white"
        title={selected?.name ?? 'Select child'}
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
          {selected?.name?.[0] ?? '?'}
        </span>
      </button>
    )
  }

  return (
    <div className="relative px-3 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-seed-mint flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {selected?.name?.[0] ?? '?'}
        </span>
        <span className="text-sm text-white font-medium truncate flex-1 text-left">
          {selected?.name ?? 'Select child'}
        </span>
        <Icon name="chevronDown" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl shadow-lg z-50 overflow-hidden border border-slate-100">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => {
                setSelectedChildId(child.id)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-seed-ice transition-colors ${
                child.id === selectedChildId ? 'bg-seed-teal/10 text-seed-teal font-medium' : 'text-seed-dark'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-seed-teal/20 flex items-center justify-center text-xs font-bold text-seed-teal">
                {child.name[0]}
              </span>
              {child.name}
            </button>
          ))}
          <button
            onClick={() => {
              setOpen(false)
              navigate('/parent/children/add')
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-seed-muted hover:bg-seed-ice transition-colors border-t border-slate-100"
          >
            <Icon name="add" />
            Add another child
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={`fixed top-0 left-0 h-full flex flex-col bg-seed-navy transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2 px-4 py-5 border-b border-white/10 ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <span className="text-2xl font-extrabold tracking-tight text-white flex-shrink-0">
          S<span className="text-seed-mint">.</span>
        </span>
        {!collapsed && (
          <span className="text-xl font-extrabold tracking-tight text-white whitespace-nowrap">
            E<span className="text-seed-mint">.</span>E
            <span className="text-seed-mint">.</span>D
            <span className="text-seed-mint">.</span>
          </span>
        )}
      </div>

      {/* Child selector */}
      <div className="pt-4">
        <ChildSelector collapsed={collapsed} />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 mt-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <span className="flex-shrink-0">
              <Icon name={icon} />
            </span>
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="mx-2 mb-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Icon name="menu" />
      </button>

      {/* Disclaimer badge */}
      {!collapsed && (
        <div className="mx-3 mb-4 px-3 py-2 rounded-lg bg-white/10 border border-white/10">
          <p className="text-[10px] text-white/60 text-center leading-tight">
            Screening tool only.
            <br />
            Not a medical diagnosis.
          </p>
        </div>
      )}
    </aside>
  )
}

// ─── Top bar ─────────────────────────────────────────────────────────────────

function TopBar({ sidebarWidth }: { sidebarWidth: number }) {
  const { unreadNotifications } = useParentStore()
  const child = useParentStore(selectChild)
  const age = child ? calculateAge(child.dateOfBirth) : null

  return (
    <header
      className="fixed top-0 right-0 h-14 flex items-center justify-between px-4 bg-white/80 backdrop-blur border-b border-slate-100 z-30 transition-all duration-300"
      style={{ left: sidebarWidth }}
    >
      <div>
        {child ? (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-seed-dark">{child.name}</span>
            {age && (
              <span className="text-sm text-seed-muted">{age.display}</span>
            )}
          </div>
        ) : (
          <span className="text-seed-muted text-sm">No child selected</span>
        )}
      </div>

      <button
        className="relative p-2 rounded-lg text-seed-muted hover:text-seed-dark hover:bg-seed-ice transition-colors"
        aria-label={`Notifications ${unreadNotifications > 0 ? `(${unreadNotifications} unread)` : ''}`}
      >
        <Icon name="bell" />
        {unreadNotifications > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-seed-alert text-white text-[9px] font-bold flex items-center justify-center">
            {unreadNotifications}
          </span>
        )}
      </button>
    </header>
  )
}

// ─── Layout root ─────────────────────────────────────────────────────────────

export function ParentLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 64 : 240

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const handle = (e: MediaQueryListEvent) => setCollapsed(e.matches)
    setCollapsed(mq.matches)
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [])

  // Fetch children from API on mount; redirect if the API confirms no children exist
  const { setChildren, setSelectedChildId, setChildrenFetched } = useParentStore()
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get<{ children: Child[] }>('/children')
      .then(({ data }) => {
        setChildrenFetched(true)
        if (data.children?.length) {
          setChildren(data.children)
          setSelectedChildId(data.children[0].id)
        } else {
          // API confirmed zero children — clear mock data and send to add-child
          setChildren([])
          navigate('/parent/children/add', { replace: true })
        }
      })
      .catch(() => {
        // API unavailable (demo / dev mode) — keep mock data, no redirect
        setChildrenFetched(true)
      })
  }, [setChildren, setSelectedChildId, setChildrenFetched, navigate])

  return (
    <div className="min-h-screen bg-seed-ice">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <TopBar sidebarWidth={sidebarWidth} />

      {/* Main content — offset by sidebar + top bar */}
      <main
        className="transition-all duration-300 pt-14"
        style={{ marginLeft: sidebarWidth }}
      >
        <Outlet />
      </main>
    </div>
  )
}
