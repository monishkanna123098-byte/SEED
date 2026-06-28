import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_HOME } from '@/components/RouteGuards'
import { SEEDLogo } from '@/components/SEEDLogo'
import { Disclaimer } from '@/components/Disclaimer'

type LoginStep = 'form' | 'unverified'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user, isLoading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<LoginStep>('form')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  // Where to send the user after login:
  // 1. Back to the protected page they were trying to reach (state.from)
  // 2. Otherwise, their role's home (PARENT→/parent/dashboard, etc.)
  const intendedPath = (location.state as { from?: { pathname: string } })?.from?.pathname

  useEffect(() => {
    if (user) {
      navigate(intendedPath ?? ROLE_HOME[user.role], { replace: true })
    }
  }, [user, navigate, intendedPath])

  useEffect(() => {
    return () => clearError()
  }, [clearError])

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email'
    if (!password) errors.password = 'Password is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      await login(email.trim().toLowerCase(), password)
      // Navigation handled by useEffect above
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.toLowerCase().includes('email not verified') || message.includes('EMAIL_NOT_VERIFIED')) {
        setStep('unverified')
      }
    }
  }

  if (step === 'unverified') {
    return (
      <div className="min-h-screen bg-seed-ice flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="seed-card text-center">
              <div className="w-16 h-16 bg-seed-amber/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-seed-amber" size={28} />
              </div>
              <h2 className="text-xl font-bold text-seed-dark mb-2">Verify your email</h2>
              <p className="text-seed-muted text-sm mb-6">
                We sent a verification link to <strong className="text-seed-dark">{email}</strong>.
                Please check your inbox and click the link to activate your account.
              </p>
              <button
                onClick={() => setStep('form')}
                className="seed-btn-secondary w-full"
              >
                Back to login
              </button>
            </div>
          </motion.div>
        </main>
        <Disclaimer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-seed-ice flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <SEEDLogo size="lg" showTagline />
            <p className="mt-3 text-seed-muted text-sm">
              AI-powered early ASD screening for children aged 2–5
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="seed-card"
          >
            <h1 className="text-xl font-bold text-seed-dark mb-6">Sign in to your account</h1>

            {error && !error.includes('EMAIL_NOT_VERIFIED') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-seed-alert/10 border border-seed-alert/20 rounded-xl px-4 py-3 mb-5"
              >
                <p className="text-seed-alert text-sm font-medium">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="email" className="seed-label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }))
                    clearError()
                  }}
                  className={`seed-input ${fieldErrors.email ? 'border-seed-alert focus:border-seed-alert focus:ring-seed-alert/20' : ''}`}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
                {fieldErrors.email && (
                  <p className="seed-error">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="seed-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
                      clearError()
                    }}
                    className={`seed-input pr-12 ${fieldErrors.password ? 'border-seed-alert focus:border-seed-alert focus:ring-seed-alert/20' : ''}`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-seed-muted hover:text-seed-dark transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="seed-error">{fieldErrors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="seed-btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-seed-ice">
              <p className="text-center text-sm text-seed-muted">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-seed-teal font-semibold hover:text-seed-navy transition-colors"
                >
                  Register
                </Link>
              </p>
            </div>
          </motion.div>

          <Disclaimer variant="inline" className="text-center mt-4" />
        </div>
      </main>
      <Disclaimer />
    </div>
  )
}
