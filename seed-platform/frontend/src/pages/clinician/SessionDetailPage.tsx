/**
 * S.E.E.D. Clinician — Session Detail
 * Route: /clinician/session/:sessionId
 *
 * Always-visible header: child info, risk tier, composite score,
 * confidence badge, divergence warning banner.
 * 5-tab shell: Tab 1 (Behavioral Analysis) is fully built;
 * Tabs 2-5 render placeholder cards.
 *
 * On mount: GET /screening/:sessionId/results
 * Falls back to ELEVATED mock data in demo mode.
 */

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RiskTierBadge } from '@/components/parent/RiskTierBadge'
import { calculateAge, formatDate } from '@/utils/age'
import { api } from '@/utils/api'
import { BehavioralAnalysis } from './tabs/BehavioralAnalysis'
import { MChatDetails }       from './tabs/MChatDetails'
import { GameData as GameDataTab } from './tabs/GameData'
import { AISummary }          from './tabs/AISummary'
import { TrajectoryTab }      from './tabs/TrajectoryTab'
import { ReviewPanel }        from './ReviewPanel'

// ─── Shared data types (imported by tab components) ───────────────────────────

export interface MetricData {
  score:   number   // 0–10, higher = more concern
  zscore:  number   // standard deviations above age norm
  flag:    boolean  // true = at-risk threshold exceeded
  norm:    number   // age-group mean for comparison bar
}

export interface GazeMetric    extends MetricData { gazePct: number }
export interface ReactionMetric extends MetricData { latencyMs: number; sigma: number }
export interface PrecisionMetric extends MetricData { accuracyPct: number }
export interface ImitationMetric extends MetricData { accuracyPct: number; trials: number }
export interface EngagementMetric extends MetricData { disengageCount: number; completionPct: number }

export interface CriterionSub {
  name:  string
  score: number
  max:   number
}

export interface SessionDetail {
  sessionId: string
  child: {
    id:          string
    name:        string
    dateOfBirth: string
    gender:      string
  }
  session: {
    type:              string
    createdAt:         string
    riskTier:          string
    compositeScore:    number
    criterionAScore:   number
    criterionBScore:   number
    /** 0–1 from analysis engine confidence field */
    confidence:        number
    divergenceFlag:    boolean
    divergencePercent?: number
    /** Pre-built recommended action string from fusion engine */
    recommendedAction?: string
  }
  metrics: {
    gaze:       GazeMetric
    reaction:   ReactionMetric
    precision:  PrecisionMetric
    imitation:  ImitationMetric
    engagement: EngagementMetric
  }
  criterionA: { total: number; max: number; a1: CriterionSub; a2: CriterionSub; a3: CriterionSub }
  criterionB: { total: number; max: number; b1: CriterionSub; b2: CriterionSub; b3: CriterionSub; b4: CriterionSub }
  /** M-CHAT-R item-level data for Tab 2 */
  mchatData?: MChatData
  /** Buddy's World game metrics for Tab 3 (present only when session includes game) */
  gameData?: GameData
  /** Historical sessions for this child — used by the Trajectory tab */
  childHistory?: Array<{
    sessionId:      string
    createdAt:      string
    compositeScore: number
    riskTier:       string
  }>
  /** Persisted clinician notes (pre-filled into the review panel) */
  clinicianNotes?: string
}

// ─── M-CHAT-R tab types ────────────────────────────────────────────────────────

export interface MChatData {
  /** One boolean per item; true = parent answered YES */
  answers: boolean[]
  /** One boolean per item; true = answer is at-risk per official scoring */
  risk_flags: boolean[]
  total_score: number
  /** Count of at-risk responses among critical (reverse-scored) items 2, 5, 12 */
  critical_flagged: number
}

// ─── Game data tab types ───────────────────────────────────────────────────────

export interface GameTrialPoint { trial: number; value: number }

export interface DisengagementEvent {
  timestamp_ms: number
  module:       string
  duration_ms:  number
}

export interface GameData {
  module1: {
    accuracy_pct:           number
    mean_reaction_ms:       number
    social_following_ratio: number
    /** Per-trial reaction time (ms); 0 on incorrect / no response */
    trials: GameTrialPoint[]
  }
  module2: {
    accuracy_pct:  number
    mean_latency_ms: number
    /** Per-trial accuracy (0 or 1) */
    trials: GameTrialPoint[]
  }
  module3: {
    precision_score:        number   // 0–10
    drag_smoothness:        number   // 0–10
    fixation_pattern_flag:  boolean
  }
  module4: {
    accuracy_pct:       number
    flexibility_score:  number   // 0–10
    rigidity_score:     number   // 0–10
    /** Per-trial accuracy (0 or 1) */
    trials: GameTrialPoint[]
  }
  overall: {
    completion_rate_pct:   number
    disengagement_events:  DisengagementEvent[]
  }
}

// ─── Mock ELEVATED scenario ───────────────────────────────────────────────────

const MOCK_MCHAT: MChatData = {
  // true = YES, false = NO
  answers: [
    false, true,  false, true,  false,  // 1-5
    false, false, false, false, false,  // 6-10
    true,  true,  true,  false, false,  // 11-15
    true,  false, true,  true,  true,   // 16-20
  ],
  // Scoring: items 2,5,12 (indices 1,4,11) are reverse-scored (YES=at-risk)
  // All others: NO = at-risk
  risk_flags: [
    true,  true,  true,  false, false,   // 1-5
    true,  true,  true,  true,  true,    // 6-10
    false, true,  false, true,  true,    // 11-15
    false, true,  false, false, false,   // 16-20
  ],
  total_score: 12,
  critical_flagged: 2,  // items 2 (idx 1) and 12 (idx 11) are flagged
}

const MOCK_GAME: GameData = {
  module1: {
    accuracy_pct:           37.5,
    mean_reaction_ms:       2840,
    social_following_ratio: 0.31,
    trials: [
      { trial: 1, value: 3200 }, { trial: 2, value: 0    },
      { trial: 3, value: 2950 }, { trial: 4, value: 0    },
      { trial: 5, value: 3100 }, { trial: 6, value: 2800 },
      { trial: 7, value: 0    }, { trial: 8, value: 3400 },
    ],
  },
  module2: {
    accuracy_pct:    16.7,
    mean_latency_ms: 2100,
    trials: [
      { trial: 1, value: 0 }, { trial: 2, value: 1 },
      { trial: 3, value: 0 }, { trial: 4, value: 0 },
      { trial: 5, value: 0 }, { trial: 6, value: 0 },
    ],
  },
  module3: {
    precision_score:       4.1,
    drag_smoothness:       3.8,
    fixation_pattern_flag: false,
  },
  module4: {
    accuracy_pct:      25,
    flexibility_score: 2.1,
    rigidity_score:    7.8,
    trials: [
      { trial: 1, value: 0 }, { trial: 2, value: 0 },
      { trial: 3, value: 1 }, { trial: 4, value: 0 },
      { trial: 5, value: 0 }, { trial: 6, value: 1 },
    ],
  },
  overall: {
    completion_rate_pct: 68,
    disengagement_events: [
      { timestamp_ms: 142000, module: 'Module 1 – Gaze',     duration_ms: 31000 },
      { timestamp_ms: 298000, module: 'Module 2 – Imitation', duration_ms: 30000 },
      { timestamp_ms: 421000, module: 'Module 4 – Sequence',  duration_ms: 30000 },
    ],
  },
}

const MOCK_ELEVATED: SessionDetail = {
  sessionId: 'session-c1',
  child: {
    id:          'child-c1',
    name:        'Arjun K.',
    dateOfBirth: new Date(Date.now() - 38 * 30.44 * 86400000).toISOString().split('T')[0],
    gender:      'MALE',
  },
  session: {
    type:              'COMBINED',
    createdAt:         '2025-06-10T09:00:00Z',
    riskTier:          'ELEVATED',
    compositeScore:    41,
    criterionAScore:   22,
    criterionBScore:   19,
    confidence:        0.88,
    divergenceFlag:    true,
    divergencePercent: 34,
    recommendedAction: 'Refer for specialist evaluation. Consultation should be scheduled within 2 weeks. Parent has been informed of the findings.',
  },
  metrics: {
    gaze:       { score: 7.2, zscore: 2.1, flag: true,  norm: 3.1, gazePct: 31 },
    reaction:   { score: 6.8, zscore: 1.9, flag: true,  norm: 3.4, latencyMs: 2840, sigma: 2.1 },
    precision:  { score: 4.1, zscore: 0.8, flag: false, norm: 2.8, accuracyPct: 59 },
    imitation:  { score: 8.1, zscore: 2.8, flag: true,  norm: 2.9, accuracyPct: 19, trials: 6 },
    engagement: { score: 7.5, zscore: 2.3, flag: true,  norm: 3.2, disengageCount: 7, completionPct: 68 },
  },
  criterionA: {
    total: 22, max: 30,
    a1: { name: 'Social reciprocity',      score: 8, max: 10 },
    a2: { name: 'Nonverbal communication', score: 7, max: 10 },
    a3: { name: 'Relationships',           score: 7, max: 10 },
  },
  criterionB: {
    total: 19, max: 40,
    b1: { name: 'Stereotyped movements',  score: 5, max: 10 },
    b2: { name: 'Insistence on sameness', score: 4, max: 10 },
    b3: { name: 'Restricted interests',   score: 4, max: 10 },
    b4: { name: 'Sensory reactivity',     score: 6, max: 10 },
  },
  mchatData: MOCK_MCHAT,
  gameData:  MOCK_GAME,
  // ── Historical sessions for Trajectory tab (4 prior + current = 5 points) ─
  childHistory: [
    {
      sessionId:      'session-h1',
      createdAt:      '2024-09-18T10:00:00Z',
      compositeScore: 16,
      riskTier:       'MONITOR',
    },
    {
      sessionId:      'session-h2',
      createdAt:      '2024-12-05T09:30:00Z',
      compositeScore: 27,
      riskTier:       'INDETERMINATE',
    },
    {
      sessionId:      'session-h3',
      createdAt:      '2025-02-28T11:00:00Z',
      compositeScore: 33,
      riskTier:       'INDETERMINATE',
    },
    {
      sessionId:      'session-h4',
      createdAt:      '2025-04-15T09:00:00Z',
      compositeScore: 38,
      riskTier:       'ELEVATED',
    },
    // Current session (session-c1, 2025-06-10, score 41) is merged in TrajectoryTab
  ],
  clinicianNotes: '',
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  let label: string
  let cls: string

  if (value >= 0.75) {
    label = 'HIGH'; cls = 'bg-emerald-100 text-emerald-700'
  } else if (value >= 0.60) {
    label = 'MODERATE'; cls = 'bg-amber-100 text-amber-700'
  } else {
    label = 'LOW'; cls = 'bg-red-100 text-red-700'
  }

  return (
    <div className="flex flex-col items-center">
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
      <span className="text-[10px] text-seed-muted mt-0.5">Confidence</span>
    </div>
  )
}

// ─── Session header ───────────────────────────────────────────────────────────

function SessionHeader({ detail }: { detail: SessionDetail }) {
  const { child, session } = detail
  const age = calculateAge(child.dateOfBirth)

  const genderLabel = child.gender === 'MALE' ? 'Boy'
    : child.gender === 'FEMALE' ? 'Girl' : 'Child'

  const typeLabel: Record<string, string> = {
    VIDEO: 'Video only', GAME: 'Game only',
    COMBINED: 'Video + Game', MCHAT_ONLY: 'Questionnaire',
  }

  return (
    <div className="bg-white border-b border-slate-100">
      {/* Divergence warning banner */}
      {session.divergenceFlag && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-start gap-2">
          <span className="text-amber-500 text-base flex-shrink-0 mt-0.5">⚠</span>
          <p className="text-sm text-amber-800 font-medium">
            Parent questionnaire and behavioral data diverge by{' '}
            <strong>{session.divergencePercent ?? '—'}%</strong>.
            Manual review required before any clinical action.
          </p>
        </div>
      )}

      <div className="px-6 py-5">
        {/* Back link */}
        <Link
          to="/clinician/dashboard"
          className="inline-flex items-center gap-1 text-xs text-seed-muted
                     hover:text-seed-dark transition-colors mb-4"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}
            className="w-3.5 h-3.5">
            <polyline points="10,3 5,8 10,13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Header grid */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: child + session info */}
          <div>
            <h1 className="text-2xl font-bold text-seed-dark">{child.name}</h1>
            <p className="text-sm text-seed-muted mt-1">
              {age.display}
              <span className="mx-1.5 text-slate-300">·</span>
              {genderLabel}
              <span className="mx-1.5 text-slate-300">·</span>
              {typeLabel[session.type] ?? session.type}
              <span className="mx-1.5 text-slate-300">·</span>
              {formatDate(session.createdAt)}
            </p>
          </div>

          {/* Right: scores */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-seed-dark leading-none">
                {session.compositeScore}
              </span>
              <span className="text-[10px] text-seed-muted mt-0.5">
                Score <span className="text-slate-300">/70</span>
              </span>
            </div>

            <ConfidenceBadge value={session.confidence} />

            <div className="flex flex-col items-center">
              <RiskTierBadge tier={session.riskTier as import('@/components/parent/RiskTierBadge').DisplayTier} size="lg" />
              <span className="text-[10px] text-seed-muted mt-0.5">Risk Tier</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type TabId = 'behavioral' | 'mchat' | 'game' | 'summary' | 'trajectory'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'behavioral', label: 'Behavioral Analysis' },
  { id: 'mchat',      label: 'M-CHAT-R Details'   },
  { id: 'game',       label: 'Game Data'           },
  { id: 'summary',    label: 'AI Summary'          },
  { id: 'trajectory', label: 'Trajectory'          },
]

function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="bg-white border-b border-slate-100 px-6 overflow-x-auto">
      <div className="flex gap-0 min-w-max">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors
                         whitespace-nowrap ${
              active === id
                ? 'border-seed-teal text-seed-teal'
                : 'border-transparent text-seed-muted hover:text-seed-dark'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [detail, setDetail]     = useState<SessionDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('behavioral')

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)

    api
      .get(`/screening/${sessionId}/results`)
      .then(({ data }) => {
        // TODO: map real API shape to SessionDetail once backend is confirmed
        setDetail(data.detail ?? MOCK_ELEVATED)
      })
      .catch(() => {
        setDetail(MOCK_ELEVATED)
      })
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-seed-teal border-t-transparent
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (!detail) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col"
    >
      <SessionHeader detail={detail} />
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* pb-44 keeps content clear of the fixed ReviewPanel */}
      <div className="p-6 max-w-5xl pb-44">
        {activeTab === 'behavioral' && <BehavioralAnalysis detail={detail} />}
        {activeTab === 'mchat'      && <MChatDetails data={detail.mchatData} />}
        {activeTab === 'game'       && <GameDataTab data={detail.gameData} sessionType={detail.session.type} />}
        {activeTab === 'summary'    && <AISummary detail={detail} />}
        {activeTab === 'trajectory' && <TrajectoryTab detail={detail} />}
      </div>

      <ReviewPanel detail={detail} sessionId={sessionId ?? ''} />
    </motion.div>
  )
}
