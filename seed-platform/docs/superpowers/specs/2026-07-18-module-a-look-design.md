# Module A: LOOK — Design Spec

Status: Design complete
Sub-project 4 of 9 in the SEED game engine rebuild
Depends on: AgeAdapter (sub-project 1), EventCollector infrastructure (sub-project 3)
Blocks: nothing downstream directly, but establishes patterns (dedicated per-module config getter, discriminated-union event types) the remaining modules should follow for consistency

## 1. What This Spec Resolves That `docs/RESEARCH.md` Left Open

The research description (§5.2, Module A) specifies the clinical intent and rough mechanic but not enough to implement: exact trial structure, exact event fields, exact per-band numeric parameters, or how it plugs into AgeAdapter/EventCollector's now-established conventions (neither existed yet when that research was written). Resolving those here.

## 2. Trial Structure

The research describes two cadences running "separately" (name-calls every 8–12s, star joint-attention cues every 4–5s). Left as literally-simultaneous independent timers, these could collide — a star appearing at the same instant Buddy calls the child's name would muddy both signals for a young child who can't process two social demands at once. **Decision: one linear sequence of discrete, non-overlapping trials, alternating between two trial types**, not two independent parallel timers. This also keeps Module A consistent with every other event in the collector, which are all trial-indexed.

**Trial counts by band** — the research gave a single estimate ("12–15 trials") without breaking it out per band. Given younger bands need longer response windows per trial (per `docs/RESEARCH.md` §2.1–2.2) but the module's total duration should stay roughly constant across bands, trial *count* is scaled down for younger bands rather than duration scaled up:

| Band | Name-call trials | Joint-attention trials | Total |
|---|---|---|---|
| Band 1 (18–30m) | 5 | 3 | 8 |
| Band 2 (30–42m) | 6 | 6 | 12 |
| Band 3 (42–60m) | 7 | 8 | 15 |

**Name-call trial timeline:**
1. Buddy calls the child's name + sound + beckoning animation.
2. Response window opens (age-scaled — see §4).
3. A tap anywhere on Buddy's `face` container, Buddy's `root` container outside `face` (body/limbs), or a decoy character resolves the trial and stops the window.
4. No tap before the window closes resolves as no-response.

**Joint-attention trial timeline:**
1. A star appears at a candidate location (silent, no cue yet).
2. **Initiation window** opens (constant across bands — see §4 for why this one isn't age-scaled). A tap on the star during this window is recorded as spontaneous initiation; the gaze cue never fires for this trial.
3. If the initiation window closes without a tap, Buddy's gaze cue fires (head-turn toward the star).
4. **Response window** opens (age-scaled). A tap on the star now counts as joint-attention *response*, not initiation.
5. No tap before the response window closes resolves as no-response.

## 3. Event Schema

Two trial types have enough non-overlapping relevant fields (a name-call's "did they tap a decoy character" vs. a joint-attention trial's "did they initiate before the cue") that forcing them into one flat interface with a `type` discriminant — the pattern `SortEvent` uses for tap/drag — would leave several fields meaningless depending on the variant. A genuine discriminated union is cleaner here:

```typescript
export interface NameCallEvent {
  type: 'name_call'
  trial_id: number
  timestamp_ms: number
  response_target: 'buddy_face' | 'buddy_body' | 'other_character' | 'none'
  latency_ms: number | null   // null when response_target is 'none' (timed out)
  stimulus_type: 'social'
}

export interface JointAttentionEvent {
  type: 'joint_attention'
  trial_id: number
  timestamp_ms: number          // when the star first appeared
  cue_onset_ms: number | null   // when Buddy's gaze cue fired; null if the child tapped before the cue ever fired
  tap_ms: number | null         // null if no tap occurred at all
  initiated: boolean            // true if the tap happened before cue_onset_ms (or the cue never fired)
  correct: boolean              // tapped the actual star location, not a miss
  stimulus_type: 'social'
}

export type LookEvent = NameCallEvent | JointAttentionEvent
```

This directly answers all four signals from the research without inference: A1 (`latency_ms` on `NameCallEvent`), A2 (`initiated` on `JointAttentionEvent`), A3 (`response_target` discriminates `buddy_face`/`buddy_body`, made possible by `BuddySprite`'s existing `face` container being a separate public property from body/limbs — confirmed by inspection, no engine change needed), A4 (`response_target === 'other_character'`).

**EventCollector additions this module's implementation will need to make** (per sub-project 3's scope boundary — these belong to Module A's own build, not EventCollector's): a `lookEvents: LookEvent[]` array, `addLookEvent(event: LookEvent): void`, and a `mapEvents()` loop normalizing both variants into the flat wire shape (`module_id: 'LOOK'`, discriminating on `type` for the variant-specific fields).

## 4. AgeAdapter Integration

Sub-project 1 left `getModuleConfig(moduleKey, ageMonths)` as a deliberate stub returning just `{ moduleKey, ageBand }`, explicitly deferring real per-module parameters to each module's own spec (AgeAdapter spec §5). This is that deferred work, for LOOK specifically.

**Decision on how to extend it:** rather than force one generic `getModuleConfig()` to return type-safe module-specific shapes (awkward in TypeScript without heavy overload machinery), add a dedicated `getLookConfig(ageMonths: number): LookModuleConfig` that internally calls the existing `getModuleConfig('LOOK', ageMonths)` first — getting its validation/throw behavior for free, without duplicating it — then returns the richer, LOOK-specific parameters. This pattern (dedicated per-module getter, thin wrapper around the existing validator) is what the remaining modules should follow too, for consistency.

```typescript
export interface LookModuleConfig {
  numCharacters: 2 | 3 | 4
  nameCallSalience: 'high' | 'medium' | 'low'
  starSizePx: number
  responseWindowMs: number
  initiationWindowMs: number   // constant across bands — see reasoning below
  nameCallIntervalMsRange: [number, number]
  jointAttentionIntervalMsRange: [number, number]
  trialCounts: { nameCall: number; jointAttention: number }
}
```

| Parameter | Band 1 (18–30m) | Band 2 (30–42m) | Band 3 (42–60m) |
|---|---|---|---|
| `numCharacters` | 2 | 3 | 4 |
| `nameCallSalience` | high (flashes + louder sound) | medium | low (head-turn + name only) |
| `starSizePx` | 90 | 60 | 40 |
| `responseWindowMs` | 4000 | 3000 | 2500 |
| `trialCounts` | 5 / 3 | 6 / 6 | 7 / 8 |

`initiationWindowMs` (1500ms) and the two interval ranges (8000–12000ms name-call, 4000–5000ms joint-attention) are held **constant across bands**, not scaled. Reasoning: these describe how patient Buddy is before cueing and how often opportunities arise — properties of the *game's pacing*, not the child's processing speed. The response *window* (how long the child has to act once an opportunity has already been presented) is the age-appropriate variable per `docs/RESEARCH.md` §2; the *pacing* of when opportunities occur is not something the research gave a reason to vary, so it isn't varied without one.

## 5. Other Characters — an Open Design Point the Research Didn't Specify

The research says 2–4 characters are "doing things" on screen without specifying what. This matters for signal validity, not just visual polish: if a decoy character is *more* visually active than Buddy during his call, a tap on it stops being evidence of reduced social specificity (Signal A4) and starts being evidence the module is just poorly balanced. **Decision:** other characters get simple, low-salience idle animation (gentle bob/sway) only — visibly less active than Buddy at all times, and especially during his call window. This is a constraint on whatever sprite class implements them, not a new signal or config value, but it's load-bearing for A4's validity and belongs in this spec rather than being left to whoever builds it to guess.

**New sprite class needed:** no existing sprite covers "generic background character." `BuddySprite` is Buddy-specific. This module's implementation will need a small new sprite class (or several palette variants of one class) for the 2–4 background characters — out of scope for this spec to fully design, but flagged so it isn't a surprise at build time.

## 6. Explicitly Out of Scope

- The new background-character sprite class's exact visual design — noted in §5, left to implementation.
- `EventCollector.ts` changes — per sub-project 3's scope boundary, these are made as part of *this* module's build, not speculatively added to EventCollector's own sub-project.
- Any change to `computeMetrics()` to incorporate LOOK data into the frontend's provisional `GameMetrics` summary — per the EventCollector spec §8, that rollup logic is deferred to the analysis engine sub-project, which is the actual scoring authority.
