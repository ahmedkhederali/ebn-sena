import { Router, type Request, type Response, type NextFunction } from 'express'
import { verifyToken, checkRole } from '../auth/auth.middleware'
import * as contentService from './content.service'
import { sendSuccess } from '../../shared/utils/apiResponse'

export const contentRouter = Router()

// GET /api/content/public (no auth, cached 30s)
contentRouter.get('/public', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const keys = req.query['keys'] as string[] | string | undefined
    const keyArray = Array.isArray(keys) ? keys : (keys !== undefined ? [keys] : undefined)
    const content = await contentService.getPublicContent(keyArray)
    res.set('Cache-Control', 'public, max-age=30')
    sendSuccess(res, content)
  } catch (err) {
    next(err)
  }
})

// GET /api/content/services (public)
contentRouter.get('/services', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const services = await contentService.listServices()
    sendSuccess(res, services)
  } catch (err) {
    next(err)
  }
})

// POST /api/content/services (admin only)
contentRouter.post(
  '/services',
  verifyToken,
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = await contentService.createService(
        req.body as Parameters<typeof contentService.createService>[0],
      )
      sendSuccess(res, service, 201)
    } catch (err) {
      next(err)
    }
  },
)

// PUT /api/content/services/:id (admin only)
contentRouter.put(
  '/services/:id',
  verifyToken,
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = await contentService.updateService(
        String(req.params['id'] ?? ''),
        req.body as Parameters<typeof contentService.updateService>[1],
      )
      sendSuccess(res, service)
    } catch (err) {
      next(err)
    }
  },
)

// PUT /api/content/:key (admin only)
contentRouter.put(
  '/:key',
  verifyToken,
  checkRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ar, en } = req.body as { ar?: string; en?: string }
      if (ar === undefined || en === undefined) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'ar and en fields are required' },
        })
        return
      }
      await contentService.updateContent(String(req.params['key'] ?? ''), { ar, en })
      sendSuccess(res, { message: 'Content updated' })
    } catch (err) {
      next(err)
    }
  },
)
