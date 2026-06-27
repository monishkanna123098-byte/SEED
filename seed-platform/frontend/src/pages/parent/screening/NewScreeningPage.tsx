/**
 * New Screening Wizard — /parent/screening/new
 *
 * Orchestrates the 6-step screening flow.
 * Wizard state is persisted to sessionStorage so the parent can resume
 * after a browser refresh or mid-flow navigation.
 *
 * Smart step routing for Step 4:
 *   VIDEO only  → Step4a → Step 5
 *   GAME only   → Step4b → Step 5
 *   BOTH        → Step4a → Step4b (same step number) → Step 5
 *
 * Step 5 blocks all back navigation unconditionally.
 */

import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useParentStore } from '@/stores/parentStore'
import { MChatScore } from '@/components/MChatQuestionnaire'
import { StepIndicator }      from './StepIndicator'
import { Step1_SelectChild }  from './Step1_SelectChild'
import { Step2_MChatWrapper } from './Step2_MChatWrapper'
import { Step3_Modality }     from './Step3_Modality'
import { Step4a_VideoUpload } from './Step4a_VideoUpload'
import { Step4b_Game }        from './Step4b_Game'
import { Step5_Processing }   from './Step5_Processing'
import { Step6_Results }      from './Step6_Results'

// ─── Exported types — imported by all step components ─────────────────────────

export type ScreeningModality = 'VIDEO' | 'GAME' | 'BOTH'

export interface WizardState {
  step: number
  selectedChildId: string | null
  /** Created at Step 1→2 transition via POST /api/screening/start */
  sessionId: string | null
  modality: ScreeningModality | null
  mchatCompleted: boolean
  mchatScore: MChatScore | null
  videoUploaded: boolean
  gameCompleted: boolean
}

// ─── sessionStorage ────────────────────────────────────────────────────────────

const WIZARD_KEY = 'seed:wizard:screening'

function freshState(childId: string | null): WizardState {
  return {
    step: 1,
    selectedChildId: childId,
    sessionId: null,
    modality: null,
    mchatCompleted: false,
    mchatScore: null,
    videoUploaded: false,
    gameCompleted: false,
  }
}

function loadSaved(fallbackChildId: string | null): WizardState {
  try {
    const raw = sessionStorage.getItem(WIZARD_KEY)
    if (raw) {
      const p = JSON.parse(raw) as WizardState
      // Don't restore a completed wizard (step 6 done means back to dashboard)
      if (p.step >= 1 && p.step <= 6) return p
    }
  } catch { /* malformed — ignore */ }
  return freshState(fallbackChildId)
}

// ─── Wizard page ───────────────────────────────────────────────────────────────

export function NewScreeningPage() {
  const navigate = useNavigate()
  const storeChildId = useParentStore((s) => s.selectedChildId)

  const [state, setRawState] = useState<WizardState>(() =>
    loadSaved(storeChildId)
  )

  // Clear persisted wizard state once the screening reaches step 6 (completed).
  // Without this, navigating back to /parent/screening/new would re-hydrate the
  // old completed session instead of starting a fresh wizard.
  useEffect(() => {
    if (state.step === 6) {
      try { sessionStorage.removeItem(WIZARD_KEY) } catch { /* quota */ }
    }
  }, [state.step])

  /**
   * Smart step-advance: step files call onNext() and routing logic lives here.
   *   videoUploaded=true + BOTH  → stay at step 4 (Step4b renders)
   *   videoUploaded=true + VIDEO → step 5
   *   gameCompleted=true         → step 5
   *   explicit step in updates   → use that value
   *   otherwise                  → increment by 1
   */
  const onNext = useCallback(
    (updates: Partial<WizardState> = {}) => {
      setRawState((prev) => {
        let nextStep = prev.step

        if (updates.step !== undefined) {
          nextStep = updates.step
        } else if (updates.videoUploaded === true) {
          nextStep = prev.modality === 'BOTH' ? 4 : 5
        } else if (updates.gameCompleted === true) {
          nextStep = 5
        } else {
          nextStep = prev.step + 1
        }

        const next: WizardState = { ...prev, ...updates, step: nextStep }
        try { sessionStorage.setItem(WIZARD_KEY, JSON.stringify(next)) } catch { /* quota */ }
        return next
      })
    },
    []
  )

  function clearAndCancel() {
    try { sessionStorage.removeItem(WIZARD_KEY) } catch { /* ignore */ }
    navigate('/parent/dashboard')
  }

  // ── Step 4 renderer ─────────────────────────────────────────────────────────

  function renderStep4() {
    const { modality, videoUploaded } = state
    if (modality === 'GAME')  return <Step4b_Game state={state} onNext={onNext} />
    if (modality === 'VIDEO') return <Step4a_VideoUpload state={state} onNext={onNext} />
    if (modality === 'BOTH')  return videoUploaded
      ? <Step4b_Game state={state} onNext={onNext} />
      : <Step4a_VideoUpload state={state} onNext={onNext} />
    return null
  }

  // ── Step 2: MChatQuestionnaire owns its full-screen layout ──────────────────

  if (state.step === 2) {
    return (
      <div className="min-h-screen bg-seed-ice flex flex-col">
        <StepIndicator currentStep={2} />
        <Step2_MChatWrapper state={state} onNext={onNext} />
      </div>
    )
  }

  // ── Step 5: processing — wizard chrome deliberately minimal ─────────────────

  if (state.step === 5) {
    return (
      <div className="min-h-screen bg-seed-ice flex flex-col">
        <StepIndicator currentStep={5} />
        <Step5_Processing state={state} onNext={onNext} />
      </div>
    )
  }

  // ── Step 6: results — no back link, results take full scroll area ────────────

  if (state.step === 6) {
    return (
      <div className="min-h-screen bg-seed-ice flex flex-col">
        <StepIndicator currentStep={6} />
        <Step6_Results state={state} />
      </div>
    )
  }

  // ── Steps 1, 3, 4: standard wizard shell with optional back link ────────────

  return (
    <div className="min-h-screen bg-seed-ice flex flex-col">
      <StepIndicator currentStep={state.step} />

      {(state.step === 1 || state.step === 3) && (
        <div className="px-6 pt-3 max-w-2xl mx-auto w-full">
          <button
            onClick={clearAndCancel}
            className="text-sm text-seed-muted hover:text-seed-dark transition-colors
                       flex items-center gap-1"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
              strokeWidth={1.8} className="w-3.5 h-3.5">
              <polyline points="10,3 5,8 10,13"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {state.step === 1 && <Step1_SelectChild state={state} onNext={onNext} />}
        {state.step === 3 && <Step3_Modality    state={state} onNext={onNext} />}
        {state.step === 4 && renderStep4()}
      </div>
    </div>
  )
}
