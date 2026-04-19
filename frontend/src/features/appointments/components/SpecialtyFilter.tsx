import { useTranslation } from 'react-i18next'

interface Specialty {
  id: string
  nameAr: string
  nameEn: string
}

interface SpecialtyFilterProps {
  specialties: Specialty[]
  selected: string | null
  onChange: (id: string | null) => void
}

export function SpecialtyFilter({ specialties, selected, onChange }: SpecialtyFilterProps) {
  const { t, i18n } = useTranslation('appointments')
  const isAr = i18n.language === 'ar'

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('selectSpecialty')}>
      {/* "All" chip */}
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={selected === null}
        className={[
          'rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
          selected === null
            ? 'bg-primary-600 text-white'
            : 'border border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:text-primary-700',
        ].join(' ')}
      >
        {t('allSpecialties')}
      </button>

      {specialties.map((sp) => (
        <button
          key={sp.id}
          type="button"
          onClick={() => onChange(sp.id)}
          aria-pressed={selected === sp.id}
          className={[
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
            selected === sp.id
              ? 'bg-primary-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:text-primary-700',
          ].join(' ')}
        >
          {isAr ? sp.nameAr : sp.nameEn}
        </button>
      ))}
    </div>
  )
}
