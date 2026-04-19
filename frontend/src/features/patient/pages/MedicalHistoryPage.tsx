import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { formatDate } from '../../../shared/utils/date'

interface HistoryItem {
  id: string
  bookingRef: string
  appointmentDateTime: string
  status: string
  doctor: { nameAr: string; nameEn: string }
  note: string | null
}

export default function MedicalHistoryPage() {
  const { t } = useTranslation('patient')
  const { lang } = useRTL()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['patient-history'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: HistoryItem[] }>('/patients/me/history')
      return res.data.data
    },
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('history.title')}</h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl bg-white py-16 text-center text-gray-400 shadow-sm">
          {t('history.no_history')}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                className="flex w-full items-center justify-between p-4 text-start"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {lang === 'ar' ? item.doctor.nameAr : item.doctor.nameEn}
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(item.appointmentDateTime, lang)}</p>
                </div>
                <svg
                  className={`h-5 w-5 text-gray-400 transition-transform ${expanded === item.id ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded === item.id && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  {item.note ? (
                    <p className="text-gray-700">{item.note}</p>
                  ) : (
                    <p className="text-gray-400">{t('appointments.no_notes')}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
