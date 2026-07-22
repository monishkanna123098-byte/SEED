# Module C: PEEK — Design Spec

Status: Design complete
Sub-project 5 of 9 in the SEED game engine rebuild
Depends on: AgeAdapter (sub-project 1), EventCollector infrastructure (sub-project 3)
Blocks: nothing downstream directly

## 1. A Phrase in the Research That Needs Correcting Before Anything Else

`docs/RESEARCH.md` §5.2 describes Buddy "making eye contact with the camera" during the confusion moment. Read literally, this sounds like device-camera-based gaze detection — which §5.5 of the same document explicitly ruled out ("Eye tracking / gaze detection via camera... requires camera permission, reliable lighting, and calibration. Not viable in a self-administered browser tool"). That's a real internal contradiction if left as-is.

**Resolution:** this was always meant to describe a *rendered* effect — Buddy's sprite performing a "looking at you" animation (pupils centering, widening, held on the viewer) — not anything involving the device's camera. No camera permission, no camera access, ever. Restating this explicitly here since the ambiguous phrasing could otherwise survive into an implementation that tries to request camera access it doesn't need.

**The bigger consequence of the no-camera constraint:** the research's own description of the social-referencing mechanic — "a neurotypical child will look to Buddy for a hint" — describes an eye-gaze construct that literally cannot be observed on this platform. There's no way to measure *where a child is looking* without a camera. Signal C3 ("whether child taps a cup before checking Buddy") as originally phrased assumes an observable "checking" behavior that doesn't actually exist in a touch-only interface. This has to be re-operationalized into something the platform can actually measure, not just built as designed and discovered broken later.

## 2. Re-operationalizing "Checking Buddy"

**Decision:** Buddy becomes tappable during his confusion moment, and tapping him is what "checking" means — a real, deliberate, measurable touch action, not an inferred gaze pattern. This isn't a weaker substitute for the original idea; it's arguably a *better* fit for an interactive medium — checking Buddy becomes something the child actively *does* rather than a passive gaze the game tries to infer.

To make this a genuine incentive rather than an arbitrary extra step, tapping Buddy during the checking window makes his gaze-cue fire immediately (rewarding the check with faster help toward solving the puzzle). If the checking window closes without a tap, the cue fires anyway, just later — so a child who never checks Buddy isn't punished with a broken trial, only a slower one. This mirrors Module A's joint-attention trial structure (initiation window → cue fires if not preempted → response window), which is a deliberate consistency choice across modules, not a coincidence.

## 3. Trial Structure

Two trial types, matching the research's own distinction between plain object-permanence trials and social-referencing trials — the confusion/check mechanic only exists on referencing trials; plain trials are a single hide-shuffle-respond sequence with no Buddy interaction step.

**Trial counts and referencing proportion by band** — not specified in the research beyond a single "8–10 trials" estimate. Increasing the referencing proportion with age, since object permanence itself (the thing plain trials test) is a milestone typically-developing children have already cleared well before 42 months — plain trials stay clinically informative longest in the youngest band, where permanence itself is still being established, and matter progressively less as bands get older:

| Band | Plain trials | Referencing trials | Total |
|---|---|---|---|
| Band 1 (18–30m) | 4 | 2 | 6 |
| Band 2 (30–42m) | 4 | 4 | 8 |
| Band 3 (42–60m) | 3 | 7 | 10 |

**Plain trial timeline:**
1. Buddy hides the object under a cup, shuffles cups (count per §4).
2. Response window opens. The child may tap multiple cups in sequence (see Signal C4 below) — the trial doesn't resolve on the first tap.
3. Trial resolves when the correct cup is tapped, `maxCupTaps` is reached, or the window times out.

**Referencing trial timeline:**
1. Buddy hides the object, shuffles quickly.
2. Buddy's confusion expression triggers (shrug + the rendered "looking at you" animation from §1).
3. **Checking window** opens. A tap on Buddy during this window: records `checked_buddy: true` and the latency, and fires the gaze-cue immediately.
4. If the checking window closes without a Buddy-tap: `checked_buddy: false`, and the gaze-cue fires anyway once the window ends.
5. **Cup-response window** opens after the cue fires (whenever that was). Same multi-tap-until-resolved behavior as plain trials.
6. If the child taps a *cup* during the checking window (step 3), before tapping Buddy and before the cue fires — this is the impulsive-guess case (`checked_buddy: false`) and still resolves the trial on that tap; the object's location is fixed once shuffling stops, so an early cup-tap is a valid, resolvable attempt.

**Signal C4 (perseveration) requires multi-tap support**, not single-tap resolution — the research asks for "number of cups tapped per trial," which only means something if more than one tap per trial is possible. Response windows stay open across multiple taps until the correct cup is found, a per-band tap ceiling is reached (`maxCupTaps`, set to `numCups × 2` — enough room to show real perseveration without allowing unbounded button-mashing), or the window times out.

## 4. Event Schema

```typescript
export interface PeekPlainEvent {
  type: 'peek_plain'
  trial_id: number
  timestamp_ms: number
  num_cups: number
  num_shuffles: number
  cup_taps: number[]            // sequence of cup indices tapped, in order — length itself is Signal C4
  correct: boolean
  latency_ms: number | null     // time to the resolving tap; null if the window timed out with no tap
  stimulus_type: 'nonsocial'
}

export interface PeekReferencingEvent {
  type: 'peek_referencing'
  trial_id: number
  timestamp_ms: number
  num_cups: number
  num_shuffles: number
  checked_buddy: boolean
  check_latency_ms: number | null    // null if never checked
  cue_onset_ms: number               // always fires eventually — immediately if checked, else once the checking window closes
  cup_taps: number[]
  correct: boolean
  response_latency_ms: number | null // time from cue_onset_ms to the resolving cup tap
  stimulus_type: 'social'            // the check/confusion dynamic makes this variant social, unlike plain permanence trials
}

export type PeekEvent = PeekPlainEvent | PeekReferencingEvent
```

Maps directly to the research's four signals: C1 = `correct` (both variants), C2 = `response_latency_ms` (referencing only), C3 = `checked_buddy` (referencing only, re-operationalized per §2), C4 = `cup_taps.length` (both variants).

**EventCollector additions this module's implementation will need** (per sub-project 3's scope boundary): a `peekEvents: PeekEvent[]` array, `addPeekEvent(event: PeekEvent): void`, and a `mapEvents()` loop normalizing both variants.

## 5. AgeAdapter Integration

Following the dedicated-getter pattern established in the Module A spec (§4 there): `getPeekConfig(ageMonths: number): PeekModuleConfig`, internally calling `getModuleConfig('PEEK', ageMonths)` first for validation.

```typescript
export interface PeekModuleConfig {
  numCups: 2 | 3
  numShufflesRange: [number, number]
  objectSalience: 'high' | 'standard'
  confusionIntensity: 'exaggerated' | 'moderate' | 'subtle'
  checkingWindowMs: number
  cupResponseWindowMs: number
  maxCupTaps: number
  trialCounts: { plain: number; referencing: number }
}
```

| Parameter | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| `numCups` | 2 | 3 | 3 |
| `numShufflesRange` | [0, 1] | [1, 2] | [2, 3] |
| `objectSalience` | high | standard | standard |
| `confusionIntensity` | exaggerated | moderate | subtle |
| `checkingWindowMs` | 3000 | 2500 | 2000 |
| `cupResponseWindowMs` | 5000 | 4000 | 3000 |
| `maxCupTaps` | 4 | 6 | 6 |

`objectSalience` is only varied for Band 1 ("very salient" per the research) — the research doesn't state a further distinction between Band 2 and Band 3 on this axis, so both are set to `standard` rather than inventing an unstated difference.

## 6. Explicitly Out of Scope

- No camera access of any kind, at any point — restated from §1 because it's the single most important constraint this spec has to protect against, given how the source research was phrased.
- `EventCollector.ts` changes — made as part of this module's own build, per sub-project 3's scope boundary.
- Any change to `computeMetrics()` — deferred to the analysis engine sub-project, same reasoning as Module A's spec §6.
