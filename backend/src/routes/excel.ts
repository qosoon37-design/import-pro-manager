import { Router, Response, NextFunction } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '../utils/prisma.js'
import { authenticate, authorize, auditLog, type AuthenticatedRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

export const excelRouter = Router()
excelRouter.use(authenticate)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel files are allowed'))
    }
  },
})

// GET /api/excel/imports - import history
excelRouter.get('/imports', authorize('GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'), async (_req, res: Response, next: NextFunction) => {
  try {
    const imports = await prisma.excelImport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { name:true, nameAr:true } } },
    })
    res.json({ imports })
  } catch(err){ next(err) }
})

// POST /api/excel/preview - parse and return preview without importing
excelRouter.post('/preview', authorize('GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'), upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const sheets: Record<string, { headers: string[]; rows: unknown[]; total: number }> = {}

    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[]
      const headers = rows.length > 0 ? Object.keys(rows[0]) : []
      sheets[sheetName] = {
        headers,
        rows: rows.slice(0, 10), // Preview first 10 rows
        total: rows.length,
      }
    }

    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex')
    res.json({ sheets, sheetNames: workbook.SheetNames, fileSize: req.file.size, filename: req.file.originalname, hash })
  } catch(err){ next(err) }
})

// POST /api/excel/import - full import
excelRouter.post('/import', authorize('GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'), upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)

    const schema = z.object({
      type: z.enum(['products', 'prices', 'inventory', 'initial_load']),
      mode: z.enum(['replace', 'update', 'add', 'merge']).default('update'),
      sheetName: z.string().optional(),
    })
    const { type, mode, sheetName } = schema.parse(req.body)

    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex')

    // Check for duplicate import
    const existing = await prisma.excelImport.findFirst({ where: { fileHash: hash, status: 'COMPLETED' } })
    if (existing) throw new AppError('This file has already been imported successfully.', 409)

    // Create import record
    const importRecord = await prisma.excelImport.create({
      data: {
        filename: `${Date.now()}_${req.file.originalname}`,
        originalName: req.file.originalname,
        fileHash: hash,
        type,
        status: 'PROCESSING',
        userId: req.user!.id,
        metadata: { mode, sheetName },
      },
    })

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const targetSheet = sheetName || workbook.SheetNames[0]
    const ws = workbook.Sheets[targetSheet]
    if (!ws) throw new AppError(`Sheet "${targetSheet}" not found`, 400)

    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[]

    let processed = 0, errors = 0
    const errorList: { row: number; error: string }[] = []
    const rollbackData: unknown[] = []

    // Process based on type
    if (type === 'products' || type === 'initial_load') {
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i]
          const sku = String(row['كود'] || row['SKU'] || row['sku'] || '').trim()
          const nameAr = String(row['اسم'] || row['name_ar'] || '').trim()
          const name = String(row['name'] || row['Name'] || nameAr).trim()
          const costPrice = parseFloat(String(row['سعر_شراء'] || row['cost_price'] || 0))
          const sellPrice = parseFloat(String(row['سعر_بيع'] || row['sell_price'] || 0))

          if (!sku || !nameAr) { errors++; errorList.push({ row: i+2, error: 'Missing SKU or name' }); continue }
          if (costPrice <= 0 || sellPrice <= 0) { errors++; errorList.push({ row: i+2, error: 'Invalid prices' }); continue }

          const existing = await prisma.product.findUnique({ where: { sku } })
          if (existing) rollbackData.push({ action: 'update', before: existing })

          await prisma.product.upsert({
            where: { sku },
            update: mode !== 'add' ? { name: name || nameAr, nameAr, costPrice, sellPrice,
              barcode: String(row['باركود'] || row['barcode'] || '').trim() || undefined,
              unit: String(row['وحدة'] || 'piece'), unitAr: String(row['وحدة'] || 'قطعة'),
              reorderLevel: parseInt(String(row['حد_أدنى'] || 10)),
            } : {},
            create: { sku, name: name || nameAr, nameAr, costPrice, sellPrice,
              barcode: String(row['باركود'] || '').trim() || undefined,
              unit: String(row['وحدة'] || 'piece'), unitAr: String(row['وحدة'] || 'قطعة'),
              reorderLevel: parseInt(String(row['حد_أدنى'] || 10)),
            },
          })
          processed++
        } catch(e) {
          errors++
          errorList.push({ row: i+2, error: String(e) })
        }
      }
    }

    if (type === 'prices') {
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i]
          const sku = String(row['كود'] || row['sku'] || '').trim()
          const newCost = parseFloat(String(row['سعر_جديد'] || row['new_price'] || 0))
          const branchCode = String(row['فرع'] || row['branch'] || '').trim()

          if (!sku || newCost <= 0) { errors++; continue }

          const product = await prisma.product.findUnique({ where: { sku } })
          if (!product) { errors++; errorList.push({ row: i+2, error: `Product ${sku} not found` }); continue }

          if (branchCode) {
            // Branch-specific price
            const branch = await prisma.branch.findUnique({ where: { code: branchCode } })
            if (branch) {
              await prisma.branchPriceOverride.upsert({
                where: { branchId_productId: { branchId: branch.id, productId: product.id } },
                update: { sellPrice: newCost },
                create: { branchId: branch.id, productId: product.id, sellPrice: newCost },
              })
            }
          } else {
            rollbackData.push({ action: 'price', productId: product.id, before: { costPrice: product.costPrice, sellPrice: product.sellPrice } })
            await prisma.$transaction([
              prisma.product.update({ where: { id: product.id }, data: { costPrice: newCost } }),
              prisma.priceHistory.create({
                data: { productId: product.id, oldCost: product.costPrice, newCost, oldSell: product.sellPrice, newSell: product.sellPrice, reason: `Excel import: ${req.file!.originalname}` },
              }),
            ])
          }
          processed++
        } catch(e) {
          errors++
          errorList.push({ row: i+2, error: String(e) })
        }
      }
    }

    if (type === 'inventory') {
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i]
          const branchCode = String(row['فرع'] || row['branch'] || '').trim()
          const sku = String(row['كود'] || row['sku'] || '').trim()
          const qty = parseInt(String(row['كمية'] || row['quantity'] || 0))

          if (!branchCode || !sku) { errors++; continue }

          const [branch, product] = await Promise.all([
            prisma.branch.findUnique({ where: { code: branchCode } }),
            prisma.product.findUnique({ where: { sku } }),
          ])
          if (!branch || !product) { errors++; errorList.push({ row: i+2, error: `Branch or product not found` }); continue }

          const existing = await prisma.branchInventory.findUnique({
            where: { branchId_productId: { branchId: branch.id, productId: product.id } },
          })
          if (existing) rollbackData.push({ action: 'inventory', before: existing })

          await prisma.branchInventory.upsert({
            where: { branchId_productId: { branchId: branch.id, productId: product.id } },
            update: mode === 'replace' ? { quantity: qty } : { quantity: { increment: qty } },
            create: { branchId: branch.id, productId: product.id, quantity: qty },
          })
          processed++
        } catch(e) {
          errors++
          errorList.push({ row: i+2, error: String(e) })
        }
      }
    }

    await prisma.excelImport.update({
      where: { id: importRecord.id },
      data: {
        status: errors > 0 && processed === 0 ? 'FAILED' : 'COMPLETED',
        totalRows: rows.length,
        processedRows: processed,
        errorRows: errors,
        errors: errorList as Parameters<typeof prisma.excelImport.update>[0]['data']['errors'],
        rollbackData: rollbackData as Parameters<typeof prisma.excelImport.update>[0]['data']['rollbackData'],
        processedAt: new Date(),
      },
    })

    await auditLog(req.user!.id, 'EXCEL_IMPORT', 'ExcelImport', importRecord.id, undefined, { type, mode, processed, errors }, req)

    res.json({ importId: importRecord.id, processed, errors, errorList: errorList.slice(0, 20), total: rows.length })
  } catch(err){ next(err) }
})

// POST /api/excel/rollback/:importId
excelRouter.post('/rollback/:importId', authorize('GENERAL_MANAGER','DEPUTY_MANAGER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const importId = req.params.importId as string
    const importRecord = await prisma.excelImport.findUniqueOrThrow({ where: { id: importId } })
    if (importRecord.status !== 'COMPLETED') throw new AppError('Can only rollback completed imports', 400)
    if (!importRecord.rollbackData) throw new AppError('No rollback data available', 400)

    const rollbackItems = importRecord.rollbackData as { action: string; before: Record<string, unknown>; productId?: string }[]

    for (const item of rollbackItems) {
      if (item.action === 'update' && item.before.sku) {
        await prisma.product.update({ where: { sku: item.before.sku as string }, data: item.before as Parameters<typeof prisma.product.update>[0]['data'] })
      } else if (item.action === 'price' && item.productId) {
        await prisma.product.update({ where: { id: item.productId }, data: { costPrice: item.before.costPrice as number, sellPrice: item.before.sellPrice as number } })
      } else if (item.action === 'inventory' && item.before.branchId) {
        await prisma.branchInventory.update({
          where: { branchId_productId: { branchId: item.before.branchId as string, productId: item.before.productId as string } },
          data: { quantity: item.before.quantity as number },
        })
      }
    }

    await prisma.excelImport.update({
      where: { id: importRecord.id },
      data: { status: 'ROLLED_BACK', rolledBackAt: new Date() },
    })

    await auditLog(req.user!.id, 'EXCEL_ROLLBACK', 'ExcelImport', importRecord.id, undefined, undefined, req)
    res.json({ message: 'Rollback completed', items: rollbackItems.length })
  } catch(err){ next(err) }
})

// GET /api/excel/export/products - export current products to Excel
excelRouter.get('/export/products', authorize('GENERAL_MANAGER','DEPUTY_MANAGER','WAREHOUSE_MANAGER'), async (_req, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: { select: { name:true, nameAr:true } } },
      orderBy: { sku: 'asc' },
    })

    const data = products.map(p => ({
      'كود': p.sku, 'اسم': p.nameAr, 'Name': p.name,
      'باركود': p.barcode || '', 'سعر_شراء': Number(p.costPrice), 'سعر_بيع': Number(p.sellPrice),
      'حد_أدنى': p.reorderLevel, 'وحدة': p.unit, 'الفئة': p.category?.nameAr || '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [8,20,20,15,12,12,10,10,15].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'المنتجات')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="products_${new Date().toISOString().slice(0,10)}.xlsx"`)
    res.send(buffer)
  } catch(err){ next(err) }
})
