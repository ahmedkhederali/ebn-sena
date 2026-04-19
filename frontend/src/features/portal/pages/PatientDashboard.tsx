import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../../../shared/api/client'
import { useAuth } from '../../../shared/hooks/useAuth'
import { useRTL } from '../../../shared/hooks/useRTL'
import { Badge, appointmentStatusVariant } from '../../../shared/components/ui/Badge'
import { Spinner } from '../../../shared/components/ui/Spinner'
import type { AppointmentSummary } from '@shared/types/appointment.types'

export default function PatientDashboard() {
  const { t } = useTranslation('portal')
  const { isRTL } = useRTL()
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: true; data: AppointmentSummary[] }>(
        '/appointments',
        { params: { status: 'confirmed', limit: 5 } },
      )
      return data.data
    },
    staleTime: 60_000,
  })

  return (
    <div>
      {/* Welcome banner */}
      <div className="mb-6 rounded-2xl bg-primary-600 px-6 py-5 text-white">
        <h1 className="text-xl font-bold">
          {t('welcome')},{' '}
          {isRTL ? user?.nameAr : user?.nameEn}
        </h1>
        <p className="mt-1 text-sm text-primary-100">{t('dashboardSubtitle')}</p>
        <Link
          to="/book"
          className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
        >
          {t('bookNew')}
        </Link>
      </div>

      {/* Upcoming appointments */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{t('upcomingAppointments')}</h2>
          <Link to="/portal/appointments" className="text-sm text-primary-600 hover:underline">
            {t('viewAll')}
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-10 text-center text-gray-400">
            <p className="text-sm">{t('noUpcoming')}</p>
            <Link
              to="/book"
              className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline"
            >
              {t('bookNow')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((appt) => (
              <Link
                key={appt.id}
                to={`/portal/appointments/${appt.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {isRTL ? appt.doctor.nameAr : appt.doctor.nameEn}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(appt.appointmentDateTime).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={appointmentStatusVariant(appt.status)}>
                    {t(`status.${appt.status}`)}
                  </Badge>
                  <p className="text-xs font-medium text-gray-500">
                    {appt.bookingRef}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
