import type { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service'
import { sendSuccess, Errors } from '../../shared/utils/apiResponse'
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validation'
import { UserModel } from './auth.schema'
import { env } from '../../config/env'

const REFRESH_COOKIE = 'refreshToken'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = registerSchema.parse(req.body)
    const { userId } = await authService.register(dto)
    sendSuccess(res, { message: 'Registration successful. Please verify your email.', userId }, 201)
  } catch (err) {
    next(err)
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = verifyEmailSchema.parse(req.body)
    await authService.verifyEmail(token)
    sendSuccess(res, { message: 'Email verified successfully.' })
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = loginSchema.parse(req.body)
    const meta: { userAgent?: string; ip?: string } = {}
    const ua = req.headers['user-agent']
    const ip = req.ip
    if (ua) meta.userAgent = ua
    if (ip) meta.ip = ip
    const { accessToken, refreshToken, user } = await authService.login(dto, meta)

    // Refresh token in httpOnly cookie — never exposed in response body
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS)

    sendSuccess(res, { accessToken, user })
  } catch (err) {
    next(err)
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined
    if (!rawToken) {
      Errors.unauthorized(res, 'No refresh token provided')
      return
    }

    const { accessToken, refreshToken: newRawToken } = await authService.refreshAccessToken(rawToken)
    res.cookie(REFRESH_COOKIE, newRawToken, COOKIE_OPTIONS)
    sendSuccess(res, { accessToken })
  } catch (err) {
    next(err)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined
    if (rawToken) {
      await authService.logout(rawToken)
    }
    res.clearCookie(REFRESH_COOKIE)
    sendSuccess(res, { message: 'Logged out successfully.' })
  } catch (err) {
    next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body)
    await authService.forgotPassword(email)
    // Always 200 — prevents email enumeration
    sendSuccess(res, { message: 'If that email exists, a reset link was sent.' })
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body)
    await authService.resetPassword(token, newPassword)
    sendSuccess(res, { message: 'Password reset successful. Please log in again.' })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      Errors.unauthorized(res)
      return
    }
    const user = await UserModel.findById(req.user.id).lean()
    if (!user) {
      Errors.notFound(res, 'User')
      return
    }
    sendSuccess(res, {
      id: user._id.toString(),
      nameAr: user.nameAr,
      nameEn: user.nameEn,
      email: user.email,
      phone: user.phone,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      emailVerified: user.emailVerified,
      profilePhotoUrl: user.profilePhotoUrl,
    })
  } catch (err) {
    next(err)
  }
}
