import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../utils/prisma.js'
import { AppError } from './errorHandler.js'
import type { UserRole } from '@prisma/client'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: UserRole
    branchId: string | null
  }
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401))
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string
      email: string
      role: UserRole
      branchId: string | null
    }
    req.user = payload
    next()
  } catch {
    next(new AppError('Invalid or expired token', 401))
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401))
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403))
    }
    next()
  }
}

export async function auditLog(
  userId: string | undefined,
  action: string,
  entity: string,
  entityId?: string,
  oldValue?: object,
  newValue?: object,
  req?: Request
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
      },
    })
  } catch {
    // Non-critical, log but don't throw
    console.error('Failed to write audit log')
  }
}
