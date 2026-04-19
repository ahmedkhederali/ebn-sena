import type { Response } from 'express'
import type { PaginationMeta } from '@shared/types/api.types'

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta,
): void {
  const body: Record<string, unknown> = { success: true, data }
  if (meta !== undefined) body['meta'] = meta
  res.status(statusCode).json(body)
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, string[]>,
): void {
  const error: Record<string, unknown> = { code, message }
  if (details !== undefined) error['details'] = details
  res.status(statusCode).json({ success: false, error })
}

// Common error shortcuts
export const Errors = {
  notFound: (res: Response, entity = 'Resource') =>
    sendError(res, 404, 'NOT_FOUND', `${entity} not found`),
  unauthorized: (res: Response, msg = 'Authentication required') =>
    sendError(res, 401, 'UNAUTHORIZED', msg),
  forbidden: (res: Response, msg = 'Access denied') =>
    sendError(res, 403, 'FORBIDDEN', msg),
  conflict: (res: Response, code: string, msg: string) =>
    sendError(res, 409, code, msg),
  badRequest: (res: Response, code: string, msg: string, details?: Record<string, string[]>) =>
    sendError(res, 400, code, msg, details),
  tooMany: (res: Response, msg = 'Too many requests') =>
    sendError(res, 429, 'TOO_MANY_REQUESTS', msg),
  internal: (res: Response) =>
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred'),
} as const
