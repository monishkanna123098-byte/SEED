/**
 * Pure age-in-months calculation, extracted from children.routes.ts's
 * validator so it can be unit-tested directly without a live Postgres
 * instance (see docs/superpowers/specs/2026-07-18-age-floor-ceiling-consistency-design.md §5).
 */

/** Whole months between a date of birth and `now`. Matches the same
 *  calendar-based counting approach as the frontend's calculateAge
 *  (utils/age.ts) — not a fixed 30-day approximation. */
export function ageInMonths(dateOfBirth: Date, now: Date = new Date()): number {
  let months =
    (now.getFullYear() - dateOfBirth.getFullYear()) * 12 + (now.getMonth() - dateOfBirth.getMonth())
  if (now.getDate() < dateOfBirth.getDate()) {
    months -= 1
  }
  return months
}

/** True if a date of birth falls at or above SEED's screening floor,
 *  as of `now`. Does not check the ceiling — children.routes.ts's
 *  existing ceiling check (8 years / 96 months) is a separate,
 *  deliberately looser sanity bound and is left untouched. */
export function isAtLeastMinimumAge(
  dateOfBirth: Date,
  minAgeMonths: number,
  now: Date = new Date()
): boolean {
  return ageInMonths(dateOfBirth, now) >= minAgeMonths
}
