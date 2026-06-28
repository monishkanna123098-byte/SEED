/**
 * S.E.E.D. Admin — System Health
 * Route: /admin/system
 *
 * Five status cards, each polling their own REST endpoint every 30 s.
 * Architecture: setInterval on mount, cleared on unmount.
 * On fetch failure: keep previous status, only update lastChecked —
 *   so demo shows the seeded states and real deployments show live data.
 *
 * VITE_ANALYSIS_ENGINE_URL must be set in .env.
 * Never hardcode localhost — the analysis engine runs on a different
 * host than the API server in any real deployment.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle, Circle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'loading'

interface ServiceState {
  status:      ServiceStatus
  responseMs?: number
  lastChecked: Date | null
  details?:    Record<string, unknown>
  error?:      string
}

interface ServicesState {
  api:      ServiceState
  analysis: ServiceState
  db:       ServiceState
  redis:    ServiceState
  queue:    ServiceState
}

interface ErrorLogEntry {
  id:        string
  timestamp: string
  route:     string
  message:   string
  userId:    string | null
  resolved:  boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Set VITE_ANALYSIS_ENGINE_URL in .env.
 * Falls back to empty string — checks will fail gracefully if unset.
 */
const ANALYSIS_ENGINE_URL: string =
  (import.meta.env.VITE_ANALYSIS_ENGINE_URL as string | undefined) ?? ''

const POLL_MS = 30_000

// ─── Seeded initial state (demo: healthy / degraded / down mix) ───────────────
//
// Scenario: Redis pod restarted; analysis engine is slow; queue workers
// lost Redis connection and are accumulating waiting jobs.

const INITIAL_STATE: ServicesState = {
  api: {
    status: 'healthy',
    responseMs: 45,
    lastChecked: new Date(),
    details: { uptime_s: 604800, version: '1.4.2' },
  },
  analysis: {
    status: 'degraded',
    responseMs: 1240,
    lastChecked: new Date(),
    details: { model_loaded: true, auc: 0.89 },
    error: 'Response time > 1000 ms — possible GPU saturation',
  },
  db: {
    status: 'healthy',
    lastChecked: new Date(),
    details: { active: 3, pool_size: 10, wait_count: 0, idle: 7 },
  },
  redis: {
    status: 'down',
    lastChecked: new Date(),
    error: 'ECONNREFUSED 127.0.0.1:6379',
  },
  queue: {
    status: 'degraded',
    lastChecked: new Date(),
    details: { waiting: 12, active: 0, completed: 847, failed: 3 },
    error: 'Workers cannot connect to Redis — jobs accumulating',
  },
}

// ─── Seeded error log (12 entries) ───────────────────────────────────────────

const SEED_ERROR_LOG: ErrorLogEntry[] = [
  { id:'e01', timestamp:'2026-06-22T09:14:33Z', route:'POST /api/screening/upload-video', message:'Multer: File size limit exceeded (128 MB)',         userId:'p09', resolved:false },
  { id:'e02', timestamp:'2026-06-22T08:47:11Z', route:'GET /api/clinician/dashboard',     message:'Prisma query timeout (5021 ms)',                     userId:'c02', resolved:false },
  { id:'e03', timestamp:'2026-06-22T07:33:05Z', route:'POST /api/auth/login',             message:'Too many requests — IP rate limit hit (100/15 min)', userId:null,  resolved:false },
  { id:'e04', timestamp:'2026-06-21T22:15:44Z', route:'POST /analyze/game',               message:'Analysis Engine HTTP 503 Service Unavailable',       userId:null,  resolved:false },
  { id:'e05', timestamp:'2026-06-21T20:44:28Z', route:'GET /api/screening/status',        message:'Redis connection refused — ECONNREFUSED 6379',        userId:'c01', resolved:false },
  { id:'e06', timestamp:'2026-06-21T18:30:02Z', route:'POST /api/admin/queue-stats',      message:'Bull: ECONNREFUSED redis:6379',                       userId:'a01', resolved:false },
  { id:'e07', timestamp:'2026-06-21T16:12:19Z', route:'GET /api/children',               message:'Prisma: Record not found (P2025)',                    userId:'p04', resolved:true  },
  { id:'e08', timestamp:'2026-06-21T14:55:47Z', route:'POST /api/screening/start',        message:'JsonWebTokenError: jwt expired',                      userId:'p12', resolved:true  },
  { id:'e09', timestamp:'2026-06-21T12:00:33Z', route:'GET /api/clinician/patients',      message:"TypeError: Cannot read properties of undefined ('map')", userId:'c04', resolved:true  },
  { id:'e10', timestamp:'2026-06-20T22:30:55Z', route:'POST /analyze/video',              message:'CUDA out of memory: 12.0 GB allocated',               userId:null,  resolved:true  },
  { id:'e11', timestamp:'2026-06-20T18:15:09Z', route:'GET /api/auth/me',                message:'JsonWebTokenError: invalid signature',                 userId:'p07', resolved:true  },
  { id:'e12', timestamp:'2026-06-20T09:45:22Z', route:'POST /api/screening/upload-video', message:'S3 PutObject: Access Denied — check IAM policy',      userId:null,  resolved:true  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleTimeString('en-IN', { hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ServiceStatus, {
  label: string; dot: string; badge: string; ring: string
}> = {
  healthy:  { label:'Healthy',    dot:'bg-emerald-500', badge:'bg-emerald-100 text-emerald-700', ring:'border-emerald-200' },
  degraded: { label:'Degraded',   dot:'bg-amber-500',   badge:'bg-amber-100 text-amber-700',     ring:'border-amber-200'   },
  down:     { label:'Down',       dot:'bg-red-500',     badge:'bg-red-100 text-red-700',         ring:'border-red-200'     },
  loading:  { label:'Checking…',  dot:'bg-slate-400 animate-pulse', badge:'bg-slate-100 text-slate-500', ring:'border-slate-200' },
}

// ─── Per-service check functions ─────────────────────────────────────────────
//
// Each returns Partial<ServiceState>:
//   — on success: full new state
//   — on failure: { lastChecked } only — caller merges with prev (status unchanged)

async function checkApiServer(): Promise<Partial<ServiceState>> {
  const t0 = Date.now()
  try {
    const res = await fetchWithTimeout('/api/health')
    const ms  = Date.now() - t0
    if (!res.ok) return { status: 'degraded', responseMs: ms, lastChecked: new Date(), error: `HTTP ${res.status}` }
    const data = await res.json() as Record<string, unknown>
    return { status: ms < 500 ? 'healthy' : 'degraded', responseMs: ms, lastChecked: new Date(), details: data }
  } catch {
    return { lastChecked: new Date() }
  }
}

async function checkAnalysis(): Promise<Partial<ServiceState>> {
  if (!ANALYSIS_ENGINE_URL) {
    return { status: 'down', lastChecked: new Date(), error: 'VITE_ANALYSIS_ENGINE_URL not set' }
  }
  const t0 = Date.now()
  try {
    const res = await fetchWithTimeout(`${ANALYSIS_ENGINE_URL}/health`)
    const ms  = Date.now() - t0
    if (!res.ok) return { status: 'down', responseMs: ms, lastChecked: new Date(), error: `HTTP ${res.status}` }
    const data = await res.json() as Record<string, unknown>
    const status: ServiceStatus = ms > 1000 ? 'degraded' : 'healthy'
    return { status, responseMs: ms, lastChecked: new Date(), details: data,
      error: ms > 1000 ? `Response time ${ms} ms > 1000 ms threshold` : undefined }
  } catch {
    return { lastChecked: new Date() }
  }
}

async function checkDatabase(): Promise<Partial<ServiceState>> {
  try {
    const res = await fetchWithTimeout('/api/admin/db-stats')
    if (!res.ok) return { status: 'degraded', lastChecked: new Date(), error: `HTTP ${res.status}` }
    const data = await res.json() as Record<string, unknown>
    const active = (data.active as number) ?? 0
    const pool   = (data.pool_size as number) ?? 10
    const status: ServiceStatus = active / pool > 0.9 ? 'degraded' : 'healthy'
    return { status, lastChecked: new Date(), details: data,
      error: status === 'degraded' ? 'Connection pool > 90% utilised' : undefined }
  } catch {
    return { lastChecked: new Date() }
  }
}

async function checkRedis(): Promise<Partial<ServiceState>> {
  const t0 = Date.now()
  try {
    const res = await fetchWithTimeout('/api/admin/redis-ping')
    const ms  = Date.now() - t0
    if (!res.ok) return { status: 'down', lastChecked: new Date(), error: 'Unreachable' }
    return { status: ms < 50 ? 'healthy' : 'degraded', responseMs: ms, lastChecked: new Date() }
  } catch {
    return { lastChecked: new Date() }
  }
}

async function checkQueue(): Promise<Partial<ServiceState>> {
  try {
    const res = await fetchWithTimeout('/api/admin/queue-stats')
    if (!res.ok) return { status: 'degraded', lastChecked: new Date(), error: `HTTP ${res.status}` }
    const data = await res.json() as { waiting: number; active: number; completed: number; failed: number }
    const status: ServiceStatus =
      data.failed > 10 || (data.waiting > 20 && data.active === 0) ? 'degraded' : 'healthy'
    return { status, lastChecked: new Date(), details: { ...data } }
  } catch {
    return { lastChecked: new Date() }
  }
}

// ─── Status Card ──────────────────────────────────────────────────────────────

function StatusCard({ title, icon, state, children }: {
  title:    string
  icon:     React.ReactNode
  state:    ServiceState
  children: React.ReactNode
}) {
  const cfg = STATUS_CFG[state.status]

  return (
    <div className={`seed-card border ${cfg.ring} flex flex-col gap-3`}>
      {/* Card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-seed-muted">{icon}</span>
          <span className="font-semibold text-seed-dark text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Metric content */}
      <div className="flex-1">{children}</div>

      {/* Error note */}
      {state.error && state.status !== 'healthy' && (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 leading-snug">
          {state.error}
        </p>
      )}

      {/* Last checked */}
      <p className="text-[10px] text-slate-400 text-right">
        Checked {fmtTime(state.lastChecked)}
      </p>
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] text-seed-muted uppercase tracking-wide">{label}</p>
      <p className="text-lg font-extrabold text-seed-dark leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-seed-muted">{sub}</p>}
    </div>
  )
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function Ico({ d, size = 5 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      className={`w-${size} h-${size}`}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Error log ────────────────────────────────────────────────────────────────

function ErrorLog() {
  const [entries] = useState<ErrorLogEntry[]>(SEED_ERROR_LOG)
  const [hiddenResolved, setHiddenResolved] = useState(false)

  const visible = hiddenResolved
    ? entries.filter(e => !e.resolved)
    : entries

  const resolvedCount = entries.filter(e => e.resolved).length

  return (
    <div className="seed-card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-seed-dark">Recent Error Log</h3>
          <p className="text-xs text-seed-muted mt-0.5">
            Last {entries.length} events ·{' '}
            <span className={resolvedCount > 0 ? 'text-emerald-600' : 'text-seed-muted'}>
              {resolvedCount} resolved
            </span>
            {' · '}
            <span className="text-amber-600">
              {entries.filter(e => !e.resolved).length} open
            </span>
          </p>
        </div>

        <button
          onClick={() => setHiddenResolved(v => !v)}
          disabled={resolvedCount === 0}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all
                      disabled:opacity-40 disabled:cursor-not-allowed ${
            hiddenResolved
              ? 'border-seed-teal/50 text-seed-teal bg-seed-teal/5'
              : 'border-slate-200 text-seed-muted hover:border-slate-300'
          }`}
        >
          {hiddenResolved ? 'Show resolved' : 'Hide resolved'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Timestamp', 'Route', 'Error Message', 'User ID', 'Status'].map(col => (
                <th key={col}
                  className="px-4 py-2.5 text-left text-[11px] font-semibold
                             text-seed-muted uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(e => (
              <tr key={e.id}
                className={`border-b border-slate-50 transition-colors ${
                  e.resolved ? 'opacity-60 hover:opacity-100' : 'hover:bg-red-50/30'
                }`}
              >
                <td className="px-4 py-3 text-xs text-seed-muted whitespace-nowrap">
                  {fmtTimestamp(e.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs font-mono text-seed-navy bg-slate-100
                                    px-1.5 py-0.5 rounded whitespace-nowrap">
                    {e.route}
                  </code>
                </td>
                <td className="px-4 py-3 text-xs text-seed-dark max-w-xs">
                  <span className="line-clamp-2">{e.message}</span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {e.userId
                    ? <code className="font-mono text-violet-700 bg-violet-50
                                       px-1.5 py-0.5 rounded">{e.userId}</code>
                    : <span className="text-slate-400 italic">system</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {e.resolved
                    ? <span className="text-xs font-semibold text-emerald-600
                                       bg-emerald-50 px-2 py-0.5 rounded-full">Resolved</span>
                    : <span className="text-xs font-semibold text-red-600
                                       bg-red-50 px-2 py-0.5 rounded-full">Open</span>
                  }
                </td>
              </tr>
            ))}

            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-seed-muted">
                  <div className="flex justify-center mb-2"><CheckCircle className="text-seed-mint" size={28} /></div>
                  No open errors to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SystemHealthPage() {
  const [services, setServices] = useState<ServicesState>(INITIAL_STATE)
  const [polling,  setPolling]  = useState(false)
  const [lastPoll, setLastPoll] = useState<Date | null>(new Date())

  // Merge partial update into services state
  const merge = useCallback((
    key: keyof ServicesState,
    patch: Partial<ServiceState>
  ) => {
    setServices(prev => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }, [])

  const pollAll = useCallback(async () => {
    setPolling(true)
    setLastPoll(new Date())

    await Promise.allSettled([
      checkApiServer().then(p => merge('api',      p)),
      checkAnalysis().then(p  => merge('analysis', p)),
      checkDatabase().then(p  => merge('db',       p)),
      checkRedis().then(p     => merge('redis',    p)),
      checkQueue().then(p     => merge('queue',    p)),
    ])

    setPolling(false)
  }, [merge])

  // Mount: immediate poll + 30s interval
  useEffect(() => {
    // Run immediately but don't change existing mock state on failures (handled in checkX)
    pollAll()

    const id = setInterval(pollAll, POLL_MS)
    return () => clearInterval(id)    // ← required cleanup
  }, [pollAll])

  // Overall platform status
  const overallStatus: ServiceStatus =
    Object.values(services).some(s => s.status === 'down')     ? 'down'
    : Object.values(services).some(s => s.status === 'degraded') ? 'degraded'
    : 'healthy'

  const overallCfg = STATUS_CFG[overallStatus]

  // Uptime display
  const uptimeSec = (services.api.details?.uptime_s as number | undefined) ?? 0
  const uptimeStr = uptimeSec
    ? `${Math.floor(uptimeSec / 86400)}d ${Math.floor((uptimeSec % 86400) / 3600)}h`
    : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="p-6 max-w-7xl space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-seed-dark">System Health</h1>
          <p className="text-sm text-seed-muted mt-0.5">
            Polling every 30 s · Last refreshed {fmtTime(lastPoll)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Overall status banner */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${overallCfg.ring}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${overallCfg.dot}`} />
            <span className={`text-sm font-semibold ${
              overallStatus === 'healthy' ? 'text-emerald-700'
              : overallStatus === 'degraded' ? 'text-amber-700'
              : 'text-red-700'
            }`}>
              Platform {overallCfg.label}
            </span>
          </div>

          {/* Manual refresh */}
          <button
            onClick={() => pollAll()}
            disabled={polling}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200
                       text-sm text-seed-muted hover:border-seed-teal/50 hover:text-seed-teal
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className={`w-4 h-4 ${polling ? 'animate-spin' : ''}`}>
              <polyline points="23 4 23 10 17 10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {polling ? 'Checking…' : 'Refresh now'}
          </button>
        </div>
      </div>

      {/* Env var warning */}
      {!ANALYSIS_ENGINE_URL && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200
                        rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p>
            <strong>VITE_ANALYSIS_ENGINE_URL</strong> is not set in your environment.
            Analysis Engine health checks will show the last known state.
            Set this variable in <code className="font-mono text-xs">.env</code> to enable live checks.
          </p>
        </div>
      )}

      {/* Status cards — 5 in a responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* 1 — API Server */}
        <StatusCard title="API Server" state={services.api}
          icon={<Ico d="M5 12h14M12 5l7 7-7 7" />}>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Response time" value={services.api.responseMs != null ? `${services.api.responseMs} ms` : '—'} />
            <Metric label="Uptime" value={uptimeStr} />
          </div>
        </StatusCard>

        {/* 2 — Analysis Engine */}
        <StatusCard title="Analysis Engine" state={services.analysis}
          icon={<Ico d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />}>
          <div className="grid grid-cols-2 gap-3">
            <Metric
              label="Response time"
              value={services.analysis.responseMs != null ? `${services.analysis.responseMs} ms` : '—'}
              sub={services.analysis.responseMs != null && services.analysis.responseMs > 1000 ? 'Above 1 s threshold' : undefined}
            />
            <Metric
              label="Model loaded"
              value={(services.analysis.details?.model_loaded as boolean | undefined) === false ? 'No' : 'Yes'}
            />
          </div>
          {!ANALYSIS_ENGINE_URL && (
            <p className="text-[11px] text-slate-400 mt-2">
              URL: <code className="font-mono">VITE_ANALYSIS_ENGINE_URL</code>
            </p>
          )}
        </StatusCard>

        {/* 3 — Database */}
        <StatusCard title="Database" state={services.db}
          icon={<Ico d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />}>
          {services.db.details ? (() => {
            const d = services.db.details
            const active    = d.active as number
            const poolSize  = d.pool_size as number
            const pct       = Math.round((active / poolSize) * 100)
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-seed-muted">Active connections</span>
                  <span className="font-bold text-seed-dark">{active} / {poolSize}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-amber-400' : 'bg-seed-teal'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-seed-muted">Idle</span>
                  <span className="font-semibold text-emerald-600">{d.idle as number} free</span>
                </div>
              </div>
            )
          })() : (
            <p className="text-sm text-seed-muted">Awaiting data…</p>
          )}
        </StatusCard>

        {/* 4 — Redis */}
        <StatusCard title="Redis" state={services.redis}
          icon={<Ico d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />}>
          {services.redis.status === 'down' ? (
            <div className="flex items-center gap-2 text-red-600">
              <Circle size={14} className="fill-red-500 text-red-500" />
              <span className="text-sm font-semibold">Unreachable</span>
            </div>
          ) : (
            <Metric
              label="Ping latency"
              value={services.redis.responseMs != null ? `${services.redis.responseMs} ms` : '—'}
              sub={services.redis.responseMs != null && services.redis.responseMs < 10 ? 'Excellent' : 'Within threshold'}
            />
          )}
        </StatusCard>

        {/* 5 — Job Queue */}
        <StatusCard title="Job Queue" state={services.queue}
          icon={<Ico d="M4 6h16M4 10h16M4 14h16M4 18h16" />}>
          {services.queue.details ? (() => {
            const d = services.queue.details as { waiting: number; active: number; completed: number; failed: number }
            return (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Metric label="Waiting"   value={String(d.waiting)}
                  sub={d.waiting > 10 ? 'High queue depth' : undefined} />
                <Metric label="Active"    value={String(d.active)} />
                <Metric label="Completed" value={d.completed.toLocaleString()} />
                <Metric label="Failed"    value={String(d.failed)}
                  sub={d.failed > 0 ? 'Review logs' : undefined} />
              </div>
            )
          })() : (
            <p className="text-sm text-seed-muted">Awaiting data…</p>
          )}
        </StatusCard>

      </div>

      {/* Error log */}
      <ErrorLog />

      <p className="text-xs text-seed-muted text-center italic pb-2">
        Screening tool only. Not a diagnostic instrument. Clinical confirmation required.
      </p>
    </motion.div>
  )
}
