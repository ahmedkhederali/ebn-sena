import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as controller from './auth.controller'
import { verifyToken } from './auth.middleware'

const isTest = process.env['NODE_ENV'] === 'test'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 10,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Try again in 15 minutes.' } },
  standardHeaders: true,
  legacyHeaders: false,
})

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 5,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts.' } },
  standardHeaders: true,
  legacyHeaders: false,
})

const router = Router()

// Public routes
router.post('/register', authLimiter, controller.register)
router.post('/verify-email', authLimiter, controller.verifyEmail)
router.post('/login', strictLimiter, controller.login)
router.post('/refresh-token', controller.refreshToken)
router.post('/logout', controller.logout)
router.post('/forgot-password', authLimiter, controller.forgotPassword)
router.post('/reset-password', authLimiter, controller.resetPassword)

// Protected routes
router.get('/me', verifyToken, controller.getMe)

export { router as authRouter }
