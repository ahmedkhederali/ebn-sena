import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../../../shared/api/client'
import { useRTL } from '../../../shared/hooks/useRTL'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'

const schema = z
  .object({
    password: z
      .string()
      .regex(
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
        'password_weak',
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'passwords_mismatch',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const { isRTL } = useRTL()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    if (!token) {
      setError('root', { message: t('errors.tokenMissing') })
      return
    }
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword: values.password,
      })
      navigate('/login?reset=1', { replace: true })
    } catch (err: unknown) {
      const code =
        (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error
          ?.code
      if (code === 'TOKEN_INVALID' || code === 'TOKEN_EXPIRED') {
        setError('root', { message: t('errors.tokenInvalid') })
      } else {
        setError('root', { message: t('errors.resetFailed') })
      }
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
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{t('resetTitle')}</h1>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label={t('newPassword')}
              type="password"
              autoComplete="new-password"
              dir="ltr"
              required
              hint={t('passwordHint')}
              error={errors.password ? t('errors.passwordWeak') : undefined}
              {...register('password')}
            />

            <Input
              label={t('confirmPassword')}
              type="password"
              autoComplete="new-password"
              dir="ltr"
              required
              error={errors.confirmPassword ? t('errors.passwordsMismatch') : undefined}
              {...register('confirmPassword')}
            />

            {errors.root && (
              <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              {t('resetButton')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
