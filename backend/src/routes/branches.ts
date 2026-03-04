import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { authenticate, authorize, auditLog, type AuthenticatedRequest } from '../middleware/auth.js'

export const branchRouter = Router()
branchRouter.use(authenticate)

const branchSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(2),
  nameAr: z.string().min(2),
  address: z.string().optional(),
  addressAr: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isMainBranch: z.boolean().optional(),
})

// GET /api/branches
branchRouter.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      include: { _count: { select: { users: true, inventory: true } } },
      orderBy: { name: 'asc' },
    })
    res.json({ branches })
  } catch(err){ next(err) }
})

// GET /api/branches/:id
branchRouter.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const branch = await prisma.branch.findUniqueOrThrow({
      where: { id },
      include: {
        users: { select: { id:true, name:true, role:true, isActive:true } },
        _count: { select: { inventory: true } },
      },
    })
    res.json({ branch })
  } catch(err){ next(err) }
})

// POST /api/branches
branchRouter.post('/', authorize('GENERAL_MANAGER','DEPUTY_MANAGER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = branchSchema.parse(req.body)
    const branch = await prisma.branch.create({ data })
    await auditLog(req.user!.id, 'CREATE_BRANCH', 'Branch', branch.id, undefined, data, req)
    res.status(201).json({ branch })
  } catch(err){ next(err) }
})

// PUT /api/branches/:id
branchRouter.put('/:id', authorize('GENERAL_MANAGER','DEPUTY_MANAGER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const data = branchSchema.partial().parse(req.body)
    const old = await prisma.branch.findUniqueOrThrow({ where: { id } })
    const branch = await prisma.branch.update({ where: { id }, data })
    await auditLog(req.user!.id, 'UPDATE_BRANCH', 'Branch', id, old, branch, req)
    res.json({ branch })
  } catch(err){ next(err) }
})

// DELETE /api/branches/:id (soft delete)
branchRouter.delete('/:id', authorize('GENERAL_MANAGER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    await prisma.branch.update({ where: { id }, data: { isActive: false } })
    await auditLog(req.user!.id, 'DEACTIVATE_BRANCH', 'Branch', id, undefined, undefined, req)
    res.json({ message: 'Branch deactivated' })
  } catch(err){ next(err) }
})

