import winston from 'winston'
import { env } from '../../config/env'

// PHI fields that must never appear in logs
const PHI_FIELDS = new Set([
  'passwordHash',
  'password',
  'nationalId',
  'phone',
  'emailVerificationToken',
  'passwordResetToken',
  'tokenHash',
])

function scrubPhi(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((v) => scrubPhi(v, depth + 1))

  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    clean[key] = PHI_FIELDS.has(key) ? '[REDACTED]' : scrubPhi(value, depth + 1)
  }
  return clean
}

const scrubFormat = winston.format((info) => {
  if (info.message && typeof info.message === 'object') {
    info.message = scrubPhi(info.message)
  }
  if (info.meta) {
    info.meta = scrubPhi(info.meta)
  }
  return info
})

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    scrubFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: env.NODE_ENV !== 'production' }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      silent: env.NODE_ENV === 'test',
    }),
  ],
})
