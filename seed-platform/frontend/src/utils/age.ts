/**
 * Age calculation utilities.
 * All ages relative to the current date at call time.
 */

export interface AgeResult {
  totalMonths: number
  years: number
  months: number
  /** "3 years 2 months" */
  display: string
  /** "3y 2m" — compact form for tight spaces */
  compact: string
}

export function calculateAge(dateOfBirth: string): AgeResult {
  const dob = new Date(dateOfBirth)
  const now = new Date()

  let totalMonths =
    (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())

  // Adjust if we haven't passed the day of birth this month
  if (now.getDate() < dob.getDate()) totalMonths -= 1
  if (totalMonths < 0) totalMonths = 0

  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  const display =
    years > 0
      ? months > 0
        ? `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`
        : `${years} year${years !== 1 ? 's' : ''}`
      : `${months} month${months !== 1 ? 's' : ''}`

  const compact = years > 0 ? `${years}y ${months}m` : `${months}m`

  return { totalMonths, years, months, display, compact }
}

/** Format a UTC ISO date string as a locale date string (e.g. "15 Jan 2025"). */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Duration in minutes from two ISO strings. */
export function durationMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}
