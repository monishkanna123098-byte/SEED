import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { SEEDLogo } from '@/components/SEEDLogo'
import { Disclaimer } from '@/components/Disclaimer'

type VerifyState = 'verifying' | 'success' | 'already_verified' | 'invalid' | 'no_token'

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { verifyEmail } = useAuthStore()

  const [state, setState] = useState<VerifyState>('verifying')
  const [countdown, setCountdown] = useState(5)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setState('no_token')
      return
    }

    let cancelled = false

    async function doVerify() {
      try {
        await verifyEmail(token!)
        if (!cancelled) setState('success')
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message.toLowerCase() : ''
        if (message.includes('already verified')) {
          setState('already_verified')
        } else {
          setState('invalid')
        }
      }
    }

    doVerify()
    return () => { cancelled = true }
  }, [token, verifyEmail])

  // Auto-redirect to login after success
  useEffect(() => {
    if (state !== 'success') return

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          navigate('/login')
          return 0
        }
        return c - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [state, navigate])

  return (
    <div className="min-h-screen bg-seed-ice flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <SEEDLogo size="md" showTagline />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="seed-card text-center"
          >
            {state === 'verifying' && (
              <VerifyingState />
            )}

            {state === 'success' && (
              <SuccessState countdown={countdown} onNavigate={() => navigate('/login')} />
            )}

            {state === 'already_verified' && (
              <AlreadyVerifiedState />
            )}

            {state === 'invalid' && (
              <InvalidState />
            )}

            {state === 'no_token' && (
              <NoTokenState />
            )}
          </motion.div>

          <Disclaimer variant="inline" className="text-center mt-4" />
        </div>
      </main>
      <Disclaimer />
    </div>
  )
}

function VerifyingState() {
  return (
    <>
      <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
        <div className="w-12 h-12 border-4 border-seed-teal border-t-transparent rounded-full animate-spin" />
      </div>
      <h2 className="text-xl font-bold text-seed-dark mb-2">Verifying your email...</h2>
      <p className="text-seed-muted text-sm">Please wait a moment.</p>
    </>
  )
}

function SuccessState({ countdown, onNavigate }: { countdown: number; onNavigate: () => void }) {
  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="w-16 h-16 bg-seed-mint/10 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <svg className="w-8 h-8 text-seed-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
      <h2 className="text-xl font-bold text-seed-dark mb-2">Email verified!</h2>
      <p className="text-seed-muted text-sm mb-6">
        Your account is active. Redirecting to login in{' '}
        <span className="font-bold text-seed-teal">{countdown}</span> seconds...
      </p>
      <button onClick={onNavigate} className="seed-btn-primary w-full">
        Go to login now
      </button>
    </>
  )
}

function AlreadyVerifiedState() {
  return (
    <>
      <div className="w-16 h-16 bg-seed-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-seed-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-seed-dark mb-2">Already verified</h2>
      <p className="text-seed-muted text-sm mb-6">
        Your email has already been verified. You can log in now.
      </p>
      <Link to="/login" className="seed-btn-primary w-full block">
        Go to login
      </Link>
    </>
  )
}

function InvalidState() {
  return (
    <>
      <div className="w-16 h-16 bg-seed-alert/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-seed-alert" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-seed-dark mb-2">Verification failed</h2>
      <p className="text-seed-muted text-sm mb-6">
        This verification link is invalid or has expired. Links expire after 24 hours.
        Please register again to receive a new link.
      </p>
      <div className="flex flex-col gap-3">
        <Link to="/register" className="seed-btn-primary block text-center">
          Register again
        </Link>
        <Link to="/login" className="seed-btn-secondary block text-center">
          Back to login
        </Link>
      </div>
    </>
  )
}

function NoTokenState() {
  return (
    <>
      <div className="w-16 h-16 bg-seed-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-seed-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-seed-dark mb-2">No verification token</h2>
      <p className="text-seed-muted text-sm mb-6">
        This page requires a verification token. Please use the link from your verification email.
      </p>
      <Link to="/login" className="seed-btn-secondary block text-center">
        Back to login
      </Link>
    </>
  )
}
