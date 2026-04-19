import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { UserModel, RefreshTokenModel } from './auth.schema'
import { AppError } from '../../shared/middleware/errorHandler'
import { env, jwtPrivateKey, jwtPublicKey } from '../../config/env'
import { logger } from '../../shared/utils/logger'
import type { RegisterDto, LoginDto, JwtPayload, IUser, Role, Language } from './auth.types'

const BCRYPT_ROUNDS = 12

// ── Helpers ───────────────────────────────────────────────────────────────────
function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function issueAccessToken(payload: JwtPayload): string {
  // Cast options to avoid exactOptionalPropertyTypes friction with jsonwebtoken overloads
  const opts = { algorithm: 'RS256', expiresIn: env.JWT_ACCESS_EXPIRY } as jwt.SignOptions
  return jwt.sign(payload, jwtPrivateKey, opts)
}

function issueRawRefreshToken(): string {
  return uuidv4() + '-' + crypto.randomBytes(32).toString('hex')
}

// ── Public service functions ───────────────────────────────────────────────────
export async function register(dto: RegisterDto): Promise<{ userId: string }> {
  // Consent is mandatory (Constitution §VI)
  if (!dto.consentGiven) {
    throw new AppError(403, 'CONSENT_REQUIRED', 'Consent to data processing is required')
  }

  const existing = await UserModel.findOne({ email: dto.email }).lean()
  if (existing) throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists')

  if (dto.nationalId) {
    const dupNationalId = await UserModel.findOne({ nationalId: dto.nationalId }).lean()
    if (dupNationalId) {
      throw new AppError(409, 'NATIONAL_ID_EXISTS', 'An account with this National ID already exists')
    }
  }

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
  const verificationToken = crypto.randomBytes(32).toString('hex')
  const verificationTokenHash = hashToken(verificationToken)

  const user = await UserModel.create({
    nameAr: dto.nameAr,
    nameEn: dto.nameEn,
    email: dto.email,
    passwordHash,
    phone: dto.phone,
    nationalId: dto.nationalId,
    preferredLanguage: dto.preferredLanguage ?? 'ar',
    role: 'patient',
    consentGiven: true,
    consentTimestamp: new Date(),
    emailVerificationToken: verificationTokenHash,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 h
  })

  // TODO: send verification email via notifications/email.service.ts
  logger.info('User registered', { userId: user._id.toString(), role: 'patient' })

  return { userId: user._id.toString() }
}

export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = hashToken(token)
  const user = await UserModel.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires')

  if (!user) throw new AppError(400, 'INVALID_TOKEN', 'Verification token is invalid or expired')

  user.emailVerified = true
  user.emailVerificationToken = undefined
  user.emailVerificationExpires = undefined
  await user.save()

  logger.info('Email verified', { userId: user._id.toString() })
}

export async function login(
  dto: LoginDto,
  meta: { userAgent?: string | undefined; ip?: string | undefined },
): Promise<{ accessToken: string; refreshToken: string; user: { id: string; nameAr: string; nameEn: string; email: string; role: Role; preferredLanguage: Language } }> {
  const user = await UserModel.findOne({ email: dto.email })
    .select('+passwordHash')
    .lean()

  if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  if (!user.isActive) throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account has been deactivated')
  if (!user.emailVerified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in')
  }

  const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash)
  if (!passwordMatch) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')

  // Issue tokens
  const jwtPayload: JwtPayload = {
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  }
  const accessToken = issueAccessToken(jwtPayload)
  const rawRefreshToken = issueRawRefreshToken()

  // Store hashed refresh token
  const refreshExpiry = new Date()
  refreshExpiry.setDate(refreshExpiry.getDate() + 7)

  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshExpiry,
    userAgent: meta.userAgent,
    ipAddress: meta.ip,
  })

  logger.info('User logged in', { userId: user._id.toString(), role: user.role })

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user._id.toString(),
      nameAr: user.nameAr,
      nameEn: user.nameEn,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
    },
  }
}

export async function refreshAccessToken(
  rawToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenHash = hashToken(rawToken)
  const stored = await RefreshTokenModel.findOne({ tokenHash, isRevoked: false }).lean()

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired')
  }

  const user = await UserModel.findById(stored.userId).lean()
  if (!user || !user.isActive) {
    throw new AppError(401, 'ACCOUNT_INACTIVE', 'Account is inactive')
  }

  // Rotate — revoke old, issue new
  await RefreshTokenModel.findByIdAndUpdate(stored._id, { isRevoked: true })

  const newRawToken = issueRawRefreshToken()
  const newExpiry = new Date()
  newExpiry.setDate(newExpiry.getDate() + 7)

  await RefreshTokenModel.create({
    userId: stored.userId,
    tokenHash: hashToken(newRawToken),
    expiresAt: newExpiry,
  })

  const accessToken = issueAccessToken({
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  })

  return { accessToken, refreshToken: newRawToken }
}

export async function logout(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken)
  await RefreshTokenModel.findOneAndUpdate({ tokenHash }, { isRevoked: true })
  logger.info('User logged out')
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await UserModel.findOne({ email }).lean()
  // Always respond 200 to prevent email enumeration
  if (!user) return

  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetTokenHash = hashToken(resetToken)

  await UserModel.findByIdAndUpdate(user._id, {
    passwordResetToken: resetTokenHash,
    passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 min
  })

  // TODO: send reset email via notifications/email.service.ts
  logger.info('Password reset requested', { userId: user._id.toString() })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token)
  const user = await UserModel.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires')

  if (!user) throw new AppError(400, 'INVALID_TOKEN', 'Reset token is invalid or expired')

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()

  // Revoke all existing refresh tokens for this user
  await RefreshTokenModel.updateMany({ userId: user._id }, { isRevoked: true })

  logger.info('Password reset completed', { userId: user._id.toString() })
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    const payload = jwt.verify(token, jwtPublicKey, { algorithms: ['RS256'] }) as JwtPayload
    return payload
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Access token is invalid or expired')
  }
}
