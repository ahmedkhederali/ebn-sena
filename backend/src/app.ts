import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import mongoSanitize from 'express-mongo-sanitize'
import rateLimit from 'express-rate-limit'
import { requestIdMiddleware } from './shared/middleware/requestId'
import { errorHandler } from './shared/middleware/errorHandler'
import { auditLogMiddleware } from './shared/middleware/auditLog'
import { authRouter } from './features/auth/auth.router'
import { appointmentsRouter } from './features/appointments/appointments.router'
import { doctorsRouter, servicesRouter } from './features/doctors/doctors.router'
import { patientsRouter } from './features/patients/patients.router'
import { paymentsRouter } from './features/payments/payments.router'
import { adminRouter } from './features/admin/admin.router'
import { analyticsRouter } from './features/analytics/analytics.router'
import { contentRouter } from './features/content/content.router'
import { env } from './config/env'
import { logger } from './shared/utils/logger'

export function createApp(): express.Application {
  const app = express()

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(helmet())

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    }),
  )

  // ── Request tracing ─────────────────────────────────────────────────────────
  app.use(requestIdMiddleware)

  // ── Body parsing ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }))
  app.use(express.urlencoded({ extended: true, limit: '10kb' }))
  app.use(cookieParser())

  // ── NoSQL injection & XSS sanitization ─────────────────────────────────────
  app.use(mongoSanitize())

  // ── Global rate limiter ─────────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: process.env['NODE_ENV'] === 'test' ? 10000 : 500,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path.startsWith('/api/health'),
    }),
  )

  // ── Request logging ─────────────────────────────────────────────────────────
  app.use((req, _res, next) => {
    logger.debug('Incoming request', {
      method: req.method,
      path: req.path,
      requestId: req.requestId,
    })
    next()
  })

  // ── Audit log (post-response, non-GET mutations) ─────────────────────────────
  app.use(auditLogMiddleware)

  // ── Health checks ────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } })
  })

  app.get('/api/health/db', async (_req, res) => {
    const start = Date.now()
    try {
      const mongoose = await import('mongoose')
      await mongoose.default.connection.db?.admin().ping()
      res.json({
        success: true,
        data: { status: 'ok', latencyMs: Date.now() - start },
      })
    } catch {
      res.status(503).json({
        success: false,
        error: { code: 'DB_UNAVAILABLE', message: 'Database unreachable' },
      })
    }
  })

  // ── Feature routers ──────────────────────────────────────────────────────────
  app.use('/api/auth', authRouter)
  app.use('/api/appointments', appointmentsRouter)
  app.use('/api/doctors', doctorsRouter)
  app.use('/api/services', servicesRouter)
  app.use('/api/patients', patientsRouter)
  app.use('/api/payments', paymentsRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/analytics', analyticsRouter)
  app.use('/api/content', contentRouter)

  // ── 404 handler ──────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    })
  })

  // ── Global error handler ─────────────────────────────────────────────────────
  app.use(errorHandler)

  return app
}
