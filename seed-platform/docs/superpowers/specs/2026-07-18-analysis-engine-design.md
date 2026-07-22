# Analysis Engine Updates — Design Spec

Status: Design complete — with an explicit caveat in §4 that needs your attention before this one gets built
Sub-project 9 of 9 (the last one) in the SEED game engine rebuild
Depends on: all of sub-projects 1–8 — this is where every module's deferred "computeMetrics() extension" and "GameEvent schema fields" finally get addressed, per each of their own §6/§8 "explicitly out of scope, deferred here" notes
Blocks: nothing — this is the end of the chain

## 1. Scope of This Spec

Checked the actual current `feature_engineer.py` (437 lines) and `scorer.py` (526 lines) rather than working from the original `docs/RESEARCH.md` summary. The scoring *architecture* — composite bands, confidence gating, the criterion A/B split, differential-pattern routing, the XGBoost blend — is sound and isn't being redesigned here. What has to change is narrower but still substantial: the 15-field `FeatureVector` and the criterion formulas that consume it are built entirely around signals from Modules 1–4, several of which don't have a clean replacement in Modules A–E's actual signal set. This spec maps every old field to its fate, and proposes new criterion formulas where a clean mapping doesn't exist — flagged clearly as provisional engineering proposals, not validated clinical weights, for reasons in §4.

## 2. Concrete, Small, Already-Flagged Items First

These were identified across the earlier specs as deferred work landing here. Addressing them before the larger formula question:

**`GameEvent` Pydantic model needs new fields.** Confirmed by inspection — it's one flat model with a fixed set of `Optional` fields, not a discriminated union. Events with `type: 'social_check'` or `type: 'perseveration'` (sub-project 3) parse today without error (Pydantic silently drops undeclared fields), but carry zero signal until these are added:
```python
trigger: Optional[str] = None    # social_check
action: Optional[str] = None     # social_check
position: Optional[str] = None   # perseveration
count: Optional[int] = None      # perseveration
```

**`module_id` values are changing.** New events emit `'LOOK'`, `'PEEK'`, `'HELLO'`, `'SORT_PLUS'`, `'FOLLOW_PLUS'` (the `ModuleKey` values from sub-project 1) instead of the old `'module1_gaze'`-style strings. `scorer.py` doesn't appear to pattern-match on `module_id` directly (it operates on the already-aggregated `FeatureVector`, not raw events) — the pattern-matching, if any exists, would be in `feature_engineer.py`'s event-to-feature aggregation. Whoever implements this sub-project should grep `feature_engineer.py` for `module_id` comparisons specifically and confirm old and new strings can coexist during the transition period where some sessions still used Modules 1–4 and others use A–E.

## 3. FeatureVector Field Mapping

Every current field, mapped to its actual fate — not a blanket "everything changes":

| Old field | Fate | New source |
|---|---|---|
| `gaze_score` | Replaced | Module A `JointAttentionEvent.correct` rate (response, not initiation) |
| `reaction_score` | Replaced, more specific | Module A `NameCallEvent.latency_ms` — response-to-name specifically, not a generic mixed latency, which is a strictly more validated signal than what it replaces |
| `touch_score` | Replaced, same role | Module D `SortPlusEvent.precision_error_px` |
| `imitation_score` | Replaced, materially cleaner | Module B `HelloEvent.is_correct` rate — true per-step imitation accuracy, not the old icon-recognition proxy the audit (`docs/RESEARCH.md` §4.2) already flagged as measuring the wrong thing |
| `engagement_score` | Retained, richer input | Same disengagement-based computation, now fed by the context-enriched `DisengagementEvent` (sub-project 3) instead of the old bare `{timestamp, duration_ms, module}` |
| `motor_consistency_score` | Replaced, same role | Module D `SortPlusEvent.drag_path_deviation` |
| `imitation_latency_score` | Replaced, same role | Module B `HelloEvent.latency_ms` |
| `disengagement_score` / `recovery_time_score` | Retained, richer input | Same as `engagement_score` — enriched disengagement context, computed generically across all modules rather than being module-specific |
| `drag_smoothness_score` | Retained, same role | Module D — feeds the motor-differential routing (§5), not the A/B criteria directly, unchanged in role |
| `gaze_variability_score` | **Retired, no replacement** | Was always a stretch for a touch-only interface measuring "gaze variability" without a camera. No new module produces anything analogous. Not replaced — removed. |
| `sustained_gaze_score` | **Retired, no replacement** | Same problem — "sustained fixation" was never really observable via taps. Retired rather than forced onto a new signal it doesn't fit. |
| `social_ratio_score` | **Retired, superseded** | The generic `SocialCheckEvent` rate (sub-project 3) is a more direct, better-grounded measure of the same underlying construct (social responsiveness to a cue) than the old proxy ever was — see §4 for how this actually gets used |
| `latency_cv_score` | Retained, richer input | Now computable from genuine per-step latency data (Module B, Module E both have it — see their specs' §3/§4) instead of the old trial-level approximation |

**New fields needed**, from signals with no old-schema analog at all:
- `social_check_rate` — proportion of confusion/rule-change/pause triggers where the child tapped Buddy (from `SocialCheckEvent`, aggregated across whichever modules ran)
- `perseveration_rate` — proportion of opportunities where a perseverative repeat was flagged (from the generic `PerseverationEvent`, sub-project 3, aggregated across modules)
- `rule_switch_rigidity` — Module D's Signal D1 (perseverative error rate in the first two post-switch trials), only present for Band 3 sessions where `SORT_PLUS` ran with a rule switch
- `joint_attention_initiation_rate` — Module A's Signal A2, distinct from `gaze_score` (response) above — initiation and response are different constructs and shouldn't be collapsed into one field the way the old schema might have tempted

## 4. Criterion Formulas — What Carries Over Structurally, What Needs Real Rework, and Why I'm Not Fully Deciding the Latter

**A1, A3, B1 carry over structurally unchanged** — same weighted-combination shape as today, just pointed at the new field names from §3 (e.g., A1's `gaze_score × 0.6 + reaction_score × 0.4` becomes the same formula over the new `gaze_score`/`reaction_score` sources). No new judgment call needed; these are direct substitutions.

**A2, B2, B3, B4 need real rework**, because their current inputs (`gaze_variability_score`, `sustained_gaze_score`, `social_ratio_score`) are retired with no direct replacement (§3). This is where a genuine design decision is needed, and it's not one I should make unilaterally the way I made the trial-count and default-value decisions elsewhere in this batch:

- **B2 (insistence on sameness)** has an obvious, well-motivated replacement candidate: `rule_switch_rigidity` (Module D) and E3's followed-modification rate (Module E) are *more direct* measures of insistence-on-sameness than the old gaze-based proxy ever was — this one I'm comfortable proposing outright: `B2 = weighted(rule_switch_rigidity, 1 − followed_modification_rate)`, structurally the same "weighted combination of two sub-scores" shape as every other criterion.
- **B3 (restricted/fixated interests)** is murkier. The old formula was already a stretch (approximating "fixation" from gaze variability with no camera). The best available replacement candidate is `perseveration_rate`, but perseveration and restricted/fixated interest are related-but-not-identical constructs — a child who perseverates on a specific action isn't necessarily the same as a child with a narrow, fixated interest pattern. Proposing `B3 = perseveration_rate` alone would be presenting a plausible-sounding formula with a confidence I don't actually have.
- **A2 and B4** have somewhat weaker replacement candidates too (`social_check_rate` for A2's "nonverbal communication," the enriched disengagement data for B4).

**I'm not writing final weights for A2/B2/B3/B4 into this spec as settled.** The existing formulas (`A1 = gaze×0.6 + reaction×0.4`, etc.) look precise, but precision isn't the same as validated — I have no evidence these specific weights (0.6/0.4, 0.7/0.3, 0.8/0.2, and so on) were ever clinically derived rather than reasonable-sounding placeholders, and I'm not in a position to determine that from the codebase alone. Proposing equally-precise-looking replacement weights for B3 in particular, where I've already said the input signal is a stretch, would be manufacturing false confidence — exactly the kind of fabricated-precision problem the project has a standing rule against (`SEED_BUILD_INVENTORY.md` §18, "no fabricated clinical accuracy metrics," which I'm reading as extending to fabricated *formula* precision, not just fabricated accuracy statistics specifically). **This needs a decision from you, or from whoever has clinical sign-off authority on this platform, not a confident-looking formula from me.** B2's replacement is solid enough to proceed on. A2, B3, and B4 need either: (a) a real clinical consultation on what these criteria should actually weight, or (b) an explicit, documented decision to ship with a best-effort placeholder formula clearly labeled as unvalidated, the same way the rest of the platform is labeled "screening tool only, not diagnostic."

## 5. Differential Pattern Routing — Unchanged in Structure

The existing motor-vs-social differential logic (`primary_scorer` = video-preferred for DSM-5 breakdown, `differential_scorer` = game-preferred for motor pattern, per the original architecture) doesn't need restructuring. Module D's `drag_path_deviation` plays exactly the same role Module 3's did — real motor data from game features, since video's motor defaults are neutral by design (the same reasoning the current architecture already documents for why this differential exists at all). `MOTOR_DOMAIN_ELEVATED_THRESHOLD`, `SOCIAL_DOMAIN_INTACT_THRESHOLD`, `MOTOR_SOCIAL_RATIO_THRESHOLD` — no evidence any of these need to change as a consequence of the module rebuild specifically; not touched here.

## 6. Explicitly Out of Scope

- **Retraining the XGBoost blend model.** The 60/40 rule-based/XGBoost blend consumes the 15-dim feature array — if the array's composition changes (§3), the model needs retraining against new data, which is a data-science effort with its own timeline, not something resolved by this spec.
- **Final weights for A2, B3, B4** — per §4, deliberately left as an open decision rather than settled here.
- **Clinical validation of any formula, old or new** — not something a design spec produced this way can responsibly claim to provide.
