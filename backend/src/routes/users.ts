import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { authenticate, authorize, auditLog, type AuthenticatedRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

export const userRouter = Router()
userRouter.use(authenticate)

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  nameAr: z.string().optional(),
  phone: z.string().optional(),
  branchId: z.string().uuid().nullable().optional(),
  role: z.enum(['GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER','BRANCH_USER','AUDITOR']).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/users
userRouter.get('/', authorize('GENERAL_MANAGER','DEPUTY_MANAGER'), async (_req, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: { id:true, email:true, name:true, nameAr:true, role:true, isActive:true, branchId:true, phone:true, createdAt:true,
        branch: { select: { id:true, name:true, nameAr:true } }
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ users })
  } catch(err){ next(err) }
})

// GET /api/users/:id
userRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    // Users can only see themselves unless manager
    if (req.user!.id !== id && !['GENERAL_MANAGER','DEPUTY_MANAGER'].includes(req.user!.role)) {
      throw new AppError('Forbidden', 403)
    }
    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { id:true, email:true, name:true, nameAr:true, role:true, isActive:true, branchId:true, phone:true, createdAt:true,
        branch: { select: { id:true, name:true, nameAr:true } }
      },
    })
    res.json({ user })
  } catch(err){ next(err) }
})

// PUT /api/users/:id
userRouter.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const isManager = ['GENERAL_MANAGER','DEPUTY_MANAGER'].includes(req.user!.role)
    if (req.user!.id !== id && !isManager) throw new AppError('Forbidden', 403)

    const data = updateSchema.parse(req.body)
    // Non-managers cannot change role or branchId
    if (!isManager) { delete data.role; delete data.branchId; delete data.isActive }

    const old = await prisma.user.findUniqueOrThrow({ where: { id } })
    const user = await prisma.user.update({
      where: { id }, data,
      select: { id:true, email:true, name:true, nameAr:true, role:true, isActive:true, branchId:true },
    })
    await auditLog(req.user!.id, 'UPDATE_USER', 'User', id, old, user, req)
    res.json({ user })
  } catch(err){ next(err) }
})

// DELETE /api/users/:id
userRouter.delete('/:id', authorize('GENERAL_MANAGER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    if (id === req.user!.id) throw new AppError('Cannot delete yourself', 400)
    await prisma.user.update({ where: { id }, data: { isActive: false } })
    await auditLog(req.user!.id, 'DEACTIVATE_USER', 'User', id, undefined, undefined, req)
    res.json({ message: 'User deactivated' })
  } catch(err){ next(err) }
})
