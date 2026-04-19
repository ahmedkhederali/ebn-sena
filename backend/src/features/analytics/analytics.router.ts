import { Router, type Request, type Response, type NextFunction } from 'express'
import { verifyToken, checkRole } from '../auth/auth.middleware'
import * as analyticsService from './analytics.service'
import { sendSuccess } from '../../shared/utils/apiResponse'

export const analyticsRouter = Router()

analyticsRouter.use(verifyToken)
analyticsRouter.use(checkRole('admin'))

function parseDateRange(from?: string, to?: string): { from: Date; to: Date } {
  const now = new Date()
  const fromDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const toDate = to ? new Date(to) : now
  toDate.setHours(23, 59, 59, 999)
  return { from: fromDate, to: toDate }
}

// GET /api/analytics/summary
analyticsRouter.get(
  '/summary',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query as Record<string, string | undefined>
      const { from, to } = parseDateRange(q['from'], q['to'])
      const summary = await analyticsService.getSummary(from, to)
      sendSuccess(res, summary)
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/analytics/by-day
analyticsRouter.get(
  '/by-day',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query as Record<string, string | undefined>
      const { from, to } = parseDateRange(q['from'], q['to'])
      const data = await analyticsService.getByDay(from, to)
      sendSuccess(res, data)
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/analytics/by-specialty
analyticsRouter.get(
  '/by-specialty',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query as Record<string, string | undefined>
      const { from, to } = parseDateRange(q['from'], q['to'])
      const data = await analyticsService.getBySpecialty(from, to)
      sendSuccess(res, data)
    } catch (err) {
      next(err)
    }
  },
)
