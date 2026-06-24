/**
 * S.E.E.D. Admin — Mock clinician data for /admin/clinicians pages.
 *
 * 5 clinicians with varied patient loads, invite codes, and analytics.
 * Overdue logic: reviewStatus=PENDING AND session.date > 72h ago.
 *
 * Dr. Meera Nambiar's pending session is dated 2026-06-21 (within 72h
 * of today Jun 22 2026) — demonstrates a non-overdue pending review.
 * All other pending sessions are 2024-2025, clearly > 72h → overdue.
 */

import { MOCK_PATIENTS } from '../clinician/mockPatients'
import type { MockPatient } from '../clinician/mockPatients'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminInviteCode {
  id:        string
  code:      string
  createdAt: string
  expiresAt: string
  usedBy:    string | null
  status:    'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED'
}

export interface ClinicianAnalytics {
  monthlyVolume:    Array<{ month: string; sessions: number }>
  riskDistribution: Array<{ name: string; value: number; color: string }>
  scoreByAge:       Array<{ ageGroup: string; avgScore: number }>
  flagFrequency:    Array<{ metric: string; count: number }>
}

export interface AdminClinicianRecord {
  id:            string
  name:          string
  email:         string
  specialty:     string
  licenseNumber: string
  isActive:      boolean
  registeredAt:  string
  lastActiveAt:  string
  patients:      MockPatient[]
  inviteCodes:   AdminInviteCode[]
  analytics:     ClinicianAnalytics
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function pendingCount(c: AdminClinicianRecord): number {
  return c.patients.flatMap(p => p.sessions)
    .filter(s => s.reviewStatus === 'PENDING').length
}

export function overduePendingCount(c: AdminClinicianRecord): number {
  const cutoff = Date.now() - 72 * 60 * 60 * 1000
  return c.patients.flatMap(p => p.sessions)
    .filter(s => s.reviewStatus === 'PENDING' && new Date(s.date).getTime() < cutoff)
    .length
}

export function totalScreenings(c: AdminClinicianRecord): number {
  return c.patients.reduce((sum, p) => sum + p.sessions.length, 0)
}

// ─── Extra patients (beyond the shared 5 in mockPatients.ts) ─────────────────

const EXTRA_PATIENTS: Record<string, MockPatient[]> = {

  // Dr. Ravi Prasad (overloaded — 6 patients, all overdue pending)
  'c04': [
    {
      id: 'child-r1', name: 'Aarav T.', dateOfBirth: '2022-08-10',
      gender: 'MALE', parentName: 'Tanya Sharma', parentEmail: 'tanya.s@gmail.com',
      registeredAt: '2024-11-01',
      sessions: [
        { id:'sr1a', date:'2024-11-10', type:'GAME',     compositeScore:22, riskTier:'INDETERMINATE', reviewStatus:'CONFIRMED' },
        { id:'sr1b', date:'2025-01-18', type:'COMBINED', compositeScore:29, riskTier:'INDETERMINATE', reviewStatus:'PENDING'   },
      ],
    },
    {
      id: 'child-r2', name: 'Zara M.', dateOfBirth: '2022-03-22',
      gender: 'FEMALE', parentName: 'Farida Mirza', parentEmail: 'farida.m@gmail.com',
      registeredAt: '2024-12-05',
      sessions: [
        { id:'sr2a', date:'2024-12-12', type:'VIDEO',    compositeScore:38, riskTier:'ELEVATED',      reviewStatus:'CONFIRMED' },
        { id:'sr2b', date:'2025-02-20', type:'COMBINED', compositeScore:45, riskTier:'ELEVATED',      reviewStatus:'PENDING'   },
      ],
    },
    {
      id: 'child-r3', name: 'Kabir N.', dateOfBirth: '2023-01-15',
      gender: 'MALE', parentName: 'Neethu Kumar', parentEmail: 'neethu.k@gmail.com',
      registeredAt: '2025-01-10',
      sessions: [
        { id:'sr3a', date:'2025-01-18', type:'GAME',     compositeScore:14, riskTier:'MONITOR',       reviewStatus:'CONFIRMED' },
      ],
    },
    {
      id: 'child-r4', name: 'Riya P.', dateOfBirth: '2022-11-08',
      gender: 'FEMALE', parentName: 'Preeti Jain', parentEmail: 'preeti.j@gmail.com',
      registeredAt: '2025-02-01',
      sessions: [
        { id:'sr4a', date:'2025-02-08', type:'COMBINED', compositeScore:33, riskTier:'INDETERMINATE', reviewStatus:'CONFIRMED'  },
        { id:'sr4b', date:'2025-04-10', type:'COMBINED', compositeScore:37, riskTier:'ELEVATED',      reviewStatus:'PENDING'    },
      ],
    },
  ],

  // Dr. Meera Nambiar — light load; ONE recent (non-overdue) pending
  'c05': [
    {
      id: 'child-m1', name: 'Sia V.', dateOfBirth: '2023-04-05',
      gender: 'FEMALE', parentName: 'Vandana Roy', parentEmail: 'vandana.r@gmail.com',
      registeredAt: '2026-05-20',
      sessions: [
        { id:'sm1a', date:'2026-05-25', type:'GAME',     compositeScore:18, riskTier:'MONITOR',       reviewStatus:'CONFIRMED' },
        // Within 72h of Jun 22 2026 → NOT overdue
        { id:'sm1b', date:'2026-06-21T09:00:00Z', type:'COMBINED', compositeScore:24, riskTier:'INDETERMINATE', reviewStatus:'PENDING' },
      ],
    },
    {
      id: 'child-m2', name: 'Veer K.', dateOfBirth: '2022-12-20',
      gender: 'MALE', parentName: 'Krish Balasubramaniam', parentEmail: 'krish.b@gmail.com',
      registeredAt: '2026-04-10',
      sessions: [
        { id:'sm2a', date:'2026-04-15', type:'VIDEO',    compositeScore:11, riskTier:'MONITOR',       reviewStatus:'CONFIRMED' },
        { id:'sm2b', date:'2026-06-01', type:'COMBINED', compositeScore:20, riskTier:'MONITOR',       reviewStatus:'CONFIRMED' },
      ],
    },
  ],

  // Dr. Sunitha K. — 1 extra patient beyond child-c5
  'c03': [
    {
      id: 'child-s1', name: 'Anaya R.', dateOfBirth: '2023-02-14',
      gender: 'FEMALE', parentName: 'Rohan Das', parentEmail: 'rohan.das@gmail.com',
      registeredAt: '2025-06-10',
      sessions: [
        { id:'ss1a', date:'2025-06-15', type:'GAME',     compositeScore:17, riskTier:'MONITOR',       reviewStatus:'CONFIRMED' },
        { id:'ss1b', date:'2025-09-02', type:'COMBINED', compositeScore:19, riskTier:'MONITOR',       reviewStatus:'CONFIRMED' },
      ],
    },
    {
      id: 'child-s2', name: 'Ishaan P.', dateOfBirth: '2022-07-30',
      gender: 'MALE', parentName: 'Pallavi Menon', parentEmail: 'pallavi.m@gmail.com',
      registeredAt: '2025-07-20',
      sessions: [
        { id:'ss2a', date:'2025-07-28', type:'VIDEO',    compositeScore:26, riskTier:'INDETERMINATE', reviewStatus:'CONFIRMED' },
      ],
    },
  ],
}

// ─── Mock clinicians ──────────────────────────────────────────────────────────

export const MOCK_CLINICIANS: AdminClinicianRecord[] = [

  // ── 1. Dr. Priya Rajan — 5 patients, 14 sessions, 2 overdue PENDING ────────
  {
    id:            'c01',
    name:          'Dr. Priya Rajan',
    email:         'dr.priya.rajan@seed-platform.in',
    specialty:     'Developmental Pediatrics',
    licenseNumber: 'MH-DEV-1042',
    isActive:      true,
    registeredAt:  '2024-01-15',
    lastActiveAt:  '2026-06-20T09:00:00Z',
    patients: [
      MOCK_PATIENTS[0],  // Arjun K. — PENDING session-c1 (overdue)
      MOCK_PATIENTS[1],  // Priya R. — PENDING session-p3 (overdue)
      MOCK_PATIENTS[2],  // Karthik N.
    ],
    inviteCodes: [
      { id:'ic-c01-1', code:'PRIY3K', createdAt:'2026-06-11', expiresAt:'2026-07-11', usedBy:null,            status:'ACTIVE'  },
      { id:'ic-c01-2', code:'KS9R1M', createdAt:'2026-05-01', expiresAt:'2026-05-31', usedBy:'Kavitha Suresh',status:'USED'    },
      { id:'ic-c01-3', code:'B7NQ6F', createdAt:'2026-06-15', expiresAt:'2026-07-15', usedBy:null,            status:'ACTIVE'  },
      { id:'ic-c01-4', code:'ZREM08', createdAt:'2026-05-10', expiresAt:'2026-06-09', usedBy:null,            status:'EXPIRED' },
    ],
    analytics: {
      monthlyVolume: [
        { month:'Jan', sessions:3 }, { month:'Feb', sessions:4 }, { month:'Mar', sessions:3 },
        { month:'Apr', sessions:5 }, { month:'May', sessions:4 }, { month:'Jun', sessions:2 },
      ],
      riskDistribution: [
        { name:'Monitor Closely', value:5, color:'#02C39A' },
        { name:'Indeterminate',   value:5, color:'#F4A261' },
        { name:'Elevated',        value:4, color:'#E63946' },
      ],
      scoreByAge: [
        { ageGroup:'24–30m', avgScore:18 }, { ageGroup:'30–36m', avgScore:28 },
        { ageGroup:'36–48m', avgScore:35 }, { ageGroup:'48–60m', avgScore:26 },
      ],
      flagFrequency: [
        { metric:'Imitation', count:9 }, { metric:'Engagement', count:8 },
        { metric:'Gaze', count:7 }, { metric:'Reaction', count:5 }, { metric:'Precision', count:3 },
      ],
    },
  },

  // ── 2. Dr. Arjun Mehta — 3 patients, 9 sessions, 1 overdue PENDING ─────────
  {
    id:            'c02',
    name:          'Dr. Arjun Mehta',
    email:         'dr.arjun.mehta@seed-platform.in',
    specialty:     'Developmental Pediatrics',
    licenseNumber: 'MH-DEV-1087',
    isActive:      true,
    registeredAt:  '2024-01-15',
    lastActiveAt:  '2026-06-19T14:30:00Z',
    patients: [
      MOCK_PATIENTS[3],  // Aisha M. — PENDING session-a4 (overdue)
      MOCK_PATIENTS[4],  // Dev S.   — PENDING session-d2 (overdue)
    ],
    inviteCodes: [
      { id:'ic-c02-1', code:'ARJX5B', createdAt:'2026-06-10', expiresAt:'2026-07-10', usedBy:null,              status:'ACTIVE'  },
      { id:'ic-c02-2', code:'VW3TJ5', createdAt:'2026-06-01', expiresAt:'2026-07-01', usedBy:'Ramesh Krishnan', status:'USED'    },
      { id:'ic-c02-3', code:'T4QM2R', createdAt:'2026-04-05', expiresAt:'2026-05-05', usedBy:null,              status:'EXPIRED' },
    ],
    analytics: {
      monthlyVolume: [
        { month:'Jan', sessions:2 }, { month:'Feb', sessions:3 }, { month:'Mar', sessions:2 },
        { month:'Apr', sessions:4 }, { month:'May', sessions:3 }, { month:'Jun', sessions:1 },
      ],
      riskDistribution: [
        { name:'Monitor Closely', value:3, color:'#02C39A' },
        { name:'Indeterminate',   value:3, color:'#F4A261' },
        { name:'Elevated',        value:3, color:'#E63946' },
      ],
      scoreByAge: [
        { ageGroup:'24–30m', avgScore:22 }, { ageGroup:'30–36m', avgScore:30 },
        { ageGroup:'36–48m', avgScore:40 }, { ageGroup:'48–60m', avgScore:28 },
      ],
      flagFrequency: [
        { metric:'Imitation', count:7 }, { metric:'Gaze', count:6 },
        { metric:'Engagement', count:5 }, { metric:'Reaction', count:4 }, { metric:'Precision', count:2 },
      ],
    },
  },

  // ── 3. Dr. Sunitha K. — 3 patients, 7 sessions, 0 PENDING — clean ──────────
  {
    id:            'c03',
    name:          'Dr. Sunitha Krishnamurthy',
    email:         'dr.sunitha.k@seed-platform.in',
    specialty:     'Child Psychiatry',
    licenseNumber: 'KA-PSY-0234',
    isActive:      true,
    registeredAt:  '2024-03-01',
    lastActiveAt:  '2026-06-18T11:15:00Z',
    patients: [
      ...(EXTRA_PATIENTS['c03'] ?? []),
    ],
    inviteCodes: [
      { id:'ic-c03-1', code:'SUN7PK', createdAt:'2026-06-08', expiresAt:'2026-07-08', usedBy:null,         status:'ACTIVE'  },
      { id:'ic-c03-2', code:'C3NHZQ', createdAt:'2026-05-15', expiresAt:'2026-06-14', usedBy:null,         status:'EXPIRED' },
      { id:'ic-c03-3', code:'W9LKFT', createdAt:'2026-04-20', expiresAt:'2026-05-20', usedBy:'Rohan Das',  status:'USED'    },
    ],
    analytics: {
      monthlyVolume: [
        { month:'Jan', sessions:1 }, { month:'Feb', sessions:2 }, { month:'Mar', sessions:2 },
        { month:'Apr', sessions:3 }, { month:'May', sessions:2 }, { month:'Jun', sessions:1 },
      ],
      riskDistribution: [
        { name:'Monitor Closely', value:6, color:'#02C39A' },
        { name:'Indeterminate',   value:5, color:'#F4A261' },
        { name:'Elevated',        value:0, color:'#E63946' },
      ],
      scoreByAge: [
        { ageGroup:'24–30m', avgScore:15 }, { ageGroup:'30–36m', avgScore:20 },
        { ageGroup:'36–48m', avgScore:24 }, { ageGroup:'48–60m', avgScore:18 },
      ],
      flagFrequency: [
        { metric:'Imitation', count:4 }, { metric:'Engagement', count:3 },
        { metric:'Gaze', count:2 }, { metric:'Reaction', count:2 }, { metric:'Precision', count:1 },
      ],
    },
  },

  // ── 4. Dr. Ravi Prasad — 4 patients, 9 sessions, 3 overdue PENDING ──────────
  //    MAX OVERDUE — this row renders in red
  {
    id:            'c04',
    name:          'Dr. Ravi Prasad',
    email:         'dr.ravi.prasad@seed-platform.in',
    specialty:     'Pediatric Psychology',
    licenseNumber: 'TN-PSY-0789',
    isActive:      true,
    registeredAt:  '2024-04-10',
    lastActiveAt:  '2026-05-14T10:00:00Z',
    patients: EXTRA_PATIENTS['c04'] ?? [],
    inviteCodes: [
      { id:'ic-c04-1', code:'RAVI4N', createdAt:'2026-05-20', expiresAt:'2026-06-19', usedBy:null,          status:'EXPIRED' },
      { id:'ic-c04-2', code:'P8QZ3X', createdAt:'2026-06-12', expiresAt:'2026-07-12', usedBy:null,          status:'ACTIVE'  },
      { id:'ic-c04-3', code:'M2KCWY', createdAt:'2026-04-01', expiresAt:'2026-05-01', usedBy:'Tanya Sharma', status:'USED'   },
      { id:'ic-c04-4', code:'J6NRBT', createdAt:'2026-03-10', expiresAt:'2026-04-10', usedBy:null,          status:'REVOKED' },
    ],
    analytics: {
      monthlyVolume: [
        { month:'Jan', sessions:4 }, { month:'Feb', sessions:5 }, { month:'Mar', sessions:4 },
        { month:'Apr', sessions:6 }, { month:'May', sessions:4 }, { month:'Jun', sessions:2 },
      ],
      riskDistribution: [
        { name:'Monitor Closely', value:3, color:'#02C39A' },
        { name:'Indeterminate',   value:4, color:'#F4A261' },
        { name:'Elevated',        value:5, color:'#E63946' },
      ],
      scoreByAge: [
        { ageGroup:'24–30m', avgScore:24 }, { ageGroup:'30–36m', avgScore:34 },
        { ageGroup:'36–48m', avgScore:44 }, { ageGroup:'48–60m', avgScore:31 },
      ],
      flagFrequency: [
        { metric:'Imitation', count:11 }, { metric:'Engagement', count:10 },
        { metric:'Gaze', count:9 }, { metric:'Reaction', count:7 }, { metric:'Precision', count:5 },
      ],
    },
  },

  // ── 5. Dr. Meera Nambiar — 2 patients, 4 sessions, 1 PENDING (not overdue) ──
  {
    id:            'c05',
    name:          'Dr. Meera Nambiar',
    email:         'dr.meera.nambiar@seed-platform.in',
    specialty:     'Occupational Therapy',
    licenseNumber: 'KL-OT-0312',
    isActive:      true,
    registeredAt:  '2024-05-22',
    lastActiveAt:  '2026-06-21T15:00:00Z',
    patients: EXTRA_PATIENTS['c05'] ?? [],
    inviteCodes: [
      { id:'ic-c05-1', code:'MEER2T', createdAt:'2026-06-18', expiresAt:'2026-07-18', usedBy:null,           status:'ACTIVE' },
      { id:'ic-c05-2', code:'K5VQXN', createdAt:'2026-05-28', expiresAt:'2026-06-27', usedBy:'Vandana Roy',  status:'USED'   },
    ],
    analytics: {
      monthlyVolume: [
        { month:'Jan', sessions:1 }, { month:'Feb', sessions:1 }, { month:'Mar', sessions:1 },
        { month:'Apr', sessions:2 }, { month:'May', sessions:1 }, { month:'Jun', sessions:2 },
      ],
      riskDistribution: [
        { name:'Monitor Closely', value:5, color:'#02C39A' },
        { name:'Indeterminate',   value:2, color:'#F4A261' },
        { name:'Elevated',        value:0, color:'#E63946' },
      ],
      scoreByAge: [
        { ageGroup:'24–30m', avgScore:14 }, { ageGroup:'30–36m', avgScore:18 },
        { ageGroup:'36–48m', avgScore:22 }, { ageGroup:'48–60m', avgScore:15 },
      ],
      flagFrequency: [
        { metric:'Imitation', count:3 }, { metric:'Gaze', count:2 },
        { metric:'Engagement', count:2 }, { metric:'Reaction', count:1 }, { metric:'Precision', count:1 },
      ],
    },
  },
]
