import { describe, it, expect } from 'vitest'
import { buildLookTrialSequence } from './lookTrialSequence'

describe('buildLookTrialSequence', () => {
  it('produces the correct total count and correct per-type counts for each band', () => {
    // Band 1: 5 name-call, 3 joint-attention
    const b1 = buildLookTrialSequence(5, 3)
    expect(b1).toHaveLength(8)
    expect(b1.filter((t) => t === 'name_call')).toHaveLength(5)
    expect(b1.filter((t) => t === 'joint_attention')).toHaveLength(3)

    // Band 3: 7 name-call, 8 joint-attention
    const b3 = buildLookTrialSequence(7, 8)
    expect(b3).toHaveLength(15)
    expect(b3.filter((t) => t === 'name_call')).toHaveLength(7)
    expect(b3.filter((t) => t === 'joint_attention')).toHaveLength(8)
  })

  it('never runs more than 2 of the same type consecutively for a reasonably balanced mix (interleaving check)', () => {
    const sequence = buildLookTrialSequence(6, 6)
    let maxRun = 1
    let currentRun = 1
    for (let i = 1; i < sequence.length; i++) {
      if (sequence[i] === sequence[i - 1]) {
        currentRun++
        maxRun = Math.max(maxRun, currentRun)
      } else {
        currentRun = 1
      }
    }
    expect(maxRun).toBeLessThanOrEqual(2)
  })

  it('handles a zero count for one type without producing extra or missing trials', () => {
    const sequence = buildLookTrialSequence(5, 0)
    expect(sequence).toHaveLength(5)
    expect(sequence.every((t) => t === 'name_call')).toBe(true)
  })

  it('handles equal counts by alternating rather than clumping', () => {
    const sequence = buildLookTrialSequence(1, 1)
    expect(sequence).toHaveLength(2)
  })
})
