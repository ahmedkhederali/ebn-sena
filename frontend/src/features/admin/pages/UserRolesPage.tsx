import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../../shared/components/layout/AdminLayout'
import { apiClient } from '../../../shared/api/client'
import { Table } from '../../../shared/components/ui/Table'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Modal } from '../../../shared/components/ui/Modal'
import { useToast } from '../../../shared/hooks/useToast'
import { useRTL } from '../../../shared/hooks/useRTL'

interface StaffUser {
  id: string
  nameAr: string
  nameEn: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

const ROLES = ['admin', 'receptionist', 'doctor'] as const
type Role = (typeof ROLES)[number]

interface CreateForm {
  nameAr: string
  nameEn: string
  email: string
  password: string
  role: Role
}

const emptyForm: CreateForm = {
  nameAr: '',
  nameEn: '',
  email: '',
  password: '',
  role: 'receptionist',
}

export default function UserRolesPage() {
  const { t } = useTranslation('admin')
  const { lang } = useRTL()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: StaffUser[] }>(
        '/admin/users?roles=admin,receptionist,doctor',
      )
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateForm) => {
      await apiClient.post('/admin/users', data)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-staff'] })
      addToast({
        type: 'success',
        message: lang === 'ar' ? 'تم إنشاء المستخدم' : 'User created',
      })
      setModalOpen(false)
      setForm(emptyForm)
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل إنشاء المستخدم' : 'Creation failed' })
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      await apiClient.put(`/admin/users/${id}`, { role })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-staff'] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم تحديث الدور' : 'Role updated' })
    },
  })

  const roleBadgeVariant = (role: string) => {
    if (role === 'admin') return 'danger' as const
    if (role === 'doctor') return 'info' as const
    return 'success' as const
  }

  const columns = [
    {
      key: 'name',
      header: lang === 'ar' ? 'الاسم' : 'Name',
      render: (row: StaffUser) => lang === 'ar' ? row.nameAr : row.nameEn,
    },
    {
      key: 'email',
      header: lang === 'ar' ? 'البريد الإلكتروني' : 'Email',
      render: (row: StaffUser) => row.email,
    },
    {
      key: 'role',
      header: lang === 'ar' ? 'الدور' : 'Role',
      render: (row: StaffUser) => (
        <Badge variant={roleBadgeVariant(row.role)}>{row.role}</Badge>
      ),
    },
    {
      key: 'status',
      header: lang === 'ar' ? 'الحالة' : 'Status',
      render: (row: StaffUser) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: lang === 'ar' ? 'تغيير الدور' : 'Change Role',
      render: (row: StaffUser) => (
        <div className="flex gap-2">
          {ROLES.filter((r) => r !== row.role).map((r) => (
            <button
              key={r}
              onClick={() => updateRoleMutation.mutate({ id: row.id, role: r })}
              className="rounded-lg border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
            >
              {r === 'admin'
                ? lang === 'ar' ? 'مدير' : 'Admin'
                : r === 'doctor'
                  ? lang === 'ar' ? 'طبيب' : 'Doctor'
                  : lang === 'ar' ? 'موظف استقبال' : 'Receptionist'}
            </button>
          ))}
        </div>
      ),
    },
  ]

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('roles.title')}</h1>
        <Button onClick={() => setModalOpen(true)}>
          {lang === 'ar' ? '+ إضافة مستخدم' : '+ Add User'}
        </Button>
      </div>

      <Table
        columns={columns as Parameters<typeof Table>[0]['columns']}
        data={(data ?? []) as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage={lang === 'ar' ? 'لا يوجد مستخدمون' : 'No users found'}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setForm(emptyForm)
        }}
        title={lang === 'ar' ? 'إنشاء مستخدم جديد' : 'Create New User'}
        confirmClose
      >
        <div className="space-y-4">
          <Input
            label={lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}
            value={form.nameAr}
            onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
            dir="rtl"
          />
          <Input
            label={lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
            value={form.nameEn}
            onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
          />
          <Input
            label={lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label={lang === 'ar' ? 'كلمة المرور' : 'Password'}
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'الدور' : 'Role'}
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false)
                setForm(emptyForm)
              }}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              isLoading={createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {lang === 'ar' ? 'إنشاء' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
