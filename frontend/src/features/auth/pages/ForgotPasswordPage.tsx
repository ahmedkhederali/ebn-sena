import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../../../shared/api/client'
import { useRTL } from '../../../shared/hooks/useRTL'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'

const schema = z.object({ email: z.string().email() })
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const { isRTL } = useRTL()
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      await apiClient.post('/auth/forgot-password', { email: values.email })
      setSent(true)
    } catch {
      // Always show success to prevent email enumeration
      setSent(true)
    }
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-primary-700 text-xl">
            <span className="text-3xl">🏥</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{t('forgotTitle')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('forgotSubtitle')}</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">
                ✓
              </div>
              <p className="font-medium text-gray-900">{t('forgotSentTitle')}</p>
              <p className="mt-1 text-sm text-gray-500">{t('forgotSentBody')}</p>
              <Link
                to="/login"
                className="mt-4 inline-block text-sm text-primary-600 hover:underline"
              >
                {t('backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Input
                label={t('email')}
                type="email"
                autoComplete="email"
                dir="ltr"
                required
                error={errors.email ? t('errors.emailInvalid') : undefined}
                {...register('email')}
              />

              {errors.root && (
                <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errors.root.message}
                </div>
              )}

              <Button type="submit" isLoading={isSubmitting} className="w-full">
                {t('sendResetLink')}
              </Button>

              <p className="text-center text-sm">
                <Link to="/login" className="text-primary-600 hover:underline">
                  {t('backToLogin')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
