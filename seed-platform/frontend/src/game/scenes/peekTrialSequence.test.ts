import { describe, it, expect } from 'vitest'
import { buildPeekTrialSequence } from './peekTrialSequence'

describe('buildPeekTrialSequence', () => {
  it('produces correct total and per-type counts for each band', () => {
    const b1 = buildPeekTrialSequence(4, 2)
    expect(b1).toHaveLength(6)
    expect(b1.filter((t) => t === 'plain')).toHaveLength(4)
    expect(b1.filter((t) => t === 'referencing')).toHaveLength(2)

    const b3 = buildPeekTrialSequence(3, 7)
    expect(b3).toHaveLength(10)
    expect(b3.filter((t) => t === 'plain')).toHaveLength(3)
    expect(b3.filter((t) => t === 'referencing')).toHaveLength(7)
  })

  it('interleaves rather than clumping all of one type at the start or end', () => {
    const sequence = buildPeekTrialSequence(4, 4)
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
})
