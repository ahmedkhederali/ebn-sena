import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AdminLayout } from '../../../shared/components/layout/AdminLayout'
import { apiClient } from '../../../shared/api/client'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { useRTL } from '../../../shared/hooks/useRTL'
import { formatCurrency } from '../../../shared/utils/currency'

interface AnalyticsSummary {
  totalAppointments: number
  totalRevenueSAR: number
  newPatients: number
  completedAppointments: number
  cancelledAppointments: number
}

export default function AdminOverviewPage() {
  const { t } = useTranslation('admin')
  const { lang } = useRTL()

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10)

  const { data: todaySummary, isLoading: loadingToday } = useQuery({
    queryKey: ['analytics-summary', today],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: AnalyticsSummary }>(
        `/analytics/summary?from=${today}&to=${today}`,
      )
      return res.data.data
    },
  })

  const { data: monthSummary, isLoading: loadingMonth } = useQuery({
    queryKey: ['analytics-summary', monthStart],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: AnalyticsSummary }>(
        `/analytics/summary?from=${monthStart}&to=${today}`,
      )
      return res.data.data
    },
  })

  const isLoading = loadingToday || loadingMonth

  const kpis = [
    {
      label: t('overview.today_appointments'),
      value: todaySummary?.totalAppointments ?? 0,
      link: '/admin/appointments',
    },
    {
      label: t('overview.revenue_mtd'),
      value: formatCurrency(monthSummary?.totalRevenueSAR ?? 0, lang),
      link: '/admin/analytics',
    },
    {
      label: t('overview.new_patients'),
      value: monthSummary?.newPatients ?? 0,
      link: '/admin/patients',
    },
    {
      label: t('overview.completed'),
      value: monthSummary?.completedAppointments ?? 0,
      link: '/admin/appointments',
    },
  ]

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('overview.title')}</h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpis.map((kpi) => (
            <Link
              key={kpi.label}
              to={kpi.link}
              className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <p className="mb-1 text-sm text-gray-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-primary-700">{kpi.value}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { to: '/admin/appointments', label: t('appointments.title') },
          { to: '/admin/doctors', label: t('doctors.title') },
          { to: '/admin/patients', label: t('patients.title') },
          { to: '/admin/analytics', label: t('analytics.title') },
          { to: '/admin/content', label: t('content.title') },
          { to: '/admin/roles', label: t('roles.title') },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-2xl border border-gray-200 bg-white p-4 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-primary-700"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </AdminLayout>
  )
}
