/**
 * S.E.E.D. — Buddy's World
 * lookTrialSequence.ts
 *
 * Pure trial-interleaving logic for Module A (LOOK), deliberately kept
 * free of any Phaser import. Importing ModuleA_Look.ts directly (even
 * just for this function) drags in Phaser's module-load-time device
 * detection code, which touches `window` and throws under vitest's
 * default Node test environment — confirmed by hitting exactly that
 * error when this function lived inside ModuleA_Look.ts itself.
 */

export type LookTrialType = 'name_call' | 'joint_attention'

/**
 * Interleaves name-call and joint-attention trials proportionally rather
 * than running all of one type then the other, so the child can't learn
 * "first half is X, second half is Y."
 */
export function buildLookTrialSequence(nameCall: number, jointAttention: number): LookTrialType[] {
  const sequence: LookTrialType[] = []
  let nRemaining = nameCall
  let jRemaining = jointAttention
  while (nRemaining > 0 || jRemaining > 0) {
    if (nRemaining / Math.max(1, nameCall) >= jRemaining / Math.max(1, jointAttention) && nRemaining > 0) {
      sequence.push('name_call')
      nRemaining--
    } else if (jRemaining > 0) {
      sequence.push('joint_attention')
      jRemaining--
    } else {
      sequence.push('name_call')
      nRemaining--
    }
  }
  return sequence
}
