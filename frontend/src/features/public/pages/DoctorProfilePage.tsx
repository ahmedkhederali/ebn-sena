import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { formatCurrency } from '../../../shared/utils/currency'
import type { SpecialtySummary } from '@shared/types/doctor.types'
import type { TimeSlot } from '@shared/types/appointment.types'

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
  qualifications?: string[]
}

function getNext30Days(): Date[] {
  const dates: Date[] = []
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }
  return dates
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function DoctorProfilePage() {
  const { id: doctorId } = useParams<{ id: string }>()
  const { t } = useTranslation('public')
  const { lang } = useRTL()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: Doctor }>(`/doctors/${doctorId ?? ''}`)
      return res.data.data
    },
    enabled: Boolean(doctorId),
  })

  const { data: slotsData } = useQuery({
    queryKey: ['slots', doctorId, selectedDate],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true
        data: { slotDurationMinutes: number; slots: TimeSlot[] }
      }>(`/appointments/slots?doctorId=${doctorId ?? ''}&date=${selectedDate}`)
      return res.data.data
    },
    enabled: Boolean(doctorId),
    refetchInterval: 5000,
  })

  const dates = getNext30Days()

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="py-20 text-center text-gray-400">Doctor not found</div>
    )
  }

  const name = lang === 'ar' ? doctor.nameAr : doctor.nameEn
  const specialty = lang === 'ar' ? doctor.specialty.nameAr : doctor.specialty.nameEn
  const bio = lang === 'ar' ? doctor.bioAr : doctor.bioEn

  function handleBook() {
    if (!selectedSlot) return
    // Build the appointment datetime
    const [hours, minutes] = selectedSlot.split(':').map(Number)
    const dt = new Date(selectedDate)
    dt.setHours(hours ?? 0, minutes ?? 0, 0, 0)

    sessionStorage.setItem('booking_doctorId', doctorId ?? '')
    sessionStorage.setItem('booking_doctorName', name)
    sessionStorage.setItem('booking_fee', String(doctor?.consultationFeeSAR ?? 0))
    sessionStorage.setItem('booking_datetime', dt.toISOString())

    void navigate(`/book?doctorId=${doctorId ?? ''}&slot=${dt.toISOString()}`)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm sm:flex-row">
        {doctor.profilePhotoUrl ? (
          <img
            src={doctor.profilePhotoUrl}
            alt={name}
            className="h-24 w-24 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-100 text-4xl">
            👨‍⚕️
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          <p className="text-primary-600">{specialty}</p>
          {doctor.yearsOfExperience && (
            <p className="mt-1 text-sm text-gray-500">
              {doctor.yearsOfExperience} {t('doctors.experience')}
            </p>
          )}
          <p className="mt-2 text-lg font-semibold text-gray-800">
            {formatCurrency(doctor.consultationFeeSAR, lang)}
          </p>
        </div>
      </div>

      {bio && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-2 font-semibold text-gray-900">{lang === 'ar' ? 'نبذة' : 'About'}</h2>
          <p className="text-gray-600">{bio}</p>
        </div>
      )}

      {/* ── Date picker ──────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">{t('booking.select_date')}</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((d) => {
            const ds = toDateStr(d)
            return (
              <button
                key={ds}
                onClick={() => { setSelectedDate(ds); setSelectedSlot(null) }}
                className={[
                  'flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-sm transition',
                  selectedDate === ds
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <span className="text-xs text-gray-500">
                  {d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' })}
                </span>
                <span className="font-semibold">{d.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Slot picker ──────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">{t('booking.select_time')}</h2>
        {!slotsData ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : slotsData.slots.filter((s) => s.available).length === 0 ? (
          <p className="text-center text-gray-400">{t('booking.no_slots')}</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slotsData.slots.map((slot) => (
              <button
                key={slot.time}
                disabled={!slot.available}
                aria-disabled={!slot.available}
                onClick={() => setSelectedSlot(slot.time)}
                className={[
                  'rounded-xl border py-2 text-sm font-medium transition',
                  !slot.available
                    ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                    : selectedSlot === slot.time
                    ? 'border-primary-500 bg-primary-600 text-white'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50',
                ].join(' ')}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleBook}
        disabled={!selectedSlot}
        className="w-full rounded-2xl bg-primary-600 py-4 text-lg font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selectedSlot ? t('doctors.book_appointment') : t('booking.select_slot_first')}
      </button>
    </div>
  )
}
