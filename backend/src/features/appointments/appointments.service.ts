import mongoose from 'mongoose'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import {
  AvailabilityScheduleModel,
  UnavailabilityBlockModel,
  SlotHoldModel,
  AppointmentModel,
  ConsultationNoteModel,
  getNextBookingRef,
} from './appointments.schema'
import { DoctorProfileModel } from '../doctors/doctors.schema'
import { AppError } from '../../shared/middleware/errorHandler'
import { logger } from '../../shared/utils/logger'
import type { TimeSlot, AppointmentStatus } from '@shared/types/appointment.types'
import type { HoldSlotInput, ListAppointmentsInput } from './appointments.validation'
import type { Role } from '../auth/auth.types'

const SLOT_HOLD_TTL_MINUTES = 10

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h = '0', m = '0'] = time.split(':')
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const m = (totalMinutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/**
 * Translates a public DoctorProfile._id to the corresponding User._id.
 * All slot/appointment models store User._id as doctorId.
 */
async function resolveUserIdFromProfileId(profileId: string): Promise<mongoose.Types.ObjectId> {
  if (!mongoose.Types.ObjectId.isValid(profileId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid doctor ID')
  }
  const profile = await DoctorProfileModel.findById(profileId).select('userId isActive').lean()
  if (!profile || !profile.isActive) {
    throw new AppError(404, 'DOCTOR_NOT_FOUND', 'Doctor not found or inactive')
  }
  return profile.userId
}

// ── Slot Generation ────────────────────────────────────────────────────────────

export async function getAvailableSlots(
  doctorProfileId: string,
  dateStr: string,
): Promise<{ doctorId: string; date: string; slotDurationMinutes: number; slots: TimeSlot[] }> {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) throw new AppError(400, 'INVALID_DATE', 'Invalid date format')

  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  if (date < now) throw new AppError(400, 'DATE_IN_PAST', 'Cannot query slots for past dates')

  const doctorUserId = await resolveUserIdFromProfileId(doctorProfileId)
  const dayOfWeek = date.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6

  const schedule = await AvailabilityScheduleModel.findOne({
    doctorId: doctorUserId,
    dayOfWeek,
    isActive: true,
  }).lean()

  if (!schedule) {
    return { doctorId: doctorProfileId, date: dateStr, slotDurationMinutes: 0, slots: [] }
  }

  const startOfDay = new Date(date)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const isBlocked = await UnavailabilityBlockModel.exists({
    doctorId: doctorUserId,
    startDate: { $lte: endOfDay },
    endDate: { $gte: startOfDay },
  })

  if (isBlocked) {
    return {
      doctorId: doctorProfileId,
      date: dateStr,
      slotDurationMinutes: schedule.slotDurationMinutes,
      slots: [],
    }
  }

  const slotDuration = schedule.slotDurationMinutes
  const startMin = timeToMinutes(schedule.startTime)
  const endMin = timeToMinutes(schedule.endTime)
  const allTimes: string[] = []
  for (let t = startMin; t + slotDuration <= endMin; t += slotDuration) {
    allTimes.push(minutesToTime(t))
  }

  const confirmedAppointments = await AppointmentModel.find({
    doctorId: doctorUserId,
    appointmentDateTime: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending-payment', 'confirmed'] },
  })
    .select('appointmentDateTime')
    .lean()

  const toHHMM = (d: Date) =>
    `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`

  const occupiedTimes = new Set(confirmedAppointments.map((a) => toHHMM(a.appointmentDateTime)))

  const heldSlots = await SlotHoldModel.find({
    doctorId: doctorUserId,
    appointmentDateTime: { $gte: startOfDay, $lte: endOfDay },
  })
    .select('appointmentDateTime')
    .lean()

  for (const hold of heldSlots) {
    occupiedTimes.add(toHHMM(hold.appointmentDateTime))
  }

  const slots: TimeSlot[] = allTimes.map((time) => ({
    time,
    available: !occupiedTimes.has(time),
  }))

  return { doctorId: doctorProfileId, date: dateStr, slotDurationMinutes: slotDuration, slots }
}

// ── Slot Hold ──────────────────────────────────────────────────────────────────

export async function holdSlot(
  input: HoldSlotInput,
  patientId?: string,
): Promise<{
  holdId: string
  sessionRef: string
  expiresAt: Date
}> {
  const appointmentDateTime = new Date(input.appointmentDateTime)
  if (isNaN(appointmentDateTime.getTime())) {
    throw new AppError(400, 'INVALID_DATETIME', 'Invalid appointmentDateTime')
  }
  if (appointmentDateTime <= new Date()) {
    throw new AppError(400, 'DATE_IN_PAST', 'Cannot hold a slot in the past')
  }

  // Translate DoctorProfile._id → User._id
  const doctorUserId = await resolveUserIdFromProfileId(input.doctorId)

  const sessionRef = uuidv4()
  const expiresAt = new Date(Date.now() + SLOT_HOLD_TTL_MINUTES * 60 * 1000)
  const nationalIdHash = crypto
    .createHash('sha256')
    .update(input.patientNationalId)
    .digest('hex')

  try {
    const holdData: {
      doctorId: mongoose.Types.ObjectId
      appointmentDateTime: Date
      sessionRef: string
      patientNationalIdHash: string
      expiresAt: Date
      patientId?: mongoose.Types.ObjectId
    } = {
      doctorId: doctorUserId,
      appointmentDateTime,
      sessionRef,
      patientNationalIdHash: nationalIdHash,
      expiresAt,
    }

    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      holdData.patientId = new mongoose.Types.ObjectId(patientId)
    }

    const hold = await SlotHoldModel.create(holdData)

    logger.info('Slot hold created', {
      holdId: hold._id.toString(),
      doctorId: input.doctorId,
      appointmentDateTime: input.appointmentDateTime,
    })

    return { holdId: hold._id.toString(), sessionRef, expiresAt }
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: unknown }).code === 11000
    ) {
      throw new AppError(409, 'SLOT_UNAVAILABLE', 'This time slot is no longer available')
    }
    throw err
  }
}

// ── Confirm Appointment ────────────────────────────────────────────────────────

export async function confirmAppointment(
  sessionRef: string,
  paymentId: string,
  patientData: {
    patientId: string
    patientName: string
    patientPhone: string
    patientNationalId: string
  },
): Promise<{ bookingRef: string; appointmentId: string }> {
  if (!mongoose.Types.ObjectId.isValid(patientData.patientId)) {
    throw new AppError(400, 'INVALID_PATIENT', 'Valid patientId is required to confirm appointment')
  }

  const hold = await SlotHoldModel.findOneAndDelete({ sessionRef }).lean()
  if (!hold) {
    throw new AppError(404, 'HOLD_EXPIRED', 'Slot hold has expired or does not exist')
  }

  const bookingRef = await getNextBookingRef()

  const appointment = await AppointmentModel.create({
    bookingRef,
    patientId: new mongoose.Types.ObjectId(patientData.patientId),
    doctorId: hold.doctorId,
    appointmentDateTime: hold.appointmentDateTime,
    status: 'confirmed' as AppointmentStatus,
    paymentStatus: 'succeeded',
    paymentId: mongoose.Types.ObjectId.isValid(paymentId)
      ? new mongoose.Types.ObjectId(paymentId)
      : undefined,
    patientNameSnapshot: patientData.patientName,
    patientPhoneSnapshot: patientData.patientPhone,
    patientNationalIdSnapshot: patientData.patientNationalId,
    bookedAnonymously: false,
  })

  const appointmentId = appointment._id.toString()
  logger.info('Appointment confirmed', { bookingRef, appointmentId })
  return { bookingRef, appointmentId }
}

// ── List Appointments ──────────────────────────────────────────────────────────

export async function listAppointments(
  query: ListAppointmentsInput,
  viewer: { id: string; role: Role },
) {
  const filter: Record<string, unknown> = {}

  if (viewer.role === 'patient') {
    filter['patientId'] = new mongoose.Types.ObjectId(viewer.id)
  } else if (viewer.role === 'doctor') {
    // Appointments store User._id as doctorId — viewer.id IS the User._id
    filter['doctorId'] = new mongoose.Types.ObjectId(viewer.id)
  } else {
    if (query.doctorId) {
      // Admin may pass either a DoctorProfile._id or User._id; try DoctorProfile first
      if (mongoose.Types.ObjectId.isValid(query.doctorId)) {
        const profile = await DoctorProfileModel.findById(query.doctorId).select('userId').lean()
        filter['doctorId'] = profile
          ? profile.userId
          : new mongoose.Types.ObjectId(query.doctorId)
      }
    }
    if (query.patientId) filter['patientId'] = new mongoose.Types.ObjectId(query.patientId)
  }

  if (query.status) filter['status'] = query.status

  if (query.from || query.to) {
    const dateFilter: Record<string, Date> = {}
    if (query.from) dateFilter['$gte'] = new Date(query.from)
    if (query.to) {
      const to = new Date(query.to)
      to.setHours(23, 59, 59, 999)
      dateFilter['$lte'] = to
    }
    filter['appointmentDateTime'] = dateFilter
  }

  if (query.cursor) {
    filter['_id'] = { $lt: new mongoose.Types.ObjectId(query.cursor) }
  }

  const appointments = await AppointmentModel.find(filter)
    .sort({ appointmentDateTime: -1 })
    .limit(query.limit + 1)
    .populate('doctorId', 'nameAr nameEn')
    .populate('patientId', 'nameAr nameEn')
    .lean()

  const hasMore = appointments.length > query.limit
  if (hasMore) appointments.pop()

  return {
    items: appointments,
    meta: {
      cursor: hasMore
        ? (appointments[appointments.length - 1]?._id.toString() ?? null)
        : null,
      hasMore,
    },
  }
}

// ── Update Status ──────────────────────────────────────────────────────────────

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus,
  viewer: { id: string; role: Role },
  cancellationReason?: string,
): Promise<void> {
  const appt = await AppointmentModel.findById(appointmentId)
  if (!appt) throw new AppError(404, 'NOT_FOUND', 'Appointment not found')

  if (viewer.role === 'patient') {
    if (appt.patientId.toString() !== viewer.id) {
      throw new AppError(404, 'NOT_FOUND', 'Appointment not found')
    }
    if (newStatus !== 'cancelled') {
      throw new AppError(403, 'FORBIDDEN', 'Patients can only cancel appointments')
    }
    const hoursUntil = (appt.appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntil < 24) {
      throw new AppError(
        403,
        'CANCELLATION_WINDOW_CLOSED',
        'Appointments can only be cancelled at least 24 hours in advance',
      )
    }
  }

  if (viewer.role === 'doctor') {
    // Appointments store User._id as doctorId
    if (appt.doctorId.toString() !== viewer.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only update your own appointments')
    }
    if (newStatus !== 'completed') {
      throw new AppError(403, 'FORBIDDEN', 'Doctors can only mark appointments as completed')
    }
    if (appt.status !== 'confirmed') {
      throw new AppError(400, 'INVALID_STATUS_TRANSITION', `Cannot complete an appointment with status '${appt.status}'`)
    }
  }

  appt.status = newStatus
  if (newStatus === 'cancelled') {
    appt.cancelledBy = new mongoose.Types.ObjectId(viewer.id)
    appt.cancelledAt = new Date()
    if (cancellationReason) appt.cancellationReason = cancellationReason
  }

  await appt.save()
  logger.info('Appointment status updated', { appointmentId, newStatus, actorId: viewer.id })
}

// ── Consultation Notes ─────────────────────────────────────────────────────────

export async function saveConsultationNote(
  appointmentId: string,
  doctorUserId: string,
  noteText: string,
): Promise<{ noteId: string; editableUntil: Date }> {
  const appt = await AppointmentModel.findById(appointmentId).lean()
  if (!appt) throw new AppError(404, 'NOT_FOUND', 'Appointment not found')

  // Appointments store User._id as doctorId
  if (appt.doctorId.toString() !== doctorUserId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only add notes to your own appointments')
  }

  const existing = await ConsultationNoteModel.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
    doctorId: new mongoose.Types.ObjectId(doctorUserId),
  })

  if (existing) {
    if (existing.editableUntil < new Date()) {
      throw new AppError(403, 'NOTE_EDIT_WINDOW_CLOSED', 'The 24-hour edit window has closed')
    }
    existing.noteText = noteText
    await existing.save()
    return { noteId: existing._id.toString(), editableUntil: existing.editableUntil }
  }

  const editableUntil = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const note = await ConsultationNoteModel.create({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
    doctorId: new mongoose.Types.ObjectId(doctorUserId),
    patientId: appt.patientId,
    noteText,
    editableUntil,
  })

  return { noteId: note._id.toString(), editableUntil }
}

// ── Get Appointment Detail (doctor-scoped) ────────────────────────────────────

export async function getAppointmentForDoctor(
  appointmentId: string,
  doctorUserId: string,
) {
  const appt = await AppointmentModel.findById(appointmentId)
    .populate('patientId', 'nameAr nameEn phone nationalId')
    .lean()

  if (!appt || appt.doctorId.toString() !== doctorUserId) {
    throw new AppError(404, 'NOT_FOUND', 'Appointment not found')
  }

  const note = await ConsultationNoteModel.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
  }).lean()

  return { ...appt, consultationNote: note?.noteText ?? null }
}
