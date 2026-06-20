import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { SEEDLogo } from '@/components/SEEDLogo'
import { Disclaimer } from '@/components/Disclaimer'

type RegisterRole = 'PARENT' | 'CLINICIAN'
type RegisterStep = 'form' | 'success'

interface FormState {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: RegisterRole
  inviteCode: string
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  inviteCode?: string
}

interface InviteStatus {
  state: 'idle' | 'checking' | 'valid' | 'invalid'
  clinicianName?: string
  message?: string
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { register, validateInviteCode, isLoading, clearError } = useAuthStore()

  const [step, setStep] = useState<RegisterStep>('form')
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PARENT',
    inviteCode: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>({ state: 'idle' })

  const inviteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => clearError()
  }, [clearError])

  // Debounced invite code validation
  useEffect(() => {
    if (form.role !== 'PARENT' || form.inviteCode.length < 6) {
      setInviteStatus({ state: 'idle' })
      return
    }

    if (inviteDebounceRef.current) clearTimeout(inviteDebounceRef.current)

    inviteDebounceRef.current = setTimeout(async () => {
      setInviteStatus({ state: 'checking' })
      try {
        const result = await validateInviteCode(form.inviteCode.toUpperCase())
        if (result.valid) {
          setInviteStatus({
            state: 'valid',
            clinicianName: result.clinicianName,
            message: `Valid — assigned to ${result.clinicianName}`,
          })
          setErrors((p) => ({ ...p, inviteCode: undefined }))
        } else {
          setInviteStatus({ state: 'invalid', message: result.error ?? 'Invalid code' })
        }
      } catch {
        setInviteStatus({ state: 'invalid', message: 'Could not validate code' })
      }
    }, 600)

    return () => {
      if (inviteDebounceRef.current) clearTimeout(inviteDebounceRef.current)
    }
  }, [form.inviteCode, form.role, validateInviteCode])

  function updateField(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: undefined }))
    setSubmitError(null)
  }

  function validate(): boolean {
    const e: FormErrors = {}

    if (!form.name.trim() || form.name.trim().length < 2) {
      e.name = 'Full name is required (minimum 2 characters)'
    }

    if (!form.email.trim()) {
      e.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address'
    }

    if (!form.password) {
      e.password = 'Password is required'
    } else if (form.password.length < 8) {
      e.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      e.password = 'Must include uppercase, lowercase, and a number'
    }

    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match'
    }

    if (form.role === 'PARENT') {
      if (!form.inviteCode.trim()) {
        e.inviteCode = 'Invite code required — contact your child\'s clinician'
      } else if (inviteStatus.state === 'invalid') {
        e.inviteCode = inviteStatus.message ?? 'Invalid invite code'
      } else if (inviteStatus.state !== 'valid') {
        e.inviteCode = 'Please wait for invite code validation'
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        inviteCode: form.role === 'PARENT' ? form.inviteCode.toUpperCase() : undefined,
      })
      setStep('success')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  const passwordStrength = getPasswordStrength(form.password)

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-seed-ice flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <div className="seed-card text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 bg-seed-mint/10 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg className="w-8 h-8 text-seed-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-xl font-bold text-seed-dark mb-2">Registration successful!</h2>
              <p className="text-seed-muted text-sm mb-1">
                We sent a verification email to
              </p>
              <p className="font-semibold text-seed-dark mb-5">{form.email}</p>
              <p className="text-seed-muted text-sm mb-6">
                Click the link in the email to verify your account, then log in.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="seed-btn-primary w-full"
              >
                Go to login
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
            <SEEDLogo size="md" showTagline />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="seed-card"
          >
            <h1 className="text-xl font-bold text-seed-dark mb-2">Create your account</h1>
            <p className="text-seed-muted text-sm mb-6">
              Join the S.E.E.D. platform for early developmental screening.
            </p>

            {/* Role selector */}
            <div className="flex gap-3 mb-6">
              {(['PARENT', 'CLINICIAN'] as RegisterRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => updateField('role', role)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${
                    form.role === role
                      ? 'border-seed-teal bg-seed-teal/5 text-seed-teal'
                      : 'border-seed-muted/20 text-seed-muted hover:border-seed-teal/40'
                  }`}
                >
                  <div className="text-lg mb-0.5">{role === 'PARENT' ? '👨‍👩‍👧' : '🩺'}</div>
                  {role === 'PARENT' ? 'Parent / Guardian' : 'Clinician'}
                </button>
              ))}
            </div>

            {form.role === 'PARENT' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-seed-teal/5 border border-seed-teal/20 rounded-xl px-4 py-3 mb-5 text-sm text-seed-dark"
              >
                <strong>DPDPA-2023 Notice:</strong> Parent registration requires a clinician invite
                code under Schedule IV (children's health data). Please obtain this from your child's
                paediatrician or developmental specialist.
              </motion.div>
            )}

            {submitError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-seed-alert/10 border border-seed-alert/20 rounded-xl px-4 py-3 mb-5"
              >
                <p className="text-seed-alert text-sm font-medium">{submitError}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Full name */}
              <div>
                <label htmlFor="name" className="seed-label">Full name</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className={`seed-input ${errors.name ? 'border-seed-alert' : ''}`}
                  placeholder="Your full name"
                  disabled={isLoading}
                />
                {errors.name && <p className="seed-error">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" className="seed-label">Email address</label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={`seed-input ${errors.email ? 'border-seed-alert' : ''}`}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
                {errors.email && <p className="seed-error">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="seed-label">Password</label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={`seed-input pr-12 ${errors.password ? 'border-seed-alert' : ''}`}
                    placeholder="Min. 8 characters"
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
                {form.password && (
                  <PasswordStrengthBar strength={passwordStrength} />
                )}
                {errors.password && <p className="seed-error">{errors.password}</p>}
              </div>

              {/* Confirm password */}
              <div>
                <label htmlFor="confirm-password" className="seed-label">Confirm password</label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className={`seed-input ${errors.confirmPassword ? 'border-seed-alert' : ''}`}
                  placeholder="Repeat your password"
                  disabled={isLoading}
                />
                {errors.confirmPassword && <p className="seed-error">{errors.confirmPassword}</p>}
              </div>

              {/* Invite code — parents only */}
              <AnimatePresence>
                {form.role === 'PARENT' && (
                  <motion.div
                    key="invite-code"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label htmlFor="invite-code" className="seed-label">
                      Clinician invite code
                    </label>
                    <div className="relative">
                      <input
                        id="invite-code"
                        type="text"
                        value={form.inviteCode}
                        onChange={(e) => updateField('inviteCode', e.target.value.toUpperCase())}
                        className={`seed-input font-mono tracking-widest uppercase pr-10 ${
                          inviteStatus.state === 'valid'
                            ? 'border-seed-mint focus:border-seed-mint'
                            : inviteStatus.state === 'invalid'
                            ? 'border-seed-alert focus:border-seed-alert'
                            : errors.inviteCode
                            ? 'border-seed-alert'
                            : ''
                        }`}
                        placeholder="6-character code"
                        maxLength={6}
                        disabled={isLoading}
                        spellCheck={false}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {inviteStatus.state === 'checking' && (
                          <div className="w-4 h-4 border-2 border-seed-teal border-t-transparent rounded-full animate-spin" />
                        )}
                        {inviteStatus.state === 'valid' && (
                          <svg className="w-5 h-5 text-seed-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {inviteStatus.state === 'invalid' && (
                          <svg className="w-5 h-5 text-seed-alert" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {inviteStatus.state === 'valid' && (
                      <p className="text-seed-mint text-sm mt-1 font-medium">
                        ✓ {inviteStatus.message}
                      </p>
                    )}
                    {(inviteStatus.state === 'invalid' || errors.inviteCode) && (
                      <p className="seed-error">
                        {inviteStatus.message ?? errors.inviteCode}
                      </p>
                    )}
                    {errors.inviteCode && inviteStatus.state === 'idle' && (
                      <p className="seed-error">{errors.inviteCode}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading || (form.role === 'PARENT' && inviteStatus.state === 'checking')}
                className="seed-btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-seed-ice">
              <p className="text-center text-sm text-seed-muted">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-seed-teal font-semibold hover:text-seed-navy transition-colors"
                >
                  Sign in
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

// ─── Password strength helpers ─────────────────────────────────────────────
function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 3) as 0 | 1 | 2 | 3
}

const strengthConfig = {
  0: { label: '', width: '0%', color: '' },
  1: { label: 'Weak', width: '33%', color: 'bg-seed-alert' },
  2: { label: 'Fair', width: '66%', color: 'bg-seed-amber' },
  3: { label: 'Strong', width: '100%', color: 'bg-seed-mint' },
}

function PasswordStrengthBar({ strength }: { strength: 0 | 1 | 2 | 3 }) {
  const cfg = strengthConfig[strength]
  if (!cfg.label) return null
  return (
    <div className="mt-1.5">
      <div className="h-1.5 bg-seed-ice rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: cfg.width }}
          transition={{ duration: 0.3 }}
          className={`h-full rounded-full ${cfg.color}`}
        />
      </div>
      <p className={`text-xs mt-0.5 font-medium ${
        strength === 1 ? 'text-seed-alert' : strength === 2 ? 'text-seed-amber' : 'text-seed-mint'
      }`}>
        {cfg.label}
      </p>
    </div>
  )
}
