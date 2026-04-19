import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY is required'),
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY is required'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@ibnsina.sa'),

  SMS_PROVIDER: z.enum(['unifonic', 'mock']).default('mock'),
  UNIFONIC_APP_SID: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  HYPERPAY_ACCESS_TOKEN: z.string().optional(),
  HYPERPAY_BASE_URL: z.string().default('https://eu-test.oppwa.com'),
  HYPERPAY_ENTITY_ID_VISA: z.string().optional(),
  HYPERPAY_WEBHOOK_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
})

const _parsed = envSchema.safeParse(process.env)

if (!_parsed.success) {
  const issues = _parsed.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n')
  console.error(`\n❌ Environment validation failed:\n${issues}\n`)
  process.exit(1)
}

export const env = _parsed.data

// Resolve JWT keys: replace literal \n with actual newlines (for env var storage)
export const jwtPrivateKey = env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n')
export const jwtPublicKey = env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
