import mongoose, { Schema, type Model, type Document } from 'mongoose'
import { ServiceModel } from '../doctors/doctors.schema'
import { AppError } from '../../shared/middleware/errorHandler'
import { logger } from '../../shared/utils/logger'
import type { SpecialtySummary } from '@shared/types/doctor.types'

// ── ContentBlock Schema ────────────────────────────────────────────────────────

interface IContentBlock {
  key: string
  ar: string
  en: string
}

interface IContentBlockDocument extends IContentBlock, Document {
  _id: mongoose.Types.ObjectId
}

const contentBlockSchema = new Schema<IContentBlockDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    ar: { type: String, default: '' },
    en: { type: String, default: '' },
  },
  { timestamps: true },
)

export const ContentBlockModel: Model<IContentBlockDocument> = mongoose.model(
  'ContentBlock',
  contentBlockSchema,
)

// ── Service Functions ──────────────────────────────────────────────────────────

export async function getPublicContent(
  keys?: string[],
): Promise<Record<string, { ar: string; en: string }>> {
  const filter = keys && keys.length > 0 ? { key: { $in: keys } } : {}
  const blocks = await ContentBlockModel.find(filter).lean()

  return blocks.reduce<Record<string, { ar: string; en: string }>>((acc, b) => {
    acc[b.key] = { ar: b.ar, en: b.en }
    return acc
  }, {})
}

export async function updateContent(key: string, value: { ar: string; en: string }): Promise<void> {
  await ContentBlockModel.findOneAndUpdate(
    { key },
    { $set: { ar: value.ar, en: value.en } },
    { upsert: true },
  )
  logger.info('Content block updated', { key })
}

function toSpecialtySummary(s: {
  _id: mongoose.Types.ObjectId
  nameAr: string
  nameEn: string
  descriptionAr?: string
  descriptionEn?: string
  icon?: string
}): SpecialtySummary {
  const result: SpecialtySummary = {
    id: s._id.toString(),
    nameAr: s.nameAr,
    nameEn: s.nameEn,
  }
  if (s.descriptionAr) result.descriptionAr = s.descriptionAr
  if (s.descriptionEn) result.descriptionEn = s.descriptionEn
  if (s.icon) result.icon = s.icon
  return result
}

export async function listServices(): Promise<SpecialtySummary[]> {
  const services = await ServiceModel.find({ isActive: true })
    .sort({ sortOrder: 1, nameEn: 1 })
    .lean()

  return services.map((s) =>
    toSpecialtySummary({
      _id: s._id as mongoose.Types.ObjectId,
      nameAr: s.nameAr,
      nameEn: s.nameEn,
      descriptionAr: s.descriptionAr,
      descriptionEn: s.descriptionEn,
      icon: s.icon,
    }),
  )
}

export async function createService(dto: {
  nameAr: string
  nameEn: string
  descriptionAr?: string
  descriptionEn?: string
  icon?: string
}): Promise<SpecialtySummary> {
  const service = await ServiceModel.create({
    nameAr: dto.nameAr,
    nameEn: dto.nameEn,
    descriptionAr: dto.descriptionAr ?? '',
    descriptionEn: dto.descriptionEn ?? '',
    icon: dto.icon ?? '',
  })

  return toSpecialtySummary({
    _id: service._id as mongoose.Types.ObjectId,
    nameAr: service.nameAr,
    nameEn: service.nameEn,
    descriptionAr: service.descriptionAr,
    descriptionEn: service.descriptionEn,
    icon: service.icon,
  })
}

export async function updateService(
  id: string,
  dto: Partial<{
    nameAr: string
    nameEn: string
    descriptionAr: string
    descriptionEn: string
    icon: string
    isActive: boolean
  }>,
): Promise<SpecialtySummary> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid service ID')
  }

  const service = await ServiceModel.findByIdAndUpdate(id, { $set: dto }, { new: true }).lean()
  if (!service) throw new AppError(404, 'NOT_FOUND', 'Service not found')

  return toSpecialtySummary({
    _id: service._id as mongoose.Types.ObjectId,
    nameAr: service.nameAr,
    nameEn: service.nameEn,
    descriptionAr: service.descriptionAr,
    descriptionEn: service.descriptionEn,
    icon: service.icon,
  })
}
