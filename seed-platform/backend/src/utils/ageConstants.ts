/**
 * Canonical age floor/ceiling for SEED's screening range, backend runtime.
 *
 * This is the ONLY place these two numbers should be defined in the
 * backend package. children.routes.ts and screening.routes.ts both
 * import from here.
 *
 * Equivalent canonical files exist in the other two runtimes, which
 * cannot import this one directly across the process/language boundary:
 *   - frontend/src/utils/ageConstants.ts
 *   - analysis-engine/constants.py
 * If you change the values here, check those two as well.
 *
 * See: docs/superpowers/specs/2026-07-18-age-floor-ceiling-consistency-design.md
 */

/** SEED does not screen below this age. */
export const MIN_AGE_MONTHS = 18

/** SEED does not screen above this age (5 years). */
export const MAX_AGE_MONTHS = 60
