import type { JwtPayload } from '../features/auth/auth.types'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      user?: JwtPayload
    }
  }
}

export {}
