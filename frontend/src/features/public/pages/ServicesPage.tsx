import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Spinner } from '../../../shared/components/ui/Spinner'
import type { SpecialtySummary } from '@shared/types/doctor.types'

export default function ServicesPage() {
  const { t } = useTranslation('public')
  const { lang } = useRTL()

  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: SpecialtySummary[] }>('/services')
      return res.data.data
    },
    staleTime: 30_000,
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('services.title')}</h1>
        <p className="mt-2 text-gray-500">{t('services.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {(services ?? []).map((s) => (
            <Link
              key={s.id}
              to={`/doctors?specialtyId=${s.id}`}
              className="group flex flex-col rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md hover:ring-1 hover:ring-primary-200"
            >
              <span className="mb-3 text-4xl">{s.icon ?? '🏥'}</span>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-700">
                {lang === 'ar' ? s.nameAr : s.nameEn}
              </h3>
              {(lang === 'ar' ? s.descriptionAr : s.descriptionEn) && (
                <p className="mt-1 text-sm text-gray-500">
                  {lang === 'ar' ? s.descriptionAr : s.descriptionEn}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
