# EventCollector Schema Extension — Design Spec

Status: Design complete
Sub-project 3 of 9 in the SEED game engine rebuild (renumbered after inserting the age floor/ceiling fix as sub-project 2)
Depends on: AgeAdapter (sub-project 1) — reuses its `ModuleKey` type for the new generic event types
Blocks: Modules A–E (sub-projects 4–8) each need the infrastructure this spec adds; Analysis Engine (sub-project 9) needs to add matching fields to its `GameEvent` Pydantic model before these new event types carry any signal server-side

## 1. Problem

`docs/RESEARCH.md` §5.7 identified six defects in `EventCollector.ts`. Investigating them against the current codebase (not just the original research pass) changed one of the six materially:

1. **No social-referencing signal.** Nothing in the current event schema can represent "Buddy paused/looked confused — did the child check Buddy's face?" — a signal several new modules (C, D, E) need.
2. **No perseveration signal.** Nothing represents "child repeated the same action instead of adapting" — needed by Modules B, D, E.
3. **Disengagement events lack context.** Current shape is `{ timestamp, duration_ms, module }` — no record of what preceded the disengagement or whether it happened mid-trial vs. between trials.
4. **`completionRate2` is dead weight.** Confirmed via repo-wide search: zero consumers anywhere in `backend/` or `analysis-engine/`. Pure duplicate of `completionRate`.
5. **`ageGroup` — corrected finding, not what the original research claimed.** The original research doc claimed the `'24-30m'`-style string from `getAgeGroup()` caused *incorrect normative comparison*. That's wrong, and I'm not carrying the error forward: tracing `processGameData()` (sub-project 2's investigation) showed `ageGroup` is never forwarded to the analysis engine at all — it's captured, validated, and stored on the `GameSession` row for display only, with zero path into scoring. The actual issue is narrower and different: `getAgeGroup()` produces a stale six-bucket format that has nothing to do with either the old two-band or new three-band `AgeAdapter` system — it's a leftover convention borrowed from the analysis engine's own *video*-normative lookup (a separate, legitimate subsystem serving a different modality, not a bug in itself). Since the new three-band system is about to become the actual clinical grouping that determines which modules a child gets, a `GameSession` record still labeled with the old, unrelated six-bucket scheme would be actively misleading to a clinician reviewing it — even though it was never a scoring bug.
6. **Module E needs per-step granularity, not per-trial.** No EventCollector change needed — per-step event granularity is an already-proven pattern (`ImitateEvent` already does this: "one event per gesture STEP within a trial, not per trial," per its own doc comment). This is purely a design note for Module E's own future sub-project — use the `ImitateEvent` pattern, not the old `FollowEvent` per-trial pattern. No action here.

## 2. Scope Boundary: Infrastructure Now, Module-Specific Shapes Later

Modules A–E don't exist yet (sub-projects 4–8). This creates a real temptation to design their event shapes now, while I'm already in EventCollector's schema. Deliberately not doing that, for the same reason the AgeAdapter spec didn't invent per-module numeric parameters before those modules were designed: I don't yet know each module's exact trial structure, and guessing now risks locking in a shape that has to be reworked once each module gets its own detailed brainstorm.

**What this spec adds is infrastructure any future module can plug into:**
- Two new *generic*, module-agnostic event types (social-check, perseveration) — both are cross-cutting mechanics used by multiple future modules (per `docs/RESEARCH.md` §5.2, social-check appears in Modules C/D/E; perseveration in B/D/E), so they belong at the infrastructure level, the same way `DisengagementEvent` already works generically across every module today.
- An extended, backward-compatible `DisengagementEvent`.
- Removal of dead weight (`completionRate2`).
- A corrected `getAgeGroup()`.

**What this spec explicitly does NOT add:** new event interfaces for LOOK/HELLO/PEEK/SORT_PLUS/FOLLOW_PLUS specifically (e.g., no `LookEvent`, no `PeekEvent`). Each module's own sub-project adds its own typed event interface and `addXEvent()` method when it's actually designed, following the exact pattern `GazeEvent`/`addGazeEvent()` already establishes. This spec's job is to make sure the *shared* pieces those additions will need already exist.

## 3. Backward Compatibility

Same principle as the AgeAdapter spec: Modules 1–4 still call the current `addDisengagement(module, timestamp, durationMs)` 3-argument signature today, and their replacements don't exist yet. The extension adds new parameters with defaults rather than breaking the signature or adding a parallel method name.

Checked the one real call site (`BaseGameScene.onInactivityAdvance()`) rather than guessing at a plausible default: it always fires after `onInactivityCall()` has already played Buddy's call animation (the 10s-then-30s timer sequence guarantees this ordering), and always happens while the scene is still waiting on a response — never between trials. So the backward-compatible defaults are `context: 'mid_trial'` and `precedingEvent: 'buddy_call'`, not arbitrary placeholders:

```
addDisengagement(
  module: string,
  timestamp: number,
  durationMs: number,
  context: DisengagementContext = 'mid_trial',
  precedingEvent: PrecedingEvent = 'buddy_call',
  trialId: number | null = null
): void
```

## 4. New Types

```typescript
// Reuses AgeAdapter's ModuleKey for the NEW event types — old module-specific
// events (GazeEvent etc.) keep their existing plain-string module identifiers
// unchanged, since those are tied to modules being retired, not extended.
import type { ModuleKey } from '../utils/AgeAdapter'

export interface SocialCheckEvent {
  type: 'social_check'
  module: ModuleKey
  timestamp_ms: number
  trigger: 'buddy_pause' | 'rule_change' | 'confusion'
  action: 'tap_buddy' | 'tap_other' | 'no_action'
  latency_ms: number | null   // null when action is 'no_action' — nothing to time
}

export interface PerseverationEvent {
  type: 'perseveration'
  module: ModuleKey
  timestamp_ms: number
  position: string    // module-defined identifier of what was repeated (a card id, cup index, bin, etc.) — deliberately free-form since each future module's own "position" concept differs and shouldn't be forced into one shape here
  count: number        // how many consecutive repeats triggered this event
}

export type DisengagementContext = 'mid_trial' | 'inter_trial' | 'post_feedback'
export type PrecedingEvent =
  | 'buddy_call'
  | 'trial_failure'
  | 'trial_success'
  | 'rule_change'
  | 'social_check_prompt'
  | 'none'

export interface DisengagementEvent {
  timestamp: number
  duration_ms: number
  module: string
  context: DisengagementContext
  preceding_event: PrecedingEvent
  trial_id: number | null
}
```

New collector methods, following the exact existing convention (`addGazeEvent(event)` takes a whole typed object, not positional fields):

```typescript
addSocialCheckEvent(event: SocialCheckEvent): void
addPerseverationEvent(event: PerseverationEvent): void
```

## 5. `mapEvents()` Extension

Two new normalization loops, following the exact pattern the four existing ones use — flattening into the `Record<string, unknown>[]` shape the analysis engine's `GameEvent` model expects:

```typescript
for (const e of this.socialCheckEvents) {
  out.push({
    type: 'social_check',
    module_id: e.module,
    timestamp: e.timestamp_ms,
    trigger: e.trigger,
    action: e.action,
    latency_ms: e.latency_ms,
  })
}

for (const e of this.perseverationEvents) {
  out.push({
    type: 'perseveration',
    module_id: e.module,
    timestamp: e.timestamp_ms,
    position: e.position,
    count: e.count,
  })
}
```

**Explicit dependency this creates on sub-project 9 (Analysis Engine):** `main.py`'s `GameEvent` Pydantic model (checked directly — it's a fixed set of `Optional` fields, one flat model for every event type, not a union) does not currently have `trigger`, `action`, `position`, or `count` fields. Events with `type: 'social_check'` or `type: 'perseveration'` will parse successfully today (Pydantic ignores fields not declared on the model, it doesn't error), but those fields will be silently dropped server-side until sub-project 9 adds them. This is safe — nothing breaks — but it means these new event types carry zero actual signal until that later sub-project catches up. Flagging this explicitly now rather than letting it surface as a surprise later, per the standing rule against silent scope gaps.

Also worth noting for sub-project 9's future scope: the `module_id` values these new events emit will be the new `ModuleKey` strings (`'LOOK'`, `'PEEK'`, etc.), not the old `'module1_gaze'`-style strings. Any Python code that pattern-matches on `module_id` (need to check `scorer.py` for this when that sub-project comes up) will need to recognize both conventions during the transition period where old and new modules coexist.

## 6. `getAgeGroup()` Fix

Replacing the stale six-bucket string with a label derived from the new canonical `AgeBand` (reusing `getAgeBand()` from `AgeAdapter.ts`, not reinventing a parallel banding scheme):

```typescript
private getAgeGroup(): string {
  const band = getAgeBand(this.ageMonths)
  return `${band}_${this.ageMonths}m`   // e.g. "BAND_1_22m" — human-checkable, unambiguous, traceable to the exact age recorded alongside it
}
```

No backend or analysis-engine change required for this specific fix — the `game-complete` validator only checks `ageGroup` is non-empty (`body('ageGroup').notEmpty()`, confirmed by inspection), not any particular format. This is a self-contained, frontend-only correction. This also takes effect immediately for sessions still using old Modules 1–4, which is correct and not a temporary inconsistency: a child's age band is a fact about the child, not about which modules happen to be implemented yet.

## 7. `completionRate2` Removal

Confirmed via repo-wide search (zero matches outside `EventCollector.ts` itself) — deleted outright, not deprecated. Nothing downstream reads it, so there's no backward-compatibility concern here the way there is for `addDisengagement()`.

## 8. Explicitly Deferred, Not Forgotten

- **`computeMetrics()` is not extended to incorporate social-check or perseveration data in this sub-project.** Reasoning: no current module produces this data, so extending it now would compute against permanently-empty arrays. More importantly, tracing `processGameData()` in sub-project 2 suggests the frontend's `GameMetrics` summary is a provisional, display-oriented estimate — the analysis engine recomputes its own metrics server-side from raw `game_events` via `feature_engineer.py`/`scorer.py`, which is the actual scoring authority. How social-check and perseveration data should roll up into a score is a modeling decision that belongs with that server-side logic (sub-project 9), not as a frontend guess made before any real module produces the data to reason about.
- **Module-specific event interfaces for A–E** — deferred to each module's own sub-project, per §2.
- **Analysis engine `GameEvent` model fields** — deferred to sub-project 9, flagged explicitly in §5 so it isn't lost.
