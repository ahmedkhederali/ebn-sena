import nodemailer from 'nodemailer'
import { env } from '../../config/env'
import { logger } from '../../shared/utils/logger'

function getTransporter() {
  if (env.NODE_ENV === 'test' || !env.SMTP_HOST) return null

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<void> {
  const transporter = getTransporter()

  if (!transporter) {
    logger.info('EMAIL_MOCK', { to: opts.to, subject: opts.subject })
    return
  }

  await transporter.sendMail({ from: env.EMAIL_FROM, ...opts })
  logger.info('Email sent', { to: opts.to, subject: opts.subject })
}

export async function sendBookingConfirmation(data: {
  to: string
  bookingRef: string
  doctorName: string
  appointmentDateTime: string
  language: 'ar' | 'en'
}): Promise<void> {
  const isAr = data.language === 'ar'

  const subject = isAr
    ? `تأكيد الحجز - ${data.bookingRef}`
    : `Booking Confirmation - ${data.bookingRef}`

  const html = isAr
    ? `<div dir="rtl"><h2>تم تأكيد موعدك</h2><p>رقم الحجز: <strong>${data.bookingRef}</strong></p><p>الطبيب: ${data.doctorName}</p><p>الموعد: ${data.appointmentDateTime}</p></div>`
    : `<h2>Your appointment is confirmed</h2><p>Booking Ref: <strong>${data.bookingRef}</strong></p><p>Doctor: ${data.doctorName}</p><p>Appointment: ${data.appointmentDateTime}</p>`

  const text = isAr
    ? `تم تأكيد موعدك. رقم الحجز: ${data.bookingRef}`
    : `Your appointment is confirmed. Booking Ref: ${data.bookingRef}`

  await sendEmail({ to: data.to, subject, html, text })
}

export async function sendCancellationConfirmation(data: {
  to: string
  bookingRef: string
  language: 'ar' | 'en'
}): Promise<void> {
  const isAr = data.language === 'ar'

  await sendEmail({
    to: data.to,
    subject: isAr ? `إلغاء الحجز - ${data.bookingRef}` : `Booking Cancelled - ${data.bookingRef}`,
    html: isAr
      ? `<div dir="rtl"><h2>تم إلغاء موعدك</h2><p>رقم الحجز: ${data.bookingRef}</p></div>`
      : `<h2>Your appointment has been cancelled</h2><p>Booking Ref: ${data.bookingRef}</p>`,
    text: isAr
      ? `تم إلغاء موعدك. رقم الحجز: ${data.bookingRef}`
      : `Your appointment has been cancelled. Booking Ref: ${data.bookingRef}`,
  })
}

export async function sendVerificationEmail(data: {
  to: string
  token: string
  language: 'ar' | 'en'
}): Promise<void> {
  const isAr = data.language === 'ar'
  const link = `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/verify-email?token=${data.token}`

  await sendEmail({
    to: data.to,
    subject: isAr ? 'تفعيل البريد الإلكتروني' : 'Verify Your Email',
    html: isAr
      ? `<div dir="rtl"><h2>تفعيل البريد الإلكتروني</h2><p><a href="${link}">انقر هنا للتفعيل</a></p></div>`
      : `<h2>Verify Your Email</h2><p><a href="${link}">Click here to verify</a></p>`,
    text: isAr ? `رابط التفعيل: ${link}` : `Verification link: ${link}`,
  })
}

export async function sendPasswordResetEmail(data: {
  to: string
  token: string
  language: 'ar' | 'en'
}): Promise<void> {
  const isAr = data.language === 'ar'
  const link = `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/reset-password?token=${data.token}`

  await sendEmail({
    to: data.to,
    subject: isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Your Password',
    html: isAr
      ? `<div dir="rtl"><h2>إعادة تعيين كلمة المرور</h2><p><a href="${link}">انقر هنا</a></p><p>ينتهي هذا الرابط خلال 15 دقيقة</p></div>`
      : `<h2>Reset Your Password</h2><p><a href="${link}">Click here to reset</a></p><p>This link expires in 15 minutes</p>`,
    text: isAr ? `رابط إعادة التعيين: ${link}` : `Reset link: ${link}`,
  })
}
