import { useTranslation } from 'react-i18next'
import type { TimeSlot } from '@shared/types/appointment.types'

interface SlotGridProps {
  slots: TimeSlot[]
  selectedSlot: string | null
  onSelect: (time: string) => void
  isLoading: boolean
}

export function SlotGrid({ slots, selectedSlot, onSelect, isLoading }: SlotGridProps) {
  const { t } = useTranslation('appointments')

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5" aria-busy="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-200" />
        ))}
        <span className="sr-only">{t('loadingSlots')}</span>
      </div>
    )
  }

  const available = slots.filter((s) => s.available)

  if (slots.length === 0 || available.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 px-6 py-8 text-center text-gray-500">
        {t('noSlotsAvailable')}
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5"
      role="group"
      aria-label={t('availableSlots')}
    >
      {slots.map(({ time, available }) => {
        const isSelected = selectedSlot === time
        return (
          <button
            key={time}
            type="button"
            disabled={!available}
            onClick={() => available && onSelect(time)}
            aria-pressed={isSelected}
            aria-disabled={!available}
            className={[
              'rounded-lg border px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500',
              !available
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through'
                : isSelected
                  ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50',
            ].join(' ')}
          >
            {time}
          </button>
        )
      })}
    </div>
  )
}
