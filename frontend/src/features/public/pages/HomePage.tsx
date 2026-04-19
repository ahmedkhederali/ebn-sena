import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Spinner } from '../../../shared/components/ui/Spinner'
import type { SpecialtySummary } from '@shared/types/doctor.types'

export default function HomePage() {
  const { t } = useTranslation('public')
  const { lang } = useRTL()

  const { data: specialties } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: SpecialtySummary[] }>('/services')
      return res.data.data
    },
    staleTime: 30_000,
  })

  const { data: content } = useQuery({
    queryKey: ['content', 'hero'],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true
        data: Record<string, { ar: string; en: string }>
      }>('/content/public?keys[]=hero.title&keys[]=hero.subtitle&keys[]=hero.cta')
      return res.data.data
    },
    staleTime: 30_000,
  })

  const heroTitle = content?.['hero.title']?.[lang] ?? t('home.hero_title')
  const heroSubtitle = content?.['hero.subtitle']?.[lang] ?? t('home.hero_subtitle')

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">{heroTitle}</h1>
          <p className="mb-8 text-lg text-primary-100 md:text-xl">{heroSubtitle}</p>
          <Link
            to="/doctors"
            className="inline-block rounded-2xl bg-white px-8 py-4 text-lg font-bold text-primary-700 shadow-lg transition hover:bg-primary-50"
          >
            {t('home.book_now')}
          </Link>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <section className="bg-white py-10 shadow-sm">
        <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-gray-100 px-4">
          {[
            { value: '20+', label: t('home.stats_doctors') },
            { value: '5000+', label: t('home.stats_patients') },
            { value: '10+', label: t('home.stats_years') },
          ].map((stat) => (
            <div key={stat.label} className="px-4 text-center">
              <div className="text-3xl font-bold text-primary-700">{stat.value}</div>
              <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Specialties ──────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
            {t('home.featured_specialties')}
          </h2>
          {!specialties ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {specialties.map((s) => (
                <Link
                  key={s.id}
                  to={`/doctors?specialtyId=${s.id}`}
                  className="flex flex-col items-center rounded-2xl bg-white p-4 text-center shadow-sm transition hover:shadow-md hover:ring-1 hover:ring-primary-200"
                >
                  <span className="mb-2 text-3xl">{s.icon ?? '🏥'}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {lang === 'ar' ? s.nameAr : s.nameEn}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="bg-primary-50 py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">{t('home.our_doctors')}</h2>
          <Link
            to="/doctors"
            className="inline-block rounded-2xl bg-primary-600 px-8 py-3 font-bold text-white transition hover:bg-primary-700"
          >
            {t('home.book_now')}
          </Link>
        </div>
      </section>
    </div>
  )
}
