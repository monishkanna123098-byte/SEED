/**
 * RiskTierBadge — parent-facing display of a screening risk tier.
 *
 * Uses warm, non-alarming language per the spec.
 * Clinician-facing dashboards should use a separate badge with clinical labels.
 */

import React from 'react'
import { RiskTier } from '@/types'

// Handles both MONITOR (Prisma enum) and MONITOR_CLOSELY (analysis engine)
export type DisplayTier = RiskTier | 'MONITOR_CLOSELY' | null | undefined

interface BadgeConfig {
  label: string
  colorClass: string
  bgClass: string
  dotColor: string
}

const CONFIG: Record<string, BadgeConfig> = {
  MONITOR_CLOSELY: {
    label: 'Typical Development',
    colorClass: 'text-emerald-800',
    bgClass: 'bg-emerald-100',
    dotColor: 'bg-emerald-500',
  },
  MONITOR: {
    label: 'Typical Development',
    colorClass: 'text-emerald-800',
    bgClass: 'bg-emerald-100',
    dotColor: 'bg-emerald-500',
  },
  INDETERMINATE: {
    label: 'Discuss with Clinician',
    colorClass: 'text-amber-800',
    bgClass: 'bg-amber-100',
    dotColor: 'bg-amber-500',
  },
  ELEVATED: {
    label: 'Specialist Recommended',
    colorClass: 'text-red-800',
    bgClass: 'bg-red-100',
    dotColor: 'bg-red-500',
  },
  NULL: {
    label: 'No Screenings Yet',
    colorClass: 'text-slate-600',
    bgClass: 'bg-slate-100',
    dotColor: 'bg-slate-400',
  },
}

interface RiskTierBadgeProps {
  tier: DisplayTier
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
  className?: string
}

export const RiskTierBadge: React.FC<RiskTierBadgeProps> = ({
  tier,
  size = 'md',
  showDot = true,
  className = '',
}) => {
  const key = tier ?? 'NULL'
  const cfg = CONFIG[key] ?? CONFIG.NULL

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  }[size]

  const dotSize = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5' }[size]

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${cfg.bgClass} ${cfg.colorClass} ${className}`}
    >
      {showDot && (
        <span className={`rounded-full flex-shrink-0 ${dotSize} ${cfg.dotColor}`} />
      )}
      {cfg.label}
    </span>
  )
}
