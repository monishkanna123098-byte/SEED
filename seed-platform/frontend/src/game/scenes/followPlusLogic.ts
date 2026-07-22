/**
 * S.E.E.D. — Buddy's World
 * followPlusLogic.ts
 *
 * Pure logic for Module E (FOLLOW_PLUS), Phaser-free for the same
 * reason lookTrialSequence.ts is. Sequence-length ramping is adapted
 * directly from Module4_Follow.ts's existing getSequenceLength() —
 * same formula, generalized to a [min,max] range instead of a single
 * maxSequenceLength, per design spec §3.
 */

/**
 * Ramps sequence length from `range[0]` toward `range[1]` across the
 * session, proportional to trial progress. Adapted from
 * Module4_Follow.ts's existing divisor-based getSequenceLength(), but
 * that formula doesn't scale correctly for a narrow range like [3,4]
 * within a small trial count (8) — the divisor ends up larger than
 * the trial count itself, so the ramp mathematically never reaches
 * the ceiling (found by writing a test with an explicit expectation
 * and having it fail, not by inspection). Proportional scaling by
 * trial fraction reaches the ceiling by the final trials regardless
 * of how narrow the range is.
 */
export function sequenceLengthForTrial(trialIndex: number, totalTrials: number, range: [number, number]): number {
  const [min, max] = range
  const spread = max - min + 1 // number of distinct length values available
  const step = Math.floor((trialIndex / totalTrials) * spread)
  return Math.min(max, min + step)
}

/** Exactly round(n * proportion) trials get a secret replay
 *  modification — same formula as the existing Module4_Follow.ts,
 *  with a plain Fisher-Yates shuffle (RNG injectable for deterministic
 *  tests) rather than depending on Phaser.Utils.Array.Shuffle, which
 *  would require importing Phaser into this otherwise Phaser-free file. */
export function buildModifiedFlags(n: number, proportion: number, rng: () => number = Math.random): boolean[] {
  const modCount = Math.round(n * proportion)
  const flags = Array.from({ length: n }, (_, i) => i < modCount)
  for (let i = flags.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[flags[i], flags[j]] = [flags[j], flags[i]]
  }
  return flags
}

/**
 * True if the tap at `stepIndex` repeats the tap at `stepIndex - 1`
 * while the ACTUAL shown sequence has no repeat at those two
 * positions — this distinguishes genuine perseveration from a
 * legitimate repeat that happens to appear in the real sequence
 * (design spec §4, Signal E5).
 */
export function isPerseverativeStep(tappedSequence: number[], shownSequence: number[], stepIndex: number): boolean {
  if (stepIndex === 0) return false
  const tappedRepeat = tappedSequence[stepIndex] === tappedSequence[stepIndex - 1]
  const shownHasRepeatHere = shownSequence[stepIndex] === shownSequence[stepIndex - 1]
  return tappedRepeat && !shownHasRepeatHere
}
