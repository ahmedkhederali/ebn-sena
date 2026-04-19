import { Router, type Request, type Response, type NextFunction } from 'express'
import mongoose from 'mongoose'
import { verifyToken, checkRole } from '../auth/auth.middleware'
import * as adminService from './admin.service'
import { sendSuccess } from '../../shared/utils/apiResponse'
import { AvailabilityScheduleModel } from '../appointments/appointments.schema'
import { DoctorProfileModel } from '../doctors/doctors.schema'
import type { AppointmentStatus } from '@shared/types/appointment.types'
import type { Role } from '../auth/auth.types'

export const adminRouter = Router()

adminRouter.use(verifyToken)

// ── Appointments ───────────────────────────────────────────────────────────────

adminRouter.get(
  '/appointments',
  checkRole('admin', 'receptionist'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query as Record<string, string | undefined>
      const apptOpts: Parameters<typeof adminService.adminListAppointments>[0] = {}
      if (q['doctorId']) apptOpts.doctorId = q['doctorId']
      if (q['patientId']) apptOpts.patientId = q['patientId']
      if (q['status']) apptOpts.status = q['status'] as AppointmentStatus
      if (q['from']) apptOpts.from = q['from']
      if (q['to']) apptOpts.to = q['to']
      if (q['search']) apptOpts.search = q['search']
      if (q['cursor']) apptOpts.cursor = q['cursor']
      if (q['limit']) apptOpts.limit = parseInt(q['limit'], 10)
      const result = await adminService.adminListAppointments(apptOpts)
      res.json({ success: true, data: result.items, meta: result.meta })
    } catch (err) {
      next(err)
    }
  },
)

adminRouter.put(
  '/appointments/:id/reschedule',
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { newDateTime } = req.body as { newDateTime?: string }
      if (!newDateTime) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'newDateTime is required' } })
        return
      }
      await adminService.adminRescheduleAppointment(req.user!.id, String(req.params['id'] ?? ''), newDateTime)
      sendSuccess(res, { message: 'Appointment rescheduled' })
    } catch (err) {
      next(err)
    }
  },
)

adminRouter.put(
  '/appointments/:id/cancel',
  checkRole('admin', 'receptionist'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reason } = req.body as { reason?: string }
      await adminService.adminCancelAppointment(req.user!.id, String(req.params['id'] ?? ''), reason)
      sendSuccess(res, { message: 'Appointment cancelled' })
    } catch (err) {
      next(err)
    }
  },
)

// ── Patients ───────────────────────────────────────────────────────────────────

adminRouter.get(
  '/patients',
  checkRole('admin', 'receptionist'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query as Record<string, string | undefined>
      const opts: Parameters<typeof adminService.searchPatients>[0] = {}
      if (q['search']) opts.search = q['search']
      if (q['cursor']) opts.cursor = q['cursor']
      if (q['limit']) opts.limit = parseInt(q['limit'], 10)
      const result = await adminService.searchPatients(opts)
      res.json({ success: true, data: result.items, meta: result.meta })
    } catch (err) {
      next(err)
    }
  },
)

adminRouter.get(
  '/patients/:id',
  checkRole('admin', 'receptionist'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const patient = await adminService.getPatientById(String(req.params['id'] ?? ''))
      sendSuccess(res, patient)
    } catch (err) {
      next(err)
    }
  },
)

// ── Users ──────────────────────────────────────────────────────────────────────

adminRouter.get(
  '/users',
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query as Record<string, string | undefined>
      const opts: Parameters<typeof adminService.listUsers>[0] = {}
      if (q['role']) opts.role = q['role'] as Role
      if (q['cursor']) opts.cursor = q['cursor']
      if (q['limit']) opts.limit = parseInt(q['limit'], 10)
      const result = await adminService.listUsers(opts)
      res.json({ success: true, data: result.items, meta: result.meta })
    } catch (err) {
      next(err)
    }
  },
)

adminRouter.post(
  '/users',
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as Parameters<typeof adminService.createStaffUser>[0]
      const result = await adminService.createStaffUser(dto)
      sendSuccess(res, result, 201)
    } catch (err) {
      next(err)
    }
  },
)

adminRouter.put(
  '/users/:id',
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await adminService.updateUser(
        req.user!.id,
        String(req.params['id'] ?? ''),
        req.body as { role?: Role; isActive?: boolean },
      )
      sendSuccess(res, { message: 'User updated' })
    } catch (err) {
      next(err)
    }
  },
)

// ── Doctor Profile Management ──────────────────────────────────────────────────

adminRouter.get(
  '/doctors',
  checkRole('admin', 'receptionist'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query as Record<string, string | undefined>
      const opts: Parameters<typeof adminService.listDoctorProfiles>[0] = {}
      if (q['search']) opts.search = q['search']
      if (q['cursor']) opts.cursor = q['cursor']
      if (q['limit']) opts.limit = parseInt(q['limit'], 10)
      const result = await adminService.listDoctorProfiles(opts)
      res.json({ success: true, data: result.items, meta: result.meta })
    } catch (err) {
      next(err)
    }
  },
)

adminRouter.post(
  '/doctors',
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as Partial<Parameters<typeof adminService.createDoctorWithProfile>[0]>
      if (
        !body.nameAr ||
        !body.nameEn ||
        !body.email ||
        !body.phone ||
        !body.specialtyId ||
        body.consultationFeeSAR === undefined
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'nameAr, nameEn, email, phone, specialtyId, consultationFeeSAR are required',
          },
        })
        return
      }
      const dto: Parameters<typeof adminService.createDoctorWithProfile>[0] = {
        nameAr: body.nameAr,
        nameEn: body.nameEn,
        email: body.email,
        phone: body.phone,
        specialtyId: body.specialtyId,
        consultationFeeSAR: body.consultationFeeSAR,
      }
      if (body.bioAr) dto.bioAr = body.bioAr
      if (body.bioEn) dto.bioEn = body.bioEn
      if (body.yearsOfExperience !== undefined) dto.yearsOfExperience = body.yearsOfExperience
      if (body.qualifications) dto.qualifications = body.qualifications
      if (body.languages) dto.languages = body.languages
      const result = await adminService.createDoctorWithProfile(dto)
      sendSuccess(res, result, 201)
    } catch (err) {
      next(err)
    }
  },
)

// GET /admin/doctors/:id/schedule — list all schedule entries for a doctor
adminRouter.get(
  '/doctors/:id/schedule',
  checkRole('admin', 'receptionist'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await DoctorProfileModel.findById(req.params['id']).select('userId').lean()
      if (!profile) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Doctor not found' } })
        return
      }
      const schedules = await AvailabilityScheduleModel.find({ doctorId: profile.userId })
        .sort({ dayOfWeek: 1 })
        .lean()
      sendSuccess(res, schedules)
    } catch (err) {
      next(err)
    }
  },
)

// POST /admin/doctors/:id/schedule — upsert one day's schedule for a doctor
adminRouter.post(
  '/doctors/:id/schedule',
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await DoctorProfileModel.findById(req.params['id']).select('userId').lean()
      if (!profile) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Doctor not found' } })
        return
      }
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
          error: { code: 'VALIDATION_ERROR', message: 'dayOfWeek must be 0-6' },
        })
        return
      }
      const schedule = await AvailabilityScheduleModel.findOneAndUpdate(
        { doctorId: profile.userId, dayOfWeek: dow },
        {
          doctorId: profile.userId,
          dayOfWeek: dow,
          startTime: body.startTime,
          endTime: body.endTime,
          slotDurationMinutes: body.slotDurationMinutes ?? 30,
          isActive: true,
        },
        { upsert: true, new: true },
      )
      sendSuccess(res, schedule, 201)
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /admin/doctors/:id/schedule/:dayOfWeek — remove one day's schedule
adminRouter.delete(
  '/doctors/:id/schedule/:dayOfWeek',
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await DoctorProfileModel.findById(req.params['id']).select('userId').lean()
      if (!profile) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Doctor not found' } })
        return
      }
      await AvailabilityScheduleModel.deleteOne({
        doctorId: profile.userId,
        dayOfWeek: Number(req.params['dayOfWeek']),
      })
      sendSuccess(res, { message: 'Schedule entry removed' })
    } catch (err) {
      next(err)
    }
  },
)

adminRouter.put(
  '/doctors/:id',
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await adminService.updateDoctorProfile(
        String(req.params['id'] ?? ''),
        req.body as Parameters<typeof adminService.updateDoctorProfile>[1],
      )
      sendSuccess(res, { message: 'Doctor profile updated' })
    } catch (err) {
      next(err)
    }
  },
)
