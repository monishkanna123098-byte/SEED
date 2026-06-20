import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ProtectedRoute } from '@/components/RouteGuards'
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

const Spinner = (
  <div className="min-h-screen bg-seed-ice flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-seed-teal border-t-transparent rounded-full animate-spin" />
  </div>
)

function AppRoutes() {
  const { user } = useAuthStore()

  return (
    <React.Suspense fallback={Spinner}>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Parent dashboard (role = PARENT) */}
        <Route
          path="/parent/*"
          element={
            <ProtectedRoute>
              <ParentLayout />
            </ProtectedRoute>
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
            <ProtectedRoute>
              <ClinicianLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ClinicianDashboard />} />
          <Route path="session/:sessionId" element={<SessionDetailPage />} />
          {/* Patients, analytics, override panel added in Stage 4C */}
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

        {/* Root redirect */}
        <Route
          path="/"
          element={
            user ? <Navigate to="/parent/dashboard" replace /> : <Navigate to="/login" replace />
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
