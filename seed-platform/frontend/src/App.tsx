import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { ProtectedRoute, RoleRoute, ROLE_HOME } from '@/components/RouteGuards'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'

// Lazy-loaded dashboard routes (loaded after auth)
const DashboardPage = React.lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)

// Parent interface
const ParentLayout = React.lazy(() =>
  import('@/pages/parent/ParentLayout').then((m) => ({ default: m.ParentLayout }))
)
const ParentDashboard = React.lazy(() =>
  import('@/pages/parent/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const AddChildPage = React.lazy(() =>
  import('@/pages/parent/children/AddChildPage').then((m) => ({ default: m.AddChildPage }))
)
const ChildSelectorPage = React.lazy(() =>
  import('@/pages/parent/children/ChildSelectorPage').then((m) => ({ default: m.ChildSelectorPage }))
)
const NewScreeningPage = React.lazy(() =>
  import('@/pages/parent/screening/NewScreeningPage').then((m) => ({ default: m.NewScreeningPage }))
)
const HistoryPage = React.lazy(() =>
  import('@/pages/parent/HistoryPage').then((m) => ({ default: m.HistoryPage }))
)

// Clinician interface
const ClinicianLayout = React.lazy(() =>
  import('@/pages/clinician/ClinicianLayout').then((m) => ({ default: m.ClinicianLayout }))
)
const ClinicianDashboard = React.lazy(() =>
  import('@/pages/clinician/DashboardPage').then((m) => ({ default: m.ClinicianDashboard }))
)
const SessionDetailPage = React.lazy(() =>
  import('@/pages/clinician/SessionDetailPage').then((m) => ({ default: m.SessionDetailPage }))
)
const PatientsPage = React.lazy(() =>
  import('@/pages/clinician/PatientsPage').then((m) => ({ default: m.PatientsPage }))
)
const PatientDetailPage = React.lazy(() =>
  import('@/pages/clinician/PatientDetailPage').then((m) => ({ default: m.PatientDetailPage }))
)
const AnalyticsPage = React.lazy(() =>
  import('@/pages/clinician/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
)
const InviteCodesPage = React.lazy(() =>
  import('@/pages/clinician/InviteCodesPage').then((m) => ({ default: m.InviteCodesPage }))
)

// Admin interface
const AdminLayout = React.lazy(() =>
  import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout }))
)
const AdminDashboard = React.lazy(() =>
  import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
)
const AdminUsersPage = React.lazy(() =>
  import('@/pages/admin/UsersPage').then((m) => ({ default: m.UsersPage }))
)
const AdminCliniciansPage = React.lazy(() =>
  import('@/pages/admin/CliniciansPage').then((m) => ({ default: m.CliniciansPage }))
)
const AdminClinicianDetailPage = React.lazy(() =>
  import('@/pages/admin/ClinicianDetailPage').then((m) => ({ default: m.ClinicianDetailPage }))
)
const AdminAnalyticsPage = React.lazy(() =>
  import('@/pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage }))
)
const SystemHealthPage = React.lazy(() =>
  import('@/pages/admin/SystemHealthPage').then((m) => ({ default: m.SystemHealthPage }))
)
const ExportPage = React.lazy(() =>
  import('@/pages/admin/ExportPage').then((m) => ({ default: m.ExportPage }))
)

// Public landing page and legal pages
const LandingPage = React.lazy(() =>
  import('@/pages/landing/LandingPage').then((m) => ({ default: m.LandingPage }))
)
const PrivacyPage = React.lazy(() =>
  import('@/pages/landing/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
)
const TermsPage = React.lazy(() =>
  import('@/pages/landing/TermsPage').then((m) => ({ default: m.TermsPage }))
)

const Spinner = (
  <div className="min-h-screen bg-seed-ice flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-seed-teal border-t-transparent rounded-full animate-spin" />
  </div>
)

function AppRoutes() {
  const { user }   = useAuthStore()
  const location   = useLocation()
  // Key on top-level segment so transitions fire between /login → /parent etc.
  // but NOT between /parent/dashboard and /parent/history (same layout, no flash).
  const routeKey   = location.pathname.split('/')[1] || 'root'

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        style={{ minHeight: '100vh' }}
      >
        <React.Suspense fallback={Spinner}>
          <Routes location={location}>
        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Public legal pages */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms"   element={<TermsPage />} />

        {/* Parent dashboard (role = PARENT) */}
        <Route
          path="/parent/*"
          element={
            <RoleRoute roles={['PARENT']}>
              <ParentLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ParentDashboard />} />
          <Route path="children" element={<ChildSelectorPage />} />
          <Route path="children/add" element={<AddChildPage />} />
          <Route path="screening/new" element={<NewScreeningPage />} />
          <Route path="history" element={<HistoryPage />} />
          {/* Remaining parent routes added in Stage 4C */}
        </Route>

        {/* Clinician dashboard (role = CLINICIAN) */}
        <Route
          path="/clinician/*"
          element={
            <RoleRoute roles={['CLINICIAN']}>
              <ClinicianLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"          element={<ClinicianDashboard />} />
          <Route path="session/:sessionId" element={<SessionDetailPage />} />
          <Route path="patients"           element={<PatientsPage />} />
          <Route path="patients/:childId"  element={<PatientDetailPage />} />
          <Route path="analytics"          element={<AnalyticsPage />} />
          <Route path="invite-codes"       element={<InviteCodesPage />} />
          {/* pending, profile added in later stages */}
        </Route>

        {/* Admin interface (role = ADMIN) */}
        <Route
          path="/admin/*"
          element={
            <RoleRoute roles={['ADMIN']}>
              <AdminLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"               element={<AdminDashboard />} />
          <Route path="users"                   element={<AdminUsersPage />} />
          <Route path="clinicians"              element={<AdminCliniciansPage />} />
          <Route path="clinicians/:clinicianId" element={<AdminClinicianDetailPage />} />
          <Route path="analytics"               element={<AdminAnalyticsPage />} />
          <Route path="system"                  element={<SystemHealthPage />} />
          <Route path="export"                  element={<ExportPage />} />
        </Route>

        {/* Legacy /dashboard route — role-specific content handled inside */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Root: landing page for guests, role-home for authenticated users */}
        <Route
          path="/"
          element={
            user ? <Navigate to={ROLE_HOME[user.role]} replace /> : <LandingPage />
          }
        />

        {/* Catch-all */}
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-seed-ice flex items-center justify-center">
              <div className="text-center seed-card max-w-sm">
                <p className="text-4xl mb-3">🌱</p>
                <h1 className="text-xl font-bold text-seed-dark mb-2">Page not found</h1>
                <p className="text-seed-muted text-sm mb-4">
                  The page you're looking for doesn't exist.
                </p>
                <a href="/" className="seed-btn-primary inline-block">Go home</a>
              </div>
            </div>
          }
        />
      </Routes>
        </React.Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

export function App() {
  const { initialize, isInitialized } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-seed-ice flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-extrabold text-seed-navy mb-2">
            S<span className="text-seed-mint">.</span>E
            <span className="text-seed-mint">.</span>E
            <span className="text-seed-mint">.</span>D
            <span className="text-seed-mint">.</span>
          </div>
          <div className="w-8 h-8 border-3 border-seed-teal border-t-transparent rounded-full animate-spin mx-auto mt-4" />
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
