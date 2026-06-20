/**
 * SessionCard — recent session summary for the parent dashboard.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { ScreeningSession } from '@/types'
import { RiskTierBadge } from './RiskTierBadge'
import { formatDate, durationMinutes } from '@/utils/age'

const SESSION_TYPE_LABEL: Record<string, string> = {
  VIDEO: 'Video',
  GAME: 'Game',
  COMBINED: 'Video + Game',
}

interface SessionCardProps {
  session: ScreeningSession
}

export const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const typeLabel = SESSION_TYPE_LABEL[session.sessionType] ?? session.sessionType
  const duration =
    session.completedAt && session.createdAt
      ? durationMinutes(session.createdAt, session.completedAt)
      : null

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-seed-dark">
          {formatDate(session.createdAt)}
        </span>
        <span className="text-xs text-seed-muted">
          {typeLabel}
          {duration !== null && <span className="ml-1.5">· {duration} min</span>}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {typeof session.compositeScore === 'number' && (
          <span className="text-sm font-bold text-seed-dark">
            {session.compositeScore}
            <span className="text-xs font-normal text-seed-muted">/70</span>
          </span>
        )}
        <RiskTierBadge tier={session.riskTier} size="sm" />
      </div>

      <Link
        to={`/parent/sessions/${session.id}`}
        className="text-xs font-medium text-seed-teal hover:text-seed-navy flex-shrink-0 underline underline-offset-2"
      >
        View report
      </Link>
    </div>
  )
}
