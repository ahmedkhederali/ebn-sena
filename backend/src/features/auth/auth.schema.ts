import mongoose, { Schema, type Document, type Model } from 'mongoose'
import type { IUser, Role, Language } from './auth.types'

// ── User document ─────────────────────────────────────────────────────────────
export interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId   // narrows Document's _id from unknown to ObjectId
  id: string                     // Mongoose virtual — stringified _id
}

const userSchema = new Schema<IUserDocument>(
  {
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, required: true, trim: true },
    nationalId: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female'] },
    profilePhotoUrl: { type: String },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin', 'receptionist'] satisfies Role[],
      required: true,
      default: 'patient',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    preferredLanguage: {
      type: String,
      enum: ['ar', 'en'] satisfies Language[],
      default: 'ar',
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    consentGiven: { type: Boolean, required: true, default: false },
    consentTimestamp: { type: Date },
  },
  { timestamps: true },
)

// Compound indexes
userSchema.index({ nationalId: 1 }, { unique: true, sparse: true })
userSchema.index({ role: 1, isActive: 1 })

export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema)

// ── RefreshToken document ──────────────────────────────────────────────────────
interface IRefreshToken {
  userId: mongoose.Types.ObjectId
  tokenHash: string          // SHA-256 of the raw token
  expiresAt: Date
  isRevoked: boolean
  userAgent?: string
  ipAddress?: string
}

interface IRefreshTokenDocument extends IRefreshToken, Document {}

const refreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false, index: true },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// TTL — MongoDB auto-deletes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
refreshTokenSchema.index({ userId: 1, isRevoked: 1 })

export const RefreshTokenModel: Model<IRefreshTokenDocument> = mongoose.model<IRefreshTokenDocument>(
  'RefreshToken',
  refreshTokenSchema,
)
