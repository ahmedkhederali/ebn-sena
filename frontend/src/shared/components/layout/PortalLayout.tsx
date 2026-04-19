import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../hooks/useRTL'
import { useAuth } from '../../hooks/useAuth'

interface PortalLayoutProps {
  children: ReactNode
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const { t } = useTranslation('common')
  const { isRTL, toggleLanguage } = useRTL()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const navLinks =
    user?.role === 'doctor'
      ? [
          { to: '/doctor/schedule', label: t('nav.schedule') },
        ]
      : [
          { to: '/portal', label: t('nav.dashboard') },
          { to: '/portal/appointments', label: t('nav.myAppointments') },
          { to: '/portal/profile', label: t('nav.profile') },
        ]

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary-700">
            <span className="text-xl">🏥</span>
            <span className="hidden sm:inline">{t('siteName')}</span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleLanguage}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-sm font-medium text-gray-600 hover:border-primary-300"
              aria-label={isRTL ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              {isRTL ? 'EN' : 'ع'}
            </button>

            {user && (
              <span className="hidden text-sm text-gray-700 sm:inline">
                {isRTL ? user.nameAr : user.nameEn}
              </span>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* ── Side nav + content ──────────────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="space-y-1" aria-label={t('nav.portal')}>
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  [
                    'block rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
