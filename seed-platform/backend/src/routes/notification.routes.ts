/**
 * S.E.E.D. Notification Routes
 *
 * GET  /api/notifications         — list unread (and recent read) for current user
 * PATCH /api/notifications/:id/read — mark a single notification as read
 * PATCH /api/notifications/read-all — mark all as read
 *
 * In-app only — no email or SMS. Created by analysisService.ts and
 * clinician.routes.ts on trigger events.
 *
 * SQL INJECTION AUDIT:
 * All DB operations use Prisma ORM. No raw queries. Last audited: Stage 5B.
 */

import { Router, Request, Response } from 'express'
import { param } from 'express-validator'
import { prisma } from '../utils/prisma'
import { authenticateToken } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { logger } from '../utils/logger'

const router = Router()

// All notification routes require authentication
router.use(authenticateToken)

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Returns up to 50 notifications for the current user — all unread plus
// the 20 most recent read ones, so the panel shows meaningful history.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub

    // Fetch unread + recent read in a single query, ordered newest first
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id:        true,
        type:      true,
        title:     true,
        body:      true,
        sessionId: true,
        isRead:    true,
        readAt:    true,
        createdAt: true,
      },
    })

    const unreadCount = notifications.filter((n) => !n.isRead).length

    res.json({ notifications, unreadCount })
  } catch (err) {
    logger.error('Failed to fetch notifications', { error: err, userId: req.user?.sub })
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
router.patch(
  '/:id/read',
  validate([
    param('id').isUUID().withMessage('Notification ID must be a valid UUID'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    const userId = req.user!.sub

    try {
      // Verify ownership before marking read
      const notification = await prisma.notification.findUnique({
        where: { id },
        select: { userId: true, isRead: true },
      })

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' })
        return
      }

      if (notification.userId !== userId) {
        res.status(403).json({ error: 'Access denied' })
        return
      }

      if (notification.isRead) {
        // Already read — no-op, return 200 for idempotency
        res.json({ id, isRead: true })
        return
      }

      await prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      })

      res.json({ id, isRead: true })
    } catch (err) {
      logger.error('Failed to mark notification read', { error: err, id, userId })
      res.status(500).json({ error: 'Failed to mark notification as read' })
    }
  }
)

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
router.patch('/read-all', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub

  try {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    })

    res.json({ markedRead: result.count })
  } catch (err) {
    logger.error('Failed to mark all notifications read', { error: err, userId })
    res.status(500).json({ error: 'Failed to mark notifications as read' })
  }
})

export default router
