import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { SEEDLogo } from '@/components/SEEDLogo'
import { Disclaimer } from '@/components/Disclaimer'

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-seed-ice flex flex-col">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <SEEDLogo size="sm" showTagline={false} />
        <div className="flex items-center gap-4">
          <span className="text-sm text-seed-muted">
            {user?.name} &nbsp;·&nbsp;
            <span className="font-medium text-seed-teal">{user?.role}</span>
          </span>
          <button onClick={handleLogout} className="seed-btn-secondary text-sm py-2 px-4">
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="seed-card max-w-lg w-full text-center">
          <div className="text-4xl mb-4">🌱</div>
          <h1 className="text-2xl font-bold text-seed-dark mb-2">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-seed-muted mb-2">
            Role: <span className="font-semibold text-seed-teal">{user?.role}</span>
          </p>
          <p className="text-seed-muted text-sm">
            Stage 1 complete. Dashboard, screening, and game modules coming in Stage 2.
          </p>
          <Disclaimer variant="banner" className="mt-6" />
        </div>
      </main>

      <Disclaimer />
    </div>
  )
}
