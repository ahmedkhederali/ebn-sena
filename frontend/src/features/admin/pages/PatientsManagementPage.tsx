import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AdminLayout } from '../../../shared/components/layout/AdminLayout'
import { apiClient } from '../../../shared/api/client'
import { Table } from '../../../shared/components/ui/Table'
import { useRTL } from '../../../shared/hooks/useRTL'
import { formatDate } from '../../../shared/utils/date'

interface Patient {
  id: string
  nameAr: string
  nameEn: string
  phone: string
  email: string
  createdAt: string
  appointmentCount: number
}

export default function PatientsManagementPage() {
  const { t } = useTranslation('admin')
  const { lang } = useRTL()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-patients', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      const res = await apiClient.get<{ success: true; data: Patient[] }>(
        `/admin/patients?${params.toString()}`,
      )
      return res.data.data
    },
  })

  const columns = [
    {
      key: 'name',
      header: t('patients.name'),
      render: (row: Patient) => (
        <Link
          to={`/admin/patients/${row.id}`}
          className="font-medium text-primary-600 hover:underline"
        >
          {lang === 'ar' ? row.nameAr : row.nameEn}
        </Link>
      ),
    },
    { key: 'phone', header: t('patients.phone'), render: (row: Patient) => row.phone },
    { key: 'email', header: t('patients.email'), render: (row: Patient) => row.email },
    {
      key: 'createdAt',
      header: t('patients.registered'),
      render: (row: Patient) => formatDate(row.createdAt, lang),
    },
    {
      key: 'appointmentCount',
      header: t('patients.appointments'),
      render: (row: Patient) => (
        <span className="font-medium">{row.appointmentCount}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: Patient) => (
        <Link
          to={`/admin/patients/${row.id}`}
          className="text-xs text-primary-600 hover:underline"
        >
          {lang === 'ar' ? 'عرض' : 'View'}
        </Link>
      ),
    },
  ]

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('patients.title')}</h1>

      <div className="mb-4">
        <input
          type="search"
          placeholder={lang === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <Table
        columns={columns as Parameters<typeof Table>[0]['columns']}
        data={(data ?? []) as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage={lang === 'ar' ? 'لا يوجد مرضى' : 'No patients found'}
      />
    </AdminLayout>
  )
}
