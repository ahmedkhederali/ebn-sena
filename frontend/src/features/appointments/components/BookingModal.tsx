import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useBookAppointment } from '../hooks/useBookAppointment'
import type { SlotHoldResponse } from '@shared/types/appointment.types'

// ── Validation schema ──────────────────────────────────────────────────────────
const patientSchema = z.object({
  patientName: z.string().min(2),
  patientPhone: z
    .string()
    .regex(/^\+9665\d{8}$/, 'phone_invalid'),
  patientNationalId: z
    .string()
    .regex(/^\d{10}$/, 'national_id_invalid'),
  patientNotes: z.string().max(500).optional(),
})

type PatientFormValues = z.infer<typeof patientSchema>

// ── Props ──────────────────────────────────────────────────────────────────────
interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  onHoldSuccess: (hold: SlotHoldResponse) => void
  doctorId: string
  doctorNameAr: string
  doctorNameEn: string
  specialtyAr: string
  specialtyEn: string
  consultationFeeSAR: number
  selectedDate: string      // YYYY-MM-DD
  selectedTime: string      // HH:mm
}

export function BookingModal({
  isOpen,
  onClose,
  onHoldSuccess,
  doctorId,
  doctorNameAr,
  doctorNameEn,
  specialtyAr,
  specialtyEn,
  consultationFeeSAR,
  selectedDate,
  selectedTime,
}: BookingModalProps) {
  const { t, i18n } = useTranslation('appointments')
  const isAr = i18n.language === 'ar'
  const dialogRef = useRef<HTMLDialogElement>(null)

  // ISO 8601 datetime from date + time
  const appointmentDateTime = `${selectedDate}T${selectedTime}:00.000Z`

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<PatientFormValues>({ resolver: zodResolver(patientSchema) })

  const { mutate: holdSlot, isPending } = useBookAppointment({
    onSuccess: (data) => {
      reset()
      onHoldSuccess(data)
    },
    onError: (code) => {
      if (code === 'SLOT_UNAVAILABLE') {
        setError('root', { message: t('errors.slotUnavailable') })
      } else {
        setError('root', { message: t('errors.bookingFailed') })
      }
    },
  })

  // Native dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  function onSubmit(values: PatientFormValues) {
    holdSlot({
      doctorId,
      appointmentDateTime,
      patientName: values.patientName,
      patientPhone: values.patientPhone,
      patientNationalId: values.patientNationalId,
      patientNotes: values.patientNotes,
    })
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="w-full max-w-md rounded-2xl bg-white p-0 shadow-xl backdrop:bg-black/50"
      aria-labelledby="booking-modal-title"
      aria-modal="true"
    >
      <div className="p-6" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="booking-modal-title" className="text-lg font-semibold text-gray-900">
              {t('confirmBooking')}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isAr ? doctorNameAr : doctorNameEn} · {isAr ? specialtyAr : specialtyEn}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('cancel')}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Appointment summary */}
        <div className="mb-5 rounded-xl bg-primary-50 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('date')}</span>
            <span className="font-medium text-gray-900">{selectedDate}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-gray-600">{t('time')}</span>
            <span className="font-medium text-gray-900">{selectedTime}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-primary-100 pt-2">
            <span className="font-semibold text-gray-900">{t('consultationFee')}</span>
            <span className="font-bold text-primary-700">
              {isAr
                ? `${consultationFeeSAR.toLocaleString('ar-SA')} ${t('currency')}`
                : `${t('currency')} ${consultationFeeSAR}`}
            </span>
          </div>
        </div>

        {/* Patient info form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-gray-900">{t('patientInfo')}</legend>

            {/* Name */}
            <div className="mb-3">
              <label htmlFor="patientName" className="mb-1 block text-sm text-gray-700">
                {t('patientName')} <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="patientName"
                type="text"
                autoComplete="name"
                aria-required="true"
                aria-invalid={Boolean(errors.patientName)}
                aria-describedby={errors.patientName ? 'patientName-error' : undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                {...register('patientName')}
              />
              {errors.patientName && (
                <p id="patientName-error" className="mt-1 text-xs text-red-600" role="alert">
                  {t('errors.nameRequired')}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="mb-3">
              <label htmlFor="patientPhone" className="mb-1 block text-sm text-gray-700">
                {t('patientPhone')} <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="patientPhone"
                type="tel"
                autoComplete="tel"
                placeholder="+9665XXXXXXXX"
                dir="ltr"
                aria-required="true"
                aria-invalid={Boolean(errors.patientPhone)}
                aria-describedby={errors.patientPhone ? 'patientPhone-error' : undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                {...register('patientPhone')}
              />
              {errors.patientPhone && (
                <p id="patientPhone-error" className="mt-1 text-xs text-red-600" role="alert">
                  {t('errors.phoneInvalid')}
                </p>
              )}
            </div>

            {/* National ID */}
            <div className="mb-3">
              <label htmlFor="patientNationalId" className="mb-1 block text-sm text-gray-700">
                {t('patientNationalId')} <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="patientNationalId"
                type="text"
                inputMode="numeric"
                maxLength={10}
                dir="ltr"
                aria-required="true"
                aria-invalid={Boolean(errors.patientNationalId)}
                aria-describedby={errors.patientNationalId ? 'nationalId-error' : undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                {...register('patientNationalId')}
              />
              {errors.patientNationalId && (
                <p id="nationalId-error" className="mt-1 text-xs text-red-600" role="alert">
                  {t('errors.nationalIdInvalid')}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label htmlFor="patientNotes" className="mb-1 block text-sm text-gray-700">
                {t('patientNotes')}
              </label>
              <textarea
                id="patientNotes"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                {...register('patientNotes')}
              />
            </div>
          </fieldset>

          {/* Root error */}
          {errors.root && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {errors.root.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isPending ? t('loading') : t('proceedToPayment')}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
