import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../shared/hooks/useAuth'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { Badge } from '../../../shared/components/ui/Badge'
import { formatDateTime } from '../../../shared/utils/date'

interface AppointmentSummary {
  id: string
  bookingRef: string
  appointmentDateTime: string
  status: string
  doctor: { id: string; nameAr: string; nameEn: string; specialty: string }
}

const statusVariant = (s: string): 'success' | 'danger' | 'info' | 'warning' | 'default' => {
  if (s === 'confirmed') return 'success'
  if (s === 'cancelled') return 'danger'
  if (s === 'completed') return 'info'
  return 'default'
}

export default function PatientDashboardPage() {
  const { t } = useTranslation('patient')
  const { user } = useAuth()
  const { lang } = useRTL()

  const { data, isLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true
        data: AppointmentSummary[]
        meta: { hasMore: boolean; cursor: string | null }
      }>('/patients/me/appointments?limit=5')
      return res.data
    },
  })

  const appointments = data?.data ?? []
  const upcoming = appointments.filter((a) => a.status === 'confirmed')

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {t('dashboard.title')}
      </h1>

      {/* Welcome */}
      {user && (
        <p className="mb-6 text-gray-600">
          {lang === 'ar'
            ? `مرحباً، ${user.nameAr}`
            : `Welcome, ${user.nameEn}`}
        </p>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{t('dashboard.next_appointment')}</p>
          <p className="mt-1 text-lg font-bold text-primary-700">
            {upcoming[0]
              ? formatDateTime(upcoming[0].appointmentDateTime, lang)
              : t('dashboard.no_upcoming')}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{t('dashboard.total_appointments')}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{appointments.length}</p>
        </div>
      </div>

      {/* Recent appointments */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{t('dashboard.recent_activity')}</h2>
          <Link to="/portal/appointments" className="text-sm text-primary-600 hover:underline">
            {lang === 'ar' ? 'عرض الكل' : 'View all'}
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : appointments.length === 0 ? (
          <p className="py-8 text-center text-gray-400">{t('dashboard.no_upcoming')}</p>
        ) : (
          <div className="space-y-3">
            {appointments.slice(0, 5).map((a) => (
              <Link
                key={a.id}
                to={`/portal/appointments/${a.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {lang === 'ar' ? a.doctor.nameAr : a.doctor.nameEn}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(a.appointmentDateTime, lang)}
                  </p>
                </div>
                <Badge variant={statusVariant(a.status)}>
                  {t(`appointments.status.${a.status}` as Parameters<typeof t>[0], a.status)}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
