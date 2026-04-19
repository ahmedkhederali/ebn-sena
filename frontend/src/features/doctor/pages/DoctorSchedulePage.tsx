import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Modal } from '../../../shared/components/ui/Modal'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { useToast } from '../../../shared/hooks/useToast'
import { formatDateTime } from '../../../shared/utils/date'

interface Slot {
  id: string
  startTime: string
  endTime: string
  isBooked: boolean
  appointment?: {
    id: string
    patientName: string
    bookingRef: string
    status: string
  }
}

interface DaySchedule {
  date: string
  slots: Slot[]
}

interface UnavailabilityForm {
  startDate: string
  endDate: string
  reason: string
}

interface ScheduleEntry {
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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const SLOT_DURATIONS = [15, 20, 30, 45, 60]

export default function DoctorSchedulePage() {
  const { t } = useTranslation('doctor')
  const { lang } = useRTL()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [blockModal, setBlockModal] = useState(false)
  const [scheduleModal, setScheduleModal] = useState(false)
  const [blockForm, setBlockForm] = useState<UnavailabilityForm>({
    startDate: today,
    endDate: today,
    reason: '',
  })
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
  })

  const { data: weeklySchedule } = useQuery({
    queryKey: ['doctor-weekly-schedule'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: ScheduleEntry[] }>('/doctors/me/schedule')
      return res.data.data
    },
  })

  const saveScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleForm) => {
      await apiClient.post('/doctors/me/schedule', data)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['doctor-weekly-schedule'] })
      void qc.invalidateQueries({ queryKey: ['doctor-schedule'] })
      addToast({
        type: 'success',
        message: lang === 'ar' ? 'تم حفظ الجدول' : 'Schedule saved',
      })
      setScheduleModal(false)
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل الحفظ' : 'Save failed' })
    },
  })

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['doctor-schedule', selectedDate],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: DaySchedule }>(
        `/doctors/me/schedule?date=${selectedDate}`,
      )
      return res.data.data
    },
    refetchInterval: 30_000,
  })

  const { data: upcomingAppts } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: Slot['appointment'][] }>(
        '/doctors/me/appointments?status=confirmed&limit=10',
      )
      return res.data.data
    },
  })

  const blockMutation = useMutation({
    mutationFn: async (data: UnavailabilityForm) => {
      await apiClient.post('/doctors/me/unavailability', data)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['doctor-schedule'] })
      addToast({
        type: 'success',
        message: lang === 'ar' ? 'تم حجب الفترة' : 'Time blocked',
      })
      setBlockModal(false)
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل العملية' : 'Failed' })
    },
  })

  // Generate 30-day date tabs
  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  const dayName = (dateStr: string) => {
    const d = new Date(dateStr)
    return lang === 'ar'
      ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][d.getDay()]
      : DAYS[d.getDay()]
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('schedule.title')}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setScheduleModal(true)}>
            {lang === 'ar' ? '+ إضافة جدول أسبوعي' : '+ Set Weekly Schedule'}
          </Button>
          <Button variant="secondary" onClick={() => setBlockModal(true)}>
            {lang === 'ar' ? 'حجب وقت' : 'Block Time'}
          </Button>
        </div>
      </div>

      {/* Weekly schedule summary */}
      {(weeklySchedule ?? []).length > 0 && (
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            {lang === 'ar' ? 'الجدول الأسبوعي' : 'Weekly Schedule'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(weeklySchedule ?? [])
              .filter((s) => s.isActive)
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((s) => (
                <div
                  key={s.dayOfWeek}
                  className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-primary-700">
                    {lang === 'ar' ? DAYS_AR[s.dayOfWeek] : DAYS[s.dayOfWeek]}
                  </span>
                  <span className="ms-2 text-gray-600">
                    {s.startTime} – {s.endTime}
                  </span>
                  <span className="ms-2 text-xs text-gray-400">
                    {s.slotDurationMinutes}{lang === 'ar' ? ' د' : 'min'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Date picker strip */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {dates.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDate(d)}
            className={`flex min-w-[64px] flex-col items-center rounded-2xl p-3 text-xs transition ${
              selectedDate === d
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
            }`}
          >
            <span className="font-medium">{dayName(d).slice(0, 3)}</span>
            <span className="text-base font-bold">{d.slice(8)}</span>
          </button>
        ))}
      </div>

      {/* Slots */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : !schedule?.slots.length ? (
        <div className="rounded-2xl bg-white py-12 text-center text-gray-400 shadow-sm">
          {lang === 'ar' ? 'لا توجد مواعيد لهذا اليوم' : 'No slots for this day'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schedule.slots.map((slot) => (
            <div
              key={slot.id}
              className={`rounded-2xl p-4 shadow-sm ${
                slot.isBooked ? 'bg-primary-50' : 'bg-white'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  {new Date(slot.startTime).toLocaleTimeString(
                    lang === 'ar' ? 'ar-SA' : 'en-US',
                    { hour: '2-digit', minute: '2-digit' },
                  )}
                </span>
                <Badge variant={slot.isBooked ? 'info' : 'success'}>
                  {slot.isBooked
                    ? lang === 'ar'
                      ? 'محجوز'
                      : 'Booked'
                    : lang === 'ar'
                      ? 'متاح'
                      : 'Available'}
                </Badge>
              </div>
              {slot.appointment && (
                <div className="mt-2 border-t border-primary-100 pt-2">
                  <p className="text-sm font-medium text-gray-800">
                    {slot.appointment.patientName}
                  </p>
                  <p className="text-xs text-gray-500">{slot.appointment.bookingRef}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upcoming appointments sidebar */}
      {(upcomingAppts ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {lang === 'ar' ? 'المواعيد القادمة' : 'Upcoming Appointments'}
          </h2>
          <div className="space-y-3">
            {(upcomingAppts ?? []).map((appt) => (
              <div key={appt?.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{appt?.patientName}</p>
                    <p className="text-xs text-gray-500">{appt?.bookingRef}</p>
                  </div>
                  <Badge variant="success">
                    {lang === 'ar' ? 'مؤكد' : 'Confirmed'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Set weekly schedule modal */}
      <Modal
        isOpen={scheduleModal}
        onClose={() => setScheduleModal(false)}
        title={lang === 'ar' ? 'تعيين الجدول الأسبوعي' : 'Set Weekly Schedule'}
        confirmClose
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'اليوم' : 'Day of Week'}
            </label>
            <select
              value={scheduleForm.dayOfWeek}
              onChange={(e) => setScheduleForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {DAYS.map((day, i) => (
                <option key={i} value={i}>
                  {lang === 'ar' ? DAYS_AR[i] : day}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
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
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'مدة الموعد (دقيقة)' : 'Slot Duration (minutes)'}
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
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setScheduleModal(false)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              isLoading={saveScheduleMutation.isPending}
              onClick={() => saveScheduleMutation.mutate(scheduleForm)}
            >
              {lang === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block time modal */}
      <Modal
        isOpen={blockModal}
        onClose={() => setBlockModal(false)}
        title={lang === 'ar' ? 'حجب وقت' : 'Block Time'}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'من تاريخ' : 'From Date'}
            </label>
            <input
              type="date"
              value={blockForm.startDate}
              min={today}
              onChange={(e) => setBlockForm((f) => ({ ...f, startDate: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'إلى تاريخ' : 'To Date'}
            </label>
            <input
              type="date"
              value={blockForm.endDate}
              min={blockForm.startDate}
              onChange={(e) => setBlockForm((f) => ({ ...f, endDate: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {lang === 'ar' ? 'السبب' : 'Reason'}
            </label>
            <input
              type="text"
              value={blockForm.reason}
              onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setBlockModal(false)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              isLoading={blockMutation.isPending}
              onClick={() => blockMutation.mutate(blockForm)}
            >
              {lang === 'ar' ? 'حجب' : 'Block'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
