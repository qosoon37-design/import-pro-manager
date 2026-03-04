import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { authenticate, auditLog, type AuthenticatedRequest } from '../middleware/auth.js'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  nameAr: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['GENERAL_MANAGER', 'DEPUTY_MANAGER', 'WAREHOUSE_MANAGER', 'BRANCH_USER', 'AUDITOR']).optional(),
  branchId: z.string().uuid().optional(),
})

function signToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '30m') as jwt.SignOptions['expiresIn'],
  })
}

function signRefresh(payload: object): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  })
}

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) throw new AppError('Invalid credentials', 401)

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new AppError('Invalid credentials', 401)

    const payload = { id: user.id, email: user.email, role: user.role, branchId: user.branchId }
    const token = signToken(payload)
    const refresh = signRefresh({ id: user.id })

    // Save session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.session.create({
      data: { userId: user.id, token: refresh, ipAddress: req.ip, userAgent: req.headers['user-agent'], expiresAt },
    })

    await auditLog(user.id, 'LOGIN', 'User', user.id, undefined, undefined, req)

    res.json({
      token,
      refreshToken: refresh,
      user: { id: user.id, email: user.email, name: user.name, nameAr: user.nameAr, role: user.role, branchId: user.branchId },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/register (GENERAL_MANAGER only - done via user management)
authRouter.post('/register', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!
    if (!['GENERAL_MANAGER', 'DEPUTY_MANAGER'].includes(authUser.role)) {
      throw new AppError('Insufficient permissions', 403)
    }

    const data = registerSchema.parse(req.body)
    const hashed = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        name: data.name,
        nameAr: data.nameAr,
        phone: data.phone,
        role: data.role || 'BRANCH_USER',
        branchId: data.branchId,
      },
      select: { id: true, email: true, name: true, nameAr: true, role: true, branchId: true, createdAt: true },
    })

    await auditLog(authUser.id, 'CREATE_USER', 'User', user.id, undefined, { email: user.email, role: user.role }, req)
    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) throw new AppError('Refresh token required', 400)

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string }

    const session = await prisma.session.findUnique({ where: { token: refreshToken } })
    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401)
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user || !user.isActive) throw new AppError('User not found', 401)

    const newPayload = { id: user.id, email: user.email, role: user.role, branchId: user.branchId }
    const token = signToken(newPayload)

    res.json({ token })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/logout
authRouter.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { token: refreshToken } })
    }
    await auditLog(req.user?.id, 'LOGOUT', 'User', req.user?.id, undefined, undefined, req)
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, nameAr: true, role: true, branchId: true, phone: true, twoFactorEnabled: true, createdAt: true,
        branch: { select: { id: true, name: true, nameAr: true, code: true } }
      },
    })
    if (!user) throw new AppError('User not found', 404)
    res.json({ user })
  } catch (err) {
    next(err)
  }
})
