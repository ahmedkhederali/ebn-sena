import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../../shared/components/layout/AdminLayout'
import { apiClient } from '../../../shared/api/client'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Modal } from '../../../shared/components/ui/Modal'
import { Badge } from '../../../shared/components/ui/Badge'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { useToast } from '../../../shared/hooks/useToast'
import { useRTL } from '../../../shared/hooks/useRTL'

interface Specialty {
  id: string
  nameAr: string
  nameEn: string
  descriptionAr?: string
  descriptionEn?: string
  isActive: boolean
}

interface SpecialtyForm {
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
}

const emptyForm: SpecialtyForm = {
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
}

export default function SpecialtiesManagementPage() {
  const { t } = useTranslation('admin')
  const { lang } = useRTL()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Specialty | null>(null)
  const [form, setForm] = useState<SpecialtyForm>(emptyForm)
  const [editForm, setEditForm] = useState<SpecialtyForm>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-specialties'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: Specialty[] }>('/content/services')
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: SpecialtyForm) => {
      await apiClient.post('/content/services', data)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-specialties'] })
      void qc.invalidateQueries({ queryKey: ['services'] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم إضافة التخصص' : 'Specialty created' })
      setCreateOpen(false)
      setForm(emptyForm)
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل الإضافة' : 'Create failed' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: SpecialtyForm) => {
      await apiClient.put(`/content/services/${editingItem!.id}`, data)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-specialties'] })
      void qc.invalidateQueries({ queryKey: ['services'] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم التحديث' : 'Updated' })
      setEditingItem(null)
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل التحديث' : 'Update failed' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiClient.put(`/content/services/${id}`, { isActive })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-specialties'] })
      void qc.invalidateQueries({ queryKey: ['services'] })
    },
  })

  const openEdit = (item: Specialty) => {
    setEditingItem(item)
    setEditForm({
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      descriptionAr: item.descriptionAr ?? '',
      descriptionEn: item.descriptionEn ?? '',
    })
  }

  const specialties = data ?? []

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {lang === 'ar' ? 'إدارة التخصصات' : 'Specialties Management'}
        </h1>
        <Button onClick={() => setCreateOpen(true)}>
          {lang === 'ar' ? '+ إضافة تخصص' : '+ Add Specialty'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : specialties.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center text-gray-400 shadow-sm">
          {lang === 'ar' ? 'لا توجد تخصصات' : 'No specialties yet'}
        </div>
      ) : (
        <div className="space-y-3">
          {specialties.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-gray-900">
                    {lang === 'ar' ? s.nameAr : s.nameEn}
                  </p>
                  <Badge variant={s.isActive ? 'success' : 'danger'}>
                    {s.isActive ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-400">
                  {lang === 'ar' ? s.nameEn : s.nameAr}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => openEdit(s)}
                  className="text-sm text-primary-600 hover:underline"
                >
                  {lang === 'ar' ? 'تعديل' : 'Edit'}
                </button>
                <button
                  onClick={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                  className={`text-sm hover:underline ${s.isActive ? 'text-red-500' : 'text-green-600'}`}
                >
                  {s.isActive
                    ? (lang === 'ar' ? 'تعطيل' : 'Deactivate')
                    : (lang === 'ar' ? 'تفعيل' : 'Activate')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setForm(emptyForm) }}
        title={lang === 'ar' ? 'إضافة تخصص جديد' : 'Add New Specialty'}
        confirmClose
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={lang === 'ar' ? 'الاسم بالعربية *' : 'Name (Arabic) *'}
              value={form.nameAr}
              onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              dir="rtl"
            />
            <Input
              label={lang === 'ar' ? 'الاسم بالإنجليزية *' : 'Name (English) *'}
              value={form.nameEn}
              onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'الوصف بالعربية' : 'Description (Arabic)'}
            </label>
            <textarea
              value={form.descriptionAr}
              onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))}
              rows={2}
              dir="rtl"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'الوصف بالإنجليزية' : 'Description (English)'}
            </label>
            <textarea
              value={form.descriptionEn}
              onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setForm(emptyForm) }}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              isLoading={createMutation.isPending}
              disabled={!form.nameAr || !form.nameEn}
              onClick={() => createMutation.mutate(form)}
            >
              {lang === 'ar' ? 'إضافة' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={lang === 'ar' ? 'تعديل التخصص' : 'Edit Specialty'}
        confirmClose
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}
              value={editForm.nameAr}
              onChange={(e) => setEditForm((f) => ({ ...f, nameAr: e.target.value }))}
              dir="rtl"
            />
            <Input
              label={lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
              value={editForm.nameEn}
              onChange={(e) => setEditForm((f) => ({ ...f, nameEn: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'الوصف بالعربية' : 'Description (Arabic)'}
            </label>
            <textarea
              value={editForm.descriptionAr}
              onChange={(e) => setEditForm((f) => ({ ...f, descriptionAr: e.target.value }))}
              rows={2}
              dir="rtl"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'الوصف بالإنجليزية' : 'Description (English)'}
            </label>
            <textarea
              value={editForm.descriptionEn}
              onChange={(e) => setEditForm((f) => ({ ...f, descriptionEn: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditingItem(null)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              isLoading={updateMutation.isPending}
              onClick={() => updateMutation.mutate(editForm)}
            >
              {lang === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
