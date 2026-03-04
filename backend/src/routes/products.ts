import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { authenticate, authorize, auditLog, type AuthenticatedRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { Decimal } from '@prisma/client/runtime/library'

export const productRouter = Router()
productRouter.use(authenticate)

const productSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  nameAr: z.string().min(1),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  unit: z.string().default('piece'),
  unitAr: z.string().default('قطعة'),
  costPrice: z.number().positive(),
  sellPrice: z.number().positive(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  reorderLevel: z.number().int().min(0).default(10),
  maxStock: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
})

// GET /api/products - with search, filter, pagination
productRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { q, category, page = '1', limit = '50', active = 'true' } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where: Record<string, unknown> = { isActive: active === 'true' }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { nameAr: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (category) where.categoryId = category

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: { category: { select: { id:true, name:true, nameAr:true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ])

    res.json({ products, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) })
  } catch(err){ next(err) }
})

// GET /api/products/barcode/:barcode
productRouter.get('/barcode/:barcode', async (req, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findFirstOrThrow({
      where: { barcode: req.params.barcode, isActive: true },
      include: { category: true },
    })
    res.json({ product })
  } catch(err){ next(err) }
})

// GET /api/products/:id
productRouter.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        category: true,
        priceHistory: { orderBy: { createdAt: 'desc' }, take: 20 },
        inventory: { include: { branch: { select: { id:true, name:true, nameAr:true } } } },
      },
    })
    res.json({ product })
  } catch(err){ next(err) }
})

// POST /api/products
productRouter.post('/', authorize('GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = productSchema.parse(req.body)
    const product = await prisma.product.create({ data })
    await auditLog(req.user!.id, 'CREATE_PRODUCT', 'Product', product.id, undefined, data, req)
    res.status(201).json({ product })
  } catch(err){ next(err) }
})

// PUT /api/products/:id
productRouter.put('/:id', authorize('GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const data = productSchema.partial().parse(req.body)
    const old = await prisma.product.findUniqueOrThrow({ where: { id } })

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data })

      // Track price changes
      if ((data.costPrice !== undefined && !new Decimal(data.costPrice).equals(old.costPrice)) ||
          (data.sellPrice !== undefined && !new Decimal(data.sellPrice).equals(old.sellPrice))) {
        await tx.priceHistory.create({
          data: {
            productId: id,
            oldCost: old.costPrice,
            newCost: updated.costPrice,
            oldSell: old.sellPrice,
            newSell: updated.sellPrice,
            changedBy: req.user!.id,
          },
        })
      }
      return updated
    })

    await auditLog(req.user!.id, 'UPDATE_PRODUCT', 'Product', id, old, product, req)
    res.json({ product })
  } catch(err){ next(err) }
})

// DELETE /api/products/:id (soft delete)
productRouter.delete('/:id', authorize('GENERAL_MANAGER','DEPUTY_MANAGER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    await prisma.product.update({ where: { id }, data: { isActive: false } })
    await auditLog(req.user!.id, 'DEACTIVATE_PRODUCT', 'Product', id, undefined, undefined, req)
    res.json({ message: 'Product deactivated' })
  } catch(err){ next(err) }
})

// GET /api/products/:id/price-history
productRouter.get('/:id/price-history', async (req, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const history = await prisma.priceHistory.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json({ history })
  } catch(err){ next(err) }
})
