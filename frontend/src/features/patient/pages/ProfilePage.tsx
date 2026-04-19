import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useRTL } from '../../../shared/hooks/useRTL'
import { apiClient } from '../../../shared/api/client'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { useToast } from '../../../shared/hooks/useToast'

interface ProfileData {
  nameAr: string
  nameEn: string
  phone: string
  preferredLanguage: 'ar' | 'en'
}

export default function ProfilePage() {
  const { t } = useTranslation('patient')
  const { lang } = useRTL()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: ProfileData }>('/patients/me')
      return res.data.data
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileData>()

  useEffect(() => {
    if (profile) reset(profile)
  }, [profile, reset])

  const mutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      await apiClient.put('/patients/me', data)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patient-profile'] })
      addToast({ type: 'success', message: t('profile.saved') })
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل الحفظ' : 'Save failed' })
    },
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('profile.title')}</h1>

      <form
        onSubmit={(e) => void handleSubmit((data) => mutation.mutate(data))(e)}
        className="rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="space-y-4">
          <Input
            label={t('profile.name_ar')}
            {...register('nameAr', { required: true })}
            error={errors.nameAr ? (lang === 'ar' ? 'مطلوب' : 'Required') : undefined}
            dir="rtl"
          />
          <Input
            label={t('profile.name_en')}
            {...register('nameEn', { required: true })}
            error={errors.nameEn ? (lang === 'ar' ? 'مطلوب' : 'Required') : undefined}
          />
          <Input
            label={t('profile.phone')}
            {...register('phone', { required: true })}
            error={errors.phone ? (lang === 'ar' ? 'مطلوب' : 'Required') : undefined}
            type="tel"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('profile.language')}
            </label>
            <select
              {...register('preferredLanguage')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ar">{lang === 'ar' ? 'العربية' : 'Arabic'}</option>
              <option value="en">{lang === 'ar' ? 'الإنجليزية' : 'English'}</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <Button type="submit" isLoading={mutation.isPending}>
            {t('profile.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
