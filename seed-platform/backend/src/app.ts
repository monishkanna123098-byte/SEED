import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { Server as SocketIOServer } from 'socket.io'
import { logger } from './utils/logger'
import authRoutes from './routes/auth.routes'
import screeningRoutes from './routes/screening.routes'
import clinicianRoutes from './routes/clinician.routes'

const app = express()
const httpServer = http.createServer(app)

// ─── Socket.io ─────────────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})

io.on('connection', (socket) => {
  logger.debug('Socket connected', { socketId: socket.id })

  // Client subscribes to job updates for a specific analysis job
  socket.on('subscribe:job', (jobId: string) => {
    if (typeof jobId === 'string' && jobId.length < 100) {
      socket.join(`job:${jobId}`)
      logger.debug('Socket subscribed to job', { socketId: socket.id, jobId })
    }
  })

  socket.on('disconnect', () => {
    logger.debug('Socket disconnected', { socketId: socket.id })
  })
})

// ─── Security & Core Middleware ────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}))

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// HTTP request logging (skip in test env)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }))
}

// ─── Global Rate Limiting ──────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Strict limit on auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
})

app.use('/api', globalLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/clinician', authRoutes)
app.use('/api/clinician', clinicianRoutes)
app.use('/api/screening', screeningRoutes)

// Health check — used by Docker and analysis engine
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'seed-backend',
    timestamp: new Date().toISOString(),
  })
})

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack })
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  })
})

export { app, httpServer }
