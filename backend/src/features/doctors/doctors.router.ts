import { Router, type Request, type Response, type NextFunction } from 'express'
import { verifyToken, checkRole } from '../auth/auth.middleware'
import * as ctrl from './doctors.controller'
import * as doctorSvc from './doctors.service'
import { sendSuccess } from '../../shared/utils/apiResponse'
import {
  AvailabilityScheduleModel,
  UnavailabilityBlockModel,
  AppointmentModel,
  ConsultationNoteModel,
} from '../appointments/appointments.schema'
import { updateAppointmentStatus, saveConsultationNote } from '../appointments/appointments.service'
import mongoose from 'mongoose'

export const doctorsRouter = Router()
export const servicesRouter = Router()

// ── Public service routes ──────────────────────────────────────────────────────
servicesRouter.get('/', ctrl.getServices)
servicesRouter.get('/:id', ctrl.getServiceById)

// ── Doctor self-service sub-router (/api/doctors/me/*) ───────────────────────
// Must be registered BEFORE /:id to prevent "me" being parsed as an id param
const meRouter = Router()
meRouter.use(verifyToken, checkRole('doctor'))

// GET /api/doctors/me/profile
meRouter.get(
  '/profile',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await doctorSvc.getMyDoctorProfile(req.user!.id)
      sendSuccess(res, profile)
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/doctors/me/schedule
meRouter.get(
  '/schedule',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schedules = await AvailabilityScheduleModel.find({
        doctorId: new mongoose.Types.ObjectId(req.user!.id),
        isActive: true,
      })
        .sort({ dayOfWeek: 1 })
        .lean()
      sendSuccess(res, schedules)
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/doctors/me/schedule — upserts one day's schedule
meRouter.post(
  '/schedule',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as {
        dayOfWeek?: number
        startTime?: string
        endTime?: string
        slotDurationMinutes?: number
      }

      if (body.dayOfWeek === undefined || !body.startTime || !body.endTime) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'dayOfWeek, startTime, endTime are required' },
        })
        return
      }

      const dow = Number(body.dayOfWeek)
      if (dow < 0 || dow > 6 || !Number.isInteger(dow)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'dayOfWeek must be integer 0-6' },
        })
        return
      }

      const validDurations = [15, 20, 30, 45, 60]
      const duration = body.slotDurationMinutes ?? 30
      if (!validDurations.includes(duration)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'slotDurationMinutes must be 15,20,30,45,60' },
        })
        return
      }

      const schedule = await AvailabilityScheduleModel.findOneAndUpdate(
        { doctorId: new mongoose.Types.ObjectId(req.user!.id), dayOfWeek: dow },
        {
          $set: {
            startTime: body.startTime,
            endTime: body.endTime,
            slotDurationMinutes: duration,
            isActive: true,
          },
          $setOnInsert: {
            doctorId: new mongoose.Types.ObjectId(req.user!.id),
            dayOfWeek: dow,
          },
        },
        { upsert: true, new: true },
      )

      sendSuccess(res, schedule, 201)
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /api/doctors/me/schedule/:scheduleId
meRouter.delete(
  '/schedule/:scheduleId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await AvailabilityScheduleModel.findOneAndUpdate(
        {
          _id: req.params['scheduleId'],
          doctorId: new mongoose.Types.ObjectId(req.user!.id),
        },
        { $set: { isActive: false } },
      )
      if (!result) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } })
        return
      }
      sendSuccess(res, { message: 'Schedule deactivated' })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/doctors/me/unavailability
meRouter.post(
  '/unavailability',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as {
        startDate?: string
        endDate?: string
        reason?: string
        notes?: string
      }

      if (!body.startDate || !body.endDate || !body.reason) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'startDate, endDate, reason are required' },
        })
        return
      }

      const validReasons = ['vacation', 'leave', 'training', 'other']
      if (!validReasons.includes(body.reason)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `reason must be one of: ${validReasons.join(', ')}` },
        })
        return
      }

      const block = await UnavailabilityBlockModel.create({
        doctorId: new mongoose.Types.ObjectId(req.user!.id),
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        reason: body.reason as 'vacation' | 'leave' | 'training' | 'other',
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      })

      sendSuccess(res, block, 201)
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/doctors/me/unavailability
meRouter.get(
  '/unavailability',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const blocks = await UnavailabilityBlockModel.find({
        doctorId: new mongoose.Types.ObjectId(req.user!.id),
        endDate: { $gte: new Date() },
      })
        .sort({ startDate: 1 })
        .lean()
      sendSuccess(res, blocks)
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /api/doctors/me/unavailability/:blockId
meRouter.delete(
  '/unavailability/:blockId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await UnavailabilityBlockModel.findOneAndDelete({
        _id: req.params['blockId'],
        doctorId: new mongoose.Types.ObjectId(req.user!.id),
      })
      if (!result) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Block not found' } })
        return
      }
      sendSuccess(res, { message: 'Unavailability block removed' })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/doctors/me/appointments
meRouter.get(
  '/appointments',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query as Record<string, string | undefined>
      const limit = Math.min(parseInt(q['limit'] ?? '20', 10), 50)
      const filter: Record<string, unknown> = {
        doctorId: new mongoose.Types.ObjectId(req.user!.id),
      }
      if (q['status']) filter['status'] = q['status']
      if (q['cursor']) filter['_id'] = { $lt: new mongoose.Types.ObjectId(q['cursor']) }
      if (q['from'] || q['to']) {
        const df: Record<string, Date> = {}
        if (q['from']) df['$gte'] = new Date(q['from'])
        if (q['to']) {
          const t = new Date(q['to'])
          t.setHours(23, 59, 59, 999)
          df['$lte'] = t
        }
        filter['appointmentDateTime'] = df
      }

      const appointments = await AppointmentModel.find(filter)
        .sort({ appointmentDateTime: -1 })
        .limit(limit + 1)
        .populate('patientId', 'nameAr nameEn phone')
        .lean()

      const hasMore = appointments.length > limit
      if (hasMore) appointments.pop()

      const items = appointments.map((a) => {
        const patient = a.patientId as unknown as {
          _id: mongoose.Types.ObjectId
          nameAr: string
          nameEn: string
          phone: string
        } | null
        return {
          id: a._id.toString(),
          bookingRef: a.bookingRef,
          appointmentDateTime: a.appointmentDateTime.toISOString(),
          status: a.status,
          patientNameAr: patient?.nameAr ?? a.patientNameSnapshot,
          patientNameEn: patient?.nameEn ?? a.patientNameSnapshot,
          patientPhone: patient?.phone ?? a.patientPhoneSnapshot,
        }
      })

      sendSuccess(res, items, 200, {
        cursor: hasMore
          ? (appointments[appointments.length - 1]?._id.toString() ?? null)
          : null,
        hasMore,
      })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/doctors/me/appointments/:appointmentId
meRouter.get(
  '/appointments/:appointmentId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { appointmentId } = req.params as { appointmentId: string }
      const appt = await AppointmentModel.findOne({
        _id: appointmentId,
        doctorId: new mongoose.Types.ObjectId(req.user!.id),
      })
        .populate('patientId', 'nameAr nameEn phone nationalId dateOfBirth gender')
        .lean()

      if (!appt) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } })
        return
      }

      const note = await ConsultationNoteModel.findOne({
        appointmentId: new mongoose.Types.ObjectId(appointmentId),
      }).lean()

      sendSuccess(res, { ...appt, consultationNote: note?.noteText ?? null })
    } catch (err) {
      next(err)
    }
  },
)

// PUT /api/doctors/me/appointments/:appointmentId/note
meRouter.put(
  '/appointments/:appointmentId/note',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { appointmentId } = req.params as { appointmentId: string }
      const { note } = req.body as { note?: string }

      if (!note || note.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'note is required' },
        })
        return
      }

      const result = await saveConsultationNote(appointmentId, req.user!.id, note.trim())
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },
)

// PUT /api/doctors/me/appointments/:appointmentId/complete
meRouter.put(
  '/appointments/:appointmentId/complete',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { appointmentId } = req.params as { appointmentId: string }
      await updateAppointmentStatus(
        appointmentId,
        'completed',
        { id: req.user!.id, role: 'doctor' },
      )
      sendSuccess(res, { message: 'Appointment marked as completed' })
    } catch (err) {
      next(err)
    }
  },
)

// Mount /me before /:id
doctorsRouter.use('/me', meRouter)

// ── Public doctor routes ───────────────────────────────────────────────────────
doctorsRouter.get('/', ctrl.getDoctors)
doctorsRouter.get('/:id', ctrl.getDoctorById)
