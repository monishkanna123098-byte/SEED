/**
 * S.E.E.D. Notification Bell
 *
 * Shared between ParentLayout and ClinicianLayout.
 * Fetches /api/notifications on mount, polls every 60s,
 * and re-fetches on analysis:complete socket event.
 *
 * Renders a bell icon with unread count badge.
 * Clicking opens an inline dropdown panel.
 * Each notification can be marked read individually;
 * a "Mark all read" button clears the badge.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppNotification {
  id:        string
  type:      'RESULT_READY' | 'REVIEW_REQUIRED' | 'REFERRAL_SCHEDULED'
  title:     string
  body:      string
  sessionId: string | null
  isRead:    boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: AppNotification[]
  unreadCount:   number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

const TYPE_DOT: Record<AppNotification['type'], string> = {
  RESULT_READY:       'bg-seed-mint',
  REVIEW_REQUIRED:    'bg-seed-amber',
  REFERRAL_SCHEDULED: 'bg-seed-teal',
}

function sessionRoute(notification: AppNotification, role: 'PARENT' | 'CLINICIAN' | 'ADMIN'): string | null {
  if (!notification.sessionId) return null
  if (role === 'CLINICIAN') return `/clinician/session/${notification.sessionId}`
  if (role === 'PARENT')    return `/parent/sessions/${notification.sessionId}`
  return null
}

// ─── Bell icon ────────────────────────────────────────────────────────────────

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      className={className ?? 'w-5 h-5'}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface NotificationBellProps {
  /** User role — determines the session detail route */
  role: 'PARENT' | 'CLINICIAN' | 'ADMIN'
}

export function NotificationBell({ role }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [open,          setOpen]          = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get<NotificationsResponse>('/notifications')
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // Silently fail — notification fetch should never block the UI
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll every 60s as fallback for socket events
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // ── Mark single read ─────────────────────────────────────────────────────
  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // non-fatal
    }
  }

  // ── Mark all read ────────────────────────────────────────────────────────
  async function markAllRead() {
    try {
      await api.patch('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // non-fatal
    }
  }

  // ── Navigate to session ──────────────────────────────────────────────────
  async function handleNotificationClick(n: AppNotification) {
    if (!n.isRead) await markRead(n.id)
    const route = sessionRoute(n, role)
    if (route) {
      setOpen(false)
      navigate(route)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-seed-muted hover:text-seed-dark
                   hover:bg-seed-ice transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5
                            rounded-full bg-seed-alert text-white text-[9px] font-bold
                            flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-lg
                     border border-slate-100 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-seed-dark">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-seed-alert/10
                                  text-seed-alert text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-seed-teal hover:text-seed-navy transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-seed-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-seed-ice
                              transition-colors ${n.isRead ? 'opacity-60' : ''}`}
                >
                  {/* Type dot */}
                  <div className="flex-shrink-0 mt-1">
                    <span className={`w-2 h-2 rounded-full block ${
                      n.isRead ? 'bg-slate-300' : TYPE_DOT[n.type]
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold mb-0.5 ${
                      n.isRead ? 'text-seed-muted' : 'text-seed-dark'
                    }`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-seed-muted leading-relaxed line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!n.isRead && (
                    <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-seed-teal mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
