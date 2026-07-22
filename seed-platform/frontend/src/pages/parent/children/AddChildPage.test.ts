import { describe, it, expect } from 'vitest'
import { validateDob } from './AddChildPage'

// Boundary tests per design spec §5. The ceiling here is the actual bug:
// this file previously enforced 72 months (6 years), disagreeing with
// the Privacy Policy, the landing page, and Step3_Modality's own copy,
// all of which state 5 years (60 months).

function dobMonthsAgo(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().split('T')[0]
}

describe('validateDob', () => {
  it('17 months is out of range (below the floor)', () => {
    const result = validateDob(dobMonthsAgo(17))
    expect(result?.inRange).toBe(false)
  })

  it('18 months (the floor) is in range', () => {
    const result = validateDob(dobMonthsAgo(18))
    expect(result?.inRange).toBe(true)
  })

  it('60 months (the corrected ceiling) is in range', () => {
    const result = validateDob(dobMonthsAgo(60))
    expect(result?.inRange).toBe(true)
  })

  it('61 months is out of range — this is the exact bug that existed: the old ceiling (72) would have accepted this', () => {
    const result = validateDob(dobMonthsAgo(61))
    expect(result?.inRange).toBe(false)
  })

  it('72 months is out of range under the corrected ceiling (was previously the accepted boundary itself)', () => {
    const result = validateDob(dobMonthsAgo(72))
    expect(result?.inRange).toBe(false)
  })

  it('returns null for an empty dob rather than throwing', () => {
    expect(validateDob('')).toBeNull()
  })
})
