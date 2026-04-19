import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../hooks/useRTL'
import { useAuth } from '../../hooks/useAuth'

interface PublicLayoutProps {
  children: ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { t } = useTranslation('common')
  const { isRTL, toggleLanguage } = useRTL()
  const { isAuthenticated, user } = useAuth()

  const portalTo =
    user?.role === 'admin' || user?.role === 'receptionist'
      ? '/admin'
      : user?.role === 'doctor'
        ? '/doctor/schedule'
        : '/portal'

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-screen flex-col bg-white">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-primary-700 text-lg">
            <span className="text-2xl">🏥</span>
            <span>{t('siteName')}</span>
          </Link>

          {/* Nav links */}
          <div className="hidden items-center gap-6 md:flex">
            <NavLink
              to="/doctors"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-primary-700' : 'text-gray-600 hover:text-primary-600'
                }`
              }
            >
              {t('nav.doctors')}
            </NavLink>
            <NavLink
              to="/services"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-primary-700' : 'text-gray-600 hover:text-primary-600'
                }`
              }
            >
              {t('nav.services')}
            </NavLink>
            <NavLink
              to="/book"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-primary-700' : 'text-gray-600 hover:text-primary-600'
                }`
              }
            >
              {t('nav.bookAppointment')}
            </NavLink>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-primary-300 hover:text-primary-700"
              aria-label={isRTL ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              {isRTL ? 'EN' : 'ع'}
            </button>

            {isAuthenticated ? (
              <Link
                to={portalTo}
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                {t('nav.portal')}
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-gray-50 py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} {t('siteName')}. {t('footer.rights')}</p>
      </footer>
    </div>
  )
}
