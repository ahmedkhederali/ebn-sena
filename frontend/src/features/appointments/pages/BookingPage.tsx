import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../../../shared/api/client'
import { SpecialtyFilter } from '../components/SpecialtyFilter'
import { SlotGrid } from '../components/SlotGrid'
import { BookingModal } from '../components/BookingModal'
import { useAvailableSlots } from '../hooks/useAvailableSlots'
import type { SlotHoldResponse } from '@shared/types/appointment.types'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Specialty {
  id: string
  nameAr: string
  nameEn: string
}

interface Doctor {
  id: string
  nameAr: string
  nameEn: string
  specialty: { id: string; nameAr: string; nameEn: string }
  profilePhotoUrl?: string
  consultationFeeSAR: number
  averageRating: number
  ratingCount: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getNext30Days(): Date[] {
  const dates: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }
  return dates
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-sm text-amber-500">
      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span>{rating.toFixed(1)}</span>
      <span className="text-gray-400">({count})</span>
    </span>
  )
}

function DoctorCard({
  doctor,
  isSelected,
  onSelect,
  lang,
}: {
  doctor: Doctor
  isSelected: boolean
  onSelect: () => void
  lang: string
}) {
  const { t } = useTranslation('appointments')
  const isAr = lang === 'ar'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={[
        'w-full rounded-xl border p-4 text-start transition-all focus:outline-none focus:ring-2 focus:ring-primary-500',
        isSelected
          ? 'border-primary-500 bg-primary-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100">
          {doctor.profilePhotoUrl ? (
            <img
              src={doctor.profilePhotoUrl}
              alt={isAr ? doctor.nameAr : doctor.nameEn}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-400">
              {(isAr ? doctor.nameAr : doctor.nameEn).charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">
            {isAr ? doctor.nameAr : doctor.nameEn}
          </p>
          <p className="text-sm text-gray-500">
            {isAr ? doctor.specialty.nameAr : doctor.specialty.nameEn}
          </p>
          <StarRating rating={doctor.averageRating} count={doctor.ratingCount} />
        </div>

        <div className="shrink-0 text-end">
          <p className="text-sm font-bold text-primary-700">
            {isAr
              ? `${doctor.consultationFeeSAR.toLocaleString('ar-SA')} ${t('currency')}`
              : `${t('currency')} ${doctor.consultationFeeSAR}`}
          </p>
        </div>
      </div>
    </button>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BookingPage() {
  const { t, i18n } = useTranslation('appointments')
  const navigate = useNavigate()
  const isAr = i18n.language === 'ar'

  // State
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const dates = useMemo(() => getNext30Days(), [])

  // Fetch specialties
  const { data: specialtiesData } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: true; data: Specialty[] }>('/services')
      return data.data
    },
    staleTime: 5 * 60_000,
  })
  const specialties = specialtiesData ?? []

  // Fetch doctors filtered by specialty
  const { data: doctorsData, isLoading: isDoctorsLoading } = useQuery({
    queryKey: ['doctors', selectedSpecialty],
    queryFn: async () => {
      const params = selectedSpecialty ? { specialtyId: selectedSpecialty } : {}
      const { data } = await apiClient.get<{ success: true; data: Doctor[] }>('/doctors', { params })
      return data.data
    },
    staleTime: 30_000,
  })
  const doctors = doctorsData ?? []

  // Fetch available slots (polls every 5s)
  const { data: slotsData, isLoading: isSlotsLoading } = useAvailableSlots({
    doctorId: selectedDoctor?.id ?? null,
    date: selectedDate,
  })

  function handleSlotSelect(time: string) {
    setSelectedSlot(time)
  }

  function handleBookNow() {
    if (!selectedSlot) return
    setIsModalOpen(true)
  }

  function handleHoldSuccess(hold: SlotHoldResponse) {
    const doctorName = isAr ? (selectedDoctor?.nameAr ?? '') : (selectedDoctor?.nameEn ?? '')
    sessionStorage.setItem('booking_holdId', hold.holdId)
    sessionStorage.setItem('booking_sessionRef', hold.sessionRef)
    sessionStorage.setItem('booking_expiresAt', typeof hold.expiresAt === 'string' ? hold.expiresAt : new Date(hold.expiresAt).toISOString())
    sessionStorage.setItem('booking_doctorName', doctorName)
    sessionStorage.setItem('booking_fee', String(selectedDoctor?.consultationFeeSAR ?? 0))
    sessionStorage.setItem('booking_datetime', `${selectedDate}T${selectedSlot}:00.000Z`)
    sessionStorage.setItem('booking_doctorId', selectedDoctor?.id ?? '')
    setIsModalOpen(false)
    navigate('/checkout')
  }

  function handleSpecialtyChange(id: string | null) {
    setSelectedSpecialty(id)
    setSelectedDoctor(null)
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  function handleDoctorSelect(doctor: Doctor) {
    setSelectedDoctor(doctor)
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50">
      {/* Page header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Left column: Doctor selection ─────────────────────────── */}
          <div className="lg:col-span-1">

            {/* Specialty filter */}
            <section aria-labelledby="specialty-heading" className="mb-4">
              <h2 id="specialty-heading" className="mb-2 text-sm font-semibold text-gray-700">
                {t('selectSpecialty')}
              </h2>
              <SpecialtyFilter
                specialties={specialties}
                selected={selectedSpecialty}
                onChange={handleSpecialtyChange}
              />
            </section>

            {/* Doctor list */}
            <section aria-labelledby="doctor-heading">
              <h2 id="doctor-heading" className="mb-2 text-sm font-semibold text-gray-700">
                {t('selectDoctor')}
              </h2>

              {isDoctorsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
                  ))}
                </div>
              ) : doctors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
                  {t('noSlotsAvailable')}
                </div>
              ) : (
                <div className="space-y-2" role="list" aria-label={t('selectDoctor')}>
                  {doctors.map((doc) => (
                    <DoctorCard
                      key={doc.id}
                      doctor={doc}
                      isSelected={selectedDoctor?.id === doc.id}
                      onSelect={() => handleDoctorSelect(doc)}
                      lang={i18n.language}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── Right column: Date & slot picker ──────────────────────── */}
          <div className="lg:col-span-2">
            {!selectedDoctor ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                {t('selectDoctor')}
              </div>
            ) : (
              <div className="space-y-5">

                {/* Date picker */}
                <section aria-labelledby="date-heading">
                  <h2 id="date-heading" className="mb-2 text-sm font-semibold text-gray-700">
                    {t('selectDate')}
                  </h2>
                  <div
                    className="flex gap-2 overflow-x-auto pb-2"
                    role="group"
                    aria-label={t('selectDate')}
                  >
                    {dates.map((d) => {
                      const dateStr = formatDate(d)
                      const isSelected = selectedDate === dateStr
                      const dayName = d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { weekday: 'short' })
                      const dayNum = d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { day: 'numeric' })
                      const monthName = d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short' })

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => handleDateSelect(dateStr)}
                          aria-pressed={isSelected}
                          aria-label={`${dayName} ${dayNum} ${monthName}`}
                          className={[
                            'flex min-w-[4rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary-500',
                            isSelected
                              ? 'border-primary-600 bg-primary-600 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300',
                          ].join(' ')}
                        >
                          <span className="font-medium">{dayName}</span>
                          <span className="mt-0.5 text-lg font-bold leading-tight">{dayNum}</span>
                          <span className="text-[10px] opacity-75">{monthName}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Slot grid */}
                {selectedDate && (
                  <section aria-labelledby="slots-heading">
                    <h2 id="slots-heading" className="mb-2 text-sm font-semibold text-gray-700">
                      {t('availableSlots')}
                    </h2>
                    <SlotGrid
                      slots={slotsData?.slots ?? []}
                      selectedSlot={selectedSlot}
                      onSelect={handleSlotSelect}
                      isLoading={isSlotsLoading}
                    />
                  </section>
                )}

                {/* Booking CTA */}
                {selectedSlot && selectedDate && (
                  <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {isAr ? selectedDoctor.nameAr : selectedDoctor.nameEn}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedDate} · {selectedSlot}
                        </p>
                      </div>
                      <p className="font-bold text-primary-700">
                        {isAr
                          ? `${selectedDoctor.consultationFeeSAR.toLocaleString('ar-SA')} ${t('currency')}`
                          : `${t('currency')} ${selectedDoctor.consultationFeeSAR}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleBookNow}
                      className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      {t('bookNow')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Booking modal */}
      {selectedDoctor && selectedDate && selectedSlot && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onHoldSuccess={handleHoldSuccess}
          doctorId={selectedDoctor.id}
          doctorNameAr={selectedDoctor.nameAr}
          doctorNameEn={selectedDoctor.nameEn}
          specialtyAr={selectedDoctor.specialty.nameAr}
          specialtyEn={selectedDoctor.specialty.nameEn}
          consultationFeeSAR={selectedDoctor.consultationFeeSAR}
          selectedDate={selectedDate}
          selectedTime={selectedSlot}
        />
      )}
    </div>
  )
}
