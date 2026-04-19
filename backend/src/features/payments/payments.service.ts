import mongoose, { Schema, type Model, type Document } from 'mongoose'
import { env } from '../../config/env'
import { AppError } from '../../shared/middleware/errorHandler'
import { logger } from '../../shared/utils/logger'
import { confirmAppointment } from '../appointments/appointments.service'
import { UserModel } from '../auth/auth.schema'
import type { PaymentGateway } from '@shared/types/appointment.types'

// ── Payment Schema ─────────────────────────────────────────────────────────────

interface IPayment {
  sessionRef: string
  holdId?: string
  patientId?: string
  gateway: PaymentGateway
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  amountSAR: number
  currency: 'SAR'
  gatewayPaymentId?: string
  gatewayCheckoutId?: string
  customerEmail: string
  customerName: string
  metadata?: Record<string, string>
}

interface IPaymentDocument extends IPayment, Document {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    sessionRef: { type: String, required: true, index: true },
    holdId: { type: String },
    patientId: { type: String },
    gateway: { type: String, enum: ['hyperpay', 'stripe'], required: true },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded'],
      default: 'pending',
    },
    amountSAR: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    gatewayPaymentId: { type: String },
    gatewayCheckoutId: { type: String },
    customerEmail: { type: String, required: true },
    customerName: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
)

export const PaymentModel: Model<IPaymentDocument> = mongoose.model('Payment', paymentSchema)

// ── Gateway Adapters ───────────────────────────────────────────────────────────

export interface PaymentGatewayAdapter {
  initiate(opts: {
    amountSAR: number
    currency: string
    customerEmail: string
    customerName: string
    sessionRef: string
    returnUrl: string
  }): Promise<{ checkoutId?: string; clientSecret?: string; gatewayPaymentId?: string }>
  verifyWebhook(payload: string | Buffer, signature: string): boolean
}

export class HyperPayAdapter implements PaymentGatewayAdapter {
  async initiate(opts: {
    amountSAR: number
    currency: string
    customerEmail: string
    customerName: string
    sessionRef: string
    returnUrl: string
  }): Promise<{ checkoutId?: string }> {
    const isConfigured = env.HYPERPAY_ACCESS_TOKEN &&
      env.HYPERPAY_ACCESS_TOKEN !== 'placeholder' &&
      env.HYPERPAY_ENTITY_ID_VISA &&
      env.HYPERPAY_ENTITY_ID_VISA !== 'placeholder'
    if (!isConfigured) {
      logger.info('HyperPay MOCK initiate', { sessionRef: opts.sessionRef })
      return { checkoutId: `mock-checkout-${Date.now()}` }
    }

    const params = new URLSearchParams({
      entityId: env.HYPERPAY_ENTITY_ID_VISA!,
      amount: opts.amountSAR.toFixed(2),
      currency: 'SAR',
      paymentType: 'DB',
      'customer.email': opts.customerEmail,
      'customer.givenName': opts.customerName,
      shopperResultUrl: opts.returnUrl,
      merchantTransactionId: opts.sessionRef,
    })

    const response = await fetch(`${env.HYPERPAY_BASE_URL}/v1/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.HYPERPAY_ACCESS_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const data = (await response.json()) as { id?: string }
    if (!data.id) throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'HyperPay checkout creation failed')

    return { checkoutId: data.id }
  }

  verifyWebhook(_payload: string | Buffer, signature: string): boolean {
    if (!env.HYPERPAY_WEBHOOK_SECRET || env.HYPERPAY_WEBHOOK_SECRET === 'placeholder') return true
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto')
    const expected = crypto
      .createHmac('sha256', env.HYPERPAY_WEBHOOK_SECRET)
      .update(_payload)
      .digest('hex')
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
    } catch {
      return false
    }
  }
}

export class StripeAdapter implements PaymentGatewayAdapter {
  async initiate(opts: {
    amountSAR: number
    customerEmail: string
    customerName: string
    sessionRef: string
    returnUrl: string
  }): Promise<{ clientSecret?: string; gatewayPaymentId?: string }> {
    if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY.includes('placeholder')) {
      logger.info('Stripe MOCK initiate', { sessionRef: opts.sessionRef })
      return {
        clientSecret: `mock_pi_secret_${Date.now()}`,
        gatewayPaymentId: `mock_pi_${Date.now()}`,
      }
    }

    const amountHalala = Math.round(opts.amountSAR * 100)
    const params = new URLSearchParams({
      amount: String(amountHalala),
      currency: 'sar',
      'payment_method_types[]': 'card',
      'metadata[sessionRef]': opts.sessionRef,
      receipt_email: opts.customerEmail,
    })

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const data = (await response.json()) as { client_secret?: string; id?: string }
    if (!data.client_secret)
      throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Stripe intent creation failed')

    return {
      clientSecret: data.client_secret,
      ...(data.id !== undefined ? { gatewayPaymentId: data.id } : {}),
    }
  }

  verifyWebhook(payload: string | Buffer, signature: string): boolean {
    if (!env.STRIPE_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET.includes('placeholder')) return true
    const parts = signature.split(',')
    const tsPart = parts.find((p) => p.startsWith('t='))
    const sigPart = parts.find((p) => p.startsWith('v1='))
    if (!tsPart || !sigPart) return false
    const ts = tsPart.slice(2)
    const sig = sigPart.slice(3)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto')
    const expected = crypto
      .createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
      .update(`${ts}.${payload.toString()}`)
      .digest('hex')
    return sig === expected
  }
}

// ── Service Functions ──────────────────────────────────────────────────────────

const adapters: Record<PaymentGateway, PaymentGatewayAdapter> = {
  hyperpay: new HyperPayAdapter(),
  stripe: new StripeAdapter(),
}

export async function initiatePayment(dto: {
  gateway: PaymentGateway
  sessionRef: string
  holdId?: string
  patientId: string
  amountSAR: number
  customerEmail: string
  customerName: string
  returnUrl: string
}): Promise<{ paymentId: string; checkoutId?: string; clientSecret?: string }> {
  const adapter = adapters[dto.gateway]
  const result = await adapter.initiate({
    amountSAR: dto.amountSAR,
    currency: 'SAR',
    customerEmail: dto.customerEmail,
    customerName: dto.customerName,
    sessionRef: dto.sessionRef,
    returnUrl: dto.returnUrl,
  })

  const isMock =
    result.checkoutId?.startsWith('mock-') ??
    result.gatewayPaymentId?.startsWith('mock_pi_') ??
    false

  const payment = await PaymentModel.create({
    sessionRef: dto.sessionRef,
    holdId: dto.holdId,
    patientId: dto.patientId,
    gateway: dto.gateway,
    status: isMock ? 'succeeded' : 'pending',
    amountSAR: dto.amountSAR,
    currency: 'SAR',
    gatewayCheckoutId: result.checkoutId,
    gatewayPaymentId: result.gatewayPaymentId,
    customerEmail: dto.customerEmail,
    customerName: dto.customerName,
  })

  logger.info('Payment initiated', { paymentId: payment._id.toString(), gateway: dto.gateway, isMock })

  let bookingRef: string | undefined

  if (isMock) {
    try {
      const patient = await UserModel.findById(dto.patientId)
        .select('nameAr nameEn phone nationalId')
        .lean()
      if (patient) {
        const confirmed = await confirmAppointment(dto.sessionRef, payment._id.toString(), {
          patientId: dto.patientId,
          patientName: patient.nameEn || patient.nameAr,
          patientPhone: patient.phone ?? '',
          patientNationalId: patient.nationalId ?? '0000000000',
        })
        bookingRef = confirmed.bookingRef
        logger.info('Mock payment: appointment auto-confirmed', { bookingRef })
      }
    } catch (err) {
      logger.error('Mock payment: failed to auto-confirm appointment', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return {
    paymentId: payment._id.toString(),
    ...(bookingRef !== undefined ? { bookingRef } : {}),
    ...(result.checkoutId !== undefined ? { checkoutId: result.checkoutId } : {}),
    ...(result.clientSecret !== undefined ? { clientSecret: result.clientSecret } : {}),
  }
}

export async function handleWebhook(
  gateway: PaymentGateway,
  payload: string | Buffer,
  signature: string,
): Promise<void> {
  const adapter = adapters[gateway]
  if (!adapter.verifyWebhook(payload, signature)) {
    throw new AppError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature verification failed')
  }

  let sessionRef: string | undefined
  let succeeded = false

  try {
    const body = JSON.parse(payload.toString()) as Record<string, unknown>
    if (gateway === 'stripe') {
      const event = body as {
        type?: string
        data?: { object?: { metadata?: { sessionRef?: string } } }
      }
      if (event.type === 'payment_intent.succeeded') {
        sessionRef = event.data?.object?.metadata?.sessionRef
        succeeded = true
      }
    } else {
      const result = body as { result?: { code?: string }; merchantTransactionId?: string }
      const code = result.result?.code ?? ''
      succeeded = code.startsWith('000')
      sessionRef = result.merchantTransactionId
    }
  } catch {
    logger.warn('Failed to parse webhook payload')
    return
  }

  if (!sessionRef) return

  const payment = await PaymentModel.findOne({ sessionRef })
  if (!payment) return

  if (payment.status === 'succeeded') return // idempotent: already processed

  payment.status = succeeded ? 'succeeded' : 'failed'
  await payment.save()

  if (succeeded) {
    logger.info('Payment succeeded — confirming appointment', {
      paymentId: payment._id.toString(),
      gateway,
    })

    try {
      // Confirm the appointment atomically. Requires patientId stored at initiation.
      if (!payment.patientId) {
        logger.error('Cannot confirm appointment: patientId missing from payment', {
          paymentId: payment._id.toString(),
        })
        return
      }

      const patient = await UserModel.findById(payment.patientId)
        .select('nameAr nameEn phone nationalId')
        .lean()

      if (!patient) {
        logger.error('Cannot confirm appointment: patient user not found', {
          patientId: payment.patientId,
        })
        return
      }

      await confirmAppointment(sessionRef, payment._id.toString(), {
        patientId: payment.patientId,
        patientName: patient.nameEn || patient.nameAr,
        patientPhone: patient.phone,
        patientNationalId: patient.nationalId ?? '0000000000',
      })
    } catch (err) {
      logger.error('Failed to confirm appointment after payment', {
        paymentId: payment._id.toString(),
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

export async function getPayment(paymentId: string): Promise<IPayment & { id: string }> {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid payment ID')
  }

  const payment = await PaymentModel.findById(paymentId).lean()
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment not found')

  return {
    id: payment._id.toString(),
    sessionRef: payment.sessionRef,
    gateway: payment.gateway,
    status: payment.status,
    amountSAR: payment.amountSAR,
    currency: 'SAR',
    customerEmail: payment.customerEmail,
    customerName: payment.customerName,
  }
}
