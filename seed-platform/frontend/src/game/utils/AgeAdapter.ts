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

/** Below this age, SEED does not screen. Callers must gate entry before
 *  reaching the game engine (see design spec §4) — this constant is what
 *  they should check against. */
export const MIN_AGE_MONTHS = 18

/** Above this age, sessions are clamped to Band 3 rather than rejected —
 *  callers that care whether clamping occurred check ageMonths against
 *  this constant directly; AgeAdapter's own return values carry no tag. */
export const MAX_AGE_MONTHS = 60

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
