import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { Spinner } from './shared/components/ui/Spinner'
import { AuthGuard, GuestGuard } from './shared/components/guards/AuthGuard'
import { PublicLayout } from './shared/components/layout/PublicLayout'
import { PortalLayout } from './shared/components/layout/PortalLayout'

// ── Auth ────────────────────────────────────────────────────────────────────
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./features/auth/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./features/auth/pages/ResetPasswordPage'))

// ── Public ───────────────────────────────────────────────────────────────────
const HomePage = lazy(() => import('./features/public/pages/HomePage'))
const ServicesPage = lazy(() => import('./features/public/pages/ServicesPage'))
const DoctorsDirectoryPage = lazy(() => import('./features/public/pages/DoctorsDirectoryPage'))
const DoctorProfilePage = lazy(() => import('./features/public/pages/DoctorProfilePage'))

// ── Booking flow ────────────────────────────────────────────────────────────
const BookingPage = lazy(() => import('./features/appointments/pages/BookingPage'))
const CheckoutPage = lazy(() => import('./features/appointments/pages/CheckoutPage'))
const ConfirmationPage = lazy(() => import('./features/appointments/pages/ConfirmationPage'))

// ── Patient portal ──────────────────────────────────────────────────────────
const PatientDashboardPage = lazy(() => import('./features/patient/pages/PatientDashboardPage'))
const AppointmentsListPage = lazy(() => import('./features/patient/pages/AppointmentsListPage'))
const AppointmentDetailPage = lazy(() => import('./features/patient/pages/AppointmentDetailPage'))
const MedicalHistoryPage = lazy(() => import('./features/patient/pages/MedicalHistoryPage'))
const ProfilePage = lazy(() => import('./features/patient/pages/ProfilePage'))

// ── Doctor portal ────────────────────────────────────────────────────────────
const DoctorSchedulePage = lazy(() => import('./features/doctor/pages/DoctorSchedulePage'))
const PatientDetailPage = lazy(() => import('./features/doctor/pages/PatientDetailPage'))

// ── Admin ────────────────────────────────────────────────────────────────────
const AdminOverviewPage = lazy(() => import('./features/admin/pages/AdminOverviewPage'))
const AdminAppointmentsPage = lazy(() => import('./features/admin/pages/AdminAppointmentsPage'))
const DoctorsManagementPage = lazy(() => import('./features/admin/pages/DoctorsManagementPage'))
const PatientsManagementPage = lazy(() => import('./features/admin/pages/PatientsManagementPage'))
const AnalyticsPage = lazy(() => import('./features/admin/pages/AnalyticsPage'))
const ContentManagementPage = lazy(() => import('./features/admin/pages/ContentManagementPage'))
const UserRolesPage = lazy(() => import('./features/admin/pages/UserRolesPage'))
const AdminPatientDetailPage = lazy(() => import('./features/admin/pages/AdminPatientDetailPage'))
const SpecialtiesManagementPage = lazy(() => import('./features/admin/pages/SpecialtiesManagementPage'))

// ── Loading fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}

function SuspenseOutlet() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  )
}

function PublicLayoutWrapper() {
  return (
    <PublicLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </PublicLayout>
  )
}

function PortalLayoutWrapper() {
  return (
    <AuthGuard>
      <PortalLayout>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </PortalLayout>
    </AuthGuard>
  )
}

function GuestLayoutWrapper() {
  return (
    <GuestGuard>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </GuestGuard>
  )
}

// ── Router ───────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // ── Public pages with nav/footer ─────────────────────────────────────────
  {
    element: <PublicLayoutWrapper />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'doctors', element: <DoctorsDirectoryPage /> },
      { path: 'doctors/:id', element: <DoctorProfilePage /> },
      { path: 'book', element: <BookingPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'confirmation', element: <ConfirmationPage /> },
      { path: 'privacy', element: <div className="container mx-auto py-16 text-center text-gray-400">Privacy Policy</div> },
    ],
  },

  // ── Auth pages (guest only) ──────────────────────────────────────────────
  {
    element: <GuestLayoutWrapper />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // ── Patient portal ────────────────────────────────────────────────────────
  {
    path: 'portal',
    element: <PortalLayoutWrapper />,
    children: [
      { index: true, element: <PatientDashboardPage /> },
      { path: 'appointments', element: <AppointmentsListPage /> },
      { path: 'appointments/:id', element: <AppointmentDetailPage /> },
      { path: 'history', element: <MedicalHistoryPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },

  // ── Doctor portal ─────────────────────────────────────────────────────────
  {
    path: 'doctor',
    element: (
      <AuthGuard roles={['doctor']}>
        <PortalLayout>
          <SuspenseOutlet />
        </PortalLayout>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/doctor/schedule" replace /> },
      { path: 'schedule', element: <DoctorSchedulePage /> },
      { path: 'appointments/:appointmentId/patient', element: <PatientDetailPage /> },
    ],
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    path: 'admin',
    element: (
      <AuthGuard roles={['admin', 'receptionist']}>
        <SuspenseOutlet />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: 'appointments', element: <AdminAppointmentsPage /> },
      { path: 'doctors', element: <DoctorsManagementPage /> },
      { path: 'patients', element: <PatientsManagementPage /> },
      { path: 'patients/:id', element: <AdminPatientDetailPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'content', element: <ContentManagementPage /> },
      { path: 'roles', element: <UserRolesPage /> },
      { path: 'specialties', element: <SpecialtiesManagementPage /> },
    ],
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
])
