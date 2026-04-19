import mongoose from 'mongoose'
import { UserModel } from '../auth/auth.schema'
import { AppointmentModel, ConsultationNoteModel } from '../appointments/appointments.schema'
import { DoctorProfileModel } from '../doctors/doctors.schema'
import { AppError } from '../../shared/middleware/errorHandler'
import type { UserPublic } from '@shared/types/user.types'
import type { AppointmentStatus } from '@shared/types/appointment.types'

// ── Profile ────────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<UserPublic> {
  const user = await UserModel.findById(userId).lean()
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')

  return {
    id: user._id.toString(),
    nameAr: user.nameAr,
    nameEn: user.nameEn,
    email: user.email,
    phone: user.phone,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    ...(user.profilePhotoUrl !== undefined ? { profilePhotoUrl: user.profilePhotoUrl } : {}),
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  }
}

export async function updateProfile(
  userId: string,
  dto: {
    nameAr?: string
    nameEn?: string
    phone?: string
    preferredLanguage?: 'ar' | 'en'
    dateOfBirth?: string
    gender?: 'male' | 'female'
  },
): Promise<UserPublic> {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        ...(dto.nameAr !== undefined ? { nameAr: dto.nameAr } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.preferredLanguage !== undefined ? { preferredLanguage: dto.preferredLanguage } : {}),
        ...(dto.dateOfBirth !== undefined ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
        ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      },
    },
    { new: true },
  ).lean()

  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')

  return {
    id: user._id.toString(),
    nameAr: user.nameAr,
    nameEn: user.nameEn,
    email: user.email,
    phone: user.phone,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    ...(user.profilePhotoUrl !== undefined ? { profilePhotoUrl: user.profilePhotoUrl } : {}),
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  }
}

// ── Appointments ───────────────────────────────────────────────────────────────

function buildAppointmentSummary(appt: {
  _id: mongoose.Types.ObjectId
  bookingRef: string
  appointmentDateTime: Date
  status: AppointmentStatus
  doctorId: unknown
  paymentId?: mongoose.Types.ObjectId
  paymentStatus?: string
}) {
  const doc = appt.doctorId as { _id: mongoose.Types.ObjectId; nameAr: string; nameEn: string } | null

  return {
    id: appt._id.toString(),
    bookingRef: appt.bookingRef,
    appointmentDateTime: appt.appointmentDateTime.toISOString(),
    status: appt.status,
    doctor: doc
      ? { id: doc._id.toString(), nameAr: doc.nameAr, nameEn: doc.nameEn, specialty: '' }
      : { id: '', nameAr: '', nameEn: '', specialty: '' },
    consultationFeeSAR: 0,
    hasNote: false,
    hasReceipt: !!(appt.paymentId && appt.paymentStatus === 'succeeded'),
  }
}

export async function getPatientAppointments(
  userId: string,
  query: { cursor?: string; limit?: number; status?: AppointmentStatus },
): Promise<{ items: ReturnType<typeof buildAppointmentSummary>[]; meta: { cursor: string | null; hasMore: boolean } }> {
  const limit = Math.min(query.limit ?? 20, 50)
  const filter: Record<string, unknown> = {
    patientId: new mongoose.Types.ObjectId(userId),
  }

  if (query.status) filter['status'] = query.status
  if (query.cursor) filter['_id'] = { $lt: new mongoose.Types.ObjectId(query.cursor) }

  const appointments = await AppointmentModel.find(filter)
    .sort({ appointmentDateTime: -1 })
    .limit(limit + 1)
    .populate('doctorId', 'nameAr nameEn')
    .lean()

  const hasMore = appointments.length > limit
  if (hasMore) appointments.pop()

  return {
    items: appointments.map((a) => buildAppointmentSummary({
      _id: a._id as mongoose.Types.ObjectId,
      bookingRef: a.bookingRef,
      appointmentDateTime: a.appointmentDateTime,
      status: a.status,
      doctorId: a.doctorId,
      ...(a.paymentId !== undefined ? { paymentId: a.paymentId as mongoose.Types.ObjectId } : {}),
      ...(a.paymentStatus !== undefined ? { paymentStatus: a.paymentStatus } : {}),
    })),
    meta: {
      cursor: hasMore ? (appointments[appointments.length - 1]?._id.toString() ?? null) : null,
      hasMore,
    },
  }
}

export async function getPatientHistory(userId: string) {
  const appointments = await AppointmentModel.find({
    patientId: new mongoose.Types.ObjectId(userId),
    status: { $in: ['completed'] },
  })
    .sort({ appointmentDateTime: -1 })
    .populate('doctorId', 'nameAr nameEn')
    .lean()

  const notes = await ConsultationNoteModel.find({
    patientId: new mongoose.Types.ObjectId(userId),
  }).lean()

  const noteMap = new Map(notes.map((n) => [n.appointmentId.toString(), n.noteText]))

  return appointments.map((a) => ({
    ...buildAppointmentSummary({
      _id: a._id as mongoose.Types.ObjectId,
      bookingRef: a.bookingRef,
      appointmentDateTime: a.appointmentDateTime,
      status: a.status,
      doctorId: a.doctorId,
      ...(a.paymentId !== undefined ? { paymentId: a.paymentId as mongoose.Types.ObjectId } : {}),
      ...(a.paymentStatus !== undefined ? { paymentStatus: a.paymentStatus } : {}),
    }),
    note: noteMap.get(a._id.toString()) ?? null,
  }))
}

export async function getAppointmentDetail(userId: string, appointmentId: string) {
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid appointment ID')
  }

  const appt = await AppointmentModel.findById(appointmentId)
    .populate('doctorId', 'nameAr nameEn')
    .lean()

  if (!appt || appt.patientId.toString() !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Appointment not found')
  }

  const note = await ConsultationNoteModel.findOne({
    appointmentId: appt._id,
    patientId: new mongoose.Types.ObjectId(userId),
  }).lean()

  const doctor = appt.doctorId as unknown as { _id: mongoose.Types.ObjectId; nameAr: string; nameEn: string } | null
  const profile = doctor ? await DoctorProfileModel.findOne({ userId: doctor._id }).lean() : null

  return {
    id: appt._id.toString(),
    bookingRef: appt.bookingRef,
    appointmentDateTime: appt.appointmentDateTime.toISOString(),
    status: appt.status,
    doctor: doctor
      ? { id: doctor._id.toString(), nameAr: doctor.nameAr, nameEn: doctor.nameEn, specialty: '' }
      : { id: '', nameAr: '', nameEn: '', specialty: '' },
    consultationNote: note?.noteText ?? null,
    consultationNoteEditableUntil: note?.editableUntil.toISOString() ?? null,
    paymentStatus: appt.paymentStatus,
    paymentId: appt.paymentId?.toString() ?? null,
    consultationFeeSAR: profile?.consultationFeeSAR ?? 0,
  }
}
