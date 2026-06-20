/**
 * StepIndicator — wizard progress bar for the New Screening flow.
 *
 * Shows 6 steps as numbered circles connected by a line.
 *   Completed (< current): teal circle with check
 *   Active (= current):    navy circle with number
 *   Pending (> current):   grey circle with number
 *
 * On narrow screens the labels are hidden; circles + connector remain.
 */

interface Step {
  id: number
  label: string
}

const STEPS: Step[] = [
  { id: 1, label: 'Child' },
  { id: 2, label: 'Questionnaire' },
  { id: 3, label: 'Modality' },
  { id: 4, label: 'Screening' },
  { id: 5, label: 'Processing' },
  { id: 6, label: 'Results' },
]

interface StepIndicatorProps {
  currentStep: number
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Screening progress" className="w-full px-4 py-4 bg-white border-b border-slate-100">
      <ol className="flex items-center max-w-2xl mx-auto">
        {STEPS.map((step, idx) => {
          const done = step.id < currentStep
          const active = step.id === currentStep
          const last = idx === STEPS.length - 1

          return (
            <li key={step.id} className={`flex items-center ${last ? '' : 'flex-1'}`}>
              {/* Circle */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center
                               text-xs font-bold border-2 transition-colors duration-200 ${
                    done
                      ? 'bg-seed-mint border-seed-mint text-white'
                      : active
                      ? 'bg-seed-navy border-seed-navy text-white'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? (
                    <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5">
                      <polyline
                        points="2,6 5,9 10,3"
                        stroke="white"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                {/* Label — hidden on xs, visible sm+ */}
                <span
                  className={`hidden sm:block mt-1 text-[10px] font-medium text-center w-16 truncate ${
                    active ? 'text-seed-navy' : done ? 'text-seed-mint' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!last && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors duration-300 ${
                    done ? 'bg-seed-mint' : 'bg-slate-200'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
