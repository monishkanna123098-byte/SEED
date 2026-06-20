/**
 * S.E.E.D. Parent Store
 *
 * Central state for the parent dashboard:
 *   - children list fetched from /api/children
 *   - currently selected child
 *   - sessions for the selected child
 *
 * Mock data is used when the API is unavailable (development / demo mode).
 */

import { create } from 'zustand'
import { Child, ScreeningSession, RiskTier } from '@/types'

// ─── Realistic mock data ────────────────────────────────────────────────────

export const MOCK_CHILDREN: Child[] = [
  {
    id: 'child-mock-1',
    name: 'Aryan',
    dateOfBirth: '2022-01-15',
    gender: 'MALE',
    parentId: 'parent-mock-1',
    createdAt: '2024-05-10T08:00:00Z',
  },
]

export const MOCK_SESSIONS: ScreeningSession[] = [
  {
    id: 'session-mock-1',
    childId: 'child-mock-1',
    sessionType: 'VIDEO',
    status: 'COMPLETE',
    riskTier: 'ELEVATED' as RiskTier,
    compositeScore: 42,
    criterionAScore: 22,
    criterionBScore: 20,
    mChatScore: 9,
    referralStatus: 'PENDING',
    createdAt: '2024-03-12T09:15:00Z',
    completedAt: '2024-03-12T09:32:00Z',
  },
  {
    id: 'session-mock-2',
    childId: 'child-mock-1',
    sessionType: 'COMBINED',
    status: 'COMPLETE',
    riskTier: 'ELEVATED' as RiskTier,
    compositeScore: 38,
    criterionAScore: 19,
    criterionBScore: 19,
    mChatScore: 8,
    referralStatus: 'SCHEDULED',
    createdAt: '2024-04-18T10:00:00Z',
    completedAt: '2024-04-18T10:28:00Z',
  },
  {
    id: 'session-mock-3',
    childId: 'child-mock-1',
    sessionType: 'GAME',
    status: 'COMPLETE',
    riskTier: 'INDETERMINATE' as RiskTier,
    compositeScore: 31,
    criterionAScore: 16,
    criterionBScore: 15,
    mChatScore: 6,
    referralStatus: 'NONE',
    createdAt: '2024-05-22T11:30:00Z',
    completedAt: '2024-05-22T11:48:00Z',
  },
  {
    id: 'session-mock-4',
    childId: 'child-mock-1',
    sessionType: 'COMBINED',
    status: 'COMPLETE',
    riskTier: 'INDETERMINATE' as RiskTier,
    compositeScore: 28,
    criterionAScore: 14,
    criterionBScore: 14,
    mChatScore: 4,
    referralStatus: 'NONE',
    createdAt: '2024-07-10T09:30:00Z',
    completedAt: '2024-07-10T09:48:00Z',
  },
  {
    id: 'session-mock-5',
    childId: 'child-mock-1',
    sessionType: 'VIDEO',
    status: 'COMPLETE',
    riskTier: 'INDETERMINATE' as RiskTier,
    compositeScore: 25,
    criterionAScore: 13,
    criterionBScore: 12,
    mChatScore: 5,
    referralStatus: 'NONE',
    createdAt: '2024-08-15T14:00:00Z',
    completedAt: '2024-08-15T14:14:00Z',
  },
  {
    id: 'session-mock-6',
    childId: 'child-mock-1',
    sessionType: 'GAME',
    status: 'COMPLETE',
    riskTier: 'MONITOR' as RiskTier,
    compositeScore: 21,
    criterionAScore: 11,
    criterionBScore: 10,
    mChatScore: 3,
    referralStatus: 'NONE',
    createdAt: '2024-09-18T10:15:00Z',
    completedAt: '2024-09-18T10:34:00Z',
  },
  {
    id: 'session-mock-7',
    childId: 'child-mock-1',
    sessionType: 'COMBINED',
    status: 'COMPLETE',
    riskTier: 'MONITOR' as RiskTier,
    compositeScore: 19,
    criterionAScore: 10,
    criterionBScore: 9,
    mChatScore: 3,
    referralStatus: 'NONE',
    createdAt: '2024-10-22T09:45:00Z',
    completedAt: '2024-10-22T10:04:00Z',
  },
  {
    id: 'session-mock-8',
    childId: 'child-mock-1',
    sessionType: 'COMBINED',
    status: 'COMPLETE',
    riskTier: 'MONITOR' as RiskTier,
    compositeScore: 17,
    criterionAScore: 9,
    criterionBScore: 8,
    mChatScore: 2,
    referralStatus: 'NONE',
    createdAt: '2024-11-22T11:00:00Z',
    completedAt: '2024-11-22T11:21:00Z',
  },
  {
    id: 'session-mock-9',
    childId: 'child-mock-1',
    sessionType: 'VIDEO',
    status: 'COMPLETE',
    riskTier: 'MONITOR' as RiskTier,
    compositeScore: 16,
    criterionAScore: 8,
    criterionBScore: 8,
    mChatScore: 2,
    referralStatus: 'NONE',
    createdAt: '2024-12-15T13:00:00Z',
    completedAt: '2024-12-15T13:16:00Z',
  },
  {
    id: 'session-mock-10',
    childId: 'child-mock-1',
    sessionType: 'COMBINED',
    status: 'COMPLETE',
    riskTier: 'MONITOR' as RiskTier,
    compositeScore: 14,
    criterionAScore: 7,
    criterionBScore: 7,
    mChatScore: 1,
    referralStatus: 'NONE',
    createdAt: '2025-01-15T09:00:00Z',
    completedAt: '2025-01-15T09:19:00Z',
  },
  {
    id: 'session-mock-11',
    childId: 'child-mock-1',
    sessionType: 'GAME',
    status: 'COMPLETE',
    riskTier: 'MONITOR' as RiskTier,
    compositeScore: 13,
    criterionAScore: 7,
    criterionBScore: 6,
    mChatScore: 1,
    referralStatus: 'NONE',
    createdAt: '2025-02-20T10:30:00Z',
    completedAt: '2025-02-20T10:48:00Z',
  },
  {
    id: 'session-mock-12',
    childId: 'child-mock-1',
    sessionType: 'COMBINED',
    status: 'COMPLETE',
    riskTier: 'MONITOR' as RiskTier,
    compositeScore: 12,
    criterionAScore: 6,
    criterionBScore: 6,
    mChatScore: 1,
    referralStatus: 'NONE',
    createdAt: '2025-03-10T09:00:00Z',
    completedAt: '2025-03-10T09:22:00Z',
  },
]

// ─── Store definition ────────────────────────────────────────────────────────

interface ParentState {
  children: Child[]
  selectedChildId: string | null
  sessions: ScreeningSession[]
  isLoadingChildren: boolean
  isLoadingSessions: boolean
  unreadNotifications: number
  childrenFetched: boolean   // true once the API has responded (success or empty)

  setChildren: (children: Child[]) => void
  setSelectedChildId: (id: string) => void
  setSessions: (sessions: ScreeningSession[]) => void
  setLoadingChildren: (v: boolean) => void
  setLoadingSessions: (v: boolean) => void
  setChildrenFetched: (v: boolean) => void
}

export const useParentStore = create<ParentState>((set) => ({
  children: MOCK_CHILDREN,
  selectedChildId: MOCK_CHILDREN[0]?.id ?? null,
  sessions: MOCK_SESSIONS,
  isLoadingChildren: false,
  isLoadingSessions: false,
  unreadNotifications: 1,
  childrenFetched: false,

  setChildren: (children) =>
    set({ children, selectedChildId: children[0]?.id ?? null }),
  setSelectedChildId: (id) => set({ selectedChildId: id }),
  setSessions: (sessions) => set({ sessions }),
  setLoadingChildren: (v) => set({ isLoadingChildren: v }),
  setLoadingSessions: (v) => set({ isLoadingSessions: v }),
  setChildrenFetched: (v) => set({ childrenFetched: v }),
}))

// ─── Derived selectors ───────────────────────────────────────────────────────

export function selectChild(state: ParentState): Child | null {
  return state.children.find((c) => c.id === state.selectedChildId) ?? null
}

export function selectRecentSessions(
  state: ParentState,
  limit = 3
): ScreeningSession[] {
  return [...state.sessions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}
