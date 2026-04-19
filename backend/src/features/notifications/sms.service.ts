import { env } from '../../config/env'
import { logger } from '../../shared/utils/logger'

export async function sendSms(to: string, message: string): Promise<void> {
  if (env.SMS_PROVIDER === 'mock' || env.NODE_ENV === 'test') {
    logger.info('SMS_MOCK', { to, message })
    return
  }

  // Unifonic adapter
  if (!env.UNIFONIC_APP_SID) {
    logger.warn('Unifonic not configured, skipping SMS', { to })
    return
  }

  try {
    const response = await fetch('https://api.unifonic.com/rest/Messages/Send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        AppSid: env.UNIFONIC_APP_SID,
        SenderID: 'IBNSINA',
        Body: message,
        Recipient: to,
      }),
    })

    if (!response.ok) {
      logger.error('Unifonic SMS failed', { to, status: response.status })
    } else {
      logger.info('SMS sent via Unifonic', { to })
    }
  } catch (err) {
    logger.error('SMS send error', { error: err instanceof Error ? err.message : String(err) })
  }
}

export async function sendBookingConfirmationSms(data: {
  to: string
  bookingRef: string
  doctorName: string
  appointmentDateTime: string
  language: 'ar' | 'en'
}): Promise<void> {
  const message =
    data.language === 'ar'
      ? `ابن سينا: تم تأكيد موعدك مع ${data.doctorName} في ${data.appointmentDateTime}. رقم الحجز: ${data.bookingRef}`
      : `Ibn Sina: Your appointment with ${data.doctorName} on ${data.appointmentDateTime} is confirmed. Ref: ${data.bookingRef}`

  await sendSms(data.to, message)
}

export async function sendCancellationSms(data: {
  to: string
  bookingRef: string
  language: 'ar' | 'en'
}): Promise<void> {
  const message =
    data.language === 'ar'
      ? `ابن سينا: تم إلغاء موعدك. رقم الحجز: ${data.bookingRef}`
      : `Ibn Sina: Your appointment has been cancelled. Ref: ${data.bookingRef}`

  await sendSms(data.to, message)
}
