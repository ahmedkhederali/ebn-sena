import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { useToast } from '../../../shared/hooks/useToast'
import { formatDateTime } from '../../../shared/utils/date'

interface PatientAppointment {
  id: string
  bookingRef: string
  appointmentDateTime: string
  status: string
  consultationNote: string | null
}

interface PatientInfo {
  id: string
  nameAr: string
  nameEn: string
  phone: string
  appointments: PatientAppointment[]
}

export default function PatientDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const { t } = useTranslation('doctor')
  const { lang } = useRTL()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const [note, setNote] = useState('')
  const [editingApptId, setEditingApptId] = useState<string | null>(null)

  const { data: patient, isLoading } = useQuery({
    queryKey: ['doctor-patient', appointmentId],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: PatientInfo }>(
        `/doctors/me/appointments/${appointmentId ?? ''}/patient`,
      )
      return res.data.data
    },
    enabled: Boolean(appointmentId),
  })

  const { data: appointment } = useQuery({
    queryKey: ['doctor-appointment', appointmentId],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: PatientAppointment }>(
        `/doctors/me/appointments/${appointmentId ?? ''}`,
      )
      return res.data.data
    },
    enabled: Boolean(appointmentId),
  })

  const noteMutation = useMutation({
    mutationFn: async ({ id, note: noteText }: { id: string; note: string }) => {
      await apiClient.put(`/doctors/me/appointments/${id}/note`, { note: noteText })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['doctor-patient', appointmentId] })
      void qc.invalidateQueries({ queryKey: ['doctor-appointment', appointmentId] })
      addToast({
        type: 'success',
        message: lang === 'ar' ? 'تم حفظ الملاحظة' : 'Note saved',
      })
      setEditingApptId(null)
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل الحفظ' : 'Save failed' })
    },
  })

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/doctors/me/appointments/${id}/complete`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['doctor-appointment', appointmentId] })
      addToast({
        type: 'success',
        message: lang === 'ar' ? 'تم إنهاء الموعد' : 'Appointment completed',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!patient) {
    return <div className="py-20 text-center text-gray-400">Patient not found</div>
  }

  const currentNote = appointment?.consultationNote ?? ''

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/doctor/schedule" className="text-sm text-gray-500 hover:text-primary-600">
          ← {lang === 'ar' ? 'رجوع' : 'Back'}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {lang === 'ar' ? patient.nameAr : patient.nameEn}
        </h1>
      </div>

      <div className="space-y-4">
        {/* Patient info */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">
            {lang === 'ar' ? 'معلومات المريض' : 'Patient Information'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-gray-500">{lang === 'ar' ? 'الاسم (عربي)' : 'Name (AR)'}</span>
              <p className="font-medium text-gray-900">{patient.nameAr}</p>
            </div>
            <div>
              <span className="text-gray-500">{lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (EN)'}</span>
              <p className="font-medium text-gray-900">{patient.nameEn}</p>
            </div>
            <div>
              <span className="text-gray-500">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span>
              <p className="font-medium text-gray-900">{patient.phone}</p>
            </div>
          </div>
        </div>

        {/* Current appointment */}
        {appointment && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {lang === 'ar' ? 'الموعد الحالي' : 'Current Appointment'}
              </h2>
              <Badge
                variant={
                  appointment.status === 'confirmed'
                    ? 'success'
                    : appointment.status === 'completed'
                      ? 'info'
                      : 'danger'
                }
              >
                {appointment.status}
              </Badge>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              {formatDateTime(appointment.appointmentDateTime, lang)}
            </p>

            {/* Consultation note */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {lang === 'ar' ? 'ملاحظات الاستشارة' : 'Consultation Notes'}
              </label>
              {editingApptId === appointment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={lang === 'ar' ? 'اكتب الملاحظات هنا...' : 'Write notes here...'}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      isLoading={noteMutation.isPending}
                      onClick={() =>
                        noteMutation.mutate({ id: appointment.id, note })
                      }
                    >
                      {lang === 'ar' ? 'حفظ' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingApptId(null)}
                    >
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {currentNote ? (
                    <p className="mb-2 text-sm text-gray-700">{currentNote}</p>
                  ) : (
                    <p className="mb-2 text-sm text-gray-400">
                      {lang === 'ar' ? 'لا توجد ملاحظات' : 'No notes yet'}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setNote(currentNote)
                      setEditingApptId(appointment.id)
                    }}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    {lang === 'ar' ? 'تعديل الملاحظات' : 'Edit Notes'}
                  </button>
                </div>
              )}
            </div>

            {appointment.status === 'confirmed' && (
              <Button
                variant="secondary"
                size="sm"
                isLoading={completeMutation.isPending}
                onClick={() => completeMutation.mutate(appointment.id)}
              >
                {lang === 'ar' ? 'إنهاء الموعد' : 'Mark Complete'}
              </Button>
            )}
          </div>
        )}

        {/* Visit history */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">
            {lang === 'ar' ? 'سجل الزيارات' : 'Visit History'}
          </h2>
          {patient.appointments.length === 0 ? (
            <p className="text-sm text-gray-400">
              {lang === 'ar' ? 'لا توجد زيارات سابقة' : 'No previous visits'}
            </p>
          ) : (
            <div className="space-y-3">
              {patient.appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-start justify-between rounded-xl bg-gray-50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.bookingRef}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(appt.appointmentDateTime, lang)}
                    </p>
                    {appt.consultationNote && (
                      <p className="mt-1 text-xs text-gray-600">{appt.consultationNote}</p>
                    )}
                  </div>
                  <Badge
                    variant={
                      appt.status === 'completed'
                        ? 'success'
                        : appt.status === 'cancelled'
                          ? 'danger'
                          : 'info'
                    }
                  >
                    {appt.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
