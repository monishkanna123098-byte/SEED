/**
 * Canonical age floor/ceiling for SEED's screening range, frontend runtime.
 *
 * This is the ONLY place these two numbers should be defined in the
 * frontend package. AgeAdapter.ts and AddChildPage.tsx both import from
 * here rather than defining their own copies — that duplication (three
 * independently-defined "18"s and a stale "72" that disagreed with all
 * of them) is exactly the bug this file exists to prevent from recurring.
 *
 * Equivalent canonical files exist in the other two runtimes, which
 * cannot import this one directly across the process/language boundary:
 *   - backend/src/utils/ageConstants.ts
 *   - analysis-engine/constants.py
 * If you change the values here, check those two as well.
 *
 * See: docs/superpowers/specs/2026-07-18-age-floor-ceiling-consistency-design.md
 */

/** SEED does not screen below this age. */
export const MIN_AGE_MONTHS = 18

/** SEED does not screen above this age (5 years). Confirmed against the
 *  Privacy Policy, the landing page, and Step3_Modality's own age-band
 *  copy, all of which independently agree on 5 years. */
export const MAX_AGE_MONTHS = 60
