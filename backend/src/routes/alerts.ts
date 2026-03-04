import { Router, Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js'

export const alertRouter = Router()
alertRouter.use(authenticate)

// GET /api/alerts
alertRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { unread, branchId, limit = '20' } = req.query as Record<string, string>
    const effectiveBranchId = req.user!.role === 'BRANCH_USER' ? req.user!.branchId : branchId

    const where: Record<string, unknown> = {}
    if (effectiveBranchId) where.branchId = effectiveBranchId
    if (unread === 'true') where.isRead = false

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: parseInt(limit),
      }),
      prisma.alert.count({ where }),
    ])

    res.json({ alerts, total, unreadCount: alerts.filter(a => !a.isRead).length })
  } catch(err){ next(err) }
})

// PUT /api/alerts/:id/read
alertRouter.put('/:id/read', async (req, res: Response, next: NextFunction) => {
  try {
    await prisma.alert.update({ where: { id: req.params.id }, data: { isRead: true, readAt: new Date() } })
    res.json({ message: 'Alert marked as read' })
  } catch(err){ next(err) }
})

// PUT /api/alerts/read-all
alertRouter.put('/read-all', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const effectiveBranchId = req.user!.role === 'BRANCH_USER' ? req.user!.branchId : undefined
    await prisma.alert.updateMany({
      where: { isRead: false, ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}) },
      data: { isRead: true, readAt: new Date() },
    })
    res.json({ message: 'All alerts marked as read' })
  } catch(err){ next(err) }
})
