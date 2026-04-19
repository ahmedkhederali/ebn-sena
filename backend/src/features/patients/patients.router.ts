import { Router, type Request, type Response, type NextFunction } from 'express'
import { verifyToken, checkRole } from '../auth/auth.middleware'
import * as patientsService from './patients.service'
import { sendSuccess } from '../../shared/utils/apiResponse'

export const patientsRouter = Router()

patientsRouter.use(verifyToken)
patientsRouter.use(checkRole('patient'))

// GET /api/patients/me
patientsRouter.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await patientsService.getProfile(req.user!.id)
    sendSuccess(res, profile)
  } catch (err) {
    next(err)
  }
})

// PUT /api/patients/me
patientsRouter.put('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await patientsService.updateProfile(
      req.user!.id,
      req.body as Parameters<typeof patientsService.updateProfile>[1],
    )
    sendSuccess(res, profile)
  } catch (err) {
    next(err)
  }
})

// GET /api/patients/me/appointments
patientsRouter.get(
  '/me/appointments',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query as Record<string, string | undefined>
      const opts: { cursor?: string; limit?: number; status?: import('@shared/types/appointment.types').AppointmentStatus } = {}
      if (q['cursor']) opts.cursor = q['cursor']
      if (q['limit']) opts.limit = parseInt(q['limit'], 10)
      if (q['status']) opts.status = q['status'] as import('@shared/types/appointment.types').AppointmentStatus
      const result = await patientsService.getPatientAppointments(req.user!.id, opts)
      res.json({ success: true, data: result.items, meta: result.meta })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/patients/me/history
patientsRouter.get(
  '/me/history',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = await patientsService.getPatientHistory(req.user!.id)
      sendSuccess(res, history)
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/patients/me/appointments/:id
patientsRouter.get(
  '/me/appointments/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await patientsService.getAppointmentDetail(
        req.user!.id,
        String(req.params['id'] ?? ''),
      )
      sendSuccess(res, detail)
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/patients/me/receipts/:paymentId
patientsRouter.get(
  '/me/receipts/:paymentId',
  async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, { message: 'Receipt generation requires Puppeteer — configure PDF service' })
  },
)
