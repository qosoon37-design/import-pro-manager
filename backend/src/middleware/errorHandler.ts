import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    })
  }

  // Prisma errors
  if ((err as { code?: string }).code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists.' })
  }
  if ((err as { code?: string }).code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' })
  }

  console.error('Unhandled error:', err)
  return res.status(500).json({ error: 'Internal server error' })
}
