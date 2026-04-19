import mongoose from 'mongoose'
import { env } from './env'
import { logger } from '../shared/utils/logger'

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 3000

export async function connectDatabase(retries = MAX_RETRIES): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    logger.info('MongoDB connected', { uri: env.MONGODB_URI.replace(/:\/\/.*@/, '://***@') })
  } catch (err) {
    if (retries > 0) {
      logger.warn(`MongoDB connection failed. Retrying in ${RETRY_DELAY_MS}ms…`, {
        retriesLeft: retries - 1,
      })
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      return connectDatabase(retries - 1)
    }
    logger.error('MongoDB connection failed after all retries. Exiting.')
    process.exit(1)
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
  logger.info('MongoDB disconnected')
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await disconnectDatabase()
  process.exit(0)
})
