import { Router, type Request, type Response, type NextFunction } from 'express'
import { verifyToken } from '../auth/auth.middleware'
import * as paymentsService from './payments.service'
import { UserModel } from '../auth/auth.schema'
import { sendSuccess } from '../../shared/utils/apiResponse'
import { logger } from '../../shared/utils/logger'
import type { PaymentGateway } from '@shared/types/appointment.types'

export const paymentsRouter = Router()

// POST /api/payments/initiate (auth required)
paymentsRouter.post(
  '/initiate',
  verifyToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as {
        gateway?: PaymentGateway
        sessionRef?: string
        holdId?: string
        amountSAR?: number
        returnUrl?: string
      }

      if (!body.gateway || !body.sessionRef || !body.amountSAR) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'gateway, sessionRef, and amountSAR are required',
          },
        })
        return
      }

      // Fetch user name for payment records (not just email)
      const user = await UserModel.findById(req.user!.id).select('nameAr nameEn').lean()
      const customerName = user ? (user.nameEn || user.nameAr) : req.user!.email

      const result = await paymentsService.initiatePayment({
        gateway: body.gateway,
        sessionRef: body.sessionRef,
        ...(body.holdId !== undefined ? { holdId: body.holdId } : {}),
        patientId: req.user!.id,
        amountSAR: body.amountSAR,
        customerEmail: req.user!.email,
        customerName,
        returnUrl:
          body.returnUrl ??
          `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/confirmation`,
      })

      sendSuccess(res, result, 201)
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/payments/webhook/hyperpay (no auth)
paymentsRouter.post(
  '/webhook/hyperpay',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = (req.headers['x-initialization-vector'] ?? '') as string
      // req.body may be a pre-parsed object (from global express.json) or a Buffer
      const payload = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
      await paymentsService.handleWebhook('hyperpay', payload, signature)
    } catch (err) {
      logger.warn('HyperPay webhook error (non-fatal)', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
    // Always 200 to prevent gateway retries
    res.status(200).json({ success: true })
  },
)

// POST /api/payments/webhook/stripe (no auth)
paymentsRouter.post(
  '/webhook/stripe',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = (req.headers['stripe-signature'] ?? '') as string
      const payload = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
      await paymentsService.handleWebhook('stripe', payload, signature)
    } catch (err) {
      logger.warn('Stripe webhook error (non-fatal)', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
    res.status(200).json({ success: true })
  },
)

// GET /api/payments/:id (auth required)
paymentsRouter.get(
  '/:id',
  verifyToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payment = await paymentsService.getPayment(String(req.params['id'] ?? ''))
      sendSuccess(res, payment)
    } catch (err) {
      next(err)
    }
  },
)
