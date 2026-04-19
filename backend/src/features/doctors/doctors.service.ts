import { Types } from 'mongoose'
import { DoctorProfileModel } from './doctors.schema'
import { ServiceModel } from './doctors.schema'
import { AppError } from '../../shared/middleware/errorHandler'
import type { DoctorPublic, SpecialtySummary } from '@shared/types/doctor.types'

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ListDoctorsQuery {
  specialtyId?: string
  cursor?: string
  limit?: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function toSpecialtySummary(svc: { _id: Types.ObjectId; nameAr: string; nameEn: string; descriptionAr?: string | undefined; descriptionEn?: string | undefined; icon?: string | undefined }): SpecialtySummary {
  const result: SpecialtySummary = {
    id: svc._id.toString(),
    nameAr: svc.nameAr,
    nameEn: svc.nameEn,
  }
  if (svc.descriptionAr) result.descriptionAr = svc.descriptionAr
  if (svc.descriptionEn) result.descriptionEn = svc.descriptionEn
  if (svc.icon) result.icon = svc.icon
  return result
}

// ── Services (Specialties) ─────────────────────────────────────────────────────
export async function listServices(): Promise<SpecialtySummary[]> {
  const services = await ServiceModel.find({ isActive: true })
    .sort({ sortOrder: 1, nameEn: 1 })
    .lean()

  return services.map((s) => toSpecialtySummary({
    _id: s._id as Types.ObjectId,
    nameAr: s.nameAr,
    nameEn: s.nameEn,
    descriptionAr: s.descriptionAr,
    descriptionEn: s.descriptionEn,
    icon: s.icon,
  }))
}

export async function getServiceById(id: string): Promise<SpecialtySummary> {
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'INVALID_ID', 'Invalid service ID')

  const service = await ServiceModel.findById(id).lean()
  if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found')

  return toSpecialtySummary({
    _id: service._id as Types.ObjectId,
    nameAr: service.nameAr,
    nameEn: service.nameEn,
    descriptionAr: service.descriptionAr,
    descriptionEn: service.descriptionEn,
    icon: service.icon,
  })
}

// ── Doctors ────────────────────────────────────────────────────────────────────
export async function listDoctors(query: ListDoctorsQuery): Promise<{
  doctors: DoctorPublic[]
  cursor: string | null
  hasMore: boolean
}> {
  const limit = Math.min(query.limit ?? 20, 50)

  const filter: Record<string, unknown> = { isActive: true }

  if (query.specialtyId) {
    if (!Types.ObjectId.isValid(query.specialtyId)) {
      throw new AppError(400, 'INVALID_ID', 'Invalid specialtyId')
    }
    filter.specialtyId = new Types.ObjectId(query.specialtyId)
  }

  if (query.cursor) {
    if (!Types.ObjectId.isValid(query.cursor)) {
      throw new AppError(400, 'INVALID_CURSOR', 'Invalid pagination cursor')
    }
    filter._id = { $gt: new Types.ObjectId(query.cursor) }
  }

  const profiles = await DoctorProfileModel.find(filter)
    .populate('userId', 'nameAr nameEn email profilePhotoUrl isActive')
    .populate('specialtyId', 'nameAr nameEn descriptionAr descriptionEn icon')
    .sort({ _id: 1 })
    .limit(limit + 1)
    .lean()

  const hasMore = profiles.length > limit
  const page = hasMore ? profiles.slice(0, limit) : profiles
  const lastItem = page[page.length - 1]
  const nextCursor = hasMore && lastItem ? lastItem._id.toString() : null

  const doctors: DoctorPublic[] = page
    .filter((p) => {
      const user = p.userId as unknown as { isActive?: boolean } | null
      return user && user.isActive !== false
    })
    .map((p) => {
      const user = p.userId as unknown as {
        _id: Types.ObjectId
        nameAr: string
        nameEn: string
        profilePhotoUrl?: string
      }
      const specialty = p.specialtyId as unknown as {
        _id: Types.ObjectId
        nameAr: string
        nameEn: string
        descriptionAr?: string
        descriptionEn?: string
        icon?: string
      }

      return {
        id: p._id.toString(),
        nameAr: user.nameAr,
        nameEn: user.nameEn,
        specialty: toSpecialtySummary(specialty),
        bioAr: p.bioAr,
        bioEn: p.bioEn,
        profilePhotoUrl: user.profilePhotoUrl ?? p.profilePhotoUrl,
        consultationFeeSAR: p.consultationFeeSAR,
        averageRating: p.averageRating,
        ratingCount: p.ratingCount,
        yearsOfExperience: p.yearsOfExperience,
        qualifications: p.qualifications,
        languages: p.languages,
        isActive: p.isActive,
      }
    })

  return { doctors, cursor: nextCursor, hasMore }
}

export async function getMyDoctorProfile(userId: string): Promise<DoctorPublic> {
  if (!Types.ObjectId.isValid(userId)) throw new AppError(400, 'INVALID_ID', 'Invalid user ID')

  const profile = await DoctorProfileModel.findOne({ userId: new Types.ObjectId(userId) })
    .populate('userId', 'nameAr nameEn email profilePhotoUrl isActive')
    .populate('specialtyId', 'nameAr nameEn descriptionAr descriptionEn icon')
    .lean()

  if (!profile) {
    throw new AppError(404, 'DOCTOR_PROFILE_NOT_FOUND', 'Doctor profile not found for this user')
  }

  const user = profile.userId as unknown as {
    _id: Types.ObjectId
    nameAr: string
    nameEn: string
    profilePhotoUrl?: string
  }
  const specialty = profile.specialtyId as unknown as {
    _id: Types.ObjectId
    nameAr: string
    nameEn: string
    descriptionAr?: string
    descriptionEn?: string
    icon?: string
  }

  return {
    id: profile._id.toString(),
    nameAr: user.nameAr,
    nameEn: user.nameEn,
    specialty: toSpecialtySummary(specialty),
    bioAr: profile.bioAr,
    bioEn: profile.bioEn,
    profilePhotoUrl: user.profilePhotoUrl ?? profile.profilePhotoUrl,
    consultationFeeSAR: profile.consultationFeeSAR,
    averageRating: profile.averageRating,
    ratingCount: profile.ratingCount,
    yearsOfExperience: profile.yearsOfExperience,
    qualifications: profile.qualifications,
    languages: profile.languages,
    isActive: profile.isActive,
  }
}

export async function getDoctorById(id: string): Promise<DoctorPublic> {
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'INVALID_ID', 'Invalid doctor ID')

  const profile = await DoctorProfileModel.findOne({ _id: id, isActive: true })
    .populate('userId', 'nameAr nameEn email profilePhotoUrl isActive')
    .populate('specialtyId', 'nameAr nameEn descriptionAr descriptionEn icon')
    .lean()

  if (!profile) throw new AppError(404, 'DOCTOR_NOT_FOUND', 'Doctor not found')

  const user = profile.userId as unknown as {
    _id: Types.ObjectId
    nameAr: string
    nameEn: string
    profilePhotoUrl?: string
    isActive?: boolean
  }
  const specialty = profile.specialtyId as unknown as {
    _id: Types.ObjectId
    nameAr: string
    nameEn: string
    descriptionAr?: string
    descriptionEn?: string
    icon?: string
  }

  return {
    id: profile._id.toString(),
    nameAr: user.nameAr,
    nameEn: user.nameEn,
    specialty: toSpecialtySummary(specialty),
    bioAr: profile.bioAr,
    bioEn: profile.bioEn,
    profilePhotoUrl: user.profilePhotoUrl ?? profile.profilePhotoUrl,
    consultationFeeSAR: profile.consultationFeeSAR,
    averageRating: profile.averageRating,
    ratingCount: profile.ratingCount,
    yearsOfExperience: profile.yearsOfExperience,
    qualifications: profile.qualifications,
    languages: profile.languages,
    isActive: profile.isActive,
  }
}
