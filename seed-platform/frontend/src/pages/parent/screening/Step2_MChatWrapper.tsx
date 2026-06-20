/**
 * Step 2 — M-CHAT-R Questionnaire
 *
 * Creates a backend screening session (POST /api/screening/start) before
 * rendering MChatQuestionnaire so the questionnaire has a valid sessionId.
 * Auto-advances to Step 3 on questionnaire completion.
 *
 * Falls back to a mock sessionId if the API is unavailable (demo mode).
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

    api
      .post<{ session: { id: string } }>('/screening/start', {
        childId: state.selectedChildId,
        sessionType: 'COMBINED',  // will be scoped after modality selection in Step 3
      })
      .then(({ data }) => {
        const id = data.session?.id ?? `session-mock-${Date.now()}`
        setSessionId(id)
        setSessionStatus('ready')
      })
      .catch((err) => {
        const msg = extractApiError(err)
        // Network error = demo mode; use a mock id and continue
        if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed')) {
          const mockId = `session-demo-${Date.now()}`
          setSessionId(mockId)
          setSessionStatus('ready')
        } else {
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
