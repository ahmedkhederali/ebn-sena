import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export function auditLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    if (req.user && req.method !== 'GET') {
      logger.info('audit', {
        actorId: req.user.id,
        role: req.user.role,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        requestId: req.requestId,
      })
    }
  })
  next()
}
