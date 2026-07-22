# Module D: SORT_PLUS — Design Spec

Status: Design complete
Sub-project 7 of 9 in the SEED game engine rebuild
Depends on: AgeAdapter (sub-project 1), EventCollector infrastructure (sub-project 3, specifically the generic `SocialCheckEvent`)
Blocks: nothing downstream directly

## 1. The Recurring Camera Problem, Once More — and a Genuine Fix This Time

Signal D5 ("does child look to Buddy when confused") is the same gaze-based, camera-dependent construct as Module C's original Signal C3 and Module B's Signal B4. Unlike Module B, there's a natural fix here, not a drop: the rule-switch moment already has Buddy pause to announce the change ("Now let's try something new!"), which is exactly the kind of pause `SocialCheckEvent` (sub-project 3) was built to capture — its `trigger` field already includes `'rule_change'` as one of three anticipated triggers, defined before this module existed. Using it directly rather than inventing a Module-D-specific mechanism: Buddy becomes tappable during the rule-change announcement, and whether/when the child taps him during that window is the touch-based analog to "checking in," the same resolution Module C used for its own version of this problem.

## 2. Retained Mechanic, One Real Fix

Checked the actual current implementation (`Module3_Sort.ts`) rather than working from the research summary alone. The core mechanic — falling objects, drag-to-nearest-bin-on-release, auto-resolve at the catch line if never touched — is sound and retained as-is.

**One thing not carried forward:** `docs/RESEARCH.md`'s own audit of the current module (§4.3, Gap 4) already flagged that auto-resolve "conflates disengagement with accuracy" — an object that reaches the catch line untouched resolves to the nearest bin by x-position regardless of correctness, meaning an inattentive child accumulates apparent "errors" indistinguishable from genuine rule-application mistakes. Signal D1 (perseverative error rate after the rule switch) is exactly the kind of measurement this conflation would corrupt — a child who simply stopped engaging in Phase 2 would look identical to a child rigidly applying the old rule. **Fix:** auto-resolved objects are excluded from D1/D2 scoring and counted toward disengagement instead. This is a deliberate correction of a flaw the project's own audit already identified, not new scope invented here.

## 3. A Layout Constraint the Research Didn't Address

The existing engine renders exactly 3 bins (`BIN_X` has three fixed positions) but supports 4 shape types (`circle`, `square`, `triangle`, `star`). Phase 2's rule is "sort by shape" — which needs the shape-category count to match the bin count, or the mechanic doesn't work. Adding a 4th bin is layout-feasible (800px canvas, ~200px spacing) but changes an established rendering convention for a module that's supposed to *retain* the drag mechanic, not restructure its layout. **Decision: Phase 2 uses exactly 3 shape categories** (`circle`, `square`, `triangle`) as sorting targets, matching the existing 3-bin layout; `star` is dropped from the sortable set. Color and shape remain independently randomized per object (already true of the current implementation, confirmed by its own code comment — "Shape varies independently of color" — which matters here specifically: it guarantees a shape can't accidentally be predicted from its color, preserving Phase 2 as a genuine rule-switch rather than a leaky one).

**Bin visual transform:** Phase 1 bins are color-filled (existing behavior, unchanged). Phase 2 bins swap to neutral (gray/white) fill with a shape-outline icon, removing color as a visible cue during Phase 2 — otherwise a bin that happens to still look "red" could act as an accidental crutch even though sorting is now by shape.

## 4. Trial Structure

| Band | Phases | Objects/phase | Rule-switch | Focus |
|---|---|---|---|---|
| Band 1 (18–30m) | — | — | — | Module dropped entirely (per `docs/RESEARCH.md` §5.2 — already decided, not revisited here) |
| Band 2 (30–42m) | 1 (color only) | 8 | None | Drag smoothness as motor signal (Signal D3) |
| Band 3 (42–60m) | 2 (color → shape) | 5 + 5 | Yes | Full D1–D5 |

Band 2's object count (8) wasn't specified in the research beyond "sort by color only" — set higher than Band 3's per-phase count (5) since Band 2 has no second phase to spend session time on, and more repetitions give a more stable motor-consistency baseline, which is explicitly its stated focus.

**Rule-switch moment (Band 3 only), between Phase 1 and Phase 2:**
1. Buddy announces the change; bins begin their color→shape visual transform (§3).
2. Buddy becomes tappable — a `social_check` window (per §1), `trigger: 'rule_change'`.
3. Phase 2 begins regardless of whether the child tapped Buddy — same non-punishing pattern as Modules A and C's cue-always-fires-eventually design, for consistency across the whole engine.

**Criterion definition for Signal D2** ("trials to criterion after rule switch") — not given a concrete operational definition in the research. Defining it here: **2 consecutive correct sorts under the new (shape) rule**, counted only among Phase 2 objects that weren't auto-resolved (§2). `D2` is the 1-indexed object position within Phase 2 at which this is first reached, or `null` if never reached within the 5-object phase.

## 5. Event Schema

Extends the existing `SortEvent` shape (reusing `DragPoint`, unchanged) rather than replacing it outright, since the core fields are still accurate — adding what Phase/rule-switch tracking and the auto-resolve fix from §2 require:

```typescript
export interface SortPlusEvent {
  type: 'tap' | 'drag'
  object_id: number
  phase: 1 | 2
  rule: 'color' | 'shape'
  timestamp_ms: number
  color: string
  shape: string
  target_bin: string
  drop_bin: string
  correct: boolean                 // correct under the CURRENT phase's rule
  is_perseverative_error: boolean  // incorrect AND drop_bin matches what would have been correct under the PREVIOUS phase's rule — only meaningful in Phase 2; this is Signal D1's per-object basis
  was_auto_resolved: boolean       // true if never touched — excluded from D1/D2 scoring per §2
  target_x: number
  target_y: number
  target_radius: number
  actual_x: number
  actual_y: number
  tap_x: number
  tap_y: number
  drag_path: DragPoint[]
  drag_path_deviation: number
  reaction_time_ms: number
  precision_error_px: number
  stimulus_type: 'nonsocial'
}
```

Maps to: D1 (`is_perseverative_error`, aggregated across the first two non-auto-resolved Phase 2 objects), D3 (`drag_path_deviation`, unchanged from the existing signal), D4 (comparing `reaction_time_ms` distributions between Phase 1 and Phase 2 objects — a session-level aggregation, not a per-object field). D2 and D5 are session-level/single-event constructs, not per-object fields — D2 per §4's criterion definition, D5 via the generic `SocialCheckEvent` fired once at the rule-switch moment, not per-object.

**EventCollector additions this module's implementation will need**: `sortPlusEvents: SortPlusEvent[]`, `addSortPlusEvent(event: SortPlusEvent): void`, a `mapEvents()` loop, and the single `addSocialCheckEvent()` call at the rule-switch moment.

## 6. AgeAdapter Integration

`getSortPlusConfig(ageMonths): SortPlusModuleConfig`, wrapping `getModuleConfig('SORT_PLUS', ageMonths)`. Note this function is never called for Band 1 ages, since `SORT_PLUS` isn't in Band 1's module sequence (per the AgeAdapter spec §3) — calling it there would correctly throw, consistent with that spec's validation contract.

```typescript
export interface SortPlusModuleConfig {
  hasRuleSwitch: boolean
  objectsPerPhase: number[]        // [8] for Band 2 (one phase), [5, 5] for Band 3 (two phases)
  fallSpeedPxPerSec: number
  ruleSwitchCheckWindowMs: number  // only meaningful when hasRuleSwitch is true
}
```

| Parameter | Band 2 | Band 3 |
|---|---|---|
| `hasRuleSwitch` | false | true |
| `objectsPerPhase` | `[8]` | `[5, 5]` |
| `fallSpeedPxPerSec` | slower (more time per object) | standard |
| `ruleSwitchCheckWindowMs` | n/a | 2500 |

Exact fall-speed numbers deferred to implementation-time tuning against the existing `Module3_Sort.ts` constants (`SPAWN_Y`, `CATCH_Y`) rather than invented here without reference to the real current values.

## 7. Explicitly Out of Scope

- A 4th bin / expanded shape set — considered in §3 and rejected in favor of matching the existing 3-bin layout.
- `EventCollector.ts` changes and `computeMetrics()` extension — same deferrals as the other module specs.
- Re-tuning `Module3_Sort.ts`'s existing fall-speed/timing constants beyond what's needed to add the rule-switch — this spec adds a phase system on top of a mechanic that's already working, not a rebuild of the physics.
