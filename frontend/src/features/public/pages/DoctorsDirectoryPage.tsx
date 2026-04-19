import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { Badge } from '../../../shared/components/ui/Badge'
import type { SpecialtySummary } from '@shared/types/doctor.types'

interface Doctor {
  id: string
  nameAr: string
  nameEn: string
  specialty: SpecialtySummary
  bioAr?: string
  bioEn?: string
  profilePhotoUrl?: string
  consultationFeeSAR: number
  averageRating?: number
  yearsOfExperience?: number
}

function DoctorCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-3 h-16 w-16 rounded-full bg-gray-200" />
      <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
      <div className="mb-2 h-3 w-1/2 rounded bg-gray-200" />
      <div className="h-8 rounded bg-gray-200" />
    </div>
  )
}

export default function DoctorsDirectoryPage() {
  const { t } = useTranslation('public')
  const { lang } = useRTL()
  const [searchParams] = useSearchParams()
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get('specialtyId') ?? '')
  const [search, setSearch] = useState('')

  const { data: specialties } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: SpecialtySummary[] }>('/services')
      return res.data.data
    },
    staleTime: 60_000,
  })

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['doctors', selectedSpecialty, search],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (selectedSpecialty) params.set('specialtyId', selectedSpecialty)
      if (search) params.set('search', search)
      if (pageParam) params.set('cursor', pageParam as string)
      const res = await apiClient.get<{
        success: true
        data: Doctor[]
        meta: { cursor: string | null; hasMore: boolean }
      }>(`/doctors?${params.toString()}`)
      return res.data
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.meta.cursor,
  })

  const doctors = data?.pages.flatMap((p) => p.data) ?? []

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('doctors.title')}</h1>

      {/* Search */}
      <input
        type="search"
        placeholder={t('doctors.search_placeholder')}
        value={search}
        onChange={handleSearch}
        className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label={t('doctors.search_placeholder')}
      />

      {/* Specialty filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSpecialty('')}
          className={[
            'rounded-full px-4 py-1.5 text-sm font-medium transition',
            !selectedSpecialty
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ].join(' ')}
        >
          {t('doctors.all_specialties')}
        </button>
        {(specialties ?? []).map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSpecialty(s.id)}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              selectedSpecialty === s.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ].join(' ')}
          >
            {lang === 'ar' ? s.nameAr : s.nameEn}
          </button>
        ))}
      </div>

      {/* Doctor grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <DoctorCardSkeleton key={i} />)}
        </div>
      ) : doctors.length === 0 ? (
        <div className="py-16 text-center text-gray-400">{t('doctors.no_doctors')}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doc) => (
              <div key={doc.id} className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex items-center gap-3">
                  {doc.profilePhotoUrl ? (
                    <img
                      src={doc.profilePhotoUrl}
                      alt={lang === 'ar' ? doc.nameAr : doc.nameEn}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-xl text-primary-600">
                      👨‍⚕️
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {lang === 'ar' ? doc.nameAr : doc.nameEn}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {lang === 'ar' ? doc.specialty.nameAr : doc.specialty.nameEn}
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-primary-700">
                    {doc.consultationFeeSAR.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}{' '}
                    {lang === 'ar' ? 'ر.س' : 'SAR'}
                  </span>
                  {doc.averageRating && (
                    <Badge variant="info">⭐ {doc.averageRating.toFixed(1)}</Badge>
                  )}
                </div>

                <Link
                  to={`/doctors/${doc.id}`}
                  className="block w-full rounded-xl bg-primary-600 py-2 text-center text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  {t('doctors.book_appointment')}
                </Link>
              </div>
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {isFetchingNextPage ? <Spinner size="sm" /> : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
