/**
 * S.E.E.D. Clinician — Trajectory Tab
 *
 * Recharts LineChart of all sessions for this child.
 * Zone backgrounds match the canonical 0–23 / 24–46 / 47–70 bands.
 * Each historical data point is clickable → navigates to that session.
 * Current session is highlighted with a larger, navy-bordered dot.
 */

import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, ArrowUp, BarChart2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ResponsiveContainer,
} from 'recharts'
import { SessionDetail } from '../SessionDetailPage'
import { formatDate } from '@/utils/age'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrajectoryPoint {
  sessionId:   string
  date:        string
  dateLabel:   string
  score:       number
  tier:        string
  isCurrent:   boolean
}

// ─── Colour maps ─────────────────────────────────────────────────────────────

const DOT_FILL: Record<string, string> = {
  MONITOR:       '#10b981',
  INDETERMINATE: '#f59e0b',
  ELEVATED:      '#ef4444',
}

const TIER_LABEL: Record<string, string> = {
  MONITOR:       'Monitor Closely',
  INDETERMINATE: 'Indeterminate',
  ELEVATED:      'Elevated',
}

// ─── Custom dot — tier-coloured, larger for current session ──────────────────

function TieredDot(props: {
  cx?: number
  cy?: number
  payload?: TrajectoryPoint
  onClick?: (p: TrajectoryPoint) => void
}) {
  const { cx, cy, payload, onClick } = props
  if (cx === undefined || cy === undefined || !payload) return null

  const fill     = DOT_FILL[payload.tier] ?? '#028090'
  const r        = payload.isCurrent ? 9 : 6
  const stroke   = payload.isCurrent ? '#065A82' : '#ffffff'
  const sw       = payload.isCurrent ? 3 : 2
  const cursor   = payload.isCurrent ? 'default' : 'pointer'

  return (
    <circle
      key={payload.sessionId}
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      style={{ cursor }}
      onClick={() => !payload.isCurrent && onClick?.(payload)}
    />
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: TrajectoryPoint }>
}) {
  if (!active || !payload?.length) return null
  const pt = payload[0].payload

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-seed-dark mb-1">{pt.dateLabel}</p>
      <p className="text-seed-muted">
        Score: <span className="font-bold text-seed-dark">{pt.score}</span>
        <span className="text-slate-400"> / 70</span>
      </p>
      <p className="text-seed-muted text-xs mt-0.5">{TIER_LABEL[pt.tier] ?? pt.tier}</p>
      {pt.isCurrent && (
        <p className="text-xs text-seed-teal font-semibold mt-1 flex items-center gap-0.5"><ArrowUp size={11} />Current session</p>
      )}
      {!pt.isCurrent && (
        <p className="text-xs text-slate-400 mt-1">Click to open session</p>
      )}
    </div>
  )
}

// ─── Session list row ─────────────────────────────────────────────────────────

function SessionRow({
  pt,
  onClick,
}: {
  pt: TrajectoryPoint
  onClick: (id: string) => void
}) {
  const dotColor = DOT_FILL[pt.tier] ?? '#94a3b8'

  return (
    <div
      onClick={() => !pt.isCurrent && onClick(pt.sessionId)}
      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm
                  transition-colors border
                  ${pt.isCurrent
                    ? 'bg-seed-teal/10 border-seed-teal/30'
                    : 'border-transparent hover:bg-slate-50 cursor-pointer'
                  }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className={`font-medium ${pt.isCurrent ? 'text-seed-teal' : 'text-seed-dark'}`}>
          {pt.dateLabel}
        </span>
        {pt.isCurrent && (
          <span className="text-xs text-seed-teal font-medium">(current)</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-seed-dark font-semibold">
          {pt.score}
          <span className="text-seed-muted font-normal text-xs"> /70</span>
        </span>
        <span className="text-xs text-seed-muted w-28 text-right">
          {TIER_LABEL[pt.tier] ?? pt.tier}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TrajectoryTabProps {
  detail: SessionDetail
}

export function TrajectoryTab({ detail }: TrajectoryTabProps) {
  const navigate = useNavigate()

  // Merge child history + current session, sorted chronologically
  const history = detail.childHistory ?? []
  const allRaw  = [...history]
  const alreadyPresent = allRaw.some(s => s.sessionId === detail.sessionId)
  if (!alreadyPresent) {
    allRaw.push({
      sessionId:      detail.sessionId,
      createdAt:      detail.session.createdAt,
      compositeScore: detail.session.compositeScore,
      riskTier:       detail.session.riskTier,
    })
  }

  const data: TrajectoryPoint[] = allRaw
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(s => ({
      sessionId: s.sessionId,
      date:      s.createdAt,
      dateLabel: formatDate(s.createdAt),
      score:     s.compositeScore,
      tier:      s.riskTier,
      isCurrent: s.sessionId === detail.sessionId,
    }))

  function handleDotClick(pt: TrajectoryPoint) {
    navigate(`/clinician/session/${pt.sessionId}`)
  }

  function handleChartClick(chartData: { activePayload?: Array<{ payload: TrajectoryPoint }> }) {
    const pt = chartData?.activePayload?.[0]?.payload
    if (pt && !pt.isCurrent) navigate(`/clinician/session/${pt.sessionId}`)
  }

  if (data.length < 2) {
    return (
      <div className="seed-card py-14 text-center">
        <div className="flex justify-center mb-3"><BarChart2 className="text-seed-muted" size={32} /></div>
        <h3 className="font-semibold text-seed-dark mb-1">Not enough data</h3>
        <p className="text-sm text-seed-muted">
          At least 2 completed sessions are required to display a trajectory.
        </p>
      </div>
    )
  }

  // Trend arrow
  const first = data[0].score
  const last  = data[data.length - 1].score
  const delta = last - first
  const trendIcon  = delta > 3 ? <TrendingUp size={13} /> : delta < -3 ? <TrendingDown size={13} /> : <Minus size={13} />
  const trendText  = delta > 3 ? 'Increasing concern' : delta < -3 ? 'Improving trend' : 'Stable'
  const trendColor = delta > 3 ? 'text-red-600' : delta < -3 ? 'text-emerald-600' : 'text-amber-600'

  return (
    <div className="space-y-4">
      {/* Chart card */}
      <div className="seed-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-seed-dark">Development Trajectory</h3>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-semibold flex items-center gap-1 ${trendColor}`}>{trendIcon}{trendText}</span>
            <span className="text-xs text-seed-muted">
              {data.length} sessions · Click non-current points to navigate
            </span>
          </div>
        </div>

        {/* Zone legend */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {[
            { color: 'bg-emerald-200', label: '0–23 Monitor Closely' },
            { color: 'bg-amber-200',   label: '24–46 Indeterminate'  },
            { color: 'bg-red-200',     label: '47–70 Elevated'       },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-seed-muted">
              <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-seed-muted ml-auto">
            <span className="w-4 h-[3px] bg-seed-teal inline-block rounded" />
            Score trajectory
          </span>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={data}
            margin={{ top: 10, right: 16, left: -20, bottom: 0 }}
            onClick={handleChartClick as never}
            style={{ cursor: 'pointer' }}
          >
            {/* Zone backgrounds */}
            <ReferenceArea y1={0}  y2={23} fill="#dcfce7" fillOpacity={0.7} />
            <ReferenceArea y1={23} y2={46} fill="#fef9c3" fillOpacity={0.7} />
            <ReferenceArea y1={46} y2={70} fill="#fee2e2" fillOpacity={0.7} />

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 70]}
              ticks={[0, 23, 46, 70]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<ChartTooltip />} />

            <Line
              type="monotone"
              dataKey="score"
              stroke="#028090"
              strokeWidth={2.5}
              dot={(props) => (
                <TieredDot
                  key={(props as { payload?: TrajectoryPoint }).payload?.sessionId}
                  {...(props as Parameters<typeof TieredDot>[0])}
                  onClick={handleDotClick}
                />
              )}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Session list */}
      <div className="seed-card">
        <h4 className="text-xs font-semibold text-seed-muted uppercase tracking-wide mb-3">
          Session History — {detail.child.name}
        </h4>
        <div className="space-y-1.5">
          {[...data].reverse().map(pt => (
            <SessionRow
              key={pt.sessionId}
              pt={pt}
              onClick={(id) => navigate(`/clinician/session/${id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
