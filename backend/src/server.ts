import 'dotenv/config'
import { createApp } from './app'
import { connectDatabase } from './config/database'
import { env } from './config/env'
import { logger } from './shared/utils/logger'

async function bootstrap(): Promise<void> {
  await connectDatabase()

  const app = createApp()

  app.listen(env.PORT, () => {
    logger.info(`Ibn Sina API running`, {
      port: env.PORT,
      env: env.NODE_ENV,
      health: `http://localhost:${env.PORT}/api/health`,
    })
  })
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
