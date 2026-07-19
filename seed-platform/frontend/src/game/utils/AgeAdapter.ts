/**
 * S.E.E.D. Age Adapter
 *
 * Returns age-appropriate difficulty parameters for each module.
 * Ages 3-4 (36-48 months): simpler, more time, larger targets, longer cues
 * Ages 4-5 (48-60 months): faster pacing, simultaneous cues, shorter windows
 */

export interface GazeModuleConfig {
  trials: number
  gazeBeforeCardsMs: number    // how long Buddy looks before cards appear (0 = simultaneous)
  responseWindowMs: number     // how long child has to respond
  buddyLookDurationMs: number  // how long Buddy holds gaze direction
}

export interface ImitateModuleConfig {
  trials: number
  maxSequenceLength: number    // max gestures per sequence
  demonstrationPauseMs: number // pause between each gesture in demo
  responseWindowMs: number
  startingLength: number
}

export interface SortModuleConfig {
  objectCount: number
  fallSpeedMs: number          // time to fall from top to bottom
  targetRadius: number         // size of bins
  objectSize: number
}

export interface FollowModuleConfig {
  trials: number
  maxSequenceLength: number
  litDurationMs: number        // how long each circle stays lit
  betweenFlashMs: number       // gap between flashes
  responseWindowMs: number
  modifiedTrialProportion: number // fraction of trials that have a change
}

export interface AgeConfig {
  gaze: GazeModuleConfig
  imitate: ImitateModuleConfig
  sort: SortModuleConfig
  follow: FollowModuleConfig
  inactivityCallMs: number     // ms before Buddy calls to child
  inactivityAdvanceMs: number  // ms before auto-advance (disengagement)
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * NEW 3-BAND INTERFACE — spec: docs/superpowers/specs/2026-07-18-ageadapter-redesign-design.md
 * ─────────────────────────────────────────────────────────────────────────
 *
 * DEVIATION FROM SPEC §6: the spec calls this a "clean break" with no shim,
 * meaning the old AgeAdapter class below (isYoungerGroup / getConfig,
 * gaze/imitate/sort/follow shape) should be retired outright. It is NOT
 * retired in this commit. The four existing module scenes (Module1_Gaze
 * through Module4_Follow) still call the old class today, and their
 * replacements (Modules A–E, sub-projects 3–7 of the game engine rebuild)
 * have not been built yet. Deleting the old class now would break the
 * current build with no working replacement in place. The old class is
 * left untouched below; it will be deleted in whichever sub-project
 * removes its last caller (i.e. once Modules A–E replace Modules 1–4).
 */

import { MIN_AGE_MONTHS, MAX_AGE_MONTHS } from '../../utils/ageConstants'

/** Re-exported for backward compatibility — anything already importing
 *  these from AgeAdapter.ts keeps working. Canonical definition lives in
 *  utils/ageConstants.ts; see docs/superpowers/specs/2026-07-18-age-floor-ceiling-consistency-design.md */
export { MIN_AGE_MONTHS, MAX_AGE_MONTHS }

export type AgeBand = 'BAND_1' | 'BAND_2' | 'BAND_3'

export type ModuleKey = 'LOOK' | 'HELLO' | 'PEEK' | 'SORT_PLUS' | 'FOLLOW_PLUS'

/** Ordered module sequence per band. See design spec §3 for the clinical
 *  reasoning behind why SORT_PLUS and FOLLOW_PLUS are excluded where they
 *  are — in short, a diluted version of a module that can't be
 *  distinguished from age-appropriate difficulty produces an
 *  uninterpretable signal, which is worse than honestly omitting it. */
export const MODULE_SEQUENCE_BY_BAND: Readonly<Record<AgeBand, readonly ModuleKey[]>> = {
  BAND_1: ['LOOK', 'HELLO', 'PEEK'],
  BAND_2: ['LOOK', 'HELLO', 'PEEK', 'SORT_PLUS'],
  BAND_3: ['LOOK', 'HELLO', 'PEEK', 'SORT_PLUS', 'FOLLOW_PLUS'],
}

/**
 * Determines the age band for a child. Throws below MIN_AGE_MONTHS —
 * never silently clamps a below-floor age, unlike the old class's
 * constructor. Clamps above MAX_AGE_MONTHS to BAND_3.
 */
export function getAgeBand(ageMonths: number): AgeBand {
  if (ageMonths < MIN_AGE_MONTHS) {
    throw new RangeError(
      `getAgeBand: ageMonths (${ageMonths}) is below the supported minimum of ${MIN_AGE_MONTHS}. ` +
        `This must be validated before a child reaches the game engine — see design spec §4.`
    )
  }
  const clamped = Math.min(ageMonths, MAX_AGE_MONTHS)
  if (clamped < 30) return 'BAND_1'
  if (clamped < 42) return 'BAND_2'
  return 'BAND_3'
}

/** Ordered list of modules that run for this age. */
export function getModuleSequence(ageMonths: number): readonly ModuleKey[] {
  return MODULE_SEQUENCE_BY_BAND[getAgeBand(ageMonths)]
}

/**
 * Per-module numeric parameters (target sizes, response windows, trial
 * counts, etc.) are intentionally NOT implemented here — design spec §5
 * explicitly defers those to each module's own design spec (sub-projects
 * 3–7, not yet brainstormed). Fabricating plausible-looking numbers now
 * would present undesigned parameters as decided, which is the kind of
 * unfounded clinical claim this project has a standing rule against.
 *
 * What IS implemented and tested now: the validation contract. Calling
 * this with a module that isn't in this age's sequence is a programmer
 * error and throws — it does not silently fall back to a default.
 */
export interface ModuleConfigStub {
  moduleKey: ModuleKey
  ageBand: AgeBand
}

export function getModuleConfig(moduleKey: ModuleKey, ageMonths: number): ModuleConfigStub {
  const ageBand = getAgeBand(ageMonths)
  const sequence = MODULE_SEQUENCE_BY_BAND[ageBand]
  if (!sequence.includes(moduleKey)) {
    throw new Error(
      `getModuleConfig: module "${moduleKey}" is not available for ageMonths=${ageMonths} (${ageBand}). ` +
        `Calling with a module outside the band's sequence is a programmer error, not a runtime fallback.`
    )
  }
  return { moduleKey, ageBand }
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PER-MODULE CONFIG GETTERS (Stage B) — spec references:
 *   docs/superpowers/specs/2026-07-18-module-a-look-design.md
 *   docs/superpowers/specs/2026-07-18-module-c-peek-design.md
 *   docs/superpowers/specs/2026-07-18-module-b-hello-design.md
 *   docs/superpowers/specs/2026-07-18-module-d-sortplus-design.md
 *   docs/superpowers/specs/2026-07-18-module-e-followplus-design.md
 *
 * Each wraps getModuleConfig() first — validation/throw behavior for free,
 * not duplicated — then returns the module's real per-band parameters.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Module A: LOOK ──────────────────────────────────────────────────────

export interface LookModuleConfig {
  numCharacters: 2 | 3 | 4
  nameCallSalience: 'high' | 'medium' | 'low'
  starSizePx: number
  responseWindowMs: number
  initiationWindowMs: number
  nameCallIntervalMsRange: [number, number]
  jointAttentionIntervalMsRange: [number, number]
  trialCounts: { nameCall: number; jointAttention: number }
}

export function getLookConfig(ageMonths: number): LookModuleConfig {
  const ageBand = getModuleConfig('LOOK', ageMonths).ageBand
  // initiationWindowMs and both interval ranges are constant across bands —
  // see the design spec §4 for why (pacing properties of the game, not the
  // child's processing speed, which is what the response window varies for).
  const shared = {
    initiationWindowMs: 1500,
    nameCallIntervalMsRange: [8000, 12000] as [number, number],
    jointAttentionIntervalMsRange: [4000, 5000] as [number, number],
  }
  switch (ageBand) {
    case 'BAND_1':
      return { ...shared, numCharacters: 2, nameCallSalience: 'high', starSizePx: 90, responseWindowMs: 4000, trialCounts: { nameCall: 5, jointAttention: 3 } }
    case 'BAND_2':
      return { ...shared, numCharacters: 3, nameCallSalience: 'medium', starSizePx: 60, responseWindowMs: 3000, trialCounts: { nameCall: 6, jointAttention: 6 } }
    case 'BAND_3':
      return { ...shared, numCharacters: 4, nameCallSalience: 'low', starSizePx: 40, responseWindowMs: 2500, trialCounts: { nameCall: 7, jointAttention: 8 } }
  }
}

// ── Module C: PEEK ──────────────────────────────────────────────────────

export interface PeekModuleConfig {
  numCups: 2 | 3
  numShufflesRange: [number, number]
  objectSalience: 'high' | 'standard'
  confusionIntensity: 'exaggerated' | 'moderate' | 'subtle'
  checkingWindowMs: number
  cupResponseWindowMs: number
  maxCupTaps: number
  trialCounts: { plain: number; referencing: number }
}

export function getPeekConfig(ageMonths: number): PeekModuleConfig {
  const ageBand = getModuleConfig('PEEK', ageMonths).ageBand
  switch (ageBand) {
    case 'BAND_1':
      return { numCups: 2, numShufflesRange: [0, 1], objectSalience: 'high', confusionIntensity: 'exaggerated', checkingWindowMs: 3000, cupResponseWindowMs: 5000, maxCupTaps: 4, trialCounts: { plain: 4, referencing: 2 } }
    case 'BAND_2':
      return { numCups: 3, numShufflesRange: [1, 2], objectSalience: 'standard', confusionIntensity: 'moderate', checkingWindowMs: 2500, cupResponseWindowMs: 4000, maxCupTaps: 6, trialCounts: { plain: 4, referencing: 4 } }
    case 'BAND_3':
      return { numCups: 3, numShufflesRange: [2, 3], objectSalience: 'standard', confusionIntensity: 'subtle', checkingWindowMs: 2000, cupResponseWindowMs: 3000, maxCupTaps: 6, trialCounts: { plain: 3, referencing: 7 } }
  }
}

// ── Module B: HELLO ─────────────────────────────────────────────────────

export interface HelloModuleConfig {
  maxSequenceSteps: 1 | 2 | 3
  widgetChoiceCount: 2 | 3
  novelGestureFromTrial: number | null
  responseWindowMs: number
  trialCount: number
}

export function getHelloConfig(ageMonths: number): HelloModuleConfig {
  const ageBand = getModuleConfig('HELLO', ageMonths).ageBand
  switch (ageBand) {
    case 'BAND_1':
      return { maxSequenceSteps: 1, widgetChoiceCount: 2, novelGestureFromTrial: null, responseWindowMs: 5000, trialCount: 5 }
    case 'BAND_2':
      return { maxSequenceSteps: 2, widgetChoiceCount: 2, novelGestureFromTrial: 4, responseWindowMs: 4000, trialCount: 8 }
    case 'BAND_3':
      return { maxSequenceSteps: 3, widgetChoiceCount: 3, novelGestureFromTrial: 4, responseWindowMs: 3000, trialCount: 10 }
  }
}

// ── Module D: SORT_PLUS ─────────────────────────────────────────────────

export interface SortPlusModuleConfig {
  hasRuleSwitch: boolean
  objectsPerPhase: number[]
  /** Duration in ms for one object's fall, matching the existing
   *  Module3_Sort.ts tween convention (a duration, not a px/sec rate —
   *  the design spec used `fallSpeedPxPerSec`; renamed here to match
   *  what the mechanic being reused actually consumes). Grounded in the
   *  already-tuned old AgeConfig values (4000ms younger / 3000ms older),
   *  not invented fresh. */
  fallSpeedMs: number
  ruleSwitchCheckWindowMs: number // only meaningful when hasRuleSwitch is true
}

export function getSortPlusConfig(ageMonths: number): SortPlusModuleConfig {
  const ageBand = getModuleConfig('SORT_PLUS', ageMonths).ageBand
  switch (ageBand) {
    case 'BAND_1':
      // Unreachable — SORT_PLUS isn't in Band 1's sequence, so
      // getModuleConfig above already threw before this point.
      throw new Error('getSortPlusConfig: unreachable — BAND_1 does not run SORT_PLUS')
    case 'BAND_2':
      return { hasRuleSwitch: false, objectsPerPhase: [8], fallSpeedMs: 4000, ruleSwitchCheckWindowMs: 0 }
    case 'BAND_3':
      return { hasRuleSwitch: true, objectsPerPhase: [5, 5], fallSpeedMs: 3000, ruleSwitchCheckWindowMs: 2500 }
  }
}

// ── Module E: FOLLOW_PLUS ───────────────────────────────────────────────

export interface FollowPlusModuleConfig {
  trials: number
  sequenceLengthRange: [number, number]
  responseWindowMs: number
  modifiedTrialProportion: number
  socialCheckWindowMs: number
}

export function getFollowPlusConfig(ageMonths: number): FollowPlusModuleConfig {
  const ageBand = getModuleConfig('FOLLOW_PLUS', ageMonths).ageBand
  if (ageBand !== 'BAND_3') {
    // Unreachable for the same reason as getSortPlusConfig above —
    // FOLLOW_PLUS only exists in BAND_3's sequence.
    throw new Error(`getFollowPlusConfig: unreachable — ${ageBand} does not run FOLLOW_PLUS`)
  }
  // Grounded in the existing older-band AgeConfig values (trials, maxSequenceLength,
  // responseWindowMs, modifiedTrialProportion) — see design spec §2. Only
  // socialCheckWindowMs is genuinely new (the Buddy-pause mechanic didn't exist before).
  return { trials: 8, sequenceLengthRange: [3, 4], responseWindowMs: 5000, modifiedTrialProportion: 0.5, socialCheckWindowMs: 1500 }
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * OLD INTERFACE — retained for Modules 1–4 until they're replaced.
 * ─────────────────────────────────────────────────────────────────────────
 */

export class AgeAdapter {
  private ageMonths: number

  constructor(ageMonths: number) {
    this.ageMonths = Math.max(24, Math.min(60, ageMonths))
  }

  isYoungerGroup(): boolean {
    return this.ageMonths < 48 // under 4 years
  }

  getConfig(): AgeConfig {
    if (this.isYoungerGroup()) {
      // Ages 3–4 (36–48 months)
      return {
        gaze: {
          trials: 8,
          gazeBeforeCardsMs: 3000, // Buddy looks 3s before cards appear
          responseWindowMs: 6000,
          buddyLookDurationMs: 4000,
        },
        imitate: {
          trials: 6,
          maxSequenceLength: 2,
          demonstrationPauseMs: 1000,
          responseWindowMs: 6000,
          startingLength: 1,
        },
        sort: {
          objectCount: 9,
          fallSpeedMs: 4000,
          targetRadius: 70,
          objectSize: 48,
        },
        follow: {
          trials: 6,
          maxSequenceLength: 3,
          litDurationMs: 700,
          betweenFlashMs: 300,
          responseWindowMs: 7000,
          modifiedTrialProportion: 0.33,
        },
        inactivityCallMs: 10000,
        inactivityAdvanceMs: 30000,
      }
    } else {
      // Ages 4–5 (48–60 months)
      return {
        gaze: {
          trials: 8,
          gazeBeforeCardsMs: 0, // cards appear simultaneously with Buddy's look
          responseWindowMs: 4000,
          buddyLookDurationMs: 3000,
        },
        imitate: {
          trials: 6,
          maxSequenceLength: 3,
          demonstrationPauseMs: 700,
          responseWindowMs: 5000,
          startingLength: 2,
        },
        sort: {
          objectCount: 12,
          fallSpeedMs: 3000,
          targetRadius: 60,
          objectSize: 42,
        },
        follow: {
          trials: 8,
          maxSequenceLength: 4,
          litDurationMs: 500,
          betweenFlashMs: 200,
          responseWindowMs: 5000,
          modifiedTrialProportion: 0.5,
        },
        inactivityCallMs: 10000,
        inactivityAdvanceMs: 30000,
      }
    }
  }
}
