import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Button } from '../../../shared/components/ui/Button'
import { useToast } from '../../../shared/hooks/useToast'
import { formatCurrency } from '../../../shared/utils/currency'
import { formatCountdown } from '../../../shared/utils/date'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('public')
  const { lang } = useRTL()
  const { addToast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  const holdId = sessionStorage.getItem('booking_holdId') ?? ''
  const sessionRef = sessionStorage.getItem('booking_sessionRef') ?? ''
  const doctorName = sessionStorage.getItem('booking_doctorName') ?? ''
  const feeStr = sessionStorage.getItem('booking_fee') ?? '0'
  const fee = parseFloat(feeStr)
  const holdExpiresAt = sessionStorage.getItem('booking_expiresAt') ?? ''
  const datetime = sessionStorage.getItem('booking_datetime') ?? ''
  const doctorId = sessionStorage.getItem('booking_doctorId') ?? ''

  useEffect(() => {
    if (!holdExpiresAt) return

    const interval = setInterval(() => {
      const left = formatCountdown(holdExpiresAt)
      setTimeLeft(left)

      if (left === '00:00') {
        clearInterval(interval)
        addToast({ type: 'error', message: lang === 'ar' ? 'انتهت مدة الحجز المؤقت' : 'Slot hold expired' })
        void navigate(`/doctors/${doctorId}`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [holdExpiresAt, navigate, doctorId, addToast, lang])

  const handlePay = useCallback(async () => {
    if (!sessionRef) return
    setIsLoading(true)

    try {
      const res = await apiClient.post<{
        success: true
        data: { paymentId: string; checkoutId?: string; clientSecret?: string; bookingRef?: string }
      }>('/payments/initiate', {
        gateway: 'hyperpay',
        sessionRef,
        holdId,
        amountSAR: fee,
        returnUrl: `${window.location.origin}/confirmation`,
      })

      const { paymentId, bookingRef } = res.data.data
      sessionStorage.setItem('booking_paymentId', paymentId)
      if (bookingRef) {
        sessionStorage.setItem('booking_bookingRef', bookingRef)
      }

      void navigate('/confirmation')
    } catch {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل الدفع' : 'Payment failed' })
    } finally {
      setIsLoading(false)
    }
  }, [sessionRef, holdId, fee, navigate, addToast, lang])

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {lang === 'ar' ? 'الدفع' : 'Checkout'}
      </h1>

      {/* Summary */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <span>{lang === 'ar' ? 'الطبيب' : 'Doctor'}</span>
          <span className="font-medium text-gray-900">{doctorName}</span>
        </div>
        {datetime && (
          <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
            <span>{lang === 'ar' ? 'الموعد' : 'Appointment'}</span>
            <span className="font-medium text-gray-900">
              {new Date(datetime).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="font-semibold text-gray-700">
            {lang === 'ar' ? 'الإجمالي' : 'Total'}
          </span>
          <span className="text-xl font-bold text-primary-700">{formatCurrency(fee, lang)}</span>
        </div>
      </div>

      {/* Countdown */}
      {timeLeft && (
        <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-700">
          {t('booking.slot_held_for')}: <span className="font-mono font-bold">{timeLeft}</span>
        </div>
      )}

      {/* Pay button */}
      <Button
        onClick={() => void handlePay()}
        isLoading={isLoading}
        className="w-full py-4 text-lg"
      >
        {lang === 'ar' ? 'ادفع الآن' : 'Pay Now'}
      </Button>
    </div>
  )
}
