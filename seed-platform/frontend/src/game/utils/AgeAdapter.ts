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
