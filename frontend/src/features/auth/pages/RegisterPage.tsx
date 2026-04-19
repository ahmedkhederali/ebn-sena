import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../../../shared/api/client'
import { useRTL } from '../../../shared/hooks/useRTL'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'

const registerSchema = z
  .object({
    nameAr: z.string().min(2, 'min2'),
    nameEn: z.string().min(2, 'min2'),
    email: z.string().email(),
    phone: z.string().regex(/^\+9665\d{8}$/, 'phone_invalid'),
    nationalId: z.string().regex(/^\d{10}$/, 'national_id_invalid').optional().or(z.literal('')),
    password: z
      .string()
      .regex(
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
        'password_weak',
      ),
    confirmPassword: z.string(),
    consentGiven: z.literal<boolean>(true, {
      errorMap: () => ({ message: 'consent_required' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'passwords_mismatch',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const { isRTL } = useRTL()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(values: RegisterFormValues) {
    try {
      await apiClient.post('/auth/register', {
        nameAr: values.nameAr,
        nameEn: values.nameEn,
        email: values.email,
        phone: values.phone,
        nationalId: values.nationalId || undefined,
        password: values.password,
        preferredLanguage: isRTL ? 'ar' : 'en',
        consentGiven: true,
      })
      navigate('/login?registered=1', { replace: true })
    } catch (err: unknown) {
      const code =
        (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error
          ?.code
      if (code === 'EMAIL_EXISTS') {
        setError('email', { message: t('errors.emailExists') })
      } else {
        setError('root', { message: t('errors.registrationFailed') })
      }
    }
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12"
    >
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-primary-700 text-xl">
            <span className="text-3xl">🏥</span>
            <span>{t('siteName', { ns: 'common' })}</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{t('registerTitle')}</h1>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('nameAr')}
                dir="rtl"
                required
                error={errors.nameAr ? t('errors.nameRequired') : undefined}
                {...register('nameAr')}
              />
              <Input
                label={t('nameEn')}
                dir="ltr"
                required
                error={errors.nameEn ? t('errors.nameRequired') : undefined}
                {...register('nameEn')}
              />
            </div>

            <Input
              label={t('email')}
              type="email"
              autoComplete="email"
              dir="ltr"
              required
              error={errors.email ? (errors.email.message ?? t('errors.emailInvalid')) : undefined}
              {...register('email')}
            />

            <Input
              label={t('phone')}
              type="tel"
              placeholder="+9665XXXXXXXX"
              dir="ltr"
              required
              error={errors.phone ? t('errors.phoneInvalid') : undefined}
              {...register('phone')}
            />

            <Input
              label={t('nationalId')}
              inputMode="numeric"
              maxLength={10}
              dir="ltr"
              hint={t('nationalIdHint')}
              error={errors.nationalId ? t('errors.nationalIdInvalid') : undefined}
              {...register('nationalId')}
            />

            <Input
              label={t('password')}
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

            {/* Consent */}
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                {...register('consentGiven')}
              />
              <span className="text-sm text-gray-700">
                {t('consentText')}{' '}
                <Link to="/privacy" className="text-primary-600 hover:underline">
                  {t('privacyPolicy')}
                </Link>
              </span>
            </label>
            {errors.consentGiven && (
              <p role="alert" className="text-xs text-red-600">
                {t('errors.consentRequired')}
              </p>
            )}

            {errors.root && (
              <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              {t('registerButton')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            {t('alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-primary-600 hover:underline">
              {t('loginButton')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
