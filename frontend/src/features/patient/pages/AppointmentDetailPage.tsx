import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { formatDateTime } from '../../../shared/utils/date'
import { formatCurrency } from '../../../shared/utils/currency'

interface AppointmentDetail {
  id: string
  bookingRef: string
  appointmentDateTime: string
  status: string
  doctor: { id: string; nameAr: string; nameEn: string; specialty: string }
  consultationNote: string | null
  paymentStatus: string
  paymentId: string | null
  consultationFeeSAR: number
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation('patient')
  const { lang } = useRTL()

  const { data: appt, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: AppointmentDetail }>(
        `/patients/me/appointments/${id ?? ''}`,
      )
      return res.data.data
    },
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!appt) {
    return <div className="py-20 text-center text-gray-400">Not found</div>
  }

  const doctor = appt.doctor

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/portal/appointments" className="text-sm text-gray-500 hover:text-primary-600">
          ← {lang === 'ar' ? 'رجوع' : 'Back'}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{appt.bookingRef}</h1>
      </div>

      <div className="space-y-4">
        {/* Main details */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {lang === 'ar' ? doctor.nameAr : doctor.nameEn}
              </p>
              <p className="text-sm text-gray-500">{doctor.specialty}</p>
            </div>
            <Badge variant={appt.status === 'confirmed' ? 'success' : appt.status === 'cancelled' ? 'danger' : 'info'}>
              {t(`appointments.status.${appt.status}` as Parameters<typeof t>[0], appt.status)}
            </Badge>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
              <span className="font-medium">{formatDateTime(appt.appointmentDateTime, lang)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{lang === 'ar' ? 'رسوم الاستشارة' : 'Consultation Fee'}</span>
              <span className="font-medium">{formatCurrency(appt.consultationFeeSAR, lang)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{lang === 'ar' ? 'حالة الدفع' : 'Payment Status'}</span>
              <span className="font-medium capitalize">{appt.paymentStatus}</span>
            </div>
          </div>

          {appt.paymentId && appt.paymentStatus === 'succeeded' && (
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.open(`/api/patients/me/receipts/${appt.paymentId ?? ''}`, '_blank')
                }}
              >
                {t('appointments.download_receipt')}
              </Button>
            </div>
          )}
        </div>

        {/* Doctor notes */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">{t('appointments.notes')}</h2>
          {appt.consultationNote ? (
            <p className="text-gray-700">{appt.consultationNote}</p>
          ) : (
            <p className="text-gray-400">{t('appointments.no_notes')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
