import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { UserModel } from '../auth/auth.schema'
import { AppointmentModel } from '../appointments/appointments.schema'
import { DoctorProfileModel, ServiceModel } from '../doctors/doctors.schema'
import { AvailabilityScheduleModel } from '../appointments/appointments.schema'
import { AppError } from '../../shared/middleware/errorHandler'
import { logger } from '../../shared/utils/logger'
import type { Role } from '../auth/auth.types'
import type { AppointmentStatus } from '@shared/types/appointment.types'
import type { UserPublic } from '@shared/types/user.types'

function toUserPublic(user: {
  _id: mongoose.Types.ObjectId
  nameAr: string
  nameEn: string
  email: string
  phone: string
  role: Role
  preferredLanguage: 'ar' | 'en'
  profilePhotoUrl?: string | null
  isActive: boolean
  emailVerified: boolean
  createdAt: Date
}): UserPublic {
  return {
    id: user._id.toString(),
    nameAr: user.nameAr,
    nameEn: user.nameEn,
    email: user.email,
    phone: user.phone,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    ...(user.profilePhotoUrl != null ? { profilePhotoUrl: user.profilePhotoUrl } : {}),
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  }
}

// ── Patients ───────────────────────────────────────────────────────────────────

export async function searchPatients(query: {
  search?: string
  cursor?: string
  limit?: number
}): Promise<{ items: UserPublic[]; meta: { cursor: string | null; hasMore: boolean } }> {
  const limit = Math.min(query.limit ?? 20, 50)
  const filter: Record<string, unknown> = { role: 'patient' }

  if (query.search) {
    const rx = new RegExp(query.search, 'i')
    filter['$or'] = [{ nameAr: rx }, { nameEn: rx }, { nationalId: rx }, { phone: rx }]
  }

  if (query.cursor) {
    filter['_id'] = { $lt: new mongoose.Types.ObjectId(query.cursor) }
  }

  const users = await UserModel.find(filter).sort({ _id: -1 }).limit(limit + 1).lean()

  const hasMore = users.length > limit
  if (hasMore) users.pop()

  return {
    items: users.map((u) => toUserPublic({
      _id: u._id as mongoose.Types.ObjectId,
      nameAr: u.nameAr,
      nameEn: u.nameEn,
      email: u.email,
      phone: u.phone,
      role: u.role,
      preferredLanguage: u.preferredLanguage,
      profilePhotoUrl: u.profilePhotoUrl ?? null,
      isActive: u.isActive,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
    })),
    meta: {
      cursor: hasMore ? (users[users.length - 1]?._id.toString() ?? null) : null,
      hasMore,
    },
  }
}

export async function getPatientById(patientId: string): Promise<
  UserPublic & { recentAppointments: { id: string; bookingRef: string; appointmentDateTime: string; status: AppointmentStatus }[] }
> {
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid patient ID')
  }

  const user = await UserModel.findOne({ _id: patientId, role: 'patient' }).lean()
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Patient not found')

  const appointments = await AppointmentModel.find({ patientId: user._id })
    .sort({ appointmentDateTime: -1 })
    .limit(10)
    .populate('doctorId', 'nameAr nameEn')
    .lean()

  return {
    ...toUserPublic({
      _id: user._id as mongoose.Types.ObjectId,
      nameAr: user.nameAr,
      nameEn: user.nameEn,
      email: user.email,
      phone: user.phone,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      profilePhotoUrl: user.profilePhotoUrl ?? null,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    }),
    recentAppointments: appointments.map((a) => ({
      id: a._id.toString(),
      bookingRef: a.bookingRef,
      appointmentDateTime: a.appointmentDateTime.toISOString(),
      status: a.status,
    })),
  }
}

// ── Staff Users ────────────────────────────────────────────────────────────────

export async function listUsers(query: {
  role?: Role
  cursor?: string
  limit?: number
}): Promise<{ items: UserPublic[]; meta: { cursor: string | null; hasMore: boolean } }> {
  const limit = Math.min(query.limit ?? 20, 50)
  const filter: Record<string, unknown> = {}

  if (query.role) filter['role'] = query.role
  if (query.cursor) filter['_id'] = { $lt: new mongoose.Types.ObjectId(query.cursor) }

  const users = await UserModel.find(filter).sort({ _id: -1 }).limit(limit + 1).lean()

  const hasMore = users.length > limit
  if (hasMore) users.pop()

  return {
    items: users.map((u) => toUserPublic({
      _id: u._id as mongoose.Types.ObjectId,
      nameAr: u.nameAr,
      nameEn: u.nameEn,
      email: u.email,
      phone: u.phone,
      role: u.role,
      preferredLanguage: u.preferredLanguage,
      profilePhotoUrl: u.profilePhotoUrl ?? null,
      isActive: u.isActive,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
    })),
    meta: {
      cursor: hasMore ? (users[users.length - 1]?._id.toString() ?? null) : null,
      hasMore,
    },
  }
}

export async function createStaffUser(dto: {
  nameAr: string
  nameEn: string
  email: string
  phone: string
  role: 'admin' | 'receptionist' | 'doctor'
}): Promise<{ userId: string; tempPassword: string }> {
  const existing = await UserModel.findOne({ email: dto.email }).lean()
  if (existing) throw new AppError(409, 'EMAIL_EXISTS', 'Email already in use')

  const validRoles: Role[] = ['admin', 'receptionist', 'doctor']
  if (!validRoles.includes(dto.role)) {
    throw new AppError(400, 'INVALID_ROLE', 'Role must be admin, receptionist, or doctor')
  }

  const tempPassword = crypto.randomBytes(8).toString('hex')
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  const user = await UserModel.create({
    nameAr: dto.nameAr,
    nameEn: dto.nameEn,
    email: dto.email,
    phone: dto.phone,
    passwordHash,
    role: dto.role,
    emailVerified: true,
    consentGiven: true,
    consentTimestamp: new Date(),
    preferredLanguage: 'ar',
  })

  logger.info('Staff user created', { userId: user._id.toString(), role: dto.role })

  return { userId: user._id.toString(), tempPassword }
}

// ── Doctor Profile Management ──────────────────────────────────────────────────

export async function createDoctorWithProfile(dto: {
  nameAr: string
  nameEn: string
  email: string
  phone: string
  specialtyId: string
  consultationFeeSAR: number
  bioAr?: string
  bioEn?: string
  yearsOfExperience?: number
  qualifications?: string[]
  languages?: string[]
}): Promise<{ userId: string; doctorProfileId: string; tempPassword: string }> {
  if (!mongoose.Types.ObjectId.isValid(dto.specialtyId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid specialtyId')
  }
  const specialty = await ServiceModel.findById(dto.specialtyId).lean()
  if (!specialty) throw new AppError(404, 'SPECIALTY_NOT_FOUND', 'Specialty not found')

  const existing = await UserModel.findOne({ email: dto.email }).lean()
  if (existing) throw new AppError(409, 'EMAIL_EXISTS', 'Email already in use')

  const tempPassword = crypto.randomBytes(8).toString('hex')
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  // Create user first, then profile — clean up user if profile creation fails
  const user = await UserModel.create({
    nameAr: dto.nameAr,
    nameEn: dto.nameEn,
    email: dto.email,
    phone: dto.phone,
    passwordHash,
    role: 'doctor' as Role,
    emailVerified: true,
    consentGiven: true,
    consentTimestamp: new Date(),
    preferredLanguage: 'ar',
  })

  let profile
  try {
    profile = await DoctorProfileModel.create({
      userId: user._id,
      specialtyId: new mongoose.Types.ObjectId(dto.specialtyId),
      consultationFeeSAR: dto.consultationFeeSAR,
      bioAr: dto.bioAr ?? '',
      bioEn: dto.bioEn ?? '',
      yearsOfExperience: dto.yearsOfExperience ?? 0,
      qualifications: dto.qualifications ?? [],
      languages: dto.languages ?? ['ar'],
      isActive: true,
      acceptingNewPatients: true,
    })
  } catch (profileErr) {
    await UserModel.findByIdAndDelete(user._id)
    throw profileErr
  }

  const userId = user._id.toString()
  const doctorProfileId = profile._id.toString()

  logger.info('Doctor created with profile', { userId, doctorProfileId })
  return { userId, doctorProfileId, tempPassword }
}

export async function updateDoctorProfile(
  doctorProfileId: string,
  dto: {
    specialtyId?: string
    consultationFeeSAR?: number
    bioAr?: string
    bioEn?: string
    yearsOfExperience?: number
    qualifications?: string[]
    languages?: string[]
    isActive?: boolean
    acceptingNewPatients?: boolean
  },
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(doctorProfileId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid doctor profile ID')
  }

  if (dto.specialtyId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(dto.specialtyId)) {
      throw new AppError(400, 'INVALID_ID', 'Invalid specialtyId')
    }
    const specialty = await ServiceModel.findById(dto.specialtyId).lean()
    if (!specialty) throw new AppError(404, 'SPECIALTY_NOT_FOUND', 'Specialty not found')
  }

  const update: Record<string, unknown> = {}
  if (dto.specialtyId !== undefined) update['specialtyId'] = new mongoose.Types.ObjectId(dto.specialtyId)
  if (dto.consultationFeeSAR !== undefined) update['consultationFeeSAR'] = dto.consultationFeeSAR
  if (dto.bioAr !== undefined) update['bioAr'] = dto.bioAr
  if (dto.bioEn !== undefined) update['bioEn'] = dto.bioEn
  if (dto.yearsOfExperience !== undefined) update['yearsOfExperience'] = dto.yearsOfExperience
  if (dto.qualifications !== undefined) update['qualifications'] = dto.qualifications
  if (dto.languages !== undefined) update['languages'] = dto.languages
  if (dto.isActive !== undefined) update['isActive'] = dto.isActive
  if (dto.acceptingNewPatients !== undefined) update['acceptingNewPatients'] = dto.acceptingNewPatients

  const result = await DoctorProfileModel.findByIdAndUpdate(
    doctorProfileId,
    { $set: update },
    { new: true },
  )
  if (!result) throw new AppError(404, 'NOT_FOUND', 'Doctor profile not found')

  logger.info('Doctor profile updated', { doctorProfileId })
}

export async function listDoctorProfiles(query: {
  search?: string
  cursor?: string
  limit?: number
}) {
  const limit = Math.min(query.limit ?? 20, 50)
  const filter: Record<string, unknown> = {}

  if (query.cursor && mongoose.Types.ObjectId.isValid(query.cursor)) {
    filter['_id'] = { $gt: new mongoose.Types.ObjectId(query.cursor) }
  }

  const profiles = await DoctorProfileModel.find(filter)
    .populate('userId', 'nameAr nameEn email phone isActive')
    .populate('specialtyId', 'nameAr nameEn')
    .sort({ _id: 1 })
    .limit(limit + 1)
    .lean()

  let page = profiles
  let hasMore = false

  if (profiles.length > limit) {
    hasMore = true
    page = profiles.slice(0, limit)
  }

  // Apply name search after populate
  if (query.search) {
    const rx = new RegExp(query.search, 'i')
    page = page.filter((p) => {
      const user = p.userId as unknown as { nameAr?: string; nameEn?: string } | null
      return rx.test(user?.nameAr ?? '') || rx.test(user?.nameEn ?? '')
    })
  }

  const lastItem = page[page.length - 1]

  return {
    items: page.map((p) => {
      const user = p.userId as unknown as {
        _id: mongoose.Types.ObjectId
        nameAr: string
        nameEn: string
        email: string
        phone: string
        isActive: boolean
      }
      const spec = p.specialtyId as unknown as { _id: mongoose.Types.ObjectId; nameAr: string; nameEn: string } | null
      return {
        id: p._id.toString(),
        userId: user._id.toString(),
        nameAr: user.nameAr,
        nameEn: user.nameEn,
        email: user.email,
        phone: user.phone,
        specialtyId: spec?._id?.toString() ?? '',
        specialty: spec?.nameEn ?? '',
        specialtyAr: spec?.nameAr ?? '',
        consultationFeeSAR: p.consultationFeeSAR,
        isActive: p.isActive,
        acceptingNewPatients: p.acceptingNewPatients,
        yearsOfExperience: p.yearsOfExperience,
        bioAr: p.bioAr,
        bioEn: p.bioEn,
      }
    }),
    meta: {
      cursor: hasMore && lastItem ? lastItem._id.toString() : null,
      hasMore,
    },
  }
}

export async function updateUser(
  actorId: string,
  targetId: string,
  dto: { role?: Role; isActive?: boolean },
): Promise<void> {
  if (actorId === targetId && dto.isActive === false) {
    throw new AppError(403, 'CANNOT_DEACTIVATE_SELF', 'Admins cannot deactivate their own account')
  }

  const validRoles: Role[] = ['admin', 'receptionist', 'doctor', 'patient']
  if (dto.role !== undefined && !validRoles.includes(dto.role)) {
    throw new AppError(400, 'INVALID_ROLE', 'Invalid role')
  }

  // Prevent downgrading to patient via admin endpoint
  if (dto.role === 'patient') {
    throw new AppError(400, 'INVALID_ROLE', 'Cannot set role to patient via admin endpoint')
  }

  const update: Record<string, unknown> = {}
  if (dto.role !== undefined) update['role'] = dto.role
  if (dto.isActive !== undefined) update['isActive'] = dto.isActive

  const result = await UserModel.findByIdAndUpdate(targetId, { $set: update }, { new: true })
  if (!result) throw new AppError(404, 'NOT_FOUND', 'User not found')

  logger.info('User updated by admin', { targetId, actorId, changes: update })
}

// ── Admin Appointments ─────────────────────────────────────────────────────────

export async function adminListAppointments(query: {
  doctorId?: string
  patientId?: string
  status?: AppointmentStatus
  from?: string
  to?: string
  search?: string
  cursor?: string
  limit?: number
}) {
  const limit = Math.min(query.limit ?? 20, 50)
  const filter: Record<string, unknown> = {}

  if (query.doctorId && mongoose.Types.ObjectId.isValid(query.doctorId)) {
    filter['doctorId'] = new mongoose.Types.ObjectId(query.doctorId)
  }
  if (query.patientId && mongoose.Types.ObjectId.isValid(query.patientId)) {
    filter['patientId'] = new mongoose.Types.ObjectId(query.patientId)
  }
  if (query.status) filter['status'] = query.status
  if (query.search) {
    const rx = new RegExp(query.search, 'i')
    filter['$or'] = [{ bookingRef: rx }, { patientNameSnapshot: rx }]
  }

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

  if (query.cursor) filter['_id'] = { $lt: new mongoose.Types.ObjectId(query.cursor) }

  const appointments = await AppointmentModel.find(filter)
    .sort({ appointmentDateTime: -1 })
    .limit(limit + 1)
    .populate('doctorId', 'nameAr nameEn')
    .populate('patientId', 'nameAr nameEn phone')
    .lean()

  const hasMore = appointments.length > limit
  if (hasMore) appointments.pop()

  return {
    items: appointments.map((a) => ({
      id: a._id.toString(),
      bookingRef: a.bookingRef,
      appointmentDateTime: a.appointmentDateTime.toISOString(),
      status: a.status,
      patientName: a.patientNameSnapshot,
      doctorId: a.doctorId?.toString() ?? '',
      patientId: a.patientId?.toString() ?? '',
    })),
    meta: {
      cursor: hasMore ? (appointments[appointments.length - 1]?._id.toString() ?? null) : null,
      hasMore,
    },
  }
}

export async function adminRescheduleAppointment(
  _adminId: string,
  appointmentId: string,
  newDateTime: string,
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid appointment ID')
  }

  const appt = await AppointmentModel.findById(appointmentId)
  if (!appt) throw new AppError(404, 'NOT_FOUND', 'Appointment not found')

  if (!['confirmed', 'pending-payment'].includes(appt.status)) {
    throw new AppError(400, 'INVALID_STATUS', 'Only confirmed or pending appointments can be rescheduled')
  }

  const newDt = new Date(newDateTime)
  if (isNaN(newDt.getTime())) throw new AppError(400, 'INVALID_DATE', 'Invalid newDateTime')

  // Conflict check: ensure no other confirmed appointment at the new time for the same doctor
  const conflict = await AppointmentModel.findOne({
    doctorId: appt.doctorId,
    appointmentDateTime: newDt,
    status: { $in: ['confirmed', 'pending-payment'] },
    _id: { $ne: appt._id },
  }).lean()

  if (conflict) {
    throw new AppError(409, 'SLOT_CONFLICT', 'The target time slot is already booked for this doctor')
  }

  // Also check availability schedule
  const dayOfWeek = newDt.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
  const schedule = await AvailabilityScheduleModel.findOne({
    doctorId: appt.doctorId,
    dayOfWeek,
    isActive: true,
  }).lean()

  if (!schedule) {
    throw new AppError(400, 'OUTSIDE_SCHEDULE', 'Doctor has no availability on that day')
  }

  appt.appointmentDateTime = newDt
  await appt.save()

  logger.info('Appointment rescheduled by admin', { appointmentId, newDateTime })
}

export async function adminCancelAppointment(
  adminId: string,
  appointmentId: string,
  reason?: string,
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid appointment ID')
  }

  const appt = await AppointmentModel.findById(appointmentId)
  if (!appt) throw new AppError(404, 'NOT_FOUND', 'Appointment not found')

  appt.status = 'cancelled'
  appt.cancelledBy = new mongoose.Types.ObjectId(adminId)
  appt.cancelledAt = new Date()
  if (reason) appt.cancellationReason = reason

  await appt.save()
  logger.info('Appointment cancelled by admin', { appointmentId, adminId })
}
