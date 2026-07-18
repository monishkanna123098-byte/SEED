# AgeAdapter Redesign — Design Spec

Status: Approved (verbal), pending written spec review
Sub-project 1 of 8 in the SEED game engine rebuild (see `docs/RESEARCH.md` §5.6–5.7 for full rebuild scope and sequencing)
Depends on: nothing (this is the foundation)
Blocks: EventCollector schema extension, all 5 module rebuilds (A–E)

## 1. Problem

The current `AgeAdapter.ts` has one binary split: `isYoungerGroup()` at 48 months. This produces two concrete defects, both identified during the research phase (`docs/RESEARCH.md` §2.4, §5.6):

1. **18–30 month children are misclassified.** The "younger" config is tuned for 36–48 months. A 20-month-old and a 46-month-old currently receive the same difficulty parameters. This is the highest-risk population for false negatives in ASD screening, and the current engine actively mistargets it.
2. **Out-of-range ages are silently absorbed.** `Math.max(24, Math.min(60, ageMonths))` clamps anything below 24 months into the 24-month config with no signal that this happened. A below-floor child (SEED's stated minimum is 18 months) should never reach this silently.

Additionally, the new 5-module set (Modules A–E, per `docs/RESEARCH.md` §5.2) does not apply uniformly across ages — some modules don't run at all for some bands (see §3 below). The current `AgeConfig` interface has no way to express "this module isn't available at this age," only "here's how hard this module is." That has to change.

## 2. Approaches Considered

| Approach | Description | Trade-off |
|---|---|---|
| A. Separate `SessionPlanner` | AgeAdapter stays difficulty-only; new class owns module inclusion/sequencing | Cleanest separation, but adds a new class for what was scoped as an AgeAdapter-only sub-project |
| B. Sequencing lives in scene-flow code | `BuddysWorld.tsx` hardcodes per-band module lists; AgeAdapter untouched in scope | No new class, but puts an age-driven decision in UI orchestration code, the wrong layer for it |
| C. AgeAdapter owns both difficulty and sequencing | One class answers "how does age affect this session" — both facets | Slightly broadens AgeAdapter's responsibility, but sequencing and difficulty are the same *kind* of decision |

**Decision: C.** Smallest change consistent with the declared sub-project scope. If AgeAdapter grows large enough that this becomes unwieldy, sequencing is a clean future extraction into its own class — nothing in this design forecloses that later split.

## 3. Age Bands and Module Sequence

Three bands, explicit half-open boundaries to eliminate off-by-one ambiguity:

| Band | Range (months) | Modules that run |
|---|---|---|
| Band 1 | `18 ≤ age < 30` | LOOK, HELLO, PEEK |
| Band 2 | `30 ≤ age < 42` | LOOK, HELLO, PEEK, SORT_PLUS |
| Band 3 | `42 ≤ age ≤ 60` | LOOK, HELLO, PEEK, SORT_PLUS, FOLLOW_PLUS |

**Why SORT_PLUS and FOLLOW_PLUS are excluded where they are** (full clinical reasoning in `docs/RESEARCH.md` §5.2, corrected 2026-07-18):

- **FOLLOW_PLUS excluded below 42m**: its clinical mechanism is detecting a secret change between two sequence viewings. Removing the modification (to make it "easier") removes the thing being measured — you'd just be showing an identical sequence twice. Modification-detection isn't reliably interpretable before 36–42m, so the whole band is excluded rather than shipping a diluted version that produces uninterpretable signal.
- **SORT_PLUS excluded below 30m**: no substitute module. A forced-choice game at that age would duplicate signal already captured by LOOK and PEEK without adding real categorization or motor-drag content.

This is a deliberate asymmetry: Band 1 gets 3 modules, not 5. A given session collects fewer signals for younger children by design — administering a task whose failure mode can't be distinguished from age-appropriate difficulty produces a false clinical signal, which is worse than an honest absence of that signal for that age band.

## 4. Boundary and Error Handling

- **`ageMonths < 18`**: AgeAdapter throws. Never clamps. This is the direct fix for the current silent-absorption bug.
  - **Cross-cutting requirement, not fully solvable inside AgeAdapter alone**: whatever gates entry into GAME modality (currently `Step3_Modality`) must reject below-18m children *before* they reach the game engine at all. This spec covers AgeAdapter's refusal; the wizard-side gate is a separate, small follow-up change flagged here so it isn't lost.
- **`ageMonths > 60`**: soft-clamp to Band 3 config. AgeAdapter exports `MIN_AGE_MONTHS = 18` and `MAX_AGE_MONTHS = 60` as constants; any caller that cares whether a given age fell outside range (e.g. session creation, for data-quality logging) checks against those constants itself. AgeAdapter's own interface doesn't carry a tagging concept — that's a session-level concern, not a game-engine one, and baking it in here would be scope creep on a single-file utility.

## 5. Interface Shape

Design-level sketch, not implementation. Exact types/signatures to be finalized during the implementation plan.

```
type AgeBand = 'BAND_1' | 'BAND_2' | 'BAND_3'
type ModuleKey = 'LOOK' | 'HELLO' | 'PEEK' | 'SORT_PLUS' | 'FOLLOW_PLUS'

MIN_AGE_MONTHS = 18
MAX_AGE_MONTHS = 60

getAgeBand(ageMonths: number): AgeBand
  — throws if ageMonths < MIN_AGE_MONTHS
  — clamps to BAND_3 if ageMonths > MAX_AGE_MONTHS (caller checks the constant directly if it needs to know clamping occurred)

getModuleSequence(ageMonths: number): ModuleKey[]
  — ordered list per §3 table

getModuleConfig(moduleKey: ModuleKey, ageMonths: number): <module-specific config>
  — only defined for modules actually present in that band's sequence
  — calling with a moduleKey not in getModuleSequence(ageMonths) is a programmer error, not a runtime fallback — it should throw, not silently return a default
```

**Explicitly out of scope for this spec:** the literal numeric parameter values inside each module's config (target sizes, response windows, trial counts, etc.). Those depend on each module's own detailed design, which hasn't been brainstormed yet (Modules A–E come after this sub-project per the agreed sequencing). This spec defines the shape and the banding/sequencing logic only. Each module's spec will define its own per-band parameter values against this interface.

## 6. Backward Compatibility

Clean break — no shim. The current `AgeConfig` shape (`gaze`/`imitate`/`sort`/`follow` keys, `isYoungerGroup()`) is retired entirely. The only consumers are the four existing module scenes and `BaseGameScene`'s registry wiring, and both are being rewritten as part of this rebuild regardless. Maintaining a compatibility layer for code that's being deleted anyway is wasted effort.

## 7. Testing Considerations

Boundary values are where the old bug lived and where a new one would most easily hide. Test cases must explicitly cover: 17, 18, 29, 30, 41, 42, 60, 61 months — not just one "typical" age per band. Each boundary test should assert both the band assignment and the resulting module sequence, since a band-assignment bug wouldn't necessarily surface unless the sequence is checked too.

## 8. Dependencies and What This Unblocks

- **EventCollector schema extension** (sub-project 2) needs `ModuleKey` as a stable type to tag events against.
- **Modules A–E** (sub-projects 3–7) each consume `getModuleConfig(moduleKey, ageMonths)` for their own age-variant parameters, and their own specs will define what that config shape actually contains per module.
- Nothing in this spec depends on those downstream sub-projects — it's the foundation, as scoped.
