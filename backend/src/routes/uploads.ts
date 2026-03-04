import { Router, Response, NextFunction } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { prisma } from '../utils/prisma.js'

export const uploadRouter = Router()
uploadRouter.use(authenticate)

const ALLOWED_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
const MAX_SIZE = 10 * 1024 * 1024
const MAX_FILES = 20

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = './uploads/images'
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true)
    cb(new Error(`File type ${file.mimetype} not allowed`))
  },
})

// POST /api/uploads/images - single or multiple image upload
uploadRouter.post('/images', upload.array('files', MAX_FILES), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) throw new AppError('No files uploaded', 400)

    const records = await Promise.all(files.map(async file => {
      const record = await prisma.uploadedImage.create({
        data: {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          uploadedBy: req.user!.id,
          sessionId: req.headers['x-session-id'] as string || undefined,
        },
      })
      return { id: record.id, filename: file.filename, originalName: file.originalname, size: file.size, url: `/uploads/images/${file.filename}` }
    }))

    res.json({ files: records, count: records.length })
  } catch(err){ next(err) }
})

// GET /api/uploads/:filename - serve uploaded file
uploadRouter.get('/:filename', (req, res: Response) => {
  const filePath = path.resolve('./uploads/images', path.basename(req.params.filename))
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' })
  res.sendFile(filePath)
})
