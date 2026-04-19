import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../hooks/useRTL'
import { useAuth } from '../../hooks/useAuth'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation('admin')
  const { t: tc } = useTranslation('common')
  const { isRTL, toggleLanguage } = useRTL()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const allNavLinks = [
    { to: '/admin', label: t('overview.title'), roles: ['admin', 'receptionist'] },
    { to: '/admin/appointments', label: t('appointments.title'), roles: ['admin', 'receptionist'] },
    { to: '/admin/doctors', label: t('doctors.title'), roles: ['admin'] },
    { to: '/admin/patients', label: t('patients.title'), roles: ['admin', 'receptionist'] },
    { to: '/admin/analytics', label: t('analytics.title'), roles: ['admin'] },
    { to: '/admin/content', label: t('content.title'), roles: ['admin'] },
    { to: '/admin/specialties', label: t('specialties.title'), roles: ['admin'] },
    { to: '/admin/roles', label: t('roles.title'), roles: ['admin'] },
  ]

  const navLinks = allNavLinks.filter(
    (link) => user?.role && (link.roles as string[]).includes(user.role),
  )

  const NavItems = ({ onClickLink }: { onClickLink?: () => void }) => (
    <>
      {navLinks.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/admin'}
          onClick={onClickLink}
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
    </>
  )

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-screen bg-gray-50">
      {/* ── Desktop Sidebar ───────────────────────────────────────────────────── */}
      <aside className="hidden w-56 shrink-0 border-e border-gray-200 bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-gray-100 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary-700">
            <span>🏥</span>
            <span className="text-sm">{tc('siteName', 'Ibn Sina')}</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin navigation">
          <NavItems />
        </nav>

        <div className="border-t border-gray-100 p-4">
          <p className="mb-2 truncate text-xs text-gray-500">
            {user ? (isRTL ? user.nameAr : user.nameEn) : ''}
          </p>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            {tc('logout', 'Logout')}
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={`absolute top-0 h-full w-64 bg-white shadow-xl flex flex-col ${isRTL ? 'right-0' : 'left-0'}`}
          >
            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
              <Link
                to="/"
                className="flex items-center gap-2 font-bold text-primary-700"
                onClick={() => setMobileOpen(false)}
              >
                <span>🏥</span>
                <span className="text-sm">{tc('siteName', 'Ibn Sina')}</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              <NavItems onClickLink={() => setMobileOpen(false)} />
            </nav>

            <div className="border-t border-gray-100 p-4">
              <p className="mb-2 truncate text-xs text-gray-500">
                {user ? (isRTL ? user.nameAr : user.nameEn) : ''}
              </p>
              <button
                onClick={handleLogout}
                className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                {tc('logout', 'Logout')}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 md:hidden"
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-gray-800 sm:text-lg">
              {tc('admin_panel', 'Admin Panel')}
            </h1>
          </div>

          <button
            onClick={toggleLanguage}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-600 hover:border-primary-300"
          >
            {isRTL ? 'EN' : 'ع'}
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
