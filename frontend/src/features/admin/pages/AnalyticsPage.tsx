import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../../shared/components/layout/AdminLayout'
import { apiClient } from '../../../shared/api/client'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { useRTL } from '../../../shared/hooks/useRTL'
import { formatCurrency } from '../../../shared/utils/currency'

interface DayStat {
  date: string
  count: number
  revenue: number
}

interface SpecialtyStat {
  specialty: string
  count: number
  revenue: number
}

interface Summary {
  totalAppointments: number
  totalRevenueSAR: number
  newPatients: number
  completedAppointments: number
  cancelledAppointments: number
}

export default function AnalyticsPage() {
  const { t } = useTranslation('admin')
  const { lang } = useRTL()

  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(today)

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['analytics-summary', from, to],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: Summary }>(
        `/analytics/summary?from=${from}&to=${to}`,
      )
      return res.data.data
    },
  })

  const { data: byDay, isLoading: loadingByDay } = useQuery({
    queryKey: ['analytics-by-day', from, to],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: DayStat[] }>(
        `/analytics/by-day?from=${from}&to=${to}`,
      )
      return res.data.data
    },
  })

  const { data: bySpecialty, isLoading: loadingSpecialty } = useQuery({
    queryKey: ['analytics-by-specialty', from, to],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: SpecialtyStat[] }>(
        `/analytics/by-specialty?from=${from}&to=${to}`,
      )
      return res.data.data
    },
  })

  const isLoading = loadingSummary || loadingByDay || loadingSpecialty

  const kpis = summary
    ? [
        {
          label: lang === 'ar' ? 'إجمالي المواعيد' : 'Total Appointments',
          value: summary.totalAppointments,
        },
        {
          label: lang === 'ar' ? 'الإيرادات' : 'Revenue',
          value: formatCurrency(summary.totalRevenueSAR, lang),
        },
        {
          label: lang === 'ar' ? 'مرضى جدد' : 'New Patients',
          value: summary.newPatients,
        },
        {
          label: lang === 'ar' ? 'مكتملة' : 'Completed',
          value: summary.completedAppointments,
        },
        {
          label: lang === 'ar' ? 'ملغاة' : 'Cancelled',
          value: summary.cancelledAppointments,
        },
      ]
    : []

  const maxCount = Math.max(...(byDay?.map((d) => d.count) ?? [1]), 1)

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>

      {/* Date range */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <label className="me-2 text-sm text-gray-600">
            {lang === 'ar' ? 'من' : 'From'}
          </label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="me-2 text-sm text-gray-600">
            {lang === 'ar' ? 'إلى' : 'To'}
          </label>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="mb-1 text-sm text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-primary-700">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Bar chart — appointments by day */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">
              {lang === 'ar' ? 'المواعيد اليومية' : 'Daily Appointments'}
            </h2>
            <div className="flex h-40 items-end gap-1 overflow-x-auto pb-2">
              {(byDay ?? []).map((d) => (
                <div key={d.date} className="group relative flex flex-col items-center">
                  <div
                    className="w-5 min-w-[20px] rounded-t bg-primary-500 transition-all group-hover:bg-primary-600"
                    style={{ height: `${(d.count / maxCount) * 140}px` }}
                  />
                  <span className="mt-1 hidden text-[9px] text-gray-400 group-hover:block">
                    {d.date.slice(5)}
                  </span>
                  <div className="absolute bottom-full mb-1 hidden whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                    {d.count} {lang === 'ar' ? 'موعد' : 'appts'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By specialty */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">
              {lang === 'ar' ? 'حسب التخصص' : 'By Specialty'}
            </h2>
            {(bySpecialty ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">
                {lang === 'ar' ? 'لا توجد بيانات' : 'No data'}
              </p>
            ) : (
              <div className="space-y-3">
                {(bySpecialty ?? []).map((s) => (
                  <div key={s.specialty} className="flex items-center gap-4">
                    <span className="w-40 truncate text-sm text-gray-700">{s.specialty}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-primary-500"
                        style={{
                          width: `${(s.count / (bySpecialty?.[0]?.count ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-12 text-end text-sm font-medium text-gray-900">
                      {s.count}
                    </span>
                    <span className="w-28 text-end text-sm text-gray-500">
                      {formatCurrency(s.revenue, lang)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
