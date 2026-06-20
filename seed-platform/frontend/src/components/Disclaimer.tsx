import React from 'react'

interface DisclaimerProps {
  variant?: 'footer' | 'banner' | 'inline'
  className?: string
}

export const Disclaimer: React.FC<DisclaimerProps> = ({
  variant = 'footer',
  className = '',
}) => {
  if (variant === 'banner') {
    return (
      <div
        role="alert"
        aria-live="polite"
        className={`bg-seed-amber/10 border border-seed-amber/30 rounded-xl px-4 py-3 flex items-start gap-3 ${className}`}
      >
        <span className="text-seed-amber text-lg flex-shrink-0 mt-0.5" aria-hidden="true">⚠</span>
        <p className="text-sm text-seed-dark font-medium">
          <strong>Screening tool only.</strong> Not a diagnostic instrument.
          Clinical confirmation required before any intervention decisions.
        </p>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <p className={`text-xs text-seed-muted italic ${className}`}>
        Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
      </p>
    )
  }

  // footer variant (default) — appears at bottom of pages
  return (
    <footer className={`w-full py-4 px-6 bg-white border-t border-seed-ice ${className}`}>
      <p className="text-center text-xs text-seed-muted max-w-2xl mx-auto">
        <strong className="text-seed-navy">S.E.E.D.</strong> — Social Emotional Early Detection
        &nbsp;|&nbsp;
        <span className="font-medium">
          Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
        </span>
        &nbsp;|&nbsp;
        DPDPA-2023 compliant &nbsp;|&nbsp; © {new Date().getFullYear()} S.E.E.D. Platform
      </p>
    </footer>
  )
}
