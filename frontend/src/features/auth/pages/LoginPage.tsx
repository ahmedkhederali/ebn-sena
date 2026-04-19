import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../shared/hooks/useAuth'
import { useRTL } from '../../../shared/hooks/useRTL'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const { isRTL, toggleLanguage } = useRTL()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/portal'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginFormValues) {
    try {
      const user = await login(values.email, values.password)
      // Route by role
      if (user.role === 'admin' || user.role === 'receptionist') navigate('/admin', { replace: true })
      else if (user.role === 'doctor') navigate('/doctor/schedule', { replace: true })
      else navigate(from, { replace: true })
    } catch {
      setError('root', { message: t('errors.invalidCredentials') })
    }
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12"
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-primary-700 text-xl">
            <span className="text-3xl">🏥</span>
            <span>{t('siteName', { ns: 'common' })}</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{t('loginTitle')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('loginSubtitle')}</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label={t('email')}
              type="email"
              autoComplete="email"
              required
              dir="ltr"
              error={errors.email ? t('errors.emailInvalid') : undefined}
              {...register('email')}
            />

            <Input
              label={t('password')}
              type="password"
              autoComplete="current-password"
              required
              dir="ltr"
              error={errors.password ? t('errors.passwordRequired') : undefined}
              {...register('password')}
            />

            {errors.root && (
              <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              {t('loginButton')}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-primary-600 hover:underline">
              {t('forgotPassword')}
            </Link>
            <Link to="/register" className="text-primary-600 hover:underline">
              {t('createAccount')}
            </Link>
          </div>
        </div>

        {/* Language toggle */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={toggleLanguage}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {isRTL ? 'English' : 'العربية'}
          </button>
        </div>
      </div>
    </div>
  )
}
