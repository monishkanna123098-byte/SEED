/**
 * S.E.E.D. Error Boundary + Error Pages
 *
 * ErrorBoundary: class component wrapping the whole app — catches uncaught
 *   React render errors and shows a friendly fallback instead of blank screen.
 *
 * NotFoundPage:     404 — consistent with app visual language
 * ServerErrorPage:  500 — with retry button
 * MaintenancePage:  503 — service unavailable / planned downtime
 */

import React from 'react'
import { Link } from 'react-router-dom'

// ─── Shared layout shell (used by all error pages) ────────────────────────────

function ErrorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-seed-ice flex flex-col items-center justify-center px-5">
      {/* Minimal SEED wordmark */}
      <div className="text-2xl font-extrabold text-seed-navy mb-10 select-none">
        S<span className="text-seed-mint">.</span>E
        <span className="text-seed-mint">.</span>E
        <span className="text-seed-mint">.</span>D
        <span className="text-seed-mint">.</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8
                      max-w-sm w-full text-center">
        {children}
      </div>

      <p className="mt-8 text-xs text-seed-muted">
        Screening tool only. Not a medical diagnosis.
      </p>
    </div>
  )
}

// ─── 404 Not Found ────────────────────────────────────────────────────────────

export function NotFoundPage() {
  return (
    <ErrorShell>
      {/* Illustration */}
      <div className="w-16 h-16 rounded-full bg-seed-ice flex items-center justify-center
                      mx-auto mb-5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#065A82" strokeWidth={1.6}
          className="w-8 h-8">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
          <line x1="11" y1="8"  x2="11" y2="11" strokeLinecap="round" />
          <line x1="11" y1="14" x2="11.01" y2="14" strokeLinecap="round" strokeWidth={2.5} />
        </svg>
      </div>

      <h1 className="text-xl font-extrabold text-seed-dark mb-2">Page not found</h1>
      <p className="text-sm text-seed-muted mb-6 leading-relaxed">
        The page you're looking for doesn't exist or may have been moved.
      </p>

      <Link
        to="/"
        className="block w-full py-2.5 rounded-xl bg-seed-navy text-white text-sm
                   font-semibold hover:bg-seed-teal transition-colors"
      >
        Back to home
      </Link>
    </ErrorShell>
  )
}

// ─── 500 Server Error ─────────────────────────────────────────────────────────

interface ServerErrorPageProps {
  onRetry?: () => void
  message?: string
}

export function ServerErrorPage({ onRetry, message }: ServerErrorPageProps) {
  return (
    <ErrorShell>
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center
                      mx-auto mb-5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth={1.6}
          className="w-8 h-8">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8"  x2="12" y2="12" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeWidth={2.5} />
        </svg>
      </div>

      <h1 className="text-xl font-extrabold text-seed-dark mb-2">Something went wrong</h1>
      <p className="text-sm text-seed-muted mb-6 leading-relaxed">
        {message ?? 'An unexpected error occurred. Our team has been notified.'}
        <br />
        Your child's data has not been affected.
      </p>

      <div className="flex flex-col gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2.5 rounded-xl bg-seed-navy text-white text-sm
                       font-semibold hover:bg-seed-teal transition-colors"
          >
            Try again
          </button>
        )}
        <Link
          to="/"
          className="block w-full py-2.5 rounded-xl border border-slate-200 text-seed-dark
                     text-sm font-semibold hover:bg-seed-ice transition-colors"
        >
          Go to home
        </Link>
      </div>
    </ErrorShell>
  )
}

// ─── 503 Maintenance ──────────────────────────────────────────────────────────

export function MaintenancePage() {
  return (
    <ErrorShell>
      <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center
                      mx-auto mb-5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#F4A261" strokeWidth={1.6}
          className="w-8 h-8">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77
                   a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91
                   a6 6 0 017.94-7.94l-3.76 3.76z"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="text-xl font-extrabold text-seed-dark mb-2">Scheduled maintenance</h1>
      <p className="text-sm text-seed-muted mb-6 leading-relaxed">
        S.E.E.D. is temporarily unavailable for scheduled maintenance.
        We'll be back shortly. Thank you for your patience.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="w-full py-2.5 rounded-xl bg-seed-amber text-white text-sm
                   font-semibold hover:opacity-90 transition-opacity"
      >
        Refresh page
      </button>
    </ErrorShell>
  )
}

// ─── React Error Boundary ─────────────────────────────────────────────────────
// Class component — required by React (hooks can't catch render errors).
// Wraps the entire app in main.tsx to catch any uncaught render exception
// and show ServerErrorPage instead of a blank screen or raw stack trace.

interface BoundaryState {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  BoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {
      hasError: true,
      errorMessage: error.message ?? 'An unexpected error occurred.',
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev; in production this would go to an error tracker
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ServerErrorPage
          message={this.state.errorMessage}
          onRetry={() => {
            this.setState({ hasError: false, errorMessage: '' })
            window.location.reload()
          }}
        />
      )
    }
    return this.props.children
  }
}
