import { z } from 'zod'

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/
const PHONE_REGEX = /^\+9665\d{8}$/           // +9665XXXXXXXX Saudi mobile
const NATIONAL_ID_REGEX = /^\d{10}$/

export const registerSchema = z.object({
  nameAr: z.string().min(2, 'الاسم بالعربي مطلوب ويجب أن يكون حرفين على الأقل'),
  nameEn: z.string().min(2, 'English name must be at least 2 characters'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .regex(
      PASSWORD_REGEX,
      'Password must be ≥8 chars and contain uppercase, number, and special character',
    ),
  phone: z.string().regex(PHONE_REGEX, 'Phone must be Saudi format: +9665XXXXXXXX'),
  nationalId: z.string().regex(NATIONAL_ID_REGEX, 'National ID must be exactly 10 digits').optional(),
  preferredLanguage: z.enum(['ar', 'en']).default('ar'),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: 'Consent to data processing is required (HIPAA/MOH §VI)' }),
  }),
})

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .regex(PASSWORD_REGEX, 'Password must be ≥8 chars with uppercase, number, and special character'),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
