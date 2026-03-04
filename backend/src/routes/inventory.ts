import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { authenticate, authorize, auditLog, type AuthenticatedRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

export const inventoryRouter = Router()
inventoryRouter.use(authenticate)

// GET /api/inventory - get all branch inventories (managers see all, branch users see own)
inventoryRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { branchId, lowStock, page = '1', limit = '100' } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const effectiveBranchId = req.user!.role === 'BRANCH_USER' ? req.user!.branchId! : branchId

    const where: Record<string, unknown> = {}
    if (effectiveBranchId) where.branchId = effectiveBranchId
    if (lowStock === 'true') {
      where.product = { isActive: true }
      // Will filter after fetching since Prisma doesn't support cross-field comparison directly
    }

    const [inventory, total] = await Promise.all([
      prisma.branchInventory.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          product: { select: { id:true, sku:true, name:true, nameAr:true, barcode:true, reorderLevel:true, costPrice:true, sellPrice:true, unit:true, unitAr:true, imageUrl:true } },
          branch: { select: { id:true, name:true, nameAr:true, code:true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.branchInventory.count({ where }),
    ])

    const filtered = lowStock === 'true'
      ? inventory.filter(i => i.quantity <= i.product.reorderLevel)
      : inventory

    res.json({ inventory: filtered, total, page: parseInt(page), limit: parseInt(limit) })
  } catch(err){ next(err) }
})

// GET /api/inventory/:branchId/:productId
inventoryRouter.get('/:branchId/:productId', async (req, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.branchInventory.findUniqueOrThrow({
      where: { branchId_productId: { branchId: req.params.branchId, productId: req.params.productId } },
      include: {
        product: true,
        branch: { select: { id:true, name:true, nameAr:true } },
      },
    })
    res.json({ inventory: item })
  } catch(err){ next(err) }
})

// POST /api/inventory/adjust - Manual adjustment
inventoryRouter.post('/adjust', authorize('GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      branchId: z.string().uuid(),
      productId: z.string().uuid(),
      quantity: z.number().int(),
      reason: z.string().min(3),
    })
    const { branchId, productId, quantity, reason } = schema.parse(req.body)

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.branchInventory.findUnique({
        where: { branchId_productId: { branchId, productId } },
      })

      const inv = await tx.branchInventory.upsert({
        where: { branchId_productId: { branchId, productId } },
        update: { quantity: { increment: quantity } },
        create: { branchId, productId, quantity: Math.max(0, quantity) },
      })

      // Create an adjustment transaction record
      const product = await tx.product.findUniqueOrThrow({ where: { id: productId } })
      await tx.transaction.create({
        data: {
          type: 'ADJUSTMENT',
          branchId,
          userId: req.user!.id,
          notes: reason,
          totalAmount: 0,
          items: {
            create: [{
              productId,
              quantity,
              unitPrice: product.costPrice,
              totalPrice: product.costPrice,
            }],
          },
        },
      })

      return { inv, previous: existing?.quantity ?? 0 }
    })

    await auditLog(req.user!.id, 'ADJUST_INVENTORY', 'BranchInventory', `${branchId}:${productId}`, { quantity: result.previous }, { quantity: result.inv.quantity }, req)
    res.json({ inventory: result.inv, previous: result.previous })
  } catch(err){ next(err) }
})

// GET /api/inventory/summary/all - Dashboard summary
inventoryRouter.get('/summary/all', authorize('GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'), async (_req, res: Response, next: NextFunction) => {
  try {
    const [totalProducts, totalBranches, lowStockItems, totalInventoryValue] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.branch.count({ where: { isActive: true } }),
      prisma.branchInventory.findMany({
        include: { product: { select: { reorderLevel: true, costPrice: true } } },
      }).then(items => items.filter(i => i.quantity <= i.product.reorderLevel).length),
      prisma.branchInventory.findMany({
        include: { product: { select: { costPrice: true } } },
      }).then(items => items.reduce((sum, i) => sum + i.quantity * Number(i.product.costPrice), 0)),
    ])

    // Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        branch: { select: { name: true, nameAr: true } },
        items: { take: 1, include: { product: { select: { name: true, nameAr: true } } } },
      },
    })

    res.json({ totalProducts, totalBranches, lowStockItems, totalInventoryValue, recentTransactions })
  } catch(err){ next(err) }
})
