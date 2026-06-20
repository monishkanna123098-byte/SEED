// S.E.E.D. Frontend Type Definitions

export type UserRole = 'PARENT' | 'CLINICIAN' | 'ADMIN'

export type SessionType = 'VIDEO' | 'GAME' | 'COMBINED'

export type SessionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'

// LOW deliberately excluded — system never definitively clears a child
export type RiskTier = 'MONITOR' | 'INDETERMINATE' | 'ELEVATED'

export type ReferralStatus = 'NONE' | 'PENDING' | 'SCHEDULED' | 'COMPLETE'

export type MetricType = 'GAZE' | 'REACTION' | 'TOUCH' | 'IMITATION' | 'ENGAGEMENT'

/**
 * Differential pattern from the analysis engine's motor delay detection.
 *
 * MOTOR_DELAY_PATTERN — motor domain elevated, social communication intact.
 *   Suggests OT/physio referral rather than ASD evaluation as primary pathway.
 * ASD_PROFILE         — social communication domain primarily elevated.
 * MIXED_PATTERN       — both domains elevated; comprehensive evaluation needed.
 * TYPICAL_PATTERN     — all scores within/near normative range.
 */
export type DifferentialPattern =
  | 'MOTOR_DELAY_PATTERN'
  | 'ASD_PROFILE'
  | 'MIXED_PATTERN'
  | 'TYPICAL_PATTERN'

export const DIFFERENTIAL_PATTERN_CONFIG: Record<DifferentialPattern, {
  label: string
  description: string
  colorClass: string
  bgClass: string
  borderClass: string
  referralSuggestion: string
}> = {
  MOTOR_DELAY_PATTERN: {
    label: 'Motor Delay Pattern',
    description: 'Motor skills domain is primarily elevated. Social communication appears intact.',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    referralSuggestion: 'Consider occupational therapy or physiotherapy assessment.',
  },
  ASD_PROFILE: {
    label: 'Social Communication Profile',
    description: 'Social communication domain is primarily elevated relative to motor domain.',
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    referralSuggestion: 'Clinical ASD evaluation recommended.',
  },
  MIXED_PATTERN: {
    label: 'Mixed Pattern',
    description: 'Both motor and social communication domains show elevation.',
    colorClass: 'text-purple-700',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    referralSuggestion: 'Comprehensive multi-disciplinary evaluation recommended.',
  },
  TYPICAL_PATTERN: {
    label: 'Typical Pattern',
    description: 'Both domains are within or near normative range.',
    colorClass: 'text-green-700',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    referralSuggestion: 'Continue routine developmental monitoring.',
  },
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isEmailVerified: boolean
  clinicianId?: string | null
  createdAt: string
}

export interface Child {
  id: string
  name: string
  dateOfBirth: string
  gender: string
  parentId: string
  clinicianId?: string | null
  createdAt: string
  ageMonths?: number
}

export interface InviteCode {
  id: string
  code: string
  usedBy: string | null
  usedAt: string | null
  expiresAt: string
  createdAt: string
}

export interface ScreeningSession {
  id: string
  childId: string
  child?: Child
  sessionType: SessionType
  status: SessionStatus
  mChatScore?: number | null
  mChatRawAnswers?: Record<string, unknown> | null
  videoPath?: string | null
  analysisJobId?: string | null
  riskTier?: RiskTier | null
  compositeScore?: number | null
  criterionAScore?: number | null
  criterionBScore?: number | null
  rawMetrics?: Record<string, unknown> | null
  clinicianNotes?: string | null
  clinicianOverride?: string | null
  referralStatus: ReferralStatus
  // Differential pattern — populated after analysis completes
  differentialPattern?: DifferentialPattern | null
  motorDelayFlag?: boolean | null
  differentialNote?: string | null
  createdAt: string
  completedAt?: string | null
}

export interface BehavioralMetric {
  id: string
  sessionId: string
  metricType: MetricType
  rawValue: number
  normalizedScore: number
  riskFlagged: boolean
  timestamp: string
  details?: Record<string, unknown> | null
}

export interface GameSession {
  id: string
  sessionId?: string | null
  childId: string
  gameModuleId: string
  ageGroup: string
  events: GameEvent[]
  completionRate: number
  disengagementCount: number
  touchPrecisionScore: number
  reactionLatencyMean: number
  imitationAccuracy: number
  rigidityScore: number
  createdAt: string
}

export interface GameEvent {
  type: 'tap' | 'drag' | 'response' | 'disengage' | 'timeout' | 'imitation_attempt'
  timestamp: number   // ms since game start
  moduleId: string
  trialIndex: number
  targetX?: number
  targetY?: number
  actualX?: number
  actualY?: number
  latencyMs?: number
  isCorrect?: boolean
  stimulusType?: string
  responseType?: string
}

export interface NormativeBaseline {
  id: string
  ageGroupMonths: number
  metricType: string
  meanValue: number
  stdDev: number
  source: string
}

// API response wrappers
export interface ApiError {
  error: string
  details?: Array<{ field: string; message: string }>
  code?: string
}

export interface LoginResponse {
  accessToken: string
  user: User
}

export interface RegisterResponse {
  message: string
  userId: string
}

export interface InviteValidationResponse {
  valid: boolean
  clinicianName?: string
  expiresAt?: string
  error?: string
}

// Risk tier display config
export const RISK_TIER_CONFIG: Record<RiskTier, {
  label: string
  description: string
  colorClass: string
  bgClass: string
  borderClass: string
}> = {
  MONITOR: {
    label: 'Monitor Closely',
    description: 'Some developmental patterns warrant attention. Regular monitoring recommended.',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  INDETERMINATE: {
    label: 'Indeterminate',
    description: 'Results are inconclusive. Clinical evaluation is recommended.',
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
  },
  ELEVATED: {
    label: 'Elevated Concern',
    description: 'Patterns suggest need for prompt clinical evaluation.',
    colorClass: 'text-red-700',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
  },
}
