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

interface Doctor {
  id: string
  userId: string
  nameAr: string
  nameEn: string
  email: string
  phone: string
  specialtyId: string
  specialty: string
  specialtyAr: string
  consultationFeeSAR: number
  isActive: boolean
  yearsOfExperience: number
  bioAr: string
  bioEn: string
}

interface Service {
  id: string
  nameAr: string
  nameEn: string
}

interface CreateForm {
  nameAr: string
  nameEn: string
  email: string
  phone: string
  specialtyId: string
  consultationFeeSAR: number
  bioAr: string
  bioEn: string
  yearsOfExperience: number
}

interface EditForm {
  specialtyId: string
  consultationFeeSAR: number
  bioAr: string
  bioEn: string
  yearsOfExperience: number
}

interface ScheduleEntry {
  _id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDurationMinutes: number
  isActive: boolean
}

interface ScheduleForm {
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDurationMinutes: number
}

const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const SLOT_DURATIONS = [15, 20, 30, 45, 60]

const emptyCreate: CreateForm = {
  nameAr: '',
  nameEn: '',
  email: '',
  phone: '',
  specialtyId: '',
  consultationFeeSAR: 0,
  bioAr: '',
  bioEn: '',
  yearsOfExperience: 0,
}

export default function DoctorsManagementPage() {
  const { t } = useTranslation('admin')
  const { lang } = useRTL()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Doctor | null>(null)
  const [scheduleDoctor, setScheduleDoctor] = useState<Doctor | null>(null)
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate)
  const [editForm, setEditForm] = useState<EditForm>({
    specialtyId: '',
    consultationFeeSAR: 0,
    bioAr: '',
    bioEn: '',
    yearsOfExperience: 0,
  })
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
  })

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['admin-doctors', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      const res = await apiClient.get<{ success: true; data: Doctor[] }>(
        `/admin/doctors?${params.toString()}`,
      )
      return res.data.data
    },
  })

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: Service[] }>('/content/services')
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateForm) => {
      await apiClient.post('/admin/doctors', data)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-doctors'] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم إضافة الطبيب بنجاح' : 'Doctor created successfully' })
      setCreateOpen(false)
      setCreateForm(emptyCreate)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      addToast({ type: 'error', message: msg ?? (lang === 'ar' ? 'فشل إضافة الطبيب' : 'Failed to create doctor') })
    },
  })

  const editMutation = useMutation({
    mutationFn: async (data: EditForm) => {
      await apiClient.put(`/admin/doctors/${editingDoctor!.id}`, data)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-doctors'] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully' })
      setEditingDoctor(null)
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل الحفظ' : 'Save failed' })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/admin/doctors/${id}`, { isActive: false })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-doctors'] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم إلغاء تفعيل الطبيب' : 'Doctor deactivated' })
      setDeactivateTarget(null)
    },
  })

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/admin/doctors/${id}`, { isActive: true })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-doctors'] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم تفعيل الطبيب' : 'Doctor activated' })
    },
  })

  const { data: scheduleEntries } = useQuery({
    queryKey: ['admin-doctor-schedule', scheduleDoctor?.id],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: ScheduleEntry[] }>(
        `/admin/doctors/${scheduleDoctor!.id}/schedule`,
      )
      return res.data.data
    },
    enabled: Boolean(scheduleDoctor),
  })

  const addScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleForm) => {
      await apiClient.post(`/admin/doctors/${scheduleDoctor!.id}/schedule`, data)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-doctor-schedule', scheduleDoctor?.id] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم حفظ الجدول' : 'Schedule saved' })
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل الحفظ' : 'Save failed' })
    },
  })

  const deleteScheduleMutation = useMutation({
    mutationFn: async (dayOfWeek: number) => {
      await apiClient.delete(`/admin/doctors/${scheduleDoctor!.id}/schedule/${dayOfWeek}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-doctor-schedule', scheduleDoctor?.id] })
      addToast({ type: 'success', message: lang === 'ar' ? 'تم الحذف' : 'Removed' })
    },
  })

  const openEdit = (doc: Doctor) => {
    setEditingDoctor(doc)
    setEditForm({
      specialtyId: doc.specialtyId,
      consultationFeeSAR: doc.consultationFeeSAR,
      bioAr: doc.bioAr ?? '',
      bioEn: doc.bioEn ?? '',
      yearsOfExperience: doc.yearsOfExperience ?? 0,
    })
  }

  const doctorList = doctors ?? []

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('doctors.title')}</h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          {lang === 'ar' ? '+ إضافة طبيب' : '+ Add Doctor'}
        </Button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-64"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : doctorList.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center text-gray-400 shadow-sm">
          {lang === 'ar' ? 'لا يوجد أطباء' : 'No doctors found'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctorList.map((doc) => (
            <div key={doc.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {lang === 'ar' ? doc.nameAr : doc.nameEn}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {lang === 'ar' ? doc.specialtyAr : doc.specialty}
                  </p>
                  <p className="truncate text-xs text-gray-400">{doc.email}</p>
                </div>
                <Badge variant={doc.isActive ? 'success' : 'danger'} className="shrink-0">
                  {doc.isActive
                    ? (lang === 'ar' ? 'نشط' : 'Active')
                    : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
                </Badge>
              </div>

              <p className="mb-4 text-sm text-gray-600">
                {lang === 'ar' ? 'رسوم الاستشارة: ' : 'Fee: '}
                <span className="font-medium">
                  {lang === 'ar' ? `${doc.consultationFeeSAR} ر.س` : `SAR ${doc.consultationFeeSAR}`}
                </span>
              </p>

              <div className="flex gap-3">
                <button onClick={() => openEdit(doc)} className="text-xs text-primary-600 hover:underline">
                  {lang === 'ar' ? 'تعديل' : 'Edit'}
                </button>
                <button onClick={() => setScheduleDoctor(doc)} className="text-xs text-indigo-600 hover:underline">
                  {lang === 'ar' ? 'الجدول' : 'Schedule'}
                </button>
                {doc.isActive ? (
                  <button onClick={() => setDeactivateTarget(doc)} className="text-xs text-red-600 hover:underline">
                    {lang === 'ar' ? 'إلغاء التفعيل' : 'Deactivate'}
                  </button>
                ) : (
                  <button onClick={() => activateMutation.mutate(doc.id)} className="text-xs text-green-600 hover:underline">
                    {lang === 'ar' ? 'تفعيل' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Doctor Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setCreateForm(emptyCreate) }}
        title={lang === 'ar' ? 'إضافة طبيب جديد' : 'Add New Doctor'}
        size="lg"
        confirmClose
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={lang === 'ar' ? 'الاسم بالعربية *' : 'Name (Arabic) *'}
              value={createForm.nameAr}
              onChange={(e) => setCreateForm((f) => ({ ...f, nameAr: e.target.value }))}
              dir="rtl"
            />
            <Input
              label={lang === 'ar' ? 'الاسم بالإنجليزية *' : 'Name (English) *'}
              value={createForm.nameEn}
              onChange={(e) => setCreateForm((f) => ({ ...f, nameEn: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={lang === 'ar' ? 'البريد الإلكتروني *' : 'Email *'}
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label={lang === 'ar' ? 'رقم الجوال *' : 'Phone *'}
              type="tel"
              placeholder="+966501234567"
              value={createForm.phone}
              onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {lang === 'ar' ? 'التخصص *' : 'Specialty *'}
              </label>
              <select
                value={createForm.specialtyId}
                onChange={(e) => setCreateForm((f) => ({ ...f, specialtyId: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{lang === 'ar' ? 'اختر التخصص' : 'Select specialty'}</option>
                {(services ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'ar' ? s.nameAr : s.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={lang === 'ar' ? 'رسوم الاستشارة (ر.س) *' : 'Consultation Fee (SAR) *'}
              type="number"
              min="0"
              value={String(createForm.consultationFeeSAR)}
              onChange={(e) => setCreateForm((f) => ({ ...f, consultationFeeSAR: Number(e.target.value) }))}
            />
          </div>

          <Input
            label={lang === 'ar' ? 'سنوات الخبرة' : 'Years of Experience'}
            type="number"
            min="0"
            value={String(createForm.yearsOfExperience)}
            onChange={(e) => setCreateForm((f) => ({ ...f, yearsOfExperience: Number(e.target.value) }))}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'النبذة بالعربية' : 'Bio (Arabic)'}
            </label>
            <textarea
              value={createForm.bioAr}
              onChange={(e) => setCreateForm((f) => ({ ...f, bioAr: e.target.value }))}
              rows={3}
              dir="rtl"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'النبذة بالإنجليزية' : 'Bio (English)'}
            </label>
            <textarea
              value={createForm.bioEn}
              onChange={(e) => setCreateForm((f) => ({ ...f, bioEn: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setCreateForm(emptyCreate) }}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              isLoading={createMutation.isPending}
              disabled={!createForm.nameAr || !createForm.nameEn || !createForm.email || !createForm.phone || !createForm.specialtyId || createForm.consultationFeeSAR <= 0}
              onClick={() => createMutation.mutate(createForm)}
            >
              {lang === 'ar' ? 'إضافة الطبيب' : 'Add Doctor'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Doctor Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(editingDoctor)}
        onClose={() => setEditingDoctor(null)}
        title={lang === 'ar' ? 'تعديل بيانات الطبيب' : 'Edit Doctor'}
        confirmClose
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'التخصص' : 'Specialty'}
            </label>
            <select
              value={editForm.specialtyId}
              onChange={(e) => setEditForm((f) => ({ ...f, specialtyId: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{lang === 'ar' ? 'اختر التخصص' : 'Select specialty'}</option>
              {(services ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {lang === 'ar' ? s.nameAr : s.nameEn}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={lang === 'ar' ? 'رسوم الاستشارة (ر.س)' : 'Consultation Fee (SAR)'}
            type="number"
            min="0"
            value={String(editForm.consultationFeeSAR)}
            onChange={(e) => setEditForm((f) => ({ ...f, consultationFeeSAR: Number(e.target.value) }))}
          />

          <Input
            label={lang === 'ar' ? 'سنوات الخبرة' : 'Years of Experience'}
            type="number"
            min="0"
            value={String(editForm.yearsOfExperience)}
            onChange={(e) => setEditForm((f) => ({ ...f, yearsOfExperience: Number(e.target.value) }))}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'النبذة بالعربية' : 'Bio (Arabic)'}
            </label>
            <textarea
              value={editForm.bioAr}
              onChange={(e) => setEditForm((f) => ({ ...f, bioAr: e.target.value }))}
              rows={3}
              dir="rtl"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'النبذة بالإنجليزية' : 'Bio (English)'}
            </label>
            <textarea
              value={editForm.bioEn}
              onChange={(e) => setEditForm((f) => ({ ...f, bioEn: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditingDoctor(null)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button isLoading={editMutation.isPending} onClick={() => editMutation.mutate(editForm)}>
              {lang === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Schedule Management Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(scheduleDoctor)}
        onClose={() => setScheduleDoctor(null)}
        title={
          lang === 'ar'
            ? `جدول الطبيب: ${scheduleDoctor?.nameAr ?? ''}`
            : `Schedule: Dr. ${scheduleDoctor?.nameEn ?? ''}`
        }
        size="lg"
      >
        <div className="space-y-5">
          {/* Existing entries */}
          {(scheduleEntries ?? []).length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                {lang === 'ar' ? 'الجدول الحالي' : 'Current Schedule'}
              </p>
              <div className="space-y-2">
                {(scheduleEntries ?? []).map((s) => (
                  <div
                    key={s._id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-24 font-medium text-gray-800 text-sm">
                        {lang === 'ar' ? DAYS_AR[s.dayOfWeek] : DAYS_EN[s.dayOfWeek]}
                      </span>
                      <span className="text-sm text-gray-600">
                        {s.startTime} – {s.endTime}
                      </span>
                      <span className="text-xs text-gray-400">
                        {s.slotDurationMinutes}{lang === 'ar' ? ' د' : 'min'}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteScheduleMutation.mutate(s.dayOfWeek)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      {lang === 'ar' ? 'حذف' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new entry */}
          <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
            <p className="mb-3 text-sm font-medium text-primary-800">
              {lang === 'ar' ? 'إضافة / تعديل يوم' : 'Add / Update a Day'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {lang === 'ar' ? 'اليوم' : 'Day'}
                </label>
                <select
                  value={scheduleForm.dayOfWeek}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {DAYS_EN.map((day, i) => (
                    <option key={i} value={i}>
                      {lang === 'ar' ? DAYS_AR[i] : day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {lang === 'ar' ? 'مدة الموعد' : 'Slot Duration'}
                </label>
                <select
                  value={scheduleForm.slotDurationMinutes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, slotDurationMinutes: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {SLOT_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} {lang === 'ar' ? 'دقيقة' : 'min'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {lang === 'ar' ? 'وقت البدء' : 'Start Time'}
                </label>
                <input
                  type="time"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {lang === 'ar' ? 'وقت الانتهاء' : 'End Time'}
                </label>
                <input
                  type="time"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                isLoading={addScheduleMutation.isPending}
                onClick={() => addScheduleMutation.mutate(scheduleForm)}
              >
                {lang === 'ar' ? 'حفظ اليوم' : 'Save Day'}
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setScheduleDoctor(null)}>
              {lang === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Deactivation confirm ────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title={lang === 'ar' ? 'تأكيد إلغاء التفعيل' : 'Confirm Deactivation'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {lang === 'ar'
              ? `سيتم إلغاء تفعيل الدكتور "${deactivateTarget?.nameAr ?? ''}". لن يظهر في نتائج البحث.`
              : `Deactivating Dr. "${deactivateTarget?.nameEn ?? ''}" will remove them from search results.`}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeactivateTarget(null)}>
              {lang === 'ar' ? 'تراجع' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              isLoading={deactivateMutation.isPending}
              onClick={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
            >
              {lang === 'ar' ? 'إلغاء التفعيل' : 'Deactivate'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
