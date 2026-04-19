import type { Request, Response, NextFunction } from 'express'
import * as service from './appointments.service'
import { sendSuccess, Errors } from '../../shared/utils/apiResponse'
import {
  availableSlotsSchema,
  holdSlotSchema,
  updateStatusSchema,
  saveNoteSchema,
  listAppointmentsSchema,
} from './appointments.validation'
import type { AppointmentStatus } from '@shared/types/appointment.types'

export async function getAvailableSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { doctorId, date } = availableSlotsSchema.parse(req.query)
    const result = await service.getAvailableSlots(doctorId, date)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function holdSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = holdSlotSchema.parse(req.body)
    // Pass patientId if the user is authenticated (optional auth route)
    const result = await service.holdSlot(input, req.user?.id)
    sendSuccess(res, result, 201)
  } catch (err) {
    next(err)
  }
}

export async function confirmAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as {
      sessionRef?: string
      paymentId?: string
      patientId?: string
      patientName?: string
      patientPhone?: string
      patientNationalId?: string
    }
    if (!body.sessionRef || !body.paymentId || !body.patientId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sessionRef, paymentId, and patientId are required' },
      })
      return
    }
    const result = await service.confirmAppointment(body.sessionRef, body.paymentId, {
      patientId: body.patientId,
      patientName: body.patientName ?? '',
      patientPhone: body.patientPhone ?? '',
      patientNationalId: body.patientNationalId ?? '',
    })
    sendSuccess(res, result, 201)
  } catch (err) {
    next(err)
  }
}

export async function listAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      Errors.unauthorized(res)
      return
    }
    const query = listAppointmentsSchema.parse(req.query)
    const result = await service.listAppointments(query, req.user)
    sendSuccess(res, result.items, 200, result.meta)
  } catch (err) {
    next(err)
  }
}

export async function getAppointmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Simplified — full implementation uses populated query
    const { id } = req.params as { id: string }
    const { AppointmentModel, ConsultationNoteModel } = await import('./appointments.schema')
    const appt = await AppointmentModel.findById(id)
      .populate('doctorId', 'nameAr nameEn')
      .populate('patientId', 'nameAr nameEn email')
      .lean()

    if (!appt) {
      Errors.notFound(res, 'Appointment')
      return
    }

    // Scope check
    if (req.user?.role === 'patient' && appt.patientId.toString() !== req.user.id) {
      Errors.notFound(res, 'Appointment')
      return
    }
    if (req.user?.role === 'doctor' && appt.doctorId.toString() !== req.user.id) {
      Errors.forbidden(res)
      return
    }

    const note = await ConsultationNoteModel.findOne({
      appointmentId: appt._id,
      ...(req.user?.role === 'doctor' ? { doctorId: req.user.id } : {}),
    }).lean()

    sendSuccess(res, { ...appt, consultationNote: note })
  } catch (err) {
    next(err)
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      Errors.unauthorized(res)
      return
    }
    const { id } = req.params as { id: string }
    const { status, cancellationReason } = updateStatusSchema.parse(req.body)
    await service.updateAppointmentStatus(id, status as AppointmentStatus, req.user, cancellationReason)
    sendSuccess(res, { message: 'Appointment status updated' })
  } catch (err) {
    next(err)
  }
}

export async function saveNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      Errors.unauthorized(res)
      return
    }
    const { id } = req.params as { id: string }
    const { noteText } = saveNoteSchema.parse(req.body)
    const result = await service.saveConsultationNote(id, req.user.id, noteText)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}
