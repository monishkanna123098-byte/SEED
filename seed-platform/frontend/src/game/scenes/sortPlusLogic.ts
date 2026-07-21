/**
 * S.E.E.D. — Buddy's World
 * sortPlusLogic.ts
 *
 * Pure rule-evaluation logic for Module D (SORT_PLUS), Phaser-free for
 * the same reason lookTrialSequence.ts is. This is the genuinely NEW
 * logic in this module (the rule-switch/perseverative-error detection);
 * the drag mechanic itself is proven, already-working code from
 * Module3_Sort.ts and isn't re-extracted here.
 */

export type BinColor = 'red' | 'blue' | 'green'
export type SortShape = 'circle' | 'square' | 'triangle'

/** Fixed bin assignments — each bin slot represents both a color (Phase
 *  1's rule) and a shape (Phase 2's rule) throughout the whole module,
 *  never reassigned between phases. This is what makes the rule-switch
 *  a genuine switch rather than a relabeling of which bin means what. */
export const BIN_ASSIGNMENTS: Array<{ slot: number; color: BinColor; shape: SortShape }> = [
  { slot: 0, color: 'red', shape: 'circle' },
  { slot: 1, color: 'blue', shape: 'square' },
  { slot: 2, color: 'green', shape: 'triangle' },
]

export function ruleForPhase(phase: 1 | 2): 'color' | 'shape' {
  return phase === 1 ? 'color' : 'shape'
}

export function correctSlotForRule(objColor: BinColor, objShape: SortShape, rule: 'color' | 'shape'): number {
  const match = BIN_ASSIGNMENTS.find((b) => (rule === 'color' ? b.color === objColor : b.shape === objShape))
  if (!match) throw new Error(`correctSlotForRule: no bin matches ${rule === 'color' ? objColor : objShape}`)
  return match.slot
}

export interface SortPlusEvaluation {
  correct: boolean
  isPerseverativeError: boolean
}

/**
 * Evaluates a drop against the CURRENT phase's rule, and — only in
 * Phase 2, only when incorrect — checks whether the drop matches what
 * would have been correct under Phase 1's rule instead. That specific
 * pattern (wrong now, but right under the OLD rule) is a perseverative
 * error (Signal D1); a wrong-under-both-rules drop is not — it's just
 * an ordinary mistake, not evidence of rigidity toward the old rule.
 */
export function evaluateSortPlusDrop(objColor: BinColor, objShape: SortShape, droppedSlot: number, phase: 1 | 2): SortPlusEvaluation {
  const rule = ruleForPhase(phase)
  const correctSlot = correctSlotForRule(objColor, objShape, rule)
  const correct = droppedSlot === correctSlot

  let isPerseverativeError = false
  if (!correct && phase === 2) {
    const oldRuleSlot = correctSlotForRule(objColor, objShape, 'color') // Phase 1's rule is always color
    isPerseverativeError = droppedSlot === oldRuleSlot
  }

  return { correct, isPerseverativeError }
}
