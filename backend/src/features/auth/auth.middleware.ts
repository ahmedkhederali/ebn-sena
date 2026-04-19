import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from './auth.service'
import { Errors } from '../../shared/utils/apiResponse'
import type { Role } from './auth.types'

// Extend Express Request to carry decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: Role
        email: string
      }
    }
  }
}

/**
 * verifyToken — validates the Bearer JWT in Authorization header.
 * Attaches decoded payload to req.user.
 */
export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    Errors.unauthorized(res)
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = await verifyAccessToken(token)
    req.user = { id: payload.sub, role: payload.role, email: payload.email }
    next()
  } catch {
    Errors.unauthorized(res, 'Access token is invalid or expired')
  }
}

/**
 * checkRole — RBAC gate. Call after verifyToken.
 * Usage: router.get('/admin/users', verifyToken, checkRole('admin'), handler)
 */
export function checkRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      Errors.unauthorized(res)
      return
    }
    if (!allowedRoles.includes(req.user.role)) {
      Errors.forbidden(res, `Access requires one of: ${allowedRoles.join(', ')}`)
      return
    }
    next()
  }
}

/**
 * optionalAuth — attaches user if valid token present, continues if not.
 * Used on public routes that behave differently for logged-in users.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7))
      req.user = { id: payload.sub, role: payload.role, email: payload.email }
    } catch {
      // Silently ignore invalid token for optional auth
    }
  }
  next()
}
