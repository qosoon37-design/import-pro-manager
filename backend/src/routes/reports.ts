import { Router, Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.js'
import * as XLSX from 'xlsx'

export const reportRouter = Router()
reportRouter.use(authenticate)

// GET /api/reports/inventory - full inventory snapshot
reportRouter.get('/inventory', authorize('GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { branchId, format = 'json' } = req.query as Record<string, string>

    const inventory = await prisma.branchInventory.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        product: { select: { sku:true, name:true, nameAr:true, barcode:true, costPrice:true, sellPrice:true, unit:true, unitAr:true, reorderLevel:true } },
        branch: { select: { name:true, nameAr:true, code:true } },
      },
      orderBy: [{ branch: { name: 'asc' } }, { product: { name: 'asc' } }],
    })

    const rows = inventory.map((i, idx) => ({
      '#': idx + 1,
      'الفرع': i.branch.nameAr,
      'كود': i.product.sku,
      'المنتج': i.product.nameAr,
      'Product': i.product.name,
      'الكمية': i.quantity,
      'الوحدة': i.product.unitAr,
      'سعر_شراء': Number(i.product.costPrice),
      'سعر_بيع': Number(i.product.sellPrice),
      'إجمالي_التكلفة': i.quantity * Number(i.product.costPrice),
      'إجمالي_البيع': i.quantity * Number(i.product.sellPrice),
      'حد_إعادة_الطلب': i.product.reorderLevel,
      'حالة': i.quantity === 0 ? 'نفد' : i.quantity <= i.product.reorderLevel ? 'منخفض' : 'متاح',
    }))

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = rows.length ? Object.keys(rows[0]).map(() => ({ wch: 16 })) : []
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير_المخزون')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="inventory_report_${new Date().toISOString().slice(0,10)}.xlsx"`)
      return res.send(buffer)
    }

    const totalCostValue = rows.reduce((s, r) => s + (r['إجمالي_التكلفة'] as number), 0)
    const totalSellValue = rows.reduce((s, r) => s + (r['إجمالي_البيع'] as number), 0)
    res.json({ rows, totalCostValue, totalSellValue, totalItems: rows.length })
  } catch(err){ next(err) }
})

// GET /api/reports/transactions - transaction summary
reportRouter.get('/transactions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { branchId, type, from, to, format = 'json' } = req.query as Record<string, string>
    const effectiveBranchId = req.user!.role === 'BRANCH_USER' ? req.user!.branchId! : branchId

    const where: Record<string, unknown> = {}
    if (effectiveBranchId) where.branchId = effectiveBranchId
    if (type) where.type = type
    if (from || to) where.createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        user: { select: { name:true } },
        branch: { select: { nameAr:true } },
        items: { include: { product: { select: { nameAr:true, sku:true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const typeMap: Record<string, string> = {
      PURCHASE: 'شراء', SALE: 'بيع', TRANSFER_IN: 'استلام', TRANSFER_OUT: 'تحويل', DAMAGE: 'تالف', ADJUSTMENT: 'تعديل', INITIAL_LOAD: 'افتتاحي'
    }

    const rows = transactions.map((t, i) => ({
      '#': i+1, 'التاريخ': new Intl.DateTimeFormat('ar-SA', { dateStyle:'short', timeStyle:'short' }).format(t.createdAt),
      'النوع': typeMap[t.type] || t.type, 'الفرع': t.branch.nameAr,
      'المستخدم': t.user.name, 'المنتجات': t.items.length,
      'الإجمالي': Number(t.totalAmount), 'ملاحظات': t.notes || '',
    }))

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'العمليات')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().slice(0,10)}.xlsx"`)
      return res.send(buffer)
    }

    res.json({ rows, total: transactions.length, totalAmount: transactions.reduce((s, t) => s + Number(t.totalAmount), 0) })
  } catch(err){ next(err) }
})

// GET /api/reports/analytics - predictive analytics
reportRouter.get('/analytics', authorize('GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'), async (_req, res: Response, next: NextFunction) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Fast-moving items (most sold in last 30 days)
    const salesItems = await prisma.transactionItem.groupBy({
      by: ['productId'],
      where: { transaction: { type: 'SALE', createdAt: { gte: thirtyDaysAgo } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })

    const fastMoving = await Promise.all(salesItems.map(async item => {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { nameAr:true, sku:true } })
      return { ...product, totalSold: item._sum.quantity }
    }))

    // Stock out warnings
    const lowStock = await prisma.branchInventory.findMany({
      where: { quantity: { lte: 0 } },
      include: { product: { select: { nameAr:true, sku:true, reorderLevel:true } }, branch: { select: { nameAr:true } } },
      take: 20,
    })

    // Reorder suggestions (below reorder level but > 0)
    const allInv = await prisma.branchInventory.findMany({
      include: { product: { select: { nameAr:true, sku:true, reorderLevel:true, costPrice:true } }, branch: { select: { nameAr:true } } },
    })
    const reorderSuggestions = allInv.filter(i => i.quantity > 0 && i.quantity <= i.product.reorderLevel)

    res.json({ fastMoving, stockOutWarnings: lowStock, reorderSuggestions })
  } catch(err){ next(err) }
})

// GET /api/reports/profits
reportRouter.get('/profits', authorize('GENERAL_MANAGER','DEPUTY_MANAGER'), async (req, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as Record<string, string>
    const dateFilter = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) }

    const sales = await prisma.transactionItem.findMany({
      where: { transaction: { type: 'SALE', ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) } },
      include: { product: { select: { costPrice:true, nameAr:true, sku:true } } },
    })

    const summary = sales.reduce((acc, item) => {
      const revenue = Number(item.totalPrice)
      const cost = Number(item.product.costPrice) * item.quantity
      const profit = revenue - cost
      if (!acc[item.productId]) acc[item.productId] = { product: item.product.nameAr, sku: item.product.sku, revenue: 0, cost: 0, profit: 0, qty: 0 }
      acc[item.productId].revenue += revenue
      acc[item.productId].cost += cost
      acc[item.productId].profit += profit
      acc[item.productId].qty += item.quantity
      return acc
    }, {} as Record<string, { product: string; sku: string; revenue: number; cost: number; profit: number; qty: number }>)

    const rows = Object.values(summary).sort((a, b) => b.profit - a.profit)
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
    const totalCost = rows.reduce((s, r) => s + r.cost, 0)
    const totalProfit = rows.reduce((s, r) => s + r.profit, 0)

    res.json({ rows, totalRevenue, totalCost, totalProfit, margin: totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(2) : 0 })
  } catch(err){ next(err) }
})
