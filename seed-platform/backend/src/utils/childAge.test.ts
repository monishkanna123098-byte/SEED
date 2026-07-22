import { describe, it, expect } from 'vitest'
import { ageInMonths, isAtLeastMinimumAge } from './childAge'
import { MIN_AGE_MONTHS, MAX_AGE_MONTHS } from './ageConstants'

// Boundary tests per design spec §5: 17, 18 for the new children.routes.ts
// floor check. A fixed reference date is used rather than "now" so these
// tests don't depend on which day they happen to run.

const REFERENCE_NOW = new Date('2026-07-18T00:00:00Z')

function dobMonthsBefore(months: number, now: Date = REFERENCE_NOW): Date {
  const d = new Date(now)
  d.setMonth(d.getMonth() - months)
  return d
}

describe('ageInMonths', () => {
  it('computes 18 months exactly for a dob exactly 18 months before now', () => {
    expect(ageInMonths(dobMonthsBefore(18), REFERENCE_NOW)).toBe(18)
  })

  it('computes 60 months exactly for a dob exactly 60 months before now', () => {
    expect(ageInMonths(dobMonthsBefore(60), REFERENCE_NOW)).toBe(60)
  })

  it('does not round up a partial month (child is 17 months + a few days, not 18)', () => {
    const dob = dobMonthsBefore(18, REFERENCE_NOW)
    dob.setDate(dob.getDate() + 5) // born 5 days later than the exact-18-months mark
    expect(ageInMonths(dob, REFERENCE_NOW)).toBe(17)
  })
})

describe('isAtLeastMinimumAge', () => {
  it('17 months is below MIN_AGE_MONTHS (18) — rejected', () => {
    expect(isAtLeastMinimumAge(dobMonthsBefore(17), MIN_AGE_MONTHS, REFERENCE_NOW)).toBe(false)
  })

  it('18 months (the floor) is accepted — this is the exact case that was previously unenforced server-side', () => {
    expect(isAtLeastMinimumAge(dobMonthsBefore(18), MIN_AGE_MONTHS, REFERENCE_NOW)).toBe(true)
  })

  it('a large age well within range is accepted', () => {
    expect(isAtLeastMinimumAge(dobMonthsBefore(40), MIN_AGE_MONTHS, REFERENCE_NOW)).toBe(true)
  })

  it('does not itself enforce a ceiling — that is children.routes.ts\'s separate, unchanged 96-month sanity bound', () => {
    // 96 months would fail the *ceiling* check in children.routes.ts (unchanged,
    // out of scope for this fix), but isAtLeastMinimumAge only checks the floor
    // and should still return true here — proving the two checks are independent.
    expect(isAtLeastMinimumAge(dobMonthsBefore(96), MIN_AGE_MONTHS, REFERENCE_NOW)).toBe(true)
  })
})

describe('MIN_AGE_MONTHS / MAX_AGE_MONTHS (backend canonical constants)', () => {
  it('matches the values documented in the design spec', () => {
    expect(MIN_AGE_MONTHS).toBe(18)
    expect(MAX_AGE_MONTHS).toBe(60)
  })
})
