/**
 * S.E.E.D. Clinician Store
 *
 * Central state for the clinician dashboard:
 *   - stat card counts
 *   - pending reviews queue (sorted ELEVATED → INDETERMINATE → MONITOR, date desc within tier)
 *   - recent activity feed
 *
 * Pre-seeded with realistic mock data covering all risk tiers, divergence
 * flags, and activity types.  API calls on mount replace mock data when the
 * backend is available.
 */

import { create } from 'zustand'
import { formatDate } from '@/utils/age'
import { RiskTier } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingReview {
  sessionId: string
  childId: string
  childName: string
  childAgeMonths: number
  screeningDate: string
  riskTier: RiskTier
  compositeScore: number
  /** When true: parent-report and behavioral CV data diverge > threshold */
  divergenceFlag: boolean
  sessionType: string
}

export type ActivityType =
  | 'new_screening'
  | 'review_completed'
  | 'referral_scheduled'
  | 'override_applied'

export interface ActivityEntry {
  id: string
  type: ActivityType
  childName: string
  timestamp: string
  detail?: string
}

export interface ClinicianStats {
  totalChildren: number
  pendingReviews: number
  elevatedCases30d: number
  referralsScheduled: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_STATS: ClinicianStats = {
  totalChildren: 12,
  pendingReviews: 6,
  elevatedCases30d: 3,
  referralsScheduled: 2,
}

// Sorted: ELEVATED first, then INDETERMINATE, then MONITOR
// Within each tier: most recent screeningDate first
export const MOCK_PENDING: PendingReview[] = [
  {
    sessionId: 'session-c1',
    childId: 'child-c1',
    childName: 'Arjun K.',
    childAgeMonths: 38,
    screeningDate: '2025-06-10T09:00:00Z',
    riskTier: 'ELEVATED',
    compositeScore: 44,
    divergenceFlag: true,
    sessionType: 'COMBINED',
  },
  {
    sessionId: 'session-c2',
    childId: 'child-c2',
    childName: 'Sneha P.',
    childAgeMonths: 42,
    screeningDate: '2025-06-11T10:30:00Z',
    riskTier: 'ELEVATED',
    compositeScore: 41,
    divergenceFlag: false,
    sessionType: 'VIDEO',
  },
  {
    sessionId: 'session-c3',
    childId: 'child-c3',
    childName: 'Rohan M.',
    childAgeMonths: 29,
    screeningDate: '2025-06-09T14:00:00Z',
    riskTier: 'ELEVATED',
    compositeScore: 38,
    divergenceFlag: true,
    sessionType: 'COMBINED',
  },
  {
    sessionId: 'session-c4',
    childId: 'child-c4',
    childName: 'Kavya R.',
    childAgeMonths: 54,
    screeningDate: '2025-06-11T08:15:00Z',
    riskTier: 'INDETERMINATE',
    compositeScore: 29,
    divergenceFlag: false,
    sessionType: 'GAME',
  },
  {
    sessionId: 'session-c5',
    childId: 'child-c5',
    childName: 'Aditi S.',
    childAgeMonths: 36,
    screeningDate: '2025-06-07T11:00:00Z',
    riskTier: 'INDETERMINATE',
    compositeScore: 24,
    divergenceFlag: false,
    sessionType: 'VIDEO',
  },
  {
    sessionId: 'session-c6',
    childId: 'child-c6',
    childName: 'Vikram N.',
    childAgeMonths: 48,
    screeningDate: '2025-06-10T16:00:00Z',
    riskTier: 'MONITOR',
    compositeScore: 18,
    divergenceFlag: false,
    sessionType: 'COMBINED',
  },
]

export const MOCK_ACTIVITY: ActivityEntry[] = [
  {
    id: 'act-01',
    type: 'new_screening',
    childName: 'Sneha P.',
    timestamp: '2025-06-11T10:30:00Z',
  },
  {
    id: 'act-02',
    type: 'new_screening',
    childName: 'Kavya R.',
    timestamp: '2025-06-11T08:15:00Z',
  },
  {
    id: 'act-03',
    type: 'new_screening',
    childName: 'Arjun K.',
    timestamp: '2025-06-10T09:00:00Z',
  },
  {
    id: 'act-04',
    type: 'referral_scheduled',
    childName: 'Arjun K.',
    timestamp: '2025-06-10T12:45:00Z',
    detail: 'Tele-consult booked for 18 Jun',
  },
  {
    id: 'act-05',
    type: 'new_screening',
    childName: 'Vikram N.',
    timestamp: '2025-06-10T16:00:00Z',
  },
  {
    id: 'act-06',
    type: 'review_completed',
    childName: 'Meera G.',
    timestamp: '2025-06-09T17:20:00Z',
  },
  {
    id: 'act-07',
    type: 'new_screening',
    childName: 'Rohan M.',
    timestamp: '2025-06-09T14:00:00Z',
  },
  {
    id: 'act-08',
    type: 'override_applied',
    childName: 'Ananya D.',
    timestamp: '2025-06-08T10:05:00Z',
    detail: 'Tier adjusted: ELEVATED → INDETERMINATE',
  },
  {
    id: 'act-09',
    type: 'review_completed',
    childName: 'Vikas R.',
    timestamp: '2025-06-07T15:40:00Z',
  },
  {
    id: 'act-10',
    type: 'new_screening',
    childName: 'Aditi S.',
    timestamp: '2025-06-07T11:00:00Z',
  },
]

// ─── Relative time helper ─────────────────────────────────────────────────────

export function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)

  if (mins  < 2)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return formatDate(isoString)
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ClinicianState {
  stats: ClinicianStats
  pending: PendingReview[]
  activity: ActivityEntry[]
  isLoadingPending: boolean
  isLoadingStats: boolean

  setStats:   (s: ClinicianStats)  => void
  setPending: (p: PendingReview[]) => void
  setActivity:(a: ActivityEntry[]) => void
  setLoadingPending: (v: boolean)  => void
  setLoadingStats:   (v: boolean)  => void
}

export const useClinicianStore = create<ClinicianState>((set) => ({
  stats:            MOCK_STATS,
  pending:          MOCK_PENDING,
  activity:         MOCK_ACTIVITY,
  isLoadingPending: false,
  isLoadingStats:   false,

  setStats:          (s) => set({ stats: s }),
  setPending:        (p) => set({ pending: p }),
  setActivity:       (a) => set({ activity: a }),
  setLoadingPending: (v) => set({ isLoadingPending: v }),
  setLoadingStats:   (v) => set({ isLoadingStats: v }),
}))
