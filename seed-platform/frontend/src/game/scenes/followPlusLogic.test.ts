import { describe, it, expect } from 'vitest'
import { sequenceLengthForTrial, buildModifiedFlags, isPerseverativeStep } from './followPlusLogic'

describe('sequenceLengthForTrial', () => {
  it('starts near the range minimum for early trials and ramps toward the maximum', () => {
    const first = sequenceLengthForTrial(0, 8, [3, 4])
    const last = sequenceLengthForTrial(7, 8, [3, 4])
    expect(first).toBe(3)
    expect(last).toBe(4)
  })

  it('never exceeds the range maximum regardless of trial index', () => {
    for (let i = 0; i < 20; i++) {
      expect(sequenceLengthForTrial(i, 8, [3, 4])).toBeLessThanOrEqual(4)
    }
  })
})

describe('buildModifiedFlags', () => {
  it('produces exactly round(n * proportion) true flags', () => {
    const flags = buildModifiedFlags(8, 0.5)
    expect(flags.filter(Boolean)).toHaveLength(4)
    expect(flags).toHaveLength(8)
  })

  it('is deterministic given a fixed rng, for test reproducibility', () => {
    const a = buildModifiedFlags(8, 0.5, () => 0.3)
    const b = buildModifiedFlags(8, 0.5, () => 0.3)
    expect(a).toEqual(b)
  })
})

describe('isPerseverativeStep', () => {
  it('never flags the first step (no prior step to repeat)', () => {
    expect(isPerseverativeStep([1, 1], [1, 2], 0)).toBe(false)
  })

  it('flags a repeated tap when the actual sequence has no repeat there', () => {
    // tapped [1,1] but shown sequence is [1,2] -- child repeated position 1, sequence didn't
    expect(isPerseverativeStep([1, 1], [1, 2], 1)).toBe(true)
  })

  it('does not flag a repeated tap that legitimately matches a repeat in the shown sequence', () => {
    // tapped [1,1], shown [1,1] -- sequence genuinely repeats here, not perseveration
    expect(isPerseverativeStep([1, 1], [1, 1], 1)).toBe(false)
  })

  it('does not flag a tap that is not a repeat at all', () => {
    expect(isPerseverativeStep([1, 2], [1, 2], 1)).toBe(false)
  })
})
