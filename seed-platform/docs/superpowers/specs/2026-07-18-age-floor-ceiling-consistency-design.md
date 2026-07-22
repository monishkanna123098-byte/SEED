# Age Floor/Ceiling Consistency — Design Spec

Status: Design complete, proceeding to implementation (scope confirmed against evidence, not judgment call — see §1)
Sub-project 2 of 9 in the SEED game engine rebuild (inserted after AgeAdapter; see `docs/RESEARCH.md` §5.6–5.7 and the AgeAdapter spec for original sequencing)
Depends on: AgeAdapter redesign (sub-project 1) — this fix exists because that work exposed how far the drift had spread
Blocks: nothing downstream; this is a correctness fix, not new capability

## 1. Problem

Sub-project 1 fixed `AgeAdapter.ts` to correctly support 18 months as SEED's floor. Investigating whether that fix actually takes effect end-to-end surfaced that the floor (and, separately, the ceiling) is defined independently in at least nine places across three runtimes, and several of them disagree:

**Floor (18 months) — wrong or missing in 6 places:**

| Location | Current state |
|---|---|
| `frontend/AddChildPage.tsx` | Correct (18mo), but client-side only |
| `backend/children.routes.ts` | **No floor check at all.** Code comment explicitly says "18 months minimum is enforced by the wizard, not the API" — a documented, deliberate gap |
| `backend/screening.routes.ts` (`upload-video`) | Wrong — `min: 24` |
| `backend/screening.routes.ts` (`game-complete`) | Wrong — `min: 24` |
| `analysis-engine/main.py` (`GameAnalysisRequest`) | Wrong — `ge=24` |
| `analysis-engine/main.py` (`FusionRequest`) | Wrong — `ge=24` |
| `analysis-engine/main.py` (`/analyze/video` form param) | Wrong — `ge=24` |

**Ceiling (60 months / 5 years) — wrong in 1 place, confirmed against 3 independent agreeing sources:**

| Source | States |
|---|---|
| Privacy Policy (`PrivacyPage.tsx`) | 5 years |
| Landing page (`LandingSections.tsx`) | 5 years |
| `Step3_Modality.tsx` age-band copy | "3–5 years" |
| `AddChildPage.tsx` | **6 years** (`MAX_MONTHS = 72`) — the lone outlier, in both its enforced logic and its own copy |

Three independent, unrelated sources agree on 5 years (60 months). Exactly one disagrees. This is not treated as an open question requiring a product decision — it's a stale value in one file that never got updated when the other three were set, and it's fixed to match.

**Root cause, not just symptom:** this isn't really "several numbers happen to be wrong." It's that no runtime has a single canonical definition of the floor/ceiling — every file that needs the value defined its own literal. Fixing the specific wrong numbers without addressing that would leave the exact structural vulnerability that caused this bug in the first place. See §3.

## 2. Approach: Defense-in-Depth, Correctly Layered

Per `.agents/skills/systematic-debugging/defense-in-depth.md`: validating at multiple layers is the *goal*, not the bug. The actual bug is that Layer 1 (entry point — child creation) has no check at all, and Layer 2 (business logic — screening submission) has the wrong threshold. Mapping the data flow:

1. **Layer 1 — Entry point** (`children.routes.ts`, child creation): currently absent. This is where a child's age first enters the system; it should be the first and strictest checkpoint. **Being added, not just fixed** — there is no existing check to correct.
2. **Layer 2 — Business logic** (`screening.routes.ts` ×2, `analysis-engine/main.py` ×3): currently present but at the wrong threshold (24 instead of 18). **Corrected.**
3. **Layer 3 — Environment guard** (`AgeAdapter.getAgeBand()`, game-engine runtime): already throws below 18 months as of sub-project 1. **No new work — already covers this layer.**
4. **Layer 4 — Debug instrumentation**: not warranted here. This isn't a mysterious bug needing forensic logging; the fix is a known threshold correction. Adding logging infrastructure for this would be scope creep relative to what the defect actually needs.

## 3. Single Source of Truth Per Runtime

Three runtimes, three independent constant definitions (cross-runtime unification via shared schema/codegen would be a disproportionate infra investment for this fix) — but *within* each runtime, one canonical definition, not several:

- **Frontend (TS):** new `frontend/src/utils/ageConstants.ts` exports `MIN_AGE_MONTHS = 18`, `MAX_AGE_MONTHS = 60`. `AgeAdapter.ts` is changed to import and re-export these instead of defining them locally (keeps its existing public API stable — nothing importing from `AgeAdapter.ts` needs to change). `AddChildPage.tsx` imports directly from `ageConstants.ts`, replacing its local `MIN_MONTHS`/`MAX_MONTHS` (which also fixes the 72→60 ceiling bug in the same stroke).
- **Backend (TS):** new `backend/src/utils/ageConstants.ts` (matches the existing flat convention in that directory — `email.ts`, `jwt.ts`, `logger.ts`, etc.) exports the same two constants. Imported by `children.routes.ts` (new usage) and both `screening.routes.ts` validators (replacing their hardcoded `24`s).
- **Python (analysis-engine):** new `analysis-engine/constants.py` (no existing config/constants module to extend — confirmed by inspection) exports the same two constants. Imported by all three Pydantic `Field` definitions in `main.py`.

**Accepted residual risk, stated explicitly rather than silently left implicit:** these three files can still drift from each other, since TS and Python processes can't share one literal across a process/language boundary without infra (a shared JSON schema, codegen step, or similar) that's disproportionate to this fix. Mitigation: each of the three files gets a comment pointing at the other two by path, so a future change to one is a prompt to check the others, even though nothing enforces it automatically. This is a deliberate, bounded trade-off, not an oversight.

## 4. Exact Changes

1. `frontend/src/utils/ageConstants.ts` — new file, `MIN_AGE_MONTHS = 18`, `MAX_AGE_MONTHS = 60`
2. `frontend/src/game/utils/AgeAdapter.ts` — import + re-export from (1) instead of local `const`
3. `frontend/src/pages/parent/children/AddChildPage.tsx` — import from (1); remove local `MIN_MONTHS`/`MAX_MONTHS = 72`; fix `MAX_MONTHS` usage to the imported 60; fix the two "6 years" copy strings to "5 years"
4. `backend/src/utils/ageConstants.ts` — new file, same two constants
5. `backend/src/routes/children.routes.ts` — add a floor check (import `MIN_AGE_MONTHS` from (4)) in the existing `dateOfBirth` custom validator. **Not touched:** the existing ceiling check in this file (8 years / 96 months) is a deliberately looser sanity bound, not the same value as the strict product ceiling — it exists to catch obviously-wrong dates of birth, not to enforce the 5-year screening range. Left as-is; only the missing floor is added.
6. `backend/src/routes/screening.routes.ts` — both `childAgeMonths` validators (`upload-video`, `game-complete`): `min: 24` → import and use `MIN_AGE_MONTHS` from (4)
7. `analysis-engine/constants.py` — new file, same two constants
8. `analysis-engine/main.py` — all three `Field(ge=24, le=60)` occurrences → import and use `MIN_AGE_MONTHS`/`MAX_AGE_MONTHS` from (7)

## 5. Verification Plan

Following the same standard as sub-project 1 — real executed evidence, not assertion.

- **Frontend:** extend the existing `AgeAdapter.test.ts` (or a small new `ageConstants.test.ts`) to assert the re-exported constants still equal 18/60; add a boundary test for `AddChildPage`'s validation function at 17, 18, 71, 72, 73 months (the old and new ceiling boundary).
- **Backend:** no test framework currently exists here (checked — no `test` script, no `.test.ts` files). Rather than stand up full route-level integration tests requiring a live Postgres instance (disproportionate to what this fix needs), extract the age-range check in each validator into a small pure function and unit-test that directly with vitest, added as a devDependency the same way it was for frontend. Boundary values: 17, 18, 60, 61 for the two `screening.routes.ts` checks (which have both bounds at 18/60). For the new `children.routes.ts` floor check specifically: 17, 18 (its own ceiling is the pre-existing, unchanged 96-month sanity bound, not 60 — testing 60/61 there would assert nothing meaningful; a regression check at 96/97 confirms that unrelated bound wasn't accidentally touched).
- **Python:** no test framework currently exists (`pytest` absent from `requirements.txt`). Add `pytest` as a dev dependency; write boundary tests instantiating `GameAnalysisRequest` and `FusionRequest` directly with `child_age_months` at 17, 18, 60, 61 and asserting which raise `ValidationError`.
- **Type-check / lint:** run `npm run type-check` (frontend, backend) after changes; confirm no *new* errors beyond the two pre-existing unrelated ones already documented in the sub-project 1 commit.

## 6. Explicitly Out of Scope

- Cross-runtime constant unification (shared schema/codegen) — see §3, accepted residual risk.
- A hard age-gate inside `Step3_Modality.tsx` blocking GAME modality by age — considered and rejected. Once `children.routes.ts` enforces the floor at creation (this spec) and `AgeAdapter` throws for any out-of-range age that somehow still reaches it (sub-project 1), a third UI-level gate at modality selection is redundant defense for a case that can no longer occur through normal use. Two layers is sufficient; a third here is over-engineering.
- Full Express route integration tests with a live database — see §5, disproportionate to the actual defect.
