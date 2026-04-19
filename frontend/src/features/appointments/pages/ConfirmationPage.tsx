import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../../shared/hooks/useRTL'

export default function ConfirmationPage() {
  const { t } = useTranslation('public')
  const { lang } = useRTL()

  const [bookingRef, setBookingRef] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [datetime, setDatetime] = useState('')

  useEffect(() => {
    setBookingRef(sessionStorage.getItem('booking_bookingRef') ?? '')
    setDoctorName(sessionStorage.getItem('booking_doctorName') ?? '')
    setDatetime(sessionStorage.getItem('booking_datetime') ?? '')
  }, [])

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      {/* Success icon */}
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        {lang === 'ar' ? 'تم تأكيد موعدك!' : 'Appointment Confirmed!'}
      </h1>

      <p className="mb-6 text-gray-500">
        {lang === 'ar'
          ? 'تم إرسال تفاصيل الموعد عبر البريد الإلكتروني والرسائل النصية'
          : 'Appointment details sent via email and SMS'}
      </p>

      {/* Booking details */}
      <div className="mb-8 rounded-2xl bg-white p-6 text-start shadow-sm">
        {bookingRef && (
          <div className="mb-4 rounded-xl bg-primary-50 px-4 py-3 text-center">
            <p className="text-xs text-gray-500">
              {lang === 'ar' ? 'رقم الحجز' : 'Booking Reference'}
            </p>
            <p className="text-xl font-bold text-primary-700">{bookingRef}</p>
          </div>
        )}

        {doctorName && (
          <div className="mb-3 flex justify-between text-sm">
            <span className="text-gray-500">{lang === 'ar' ? 'الطبيب' : 'Doctor'}</span>
            <span className="font-medium">{doctorName}</span>
          </div>
        )}

        {datetime && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{lang === 'ar' ? 'الموعد' : 'Appointment'}</span>
            <span className="font-medium">
              {new Date(datetime).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Link
          to="/portal"
          className="block rounded-2xl bg-primary-600 py-3 font-semibold text-white transition hover:bg-primary-700"
        >
          {lang === 'ar' ? 'عرض مواعيدي' : 'View My Appointments'}
        </Link>
        <Link
          to="/"
          className="block rounded-2xl border border-gray-200 py-3 font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </Link>
      </div>
    </div>
  )
}
