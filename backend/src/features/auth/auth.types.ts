import type { Role, Language } from '@shared/types/user.types'

export type { Role, Language }

// ── Mongoose document interface ────────────────────────────────────────────────
export interface IUser {
  nameAr: string
  nameEn: string
  email: string
  passwordHash: string
  phone: string
  nationalId?: string | undefined
  dateOfBirth?: Date | undefined
  gender?: 'male' | 'female' | undefined
  profilePhotoUrl?: string | undefined
  role: Role
  isActive: boolean
  preferredLanguage: Language
  emailVerified: boolean
  emailVerificationToken?: string | undefined
  emailVerificationExpires?: Date | undefined
  passwordResetToken?: string | undefined
  passwordResetExpires?: Date | undefined
  consentGiven: boolean
  consentTimestamp?: Date | undefined
  createdAt: Date
  updatedAt: Date
}

// ── DTO shapes ─────────────────────────────────────────────────────────────────
export interface RegisterDto {
  nameAr: string
  nameEn: string
  email: string
  password: string
  phone: string
  nationalId?: string | undefined
  preferredLanguage?: Language | undefined
  consentGiven: boolean
}

export interface LoginDto {
  email: string
  password: string
}

export interface ResetPasswordDto {
  token: string
  newPassword: string
}

// ── JWT payload stored in token ────────────────────────────────────────────────
export interface JwtPayload {
  sub: string
  role: Role
  email: string
}
