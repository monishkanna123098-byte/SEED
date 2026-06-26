/**
 * Step 2 — M-CHAT-R Questionnaire
 *
 * Creates a backend screening session (POST /api/screening/start) before
 * rendering MChatQuestionnaire so the questionnaire has a valid sessionId.
 * Auto-advances to Step 3 on questionnaire completion.
 *
 * POST /screening/start returns { sessionId: string }.
 * Falls back to a non-UUID mock sessionId ONLY on genuine network failure
 * (no HTTP response). Real API errors (400, 403, 404, 500) are surfaced to
 * the user rather than silently masked with a fake ID.
 */

import { useEffect, useState } from 'react'
import { MChatQuestionnaire, MChatScore } from '@/components/MChatQuestionnaire'
import { api, extractApiError } from '@/utils/api'
import { WizardState } from './NewScreeningPage'

interface Step2Props {
  state: WizardState
  onNext: (updates: Partial<WizardState>) => void
}

type SessionCreateStatus = 'creating' | 'ready' | 'error'

export function Step2_MChatWrapper({ state, onNext }: Step2Props) {
  const [sessionStatus, setSessionStatus] = useState<SessionCreateStatus>(
    state.sessionId ? 'ready' : 'creating'
  )
  const [sessionId, setSessionId] = useState<string | null>(state.sessionId)
  const [createError, setCreateError] = useState<string | null>(null)

  // Create the screening session on mount (if not already created)
  useEffect(() => {
    if (sessionId) return  // already have one (resumed from sessionStorage)
    if (!state.selectedChildId) {
      setCreateError('No child selected. Please go back and select a child.')
      setSessionStatus('error')
      return
    }

    // POST /api/screening/start returns { sessionId: string } — NOT { session: { id } }
    api
      .post<{ sessionId: string }>('/screening/start', {
        childId: state.selectedChildId,
        sessionType: 'COMBINED',  // narrowed to actual modality after Step 3
      })
      .then(({ data }) => {
        if (!data.sessionId) {
          // Backend responded 2xx but without a sessionId — treat as a server error
          setCreateError('Server returned an unexpected response. Please try again.')
          setSessionStatus('error')
          return
        }
        setSessionId(data.sessionId)
        setSessionStatus('ready')
      })
      .catch((err: unknown) => {
        // Only fall back to demo mode on a genuine network failure — i.e. the
        // request never reached the server (no response object on the error).
        // Any error with an HTTP response (400 validation, 403 auth, 404 not found)
        // is a real problem that must be shown to the user, not silently swallowed.
        const hasResponse = !!(err as { response?: unknown }).response

        if (!hasResponse) {
          // True network failure (offline, server down, CORS) — demo mode
          const mockId = `session-demo-${Date.now()}`
          setSessionId(mockId)
          setSessionStatus('ready')
        } else {
          // HTTP error from the server — surface the real message
          const msg = extractApiError(err)
          setCreateError(msg)
          setSessionStatus('error')
        }
      })
  }, [state.selectedChildId, sessionId])

  function handleComplete(score: MChatScore) {
    onNext({
      sessionId: sessionId ?? undefined,
      mchatCompleted: true,
      mchatScore: score,
    })
  }

  if (sessionStatus === 'creating') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-seed-teal border-t-transparent
                          rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-seed-muted">Preparing questionnaire…</p>
        </div>
      </div>
    )
  }

  if (sessionStatus === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="seed-card max-w-sm w-full text-center">
          <p className="text-seed-alert font-medium mb-2">Something went wrong</p>
          <p className="text-sm text-seed-muted mb-4">{createError}</p>
          <button
            onClick={() => {
              setSessionStatus('creating')
              setCreateError(null)
              setSessionId(null)
            }}
            className="seed-btn-primary w-full"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // sessionId is guaranteed to be a string here
  return (
    <MChatQuestionnaire
      sessionId={sessionId!}
      onComplete={handleComplete}
    />
  )
}
