import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Modal } from '../../../shared/components/ui/Modal'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { useToast } from '../../../shared/hooks/useToast'
import { formatDateTime, isWithin24Hours } from '../../../shared/utils/date'

interface Appointment {
  id: string
  bookingRef: string
  appointmentDateTime: string
  status: string
  doctor: { id: string; nameAr: string; nameEn: string; specialty: string }
}

type Tab = 'upcoming' | 'past' | 'all'

const statusVariant = (s: string): 'success' | 'danger' | 'info' | 'warning' | 'default' => {
  if (s === 'confirmed') return 'success'
  if (s === 'cancelled') return 'danger'
  if (s === 'completed') return 'info'
  return 'default'
}

export default function AppointmentsListPage() {
  const { t } = useTranslation('patient')
  const { lang } = useRTL()
  const qc = useQueryClient()
  const { addToast } = useToast()

  const [tab, setTab] = useState<Tab>('upcoming')
  const [cancelId, setCancelId] = useState<string | null>(null)

  const status = tab === 'upcoming' ? 'confirmed' : tab === 'past' ? 'completed' : undefined

  const { data, isLoading } = useQuery({
    queryKey: ['patient-appointments', status],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (status) params.set('status', status)
      const res = await apiClient.get<{
        success: true
        data: Appointment[]
        meta: { hasMore: boolean }
      }>(`/patients/me/appointments?${params.toString()}`)
      return res.data
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/appointments/${id}/status`, { status: 'cancelled' })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patient-appointments'] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم إلغاء الموعد' : 'Appointment cancelled' })
      setCancelId(null)
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل الإلغاء' : 'Cancellation failed' })
    },
  })

  const appointments = data?.data ?? []

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('appointments.title')}</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(['upcoming', 'past', 'all'] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={[
              'rounded-lg px-4 py-1.5 text-sm font-medium transition',
              tab === tabKey ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t(`appointments.${tabKey}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center text-gray-400 shadow-sm">
          {t('appointments.title')}
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => {
            const within24 = isWithin24Hours(a.appointmentDateTime)

            return (
              <div key={a.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex-1">
                  <Link to={`/portal/appointments/${a.id}`} className="hover:underline">
                    <p className="font-semibold text-gray-900">
                      {lang === 'ar' ? a.doctor.nameAr : a.doctor.nameEn}
                    </p>
                  </Link>
                  <p className="text-sm text-gray-500">{formatDateTime(a.appointmentDateTime, lang)}</p>
                  <p className="text-xs text-gray-400">{a.bookingRef}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(a.status)}>
                    {t(`appointments.status.${a.status}` as Parameters<typeof t>[0], a.status)}
                  </Badge>

                  {a.status === 'confirmed' && (
                    <button
                      onClick={() => setCancelId(a.id)}
                      disabled={within24}
                      title={within24 ? t('appointments.cannot_cancel') : t('appointments.cancel')}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t('appointments.cancel')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cancel confirmation modal */}
      <Modal
        isOpen={Boolean(cancelId)}
        onClose={() => setCancelId(null)}
        title={t('appointments.cancel')}
      >
        <p className="mb-4 text-gray-600">{t('appointments.cancel_confirm')}</p>
        <p className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          {t('appointments.cancel_policy')}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCancelId(null)}>
            {lang === 'ar' ? 'تراجع' : 'Back'}
          </Button>
          <Button
            variant="danger"
            isLoading={cancelMutation.isPending}
            onClick={() => cancelId && cancelMutation.mutate(cancelId)}
          >
            {t('appointments.cancel')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
