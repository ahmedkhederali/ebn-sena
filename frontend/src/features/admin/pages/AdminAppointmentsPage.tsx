import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../../shared/components/layout/AdminLayout'
import { apiClient } from '../../../shared/api/client'
import { Table } from '../../../shared/components/ui/Table'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Modal } from '../../../shared/components/ui/Modal'
import { useToast } from '../../../shared/hooks/useToast'
import { useRTL } from '../../../shared/hooks/useRTL'
import { formatDateTime } from '../../../shared/utils/date'

interface AdminAppointment {
  id: string
  bookingRef: string
  appointmentDateTime: string
  status: string
  patientName: string
  doctorId: string
  patientId: string
}

export default function AdminAppointmentsPage() {
  const { t } = useTranslation('admin')
  const { lang } = useRTL()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [newDatetime, setNewDatetime] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-appointments', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await apiClient.get<{ success: true; data: AdminAppointment[] }>(
        `/admin/appointments?${params.toString()}`,
      )
      return res.data.data
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, dt }: { id: string; dt: string }) => {
      await apiClient.put(`/admin/appointments/${id}/reschedule`, { newDateTime: dt })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-appointments'] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تمت إعادة الجدولة' : 'Rescheduled' })
      setRescheduleId(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/admin/appointments/${id}/cancel`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-appointments'] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم الإلغاء' : 'Cancelled' })
    },
  })

  const appointments = data ?? []

  const columns = [
    { key: 'bookingRef', header: t('appointments.ref') },
    {
      key: 'patientName',
      header: t('appointments.patient'),
      render: (row: AdminAppointment) => row.patientName,
    },
    {
      key: 'appointmentDateTime',
      header: t('appointments.date'),
      render: (row: AdminAppointment) => formatDateTime(row.appointmentDateTime, lang),
    },
    {
      key: 'status',
      header: t('appointments.status'),
      render: (row: AdminAppointment) => (
        <Badge variant={row.status === 'confirmed' ? 'success' : row.status === 'cancelled' ? 'danger' : 'info'}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('appointments.actions'),
      render: (row: AdminAppointment) =>
        row.status === 'confirmed' ? (
          <div className="flex gap-2">
            <button
              onClick={() => setRescheduleId(row.id)}
              className="text-xs text-primary-600 hover:underline"
            >
              {t('appointments.reschedule')}
            </button>
            <button
              onClick={() => cancelMutation.mutate(row.id)}
              className="text-xs text-red-600 hover:underline"
            >
              {t('appointments.cancel')}
            </button>
          </div>
        ) : null,
    },
  ]

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('appointments.title')}</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{lang === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
          <option value="confirmed">{lang === 'ar' ? 'مؤكد' : 'Confirmed'}</option>
          <option value="completed">{lang === 'ar' ? 'مكتمل' : 'Completed'}</option>
          <option value="cancelled">{lang === 'ar' ? 'ملغي' : 'Cancelled'}</option>
        </select>
      </div>

      <Table
        columns={columns as Parameters<typeof Table>[0]['columns']}
        data={appointments as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage={lang === 'ar' ? 'لا توجد مواعيد' : 'No appointments'}
      />

      {/* Reschedule modal */}
      <Modal
        isOpen={Boolean(rescheduleId)}
        onClose={() => setRescheduleId(null)}
        title={t('appointments.reschedule')}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('appointments.new_datetime')}
            </label>
            <input
              type="datetime-local"
              value={newDatetime}
              onChange={(e) => setNewDatetime(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRescheduleId(null)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              isLoading={rescheduleMutation.isPending}
              onClick={() =>
                rescheduleId &&
                newDatetime &&
                rescheduleMutation.mutate({ id: rescheduleId, dt: newDatetime })
              }
            >
              {t('appointments.reschedule')}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
