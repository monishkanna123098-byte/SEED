/**
 * S.E.E.D. — Mock patient data for /clinician/patients pages.
 *
 * 5 children, 2–4 sessions each, varied risk trajectories.
 * DOBs chosen so children are 26–50 months at time of their sessions.
 *
 * session-c1 intentionally matches the MOCK_ELEVATED scenario in
 * SessionDetailPage so that navigating Arjun K.'s latest session
 * renders the full clinician detail view.
 */

export type MockRiskTier    = 'MONITOR' | 'INDETERMINATE' | 'ELEVATED'
export type MockSessionType = 'VIDEO' | 'GAME' | 'COMBINED'
export type MockReviewStatus = 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN'

export interface MockSession {
  id:             string
  date:           string    // ISO date string
  type:           MockSessionType
  compositeScore: number
  riskTier:       MockRiskTier
  reviewStatus:   MockReviewStatus
}

export interface MockPatient {
  id:           string
  name:         string
  dateOfBirth:  string    // ISO date string
  gender:       'MALE' | 'FEMALE'
  parentName:   string
  parentEmail:  string
  registeredAt: string    // ISO date string
  sessions:     MockSession[]
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Most recent session (already sorted newest → last) */
export function latestSession(patient: MockPatient): MockSession | undefined {
  return [...patient.sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0]
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_PATIENTS: MockPatient[] = [

  // ── 1. Arjun K. — ELEVATED trajectory, 4 sessions ─────────────────────────
  // Matches session-c1 in SessionDetailPage for deep-link demo.
  {
    id:           'child-c1',
    name:         'Arjun K.',
    dateOfBirth:  '2022-04-12',    // 38m in Jun 2025; 50m today
    gender:       'MALE',
    parentName:   'Kavitha Suresh',
    parentEmail:  'kavitha.suresh@gmail.com',
    registeredAt: '2024-07-15',
    sessions: [
      { id: 'session-h1', date: '2024-09-18', type: 'GAME',     compositeScore: 16, riskTier: 'MONITOR',       reviewStatus: 'CONFIRMED'  },
      { id: 'session-h2', date: '2024-12-05', type: 'VIDEO',    compositeScore: 27, riskTier: 'INDETERMINATE', reviewStatus: 'CONFIRMED'  },
      { id: 'session-h3', date: '2025-02-28', type: 'COMBINED', compositeScore: 33, riskTier: 'INDETERMINATE', reviewStatus: 'OVERRIDDEN' },
      { id: 'session-c1', date: '2025-06-10', type: 'COMBINED', compositeScore: 41, riskTier: 'ELEVATED',      reviewStatus: 'PENDING'    },
    ],
  },

  // ── 2. Priya R. — rising INDETERMINATE, 3 sessions ────────────────────────
  {
    id:           'child-c2',
    name:         'Priya R.',
    dateOfBirth:  '2022-10-20',    // 32m in Jun 2025; 44m today
    gender:       'FEMALE',
    parentName:   'Ramesh Krishnan',
    parentEmail:  'ramesh.krishnan@gmail.com',
    registeredAt: '2025-01-20',
    sessions: [
      { id: 'session-p1', date: '2025-01-25', type: 'GAME',     compositeScore: 21, riskTier: 'INDETERMINATE', reviewStatus: 'CONFIRMED' },
      { id: 'session-p2', date: '2025-03-18', type: 'COMBINED', compositeScore: 28, riskTier: 'INDETERMINATE', reviewStatus: 'CONFIRMED' },
      { id: 'session-p3', date: '2025-05-30', type: 'COMBINED', compositeScore: 31, riskTier: 'INDETERMINATE', reviewStatus: 'PENDING'   },
    ],
  },

  // ── 3. Karthik N. — stable MONITOR, 2 sessions ────────────────────────────
  {
    id:           'child-c3',
    name:         'Karthik N.',
    dateOfBirth:  '2022-01-08',    // 41m in Jun 2025; 53m today
    gender:       'MALE',
    parentName:   'Nalini Subramaniam',
    parentEmail:  'nalini.subs@gmail.com',
    registeredAt: '2025-02-10',
    sessions: [
      { id: 'session-k1', date: '2025-02-15', type: 'VIDEO',    compositeScore: 14, riskTier: 'MONITOR', reviewStatus: 'CONFIRMED' },
      { id: 'session-k2', date: '2025-05-12', type: 'COMBINED', compositeScore: 12, riskTier: 'MONITOR', reviewStatus: 'PENDING'   },
    ],
  },

  // ── 4. Aisha M. — escalating ELEVATED, 4 sessions ─────────────────────────
  {
    id:           'child-c4',
    name:         'Aisha M.',
    dateOfBirth:  '2022-07-15',    // 35m in Jun 2025; 47m today
    gender:       'FEMALE',
    parentName:   'Mohammed Farhan',
    parentEmail:  'farhan.m@gmail.com',
    registeredAt: '2024-10-05',
    sessions: [
      { id: 'session-a1', date: '2024-10-12', type: 'GAME',     compositeScore: 30, riskTier: 'INDETERMINATE', reviewStatus: 'CONFIRMED'  },
      { id: 'session-a2', date: '2024-12-20', type: 'COMBINED', compositeScore: 38, riskTier: 'ELEVATED',      reviewStatus: 'CONFIRMED'  },
      { id: 'session-a3', date: '2025-02-14', type: 'COMBINED', compositeScore: 44, riskTier: 'ELEVATED',      reviewStatus: 'OVERRIDDEN' },
      { id: 'session-a4', date: '2025-05-07', type: 'COMBINED', compositeScore: 49, riskTier: 'ELEVATED',      reviewStatus: 'PENDING'    },
    ],
  },

  // ── 5. Dev S. — MONITOR → INDETERMINATE, 2 sessions ──────────────────────
  {
    id:           'child-c5',
    name:         'Dev S.',
    dateOfBirth:  '2022-09-03',    // 33m in Jun 2025; 45m today
    gender:       'MALE',
    parentName:   'Sunitha Rajan',
    parentEmail:  'sunitha.r@gmail.com',
    registeredAt: '2025-03-01',
    sessions: [
      { id: 'session-d1', date: '2025-03-08', type: 'GAME',     compositeScore: 18, riskTier: 'MONITOR',       reviewStatus: 'CONFIRMED' },
      { id: 'session-d2', date: '2025-06-01', type: 'COMBINED', compositeScore: 25, riskTier: 'INDETERMINATE', reviewStatus: 'PENDING'   },
    ],
  },
]
