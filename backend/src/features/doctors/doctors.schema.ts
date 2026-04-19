import { Schema, model, Types, Document } from 'mongoose'

// ── Service (Specialty) ────────────────────────────────────────────────────────
export interface IService extends Document {
  _id: Types.ObjectId
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  icon: string          // CSS class or URL
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const serviceSchema = new Schema<IService>(
  {
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    descriptionAr: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    icon: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
)

serviceSchema.index({ isActive: 1, sortOrder: 1 })

export const ServiceModel = model<IService>('Service', serviceSchema)

// ── DoctorProfile ──────────────────────────────────────────────────────────────
export interface IDoctorProfile extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId      // ref → User
  specialtyId: Types.ObjectId // ref → Service
  bioAr: string
  bioEn: string
  profilePhotoUrl: string
  consultationFeeSAR: number
  yearsOfExperience: number
  qualifications: string[]
  languages: string[]         // e.g. ['ar', 'en']
  averageRating: number
  ratingCount: number
  isActive: boolean
  acceptingNewPatients: boolean
  createdAt: Date
  updatedAt: Date
}

const doctorProfileSchema = new Schema<IDoctorProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialtyId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    bioAr: { type: String, default: '' },
    bioEn: { type: String, default: '' },
    profilePhotoUrl: { type: String, default: '' },
    consultationFeeSAR: { type: Number, required: true, min: 0 },
    yearsOfExperience: { type: Number, default: 0, min: 0 },
    qualifications: [{ type: String }],
    languages: [{ type: String }],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    acceptingNewPatients: { type: Boolean, default: true },
  },
  { timestamps: true },
)

doctorProfileSchema.index({ specialtyId: 1, isActive: 1 })
doctorProfileSchema.index({ isActive: 1, averageRating: -1 })

export const DoctorProfileModel = model<IDoctorProfile>('DoctorProfile', doctorProfileSchema)
