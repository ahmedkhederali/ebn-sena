import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../../shared/components/layout/AdminLayout'
import { apiClient } from '../../../shared/api/client'
import { Badge } from '../../../shared/components/ui/Badge'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { useRTL } from '../../../shared/hooks/useRTL'
import { formatDateTime, formatDate } from '../../../shared/utils/date'

interface PatientDetail {
  id: string
  nameAr: string
  nameEn: string
  email: string
  phone: string
  isActive: boolean
  createdAt: string
  recentAppointments: Array<{
    id: string
    bookingRef: string
    appointmentDateTime: string
    status: string
  }>
}

const statusVariant = (s: string): 'success' | 'danger' | 'info' | 'warning' | 'default' => {
  if (s === 'confirmed') return 'success'
  if (s === 'cancelled') return 'danger'
  if (s === 'completed') return 'info'
  if (s === 'pending-payment') return 'warning'
  return 'default'
}

export default function AdminPatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { lang } = useRTL()

  const { data: patient, isLoading } = useQuery({
    queryKey: ['admin-patient', id],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: PatientDetail }>(`/admin/patients/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  return (
    <AdminLayout>
      <div className="mb-4">
        <Link
          to="/admin/patients"
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
        >
          {lang === 'ar' ? '→ عودة للمرضى' : '← Back to Patients'}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : !patient ? (
        <div className="rounded-2xl bg-white py-16 text-center text-gray-400 shadow-sm">
          {lang === 'ar' ? 'المريض غير موجود' : 'Patient not found'}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Patient Info Card */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {lang === 'ar' ? patient.nameAr : patient.nameEn}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {lang === 'ar' ? patient.nameEn : patient.nameAr}
                </p>
              </div>
              <Badge variant={patient.isActive ? 'success' : 'danger'}>
                {patient.isActive
                  ? (lang === 'ar' ? 'نشط' : 'Active')
                  : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
              </Badge>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <dt className="mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                </dt>
                <dd className="text-sm font-medium text-gray-900 break-all">{patient.email}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <dt className="mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {lang === 'ar' ? 'رقم الجوال' : 'Phone'}
                </dt>
                <dd className="text-sm font-medium text-gray-900">{patient.phone}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <dt className="mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {lang === 'ar' ? 'تاريخ التسجيل' : 'Registered'}
                </dt>
                <dd className="text-sm font-medium text-gray-900">{formatDate(patient.createdAt, lang)}</dd>
              </div>
            </dl>
          </div>

          {/* Recent Appointments */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {lang === 'ar' ? 'المواعيد الأخيرة' : 'Recent Appointments'}
            </h2>

            {patient.recentAppointments.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                {lang === 'ar' ? 'لا توجد مواعيد' : 'No appointments yet'}
              </p>
            ) : (
              <div className="space-y-3">
                {patient.recentAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 p-4 hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{appt.bookingRef}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatDateTime(appt.appointmentDateTime, lang)}
                      </p>
                    </div>
                    <Badge variant={statusVariant(appt.status)}>
                      {appt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
