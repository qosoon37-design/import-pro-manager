import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { authRouter } from './routes/auth.js'
import { branchRouter } from './routes/branches.js'
import { productRouter } from './routes/products.js'
import { inventoryRouter } from './routes/inventory.js'
import { transactionRouter } from './routes/transactions.js'
import { excelRouter } from './routes/excel.js'
import { reportRouter } from './routes/reports.js'
import { uploadRouter } from './routes/uploads.js'
import { alertRouter } from './routes/alerts.js'
import { userRouter } from './routes/users.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'

const app = express()

// ── Security Headers ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// ── CORS ──
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',')
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

// ── Rate Limiting ──
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
}))

// Stricter limit on auth endpoints
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth requests. Please try again in 15 minutes.' },
}))

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Request Logging ──
app.use(requestLogger)

// ── Health Check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.2.0', timestamp: new Date().toISOString() })
})

// ── API Routes ──
app.use('/api/auth', authRouter)
app.use('/api/users', userRouter)
app.use('/api/branches', branchRouter)
app.use('/api/products', productRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/transactions', transactionRouter)
app.use('/api/excel', excelRouter)
app.use('/api/reports', reportRouter)
app.use('/api/uploads', uploadRouter)
app.use('/api/alerts', alertRouter)

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ── Error Handler ──
app.use(errorHandler)

export default app
