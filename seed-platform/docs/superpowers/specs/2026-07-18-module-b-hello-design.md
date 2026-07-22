# Module B: HELLO — Design Spec

Status: Design complete
Sub-project 6 of 9 in the SEED game engine rebuild
Depends on: AgeAdapter (sub-project 1), EventCollector infrastructure (sub-project 3)
Blocks: nothing downstream directly

## 1. Three Things in the Research That Can't Be Built As Written

Same underlying issue as Module C's spec (§1 there), recurring three separate times in this module's description — worth stating plainly rather than fixing quietly, since it's a pattern, not a one-off:

1. **"the child waves their hand in front of the camera (if available)"** — literal device camera access. Dropped outright, keeping only the button-tap alternative the research already offered as a fallback. Not a compromise I'm introducing; it's enforcing a decision `docs/RESEARCH.md` §5.5 already made ("no camera access... not viable in a self-administered browser tool") that this module's mechanic description didn't fully honor when drafted.
2. **Signal B4, "whether child looks at Buddy's face between steps."** An eye-gaze construct, unobservable without a camera — the identical problem Module C's Signal C3 had. Unlike C3, there's no natural touch-based substitute here: Module B's flow is a direct perform→imitate loop with no organic pause point to hang a "check Buddy" tap on the way Module C's confusion moment provided one. Bolting an artificial "tap Buddy before you can continue" gate onto every step would slow pacing and risk confusing a child who doesn't know what the gate is for — manufacturing a confound rather than a signal, which is exactly the failure mode `docs/RESEARCH.md` §5.6 warned against elsewhere in this same rebuild. **Decision: drop B4 entirely, not dilute it into a contrived substitute.** Module B collects B1, B2, B3, B5 — four signals, still solid coverage.
3. **The Band 3 "trick gesture requiring invented imitation."** Observing a child invent a genuinely novel physical gesture needs motion/camera sensing this platform doesn't have — there's no touch-only way to detect an unscripted body movement. **Decision:** fold this into an intensified instance of the *already-existing* novel-gesture mechanic (Signal B3) rather than building a qualitatively different "free invention" interaction that can't actually be observed. Band 3's last trial is simply its most novel, least-rehearsed gesture — not a structurally different mechanic.

## 2. Trial Structure

**Widget choice, clarified.** The research's Band 1 description — "2-choice widget (do it / not do it)" — reads ambiguously as a literal don't-imitate option, which would be an odd thing to measure imitation with. Read against the module's core design principle ("2–3 large action widgets that are contextually revealed based on what Buddy just did" — the whole point being contextual reveal instead of the old design's five-always-visible icons), this is read as: after Buddy performs the action, exactly two widgets are revealed — the correct match plus one clearly different decoy — a 2-alternative forced choice, not a "skip" option. This is the interpretation used throughout this spec.

**Per-step events, not per-trial** — following the existing `ImitateEvent` convention (`trial_id` + `sequence_step` + `sequence_length`, multiple events sharing a `trial_id`), already confirmed a proven pattern rather than something to reinvent.

**Trial timeline (one iteration, repeated per step within a trial):**
1. Buddy performs a gesture on an object (pats a drum, pushes a ball, etc.).
2. The relevant widget(s) for *this step only* are revealed — never all gesture types simultaneously, preserving the contextual-reveal property that distinguishes this from the old design.
3. Response window opens; the child taps a widget.
4. Resolves on tap or timeout; if this trial has more steps, proceeds to the next step's gesture.

**Trial counts by band** — the research gave one estimate ("8 trials, shorter with younger group") without a per-band breakdown, so scaled the same way the other modules' trial counts were (fewer, shorter trials for younger bands; per `docs/RESEARCH.md` §2 general age-appropriateness reasoning):

| Band | Trials | Max steps/trial | Widget choices/step |
|---|---|---|---|
| Band 1 (18–30m) | 5 | 1 | 2 |
| Band 2 (30–42m) | 8 | 2 | 2 |
| Band 3 (42–60m) | 10 | 3 | 3 |

Novel gestures (Signal B3) are introduced from trial 4 onward in Bands 2 and 3, per the research's explicit statement for Band 2 — extended to Band 3 as well since the research doesn't give a reason to treat them differently on this axis, and Band 1 has neither sequences nor stated novelty per its own description ("1-step imitation only... No sequence").

## 3. Event Schema

```typescript
export interface HelloEvent {
  type: 'imitation_step'
  trial_id: number
  sequence_step: number        // 1-indexed within this trial
  sequence_length: number
  timestamp_ms: number          // when Buddy finished performing this step's gesture
  gesture_shown: string         // identifier of the gesture performed this step
  is_novel_gesture: boolean     // true if this gesture hasn't appeared earlier in the session — Signal B3
  widget_tapped: string | null  // identifier of the tapped widget; null if no tap before timeout
  is_correct: boolean
  latency_ms: number | null     // gesture end to tap; null if no tap
  stimulus_type: 'social'
}
```

Maps to B1 (`is_correct`), B2 (`latency_ms`), B3 (`is_novel_gesture` cross-referenced with `is_correct`/`widget_tapped`).

**Perseveration (Signal B5) uses the shared infrastructure, not a field on this event.** When `widget_tapped` matches a *prior* step's gesture rather than the current one's correct/decoy options, this module's implementation calls the generic `addPerseverationEvent()` added in sub-project 3 — that call is the authoritative record, not a duplicate flag on `HelloEvent`. Stating this explicitly so there's no ambiguity later about which of two possible places "owns" the perseveration signal.

**EventCollector additions this module's implementation will need** (per sub-project 3's scope boundary): `helloEvents: HelloEvent[]`, `addHelloEvent(event: HelloEvent): void`, a `mapEvents()` loop, plus the calls to the already-existing generic `addPerseverationEvent()` where applicable.

## 4. AgeAdapter Integration

Following the dedicated-getter pattern (`getHelloConfig(ageMonths): HelloModuleConfig`, wrapping `getModuleConfig('HELLO', ageMonths)` for validation):

```typescript
export interface HelloModuleConfig {
  maxSequenceSteps: 1 | 2 | 3
  widgetChoiceCount: 2 | 3
  novelGestureFromTrial: number | null   // null = novelty not introduced this band
  responseWindowMs: number
  trialCount: number
}
```

| Parameter | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| `maxSequenceSteps` | 1 | 2 | 3 |
| `widgetChoiceCount` | 2 | 2 | 3 |
| `novelGestureFromTrial` | null | 4 | 4 |
| `responseWindowMs` | 5000 | 4000 | 3000 |
| `trialCount` | 5 | 8 | 10 |

## 5. Explicitly Out of Scope

- Any form of camera access — restated because of how many times the source research reached for it (§1).
- A literal "invent your own gesture" mechanic — resolved in §1 point 3; not deferred, actually dropped, since no future capability on this platform would make it observable.
- `EventCollector.ts` changes and `computeMetrics()` extension — same deferrals as Modules A and C, for the same reasons.
