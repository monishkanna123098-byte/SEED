# Module E: FOLLOW_PLUS — Design Spec

Status: Design complete
Sub-project 8 of 9 in the SEED game engine rebuild
Depends on: AgeAdapter (sub-project 1), EventCollector infrastructure (sub-project 3, both generic event types this time)
Blocks: nothing downstream directly

## 1. One More Instance of the Same Problem, Cleanly Resolved This Time

The research's own item 2 already describes the fix for Signal E4 in almost the right shape ("Buddy pauses 1.5s... the child's behavior in this window... is recorded") but still lists "look confused" as one of three observable behaviors alongside "tap Buddy" and "immediately tap the sequence." "Looking confused" is a facial expression on the *child*, which needs a camera to observe — the same gap as Module C's original C3, Module B's B4, and Module D's D5. Unlike those, this one resolves cleanly, because the fix was already built for exactly this: sub-project 3's generic `SocialCheckEvent` has `trigger: 'confusion'` as one of its three anticipated trigger values, defined before this module was designed. Its `action` field (`'tap_buddy' | 'tap_other' | 'no_action'`) already collapses to what's actually observable — "looked confused but didn't tap" and "wasn't confused and didn't tap" are both just `no_action` from a touch-only interface, and that's stated plainly rather than pretended otherwise.

**This only fires on modified trials.** Non-modified trials have nothing to react to, so adding an artificial 1.5s pause to every trial (not just the ones with something to notice) would be exactly the kind of manufactured, non-organic pause point Module B's spec (§1) rejected for a different reason. The pause exists because there's something to potentially notice; forcing it onto trials with nothing to notice buys nothing.

## 2. What the Current Implementation Actually Does — Checked, Not Assumed

`docs/RESEARCH.md`'s audit (§4.4) claimed the current `Module4_Follow.ts` records one `response_time_ms` for the whole response phase, not per step. Confirmed by direct inspection: `tappedSequence.push(index)` (the only place taps are recorded) has no accompanying timestamp capture anywhere in the file — there's a single `response_time_ms` field per trial and nothing per-step. This isn't a bug to patch; it's instrumentation that doesn't exist yet and needs to be built.

**Grounding the new config in what's already tuned, not inventing fresh numbers.** The current older-band config (`AgeAdapter.ts`, ages 4–5 / 48–60m — the closest existing analog to the new Band 3, 42–60m) uses `trials: 8`, `maxSequenceLength: 4`, `responseWindowMs: 5000`, `modifiedTrialProportion: 0.5`. These are retained rather than replaced, since Band 3 only shifted its lower boundary from 48 to 42 months — nothing here suggests these particular numbers were wrong, just that the age-range label around them changed.

## 3. Trial Structure

Only Band 3 runs this module — Bands 1 and 2 were already decided against in the AgeAdapter/floor-ceiling work (sub-projects 1–2), for reasons restated in `docs/RESEARCH.md` §5.2: the two-phase watch-then-detect-change structure *is* the thing being measured, and it isn't reliably interpretable before 36–42 months. Not revisited here.

**Per-trial timeline:**
1. Original sequence shown.
2. Replay shown — identical to the original on non-modified trials; one position secretly changed on modified trials (50% of trials, per §2).
3. **Modified trials only:** Buddy pauses 1.5s; the `social_check` window from §1 opens.
4. Response window opens (5000ms). The child taps circles in sequence. **Per-step, not per-trial, timing is captured here** — this is the actual fix this module exists to make.
5. Trial resolves on completing the sequence length or timing out.

**Sequence length** stays in the "3–4" range the research specifies (not a single fixed number) — implementation should ramp similarly to the existing code's apparent intent (a `divisor`/`span`-based scaling was already present, suggesting length was meant to increase across the session rather than stay fixed; this spec doesn't need to fully re-derive that exact algorithm, just preserve the target range).

## 4. Event Schema

Moving from per-trial to per-step granularity — the same pattern already proven by `ImitateEvent` and used again in Module B's `HelloEvent` (one event per step, `trial_id` shared across steps, `sequence_step`/`sequence_length` giving position):

```typescript
export interface FollowPlusStepEvent {
  type: 'follow_step'
  trial_id: number
  sequence_step: number        // 1-indexed within this trial
  sequence_length: number
  timestamp_ms: number          // when this tap occurred
  latency_ms: number            // time since the previous tap, or since the response window opened for step 1 — this is the actual per-step timing fix
  tapped_position: number
  expected_position: number
  is_correct: boolean
  is_modified_step: boolean     // true if this position is the one secretly changed between original and replay
  was_modified_trial: boolean   // true if this trial had a modification anywhere in it
  stimulus_type: 'nonsocial'
}
```

Maps to: E1 (`is_correct` + `latency_ms` per step, not aggregated), E2 (`latency_ms` specifically where `is_modified_step` is true, compared against the same trial's other steps).

**E3 (followed-modification proportion) is a session-level derived value, not a stored field** — computed from the per-step events: for every trial where `was_modified_trial` is true, check whether the step where `is_modified_step` is true also has `is_correct` true. No new field needed; this is arithmetic over what's already captured, the same treatment Module D's spec gave its own session-level signals (D2, D4).

**E4 (social check)** — the generic `SocialCheckEvent` from sub-project 3, `trigger: 'confusion'`, fired once per modified trial during the pause in §1. Not a field on `FollowPlusStepEvent`.

**E5 (perseverative taps)** — the generic `addPerseverationEvent()` from sub-project 3, fired when `tapped_position` at step *i* equals `tapped_position` at step *i–1* while the *actual shown sequence* has no repeat at those positions (checked against `expected_position` at both steps, not against what was tapped) — this distinguishes genuine perseveration from a legitimate repeat that happens to appear in the real sequence.

**EventCollector additions this module's implementation will need**: `followPlusEvents: FollowPlusStepEvent[]`, `addFollowPlusStepEvent(event): void`, a `mapEvents()` loop, plus the `addSocialCheckEvent()` and `addPerseverationEvent()` calls described above.

## 5. AgeAdapter Integration

`getFollowPlusConfig(ageMonths): FollowPlusModuleConfig`, wrapping `getModuleConfig('FOLLOW_PLUS', ageMonths)`. Only ever called for Band 3 ages — calling it for Band 1 or 2 correctly throws, per the AgeAdapter spec's validation contract, since `FOLLOW_PLUS` isn't in either band's sequence.

```typescript
export interface FollowPlusModuleConfig {
  trials: number
  sequenceLengthRange: [number, number]
  responseWindowMs: number
  modifiedTrialProportion: number
  socialCheckWindowMs: number   // only relevant on modified trials
}
```

| Parameter | Band 3 (the only band this runs on) |
|---|---|
| `trials` | 8 (retained from the existing older-band config, §2) |
| `sequenceLengthRange` | `[3, 4]` |
| `responseWindowMs` | 5000 (retained) |
| `modifiedTrialProportion` | 0.5 (retained) |
| `socialCheckWindowMs` | 1500 |

## 6. Explicitly Out of Scope

- Bands 1 and 2 for this module — already decided against in sub-projects 1–2, not reopened here.
- Re-deriving the exact sequence-length ramping algorithm from the current implementation — noted in §3 as something to preserve in spirit, not something this spec needs to fully specify.
- `EventCollector.ts` changes and `computeMetrics()` extension — same deferral as every other module spec, for the same reason: the analysis engine sub-project is where cross-module scoring logic actually lives.
