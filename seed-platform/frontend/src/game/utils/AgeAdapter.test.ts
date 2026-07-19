import { describe, it, expect } from 'vitest'
import {
  getAgeBand,
  getModuleSequence,
  getModuleConfig,
  getLookConfig,
  getPeekConfig,
  getHelloConfig,
  getSortPlusConfig,
  getFollowPlusConfig,
  MIN_AGE_MONTHS,
  MAX_AGE_MONTHS,
  MODULE_SEQUENCE_BY_BAND,
} from './AgeAdapter'

// Boundary values called out explicitly in design spec §7:
// 17, 18, 29, 30, 41, 42, 60, 61 months. This is where the old
// AgeAdapter's silent clamp bug lived and where a new off-by-one
// would most easily hide, so these are asserted individually rather
// than via a single parameterized "typical age per band" case.

describe('getAgeBand', () => {
  it('throws below MIN_AGE_MONTHS (17 months)', () => {
    expect(() => getAgeBand(17)).toThrow(RangeError)
  })

  it('never silently clamps a below-floor age (0 months also throws)', () => {
    expect(() => getAgeBand(0)).toThrow(RangeError)
  })

  it('18 months (the floor) is BAND_1', () => {
    expect(getAgeBand(18)).toBe('BAND_1')
  })

  it('29 months is BAND_1 (just below the Band 1/2 boundary)', () => {
    expect(getAgeBand(29)).toBe('BAND_1')
  })

  it('30 months is BAND_2 (the Band 1/2 boundary itself)', () => {
    expect(getAgeBand(30)).toBe('BAND_2')
  })

  it('41 months is BAND_2 (just below the Band 2/3 boundary)', () => {
    expect(getAgeBand(41)).toBe('BAND_2')
  })

  it('42 months is BAND_3 (the Band 2/3 boundary itself)', () => {
    expect(getAgeBand(42)).toBe('BAND_3')
  })

  it('60 months (the stated ceiling) is BAND_3', () => {
    expect(getAgeBand(60)).toBe('BAND_3')
  })

  it('61 months clamps to BAND_3 rather than throwing', () => {
    expect(getAgeBand(61)).toBe('BAND_3')
  })

  it('a large out-of-range age (200 months) still clamps to BAND_3, not throw', () => {
    expect(getAgeBand(200)).toBe('BAND_3')
  })
})

describe('MIN_AGE_MONTHS / MAX_AGE_MONTHS constants', () => {
  it('exposes 18 and 60 as the documented floor and ceiling', () => {
    expect(MIN_AGE_MONTHS).toBe(18)
    expect(MAX_AGE_MONTHS).toBe(60)
  })

  it('re-exports the same values as the canonical utils/ageConstants.ts (regression check for the sub-project 2 refactor)', async () => {
    const canonical = await import('../../utils/ageConstants')
    expect(MIN_AGE_MONTHS).toBe(canonical.MIN_AGE_MONTHS)
    expect(MAX_AGE_MONTHS).toBe(canonical.MAX_AGE_MONTHS)
  })
})

describe('getModuleSequence', () => {
  it('Band 1 (18-29m) runs exactly LOOK, HELLO, PEEK — no SORT_PLUS or FOLLOW_PLUS', () => {
    expect(getModuleSequence(20)).toEqual(['LOOK', 'HELLO', 'PEEK'])
  })

  it('Band 2 (30-41m) adds SORT_PLUS but not FOLLOW_PLUS', () => {
    expect(getModuleSequence(35)).toEqual(['LOOK', 'HELLO', 'PEEK', 'SORT_PLUS'])
  })

  it('Band 3 (42-60m) runs all five modules', () => {
    expect(getModuleSequence(50)).toEqual([
      'LOOK',
      'HELLO',
      'PEEK',
      'SORT_PLUS',
      'FOLLOW_PLUS',
    ])
  })

  it('boundary ages resolve to the correct sequence, not just the correct band', () => {
    // A band-assignment bug wouldn't necessarily surface unless the
    // sequence itself is checked at the boundary, per spec §7.
    expect(getModuleSequence(29)).not.toContain('SORT_PLUS')
    expect(getModuleSequence(30)).toContain('SORT_PLUS')
    expect(getModuleSequence(41)).not.toContain('FOLLOW_PLUS')
    expect(getModuleSequence(42)).toContain('FOLLOW_PLUS')
  })

  it('throws below the floor rather than returning a sequence', () => {
    expect(() => getModuleSequence(17)).toThrow(RangeError)
  })
})

describe('MODULE_SEQUENCE_BY_BAND', () => {
  it('matches design spec §3 exactly for all three bands', () => {
    expect(MODULE_SEQUENCE_BY_BAND.BAND_1).toEqual(['LOOK', 'HELLO', 'PEEK'])
    expect(MODULE_SEQUENCE_BY_BAND.BAND_2).toEqual(['LOOK', 'HELLO', 'PEEK', 'SORT_PLUS'])
    expect(MODULE_SEQUENCE_BY_BAND.BAND_3).toEqual([
      'LOOK',
      'HELLO',
      'PEEK',
      'SORT_PLUS',
      'FOLLOW_PLUS',
    ])
  })
})

describe('getModuleConfig', () => {
  it('returns moduleKey and ageBand for a module that is valid at this age', () => {
    expect(getModuleConfig('LOOK', 20)).toEqual({ moduleKey: 'LOOK', ageBand: 'BAND_1' })
  })

  it('throws for SORT_PLUS at a Band 1 age (18-29m) — the exact bug this validation exists to catch', () => {
    expect(() => getModuleConfig('SORT_PLUS', 20)).toThrow(/not available/)
  })

  it('throws for FOLLOW_PLUS at a Band 2 age (30-41m)', () => {
    expect(() => getModuleConfig('FOLLOW_PLUS', 35)).toThrow(/not available/)
  })

  it('does not throw for FOLLOW_PLUS at a Band 3 age (42-60m)', () => {
    expect(() => getModuleConfig('FOLLOW_PLUS', 50)).not.toThrow()
  })

  it('propagates the floor error rather than a validation error when age itself is invalid', () => {
    expect(() => getModuleConfig('LOOK', 10)).toThrow(RangeError)
  })
})

// ─── Stage B: per-module config getters ─────────────────────────────────
// Not exhaustive re-tests of every field's exact value (that's what the
// design specs document) — this checks each getter returns the right
// shape per band, and that the two modules restricted to a subset of
// bands (SORT_PLUS, FOLLOW_PLUS) actually throw outside their bands
// rather than silently returning something.

describe('getLookConfig', () => {
  it('scales numCharacters up with age band (2 -> 3 -> 4)', () => {
    expect(getLookConfig(20).numCharacters).toBe(2)
    expect(getLookConfig(35).numCharacters).toBe(3)
    expect(getLookConfig(50).numCharacters).toBe(4)
  })

  it('keeps initiationWindowMs and interval ranges constant across bands, per design spec §4', () => {
    const b1 = getLookConfig(20)
    const b3 = getLookConfig(50)
    expect(b1.initiationWindowMs).toBe(b3.initiationWindowMs)
    expect(b1.nameCallIntervalMsRange).toEqual(b3.nameCallIntervalMsRange)
    expect(b1.jointAttentionIntervalMsRange).toEqual(b3.jointAttentionIntervalMsRange)
  })

  it('throws below the floor, same as getModuleConfig', () => {
    expect(() => getLookConfig(10)).toThrow(RangeError)
  })
})

describe('getPeekConfig', () => {
  it('increases referencing-trial proportion with age band', () => {
    expect(getPeekConfig(20).trialCounts.referencing).toBe(2)
    expect(getPeekConfig(35).trialCounts.referencing).toBe(4)
    expect(getPeekConfig(50).trialCounts.referencing).toBe(7)
  })

  it('only varies objectSalience for Band 1, per design spec §5', () => {
    expect(getPeekConfig(20).objectSalience).toBe('high')
    expect(getPeekConfig(35).objectSalience).toBe('standard')
    expect(getPeekConfig(50).objectSalience).toBe('standard')
  })
})

describe('getHelloConfig', () => {
  it('Band 1 has no sequence and no novel-gesture introduction', () => {
    const b1 = getHelloConfig(20)
    expect(b1.maxSequenceSteps).toBe(1)
    expect(b1.novelGestureFromTrial).toBeNull()
  })

  it('Bands 2 and 3 introduce novel gestures from trial 4', () => {
    expect(getHelloConfig(35).novelGestureFromTrial).toBe(4)
    expect(getHelloConfig(50).novelGestureFromTrial).toBe(4)
  })
})

describe('getSortPlusConfig', () => {
  it('throws for Band 1 ages — SORT_PLUS is not in Band 1\'s sequence', () => {
    expect(() => getSortPlusConfig(20)).toThrow()
  })

  it('Band 2 has no rule switch, single phase', () => {
    const cfg = getSortPlusConfig(35)
    expect(cfg.hasRuleSwitch).toBe(false)
    expect(cfg.objectsPerPhase).toEqual([8])
  })

  it('Band 3 has a rule switch across two 5-object phases', () => {
    const cfg = getSortPlusConfig(50)
    expect(cfg.hasRuleSwitch).toBe(true)
    expect(cfg.objectsPerPhase).toEqual([5, 5])
  })
})

describe('getFollowPlusConfig', () => {
  it('throws for Band 1 ages', () => {
    expect(() => getFollowPlusConfig(20)).toThrow()
  })

  it('throws for Band 2 ages — FOLLOW_PLUS only runs on Band 3', () => {
    expect(() => getFollowPlusConfig(35)).toThrow()
  })

  it('Band 3 returns the config grounded in the old older-band values (8 trials, 0.5 modification rate)', () => {
    const cfg = getFollowPlusConfig(50)
    expect(cfg.trials).toBe(8)
    expect(cfg.modifiedTrialProportion).toBe(0.5)
  })
})
