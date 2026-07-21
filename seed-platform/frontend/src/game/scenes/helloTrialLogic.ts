/**
 * S.E.E.D. — Buddy's World
 * helloTrialLogic.ts
 *
 * Pure gesture-selection logic for Module B (HELLO), Phaser-free for
 * the same reason lookTrialSequence.ts is (see that file's header).
 * RNG is injectable so tests are deterministic rather than probabilistic.
 */

export type GestureType = 'wave' | 'clap' | 'stomp' | 'spin' | 'jump'
export const ALL_GESTURES: GestureType[] = ['wave', 'clap', 'stomp', 'spin', 'jump']

/**
 * Derives the [min, max] sequence-length range from a single
 * maxSequenceSteps config value, matching the research's per-band
 * description exactly: Band 1 "1-step only" -> [1,1], Band 2 "1-2 step"
 * -> [1,2], Band 3 "2-3 step" -> [2,3]. One formula covers all three
 * without needing AgeAdapter's config shape to carry a range tuple.
 */
export function sequenceLengthRange(maxSequenceSteps: number): [number, number] {
  return [Math.max(1, maxSequenceSteps - 1), maxSequenceSteps]
}

/**
 * Picks which gesture Buddy performs for a given step. "Novel" here
 * means "hasn't appeared earlier in THIS session" (Signal B3's actual
 * definition per the design spec), not membership in a fixed pool —
 * tracked via `seen`, not a hardcoded familiar/unfamiliar split.
 */
export function pickGesture(seen: GestureType[], allowNovel: boolean, rng: () => number = Math.random): GestureType {
  if (seen.length === 0) return 'wave' // the very first step of the session

  if (allowNovel) {
    const unseen = ALL_GESTURES.filter((g) => !seen.includes(g))
    // Biased toward introducing something new when allowed, not
    // guaranteed — occasional repeats of a seen gesture are fine and
    // keep the session from being "every trial is brand new."
    if (unseen.length > 0 && rng() < 0.6) {
      return unseen[Math.floor(rng() * unseen.length)]
    }
  }
  return seen[Math.floor(rng() * seen.length)]
}

/** The correct widget plus `count - 1` decoys, decoys always different
 *  gesture types from the correct one and from each other. */
export function pickWidgetChoices(correctGesture: GestureType, count: number, rng: () => number = Math.random): GestureType[] {
  const decoyPool = ALL_GESTURES.filter((g) => g !== correctGesture)
  const decoys: GestureType[] = []
  const poolCopy = [...decoyPool]
  for (let i = 0; i < count - 1 && poolCopy.length > 0; i++) {
    const idx = Math.floor(rng() * poolCopy.length)
    decoys.push(poolCopy[idx])
    poolCopy.splice(idx, 1)
  }
  const choices = [correctGesture, ...decoys]
  // Shuffle so the correct answer isn't always in the same position
  // (Fisher-Yates, using the injected rng for determinism in tests).
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[choices[i], choices[j]] = [choices[j], choices[i]]
  }
  return choices
}

/** True if the tapped widget matches a PRIOR step's gesture rather than
 *  the current step's correct or decoy options — Signal B5, reported
 *  via the generic addPerseverationEvent(), not a field on HelloEvent
 *  itself (see design spec §3). */
export function isPerseverativeTap(tappedGesture: GestureType, priorStepGestures: GestureType[]): boolean {
  return priorStepGestures.includes(tappedGesture)
}
