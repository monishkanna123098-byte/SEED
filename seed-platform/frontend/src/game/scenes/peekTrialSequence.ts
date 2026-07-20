/**
 * S.E.E.D. — Buddy's World
 * peekTrialSequence.ts
 *
 * Pure trial-interleaving logic for Module C (PEEK), kept Phaser-free
 * for the same reason lookTrialSequence.ts is — see that file's header.
 */

export type PeekTrialType = 'plain' | 'referencing'

export function buildPeekTrialSequence(plain: number, referencing: number): PeekTrialType[] {
  const sequence: PeekTrialType[] = []
  let pRemaining = plain
  let rRemaining = referencing
  while (pRemaining > 0 || rRemaining > 0) {
    if (pRemaining / Math.max(1, plain) >= rRemaining / Math.max(1, referencing) && pRemaining > 0) {
      sequence.push('plain')
      pRemaining--
    } else if (rRemaining > 0) {
      sequence.push('referencing')
      rRemaining--
    } else {
      sequence.push('plain')
      pRemaining--
    }
  }
  return sequence
}
