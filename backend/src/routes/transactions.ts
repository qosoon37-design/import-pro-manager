import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { authenticate, authorize, auditLog, type AuthenticatedRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

export const transactionRouter = Router()
transactionRouter.use(authenticate)

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
})

const transactionSchema = z.object({
  type: z.enum(['PURCHASE','SALE','TRANSFER_IN','TRANSFER_OUT','DAMAGE','ADJUSTMENT']),
  branchId: z.string().uuid(),
  toBranchId: z.string().uuid().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  notesAr: z.string().optional(),
  items: z.array(itemSchema).min(1),
})

// GET /api/transactions
transactionRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { branchId, type, page = '1', limit = '50', from, to } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const effectiveBranchId = req.user!.role === 'BRANCH_USER' ? req.user!.branchId! : branchId

    const where: Record<string, unknown> = {}
    if (effectiveBranchId) where.branchId = effectiveBranchId
    if (type) where.type = type
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { id:true, name:true } },
          branch: { select: { id:true, name:true, nameAr:true } },
          items: { include: { product: { select: { id:true, sku:true, name:true, nameAr:true, unit:true } } } },
          transfer: { include: {
            fromBranch: { select: { name:true, nameAr:true } },
            toBranch: { select: { name:true, nameAr:true } },
          }},
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ])

    res.json({ transactions, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) })
  } catch(err){ next(err) }
})

// POST /api/transactions
transactionRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = transactionSchema.parse(req.body)

    // Role checks
    const user = req.user!
    if (data.type === 'PURCHASE' && !['GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'].includes(user.role)) {
      throw new AppError('Only warehouse managers can record purchases', 403)
    }
    if (data.type === 'DAMAGE' && !['GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER','BRANCH_USER'].includes(user.role)) {
      throw new AppError('Insufficient permissions for damage report', 403)
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get product prices
      const productIds = data.items.map(i => i.productId)
      const products = await tx.product.findMany({ where: { id: { in: productIds } } })
      const productMap = Object.fromEntries(products.map(p => [p.id, p]))

      // Check branch price overrides
      const overrides = await tx.branchPriceOverride.findMany({
        where: { branchId: data.branchId, productId: { in: productIds } },
      })
      const overrideMap = Object.fromEntries(overrides.map(o => [o.productId, o]))

      const items = data.items.map(item => {
        const product = productMap[item.productId]
        if (!product) throw new AppError(`Product ${item.productId} not found`, 404)
        const override = overrideMap[item.productId]
        const price = item.unitPrice ?? Number(override?.sellPrice ?? product.sellPrice)
        return { ...item, unitPrice: price, totalPrice: price * item.quantity }
      })

      const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0)

      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          type: data.type as string as Parameters<typeof tx.transaction.create>[0]['data']['type'],
          branchId: data.branchId,
          userId: user.id,
          reference: data.reference,
          notes: data.notes,
          notesAr: data.notesAr,
          totalAmount,
          items: { create: items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            serialNumber: i.serialNumber,
            notes: i.notes,
          })) },
        },
      })

      // Update inventory
      for (const item of items) {
        const delta =
          ['PURCHASE','TRANSFER_IN'].includes(data.type) ? item.quantity :
          ['SALE','TRANSFER_OUT','DAMAGE'].includes(data.type) ? -item.quantity : 0

        if (delta !== 0) {
          await tx.branchInventory.upsert({
            where: { branchId_productId: { branchId: data.branchId, productId: item.productId } },
            update: { quantity: { increment: delta } },
            create: { branchId: data.branchId, productId: item.productId, quantity: Math.max(0, delta) },
          })
        }
      }

      // Handle transfer record
      if (data.type === 'TRANSFER_OUT' && data.toBranchId) {
        await tx.transfer.create({
          data: {
            transactionId: transaction.id,
            fromBranchId: data.branchId,
            toBranchId: data.toBranchId,
          },
        })
        // Create corresponding TRANSFER_IN for receiving branch
        const inTx = await tx.transaction.create({
          data: {
            type: 'TRANSFER_IN',
            branchId: data.toBranchId,
            userId: user.id,
            notes: `Transfer from: ${data.notes || transaction.id}`,
            totalAmount,
            items: { create: items.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
            })) },
          },
        })
        // Add inventory to destination
        for (const item of items) {
          await tx.branchInventory.upsert({
            where: { branchId_productId: { branchId: data.toBranchId!, productId: item.productId } },
            update: { quantity: { increment: item.quantity } },
            create: { branchId: data.toBranchId!, productId: item.productId, quantity: item.quantity },
          })
        }
        await tx.transfer.update({ where: { transactionId: transaction.id }, data: { status: 'received' } })
        return { transaction, inboundTransaction: inTx }
      }

      // Check for low-stock alerts
      for (const item of items) {
        const inv = await tx.branchInventory.findUnique({
          where: { branchId_productId: { branchId: data.branchId, productId: item.productId } },
          include: { product: { select: { reorderLevel: true, name:true, nameAr:true } } },
        })
        if (inv && inv.quantity <= inv.product.reorderLevel) {
          await tx.alert.create({
            data: {
              type: inv.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
              severity: inv.quantity === 0 ? 'CRITICAL' : 'WARNING',
              title: `Low Stock: ${inv.product.name}`,
              titleAr: `مخزون منخفض: ${inv.product.nameAr}`,
              message: `Quantity ${inv.quantity} is at or below reorder level ${inv.product.reorderLevel}`,
              messageAr: `الكمية ${inv.quantity} وصلت أو تجاوزت حد إعادة الطلب ${inv.product.reorderLevel}`,
              branchId: data.branchId,
              productId: item.productId,
              metadata: { quantity: inv.quantity, reorderLevel: inv.product.reorderLevel },
            },
          })
        }
      }

      return { transaction }
    })

    await auditLog(user.id, `CREATE_TRANSACTION_${data.type}`, 'Transaction', result.transaction.id, undefined, { type: data.type, items: data.items.length }, req)
    res.status(201).json(result)
  } catch(err){ next(err) }
})

// GET /api/transactions/:id
transactionRouter.get('/:id', async (_req, res: Response, next: NextFunction) => {
  try {
    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id: _req.params.id },
      include: {
        user: { select: { id:true, name:true } },
        branch: { select: { id:true, name:true, nameAr:true } },
        items: { include: { product: { select: { id:true, sku:true, name:true, nameAr:true, unit:true, unitAr:true } } } },
        transfer: { include: {
          fromBranch: { select: { name:true, nameAr:true } },
          toBranch: { select: { name:true, nameAr:true } },
        }},
      },
    })
    res.json({ transaction })
  } catch(err){ next(err) }
})
