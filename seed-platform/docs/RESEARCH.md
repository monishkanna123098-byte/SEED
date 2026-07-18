# SEED Game Engine — Research Report
# Pre-Build Analysis: Clinical Validity, Age Appropriateness, Current Module Audit, Proposed Architecture
# Date: 2026-07-17
# Status: Research complete. No code written. Awaiting approval before implementation.

---

## 1. CLINICALLY VALIDATED BEHAVIORAL SIGNALS FOR ASD SCREENING (18–60 MONTHS)

### 1.1 The Evidence Base

The following signals have replicated validation across at least two independent studies in the 18–60 month age range. Sources include Wetherby & Prizant (CSBS, 2002), Zwaigenbaum et al. (2005 prospective sibling study), Landa & Garrett-Mayer (2006), Charman et al. (2001 M-CHAT validation), Robins et al. (M-CHAT-R/F), the BOSA (Brian et al., 2015), and Gernsbacher et al. motor research (2008).

### 1.2 Signal Inventory and Game-Event Mapping

| Clinical Signal | DSM-5 Locus | Validation Strength | Measurable In-Game Event |
|---|---|---|---|
| **Response to name / social bid** | A1 (Social-emotional reciprocity) | Very high (Zwaigenbaum 2005, Osterling 1994) | Latency from Buddy calling child's name to child tap/gaze-shift |
| **Joint attention initiation** | A1 | Very high (Charman 2001, Wetherby 2007) | Whether child spontaneously taps the object Buddy is attending to, without explicit instruction |
| **Joint attention response** | A1 | Very high | Latency from Buddy's gaze cue to correct card tap; proportion correct |
| **Protodeclarative pointing / shared reference** | A1 | High (Camaioni 1997) | Child tapping to "show" Buddy vs. tapping for instrumental reward |
| **Social smile / affect reciprocity** | A1 | Moderate (harder to capture without camera) | Engagement dwell time near Buddy; unprompted interaction events |
| **Gesture imitation — simple** | A3 (Deficits in nonverbal communication) | Very high (Rogers & Pennington 1991, Vanvuchelen 2007) | Accuracy of gesture button sequence; latency per step |
| **Gesture imitation — novel** | A3 | High (Ingersoll 2008) | Accuracy on non-overlearned gestures vs. familiar ones |
| **Object imitation** | A3 | High (Charman 1997) | Whether child replicates an action on an object Buddy performs |
| **Gaze following — referential** | A1 | Very high | Correct target selection after Buddy looks toward it |
| **Gaze following — anticipatory** | A1 | Moderate | Whether child looks ahead to where Buddy will look (detectable via sequence of rapid consecutive taps) |
| **Drag smoothness / motor consistency** | B1 (Repetitive motor behaviors proxy; also motor delay differential) | Moderate (Gernsbacher 2008, Lloyd 2013) | Drag path deviation score; velocity profile variance |
| **Touch precision / fine motor** | B1 proxy; motor delay differential | Moderate | Precision error in pixels from target center; tap radius consistency |
| **Cognitive flexibility** | B3 (Insistence on sameness / restricted interests) | High (Yerys 2007, Colvert 2015) | Whether child adapts taps when a sequence rule changes mid-trial |
| **Rigidity / perseveration** | B3 | High | Proportion of rigid responses on modified trials; repeated identical choices |
| **Response to novelty** | B3 | Moderate | First-contact latency on new trial types vs. familiar ones |
| **Object permanence** | Developmental milestone, 18–24m | High | Whether child tracks an object hidden under a cup and searches correctly |
| **Disengagement / attention duration** | A1 + B4 (highly restricted fixated interests) | Moderate | Inactivity event count; time-to-disengage per trial; return-to-engagement latency |
| **Perseverative tapping** | B3 | Moderate | Repeated taps on same target after timeout; tap count per trial |
| **Social vs. non-social stimulus preference** | A1 | High (Klin 2002 eye-tracking) | Differential reaction time to social-stimulus modules vs. non-social |

### 1.3 Signals Currently ABSENT from SEED That Have Strong Validation

**Response to name** — the single most validated early ASD marker (Osterling 1994, Zwaigenbaum 2005). Current modules have no mechanism for it. Buddy calls audibly during inactivity, but that is a disengagement trigger, not a measured response-to-social-bid trial.

**Protodeclarative vs. protoimperative distinction** — the difference between a child pointing *to share* vs. pointing *to get* is clinically meaningful. Current modules only measure instrumental responses (tap the correct card *to win*).

**Novel vs. familiar imitation contrast** — current Module 2 uses a fixed gesture set that becomes familiar across 6 trials. The critical measure is whether the child imitates something they have never seen before. This is barely captured.

**Object permanence / search** — relevant for 18–30 month age band, completely absent.

**Repetitive motor movements** — the current sort module's drag deviation is a proxy for smooth vs. jerky movement, but it captures nothing about stereotyped repetition (e.g., repeated tapping of the same location).

---

## 2. DEVELOPMENTALLY APPROPRIATE GAME MECHANICS BY AGE BAND

### 2.1 18–30 Months

**Attentional capacity:** 2–5 minutes sustained attention on a single activity. Highly distractible. Require high-salience animated stimuli to maintain attention.

**Input method:** Broad tap (whole-hand patting). Pincer precision not established. No reliable drag capability. Touch targets must be ≥ 80px diameter. No keyboard input; no multi-step drag-to-target.

**Visual complexity threshold:** 2–3 distinct objects maximum per screen. Strong color contrast, no fine detail. Animated characters that respond contingently to touch are highly engaging.

**What works:**
- Simple cause-and-effect (tap → animation/sound)
- Peek-a-boo / object disappear-reappear (object permanence)
- Single-item selection (not multi-choice among 3)
- Immediate reward animation (< 500ms after correct tap)
- Exaggerated social faces (large eyes, big expressions)

**What fails:**
- 3-choice discrimination (too cognitively demanding)
- Drag-and-drop (fine motor not there yet)
- Sequence memory of length > 1
- Any task requiring reading verbal instructions

**Critical note for SEED:** The current AgeAdapter only splits at 48 months. **18–30 month children are completely unhandled** — they fall into the "younger group" (< 48 months) which is actually tuned for 36–48 months. This is a clinical validity gap. A child tested at 20 months will receive a task designed for a 42-month-old.

### 2.2 30–42 Months

**Attentional capacity:** 5–10 minutes on structured interactive play. Can sustain across 2–3 sequential mini-activities.

**Input method:** Reliable single-tap. Beginning to manage simple drag (grab + drop, not precision steering). Touch targets can be 60–80px. 2-finger gestures unreliable.

**Visual complexity threshold:** 3–4 objects. Can process left/center/right spatial layouts. Color matching well established by 30 months.

**What works:**
- 3-choice selection (left/center/right — Module 1 is appropriate)
- Simple 1-2 step imitation
- Color/shape matching with drag-to-bin (Module 3 is broadly appropriate)
- Simon-says type sequence of length 2–3 (Module 4 appropriate at upper end of this band)
- Animated character as a play partner (Buddy is appropriate)

**What fails:**
- Sequence length > 2 steps reliably (working memory not established)
- Rule reversal / flexibility tasks (24–30m too early; reliable by 36–42m)
- Fine drag-path precision

### 2.3 42–60 Months

**Attentional capacity:** 10–15 minutes on structured interactive play. Can complete a multi-module game session.

**Input method:** Reliable tap + reliable drag. Can manage precision tapping on 50px targets. Some children at 54–60 months can use mouse accurately.

**Visual complexity threshold:** 4–6 objects. Can process 2×2 grid layouts. Can hold rules across trials.

**What works:**
- All current SEED module types
- Sequence length 3–4
- Cognitive flexibility tasks (rule change mid-game)
- Hide-and-seek object permanence (as a higher-order memory task)
- Simple categorization with 2 simultaneous rules (color + shape)

**What fails:**
- Abstract rule systems (if A then B)
- Alphabetic/numeric content

### 2.4 Age Band Gap Summary

| Age Band | Current SEED handling | What should happen |
|---|---|---|
| 18–30 months | Falls into younger group (36–48m config). Severely mismatched. | Distinct simplified config: 1-choice, cause-effect, no drag, object permanence module |
| 30–42 months | Younger group (< 48m config). Broadly adequate with caveats. | Fine-tune: reduce sequence to max 2, increase response windows, larger targets |
| 42–48 months | Younger group. Good match. | Keep current younger config |
| 48–60 months | Older group (≥ 48m config). Good match. | Keep current older config |

**Recommendation:** Add a third age band: 18–30 months, with a fully separate set of age-appropriate mechanics.

---

## 3. BEST-IN-CLASS CHILD ENGAGEMENT PATTERNS: VALIDATED TOOLS REVIEW

### 3.1 CSBS (Communication and Symbolic Behavior Scales) — Wetherby & Prizant

**What it measures:** Social communication, expressive communication, symbolic behaviors.
**What makes it work:** Uses naturalistic observation during scripted play "temptation" probes (winding up a toy and then making it stop). The clinician watches what the child does spontaneously. Extremely high ecological validity.
**Lesson for SEED:** Spontaneous behavior > elicited behavior. If we only ask the child to tap when told to tap, we miss initiations. Some module trials should be ambiguous-by-design to see if the child initiates joint attention rather than always responding to it.

### 3.2 BOSA (Brief Observation of Symptoms of Autism) — Brian et al. 2015

**What it measures:** ASD-relevant behaviors across structured and unstructured play.
**Key engagement mechanism:** Uses "press situations" — scenarios designed to elicit specific behaviors (e.g., blowing bubbles then stopping, to elicit a social request). The child's unprompted response is the data.
**Lesson for SEED:** Build in deliberate "pause" moments where Buddy stops mid-animation and waits. A neurotypical child will tap Buddy or look at the screen to re-engage. A child with ASD social communication differences will not.

### 3.3 Autism Play Assessment — Stone & Lemanek 1990

**What it measures:** Spontaneous play quality (functional vs. symbolic vs. constructive).
**Key finding:** Children with ASD prefer functional object manipulation over symbolic/pretend play. Offering both and measuring which the child gravitates toward is diagnostic.
**Lesson for SEED:** In Module 3 (Sort), the child is always told what to do. A probe where Buddy puts an object in the wrong bin and watches the child to see if the child "corrects" it (shows understanding of the rule) vs. ignores it (no shared reference) would add a social-referencing signal.

### 3.4 TEDI (Technology-Enhanced Developmental Instrument) — Various

**What it measures:** Multiple domains via touchscreen game administration.
**Key engagement patterns:** (a) Consistent character presenter (avatar as social anchor). (b) Reward animations are brief (< 1.5s) to keep pacing tight. (c) Practice trials before measurement trials. (d) Module sequencing alternates social/nonsocial to prevent habituation.
**Lesson for SEED:** Current modules go social → social → nonsocial → nonsocial. Alternating social/nonsocial reduces contrast effects.

### 3.5 Engagement Patterns That Consistently Work Across Tools

**Contingent social reward:** When the child does something correct, Buddy responds *socially* (cheers, claps), not just audibly. This creates a shared-attention loop that is itself clinically informative: does the child look at Buddy's face during the cheer? Current SEED plays Buddy's cheer animation but does not measure whether the child taps/touches Buddy afterward.

**Intrinsic motivation:** The child should want to do the task because it is *fun*, not because they understand they are being assessed. Color-matching and sorting have intrinsic appeal for 30–42 month olds. Joint attention (Module 1) is more cognitively demanding and feels more like a test.

**Predictable structure with embedded novelty:** Consistent frame (same Buddy, same background, same sounds) with trial-level variation. Children on the autism spectrum often engage well with predictable structure; flexibility tasks reveal rigidity specifically *because* the frame is expected to be stable.

**Buddy's role:** Currently Buddy is a presenter and cheerleader. He should also be a *play partner* — an agent the child interacts with bi-directionally, not just watches. The distinction matters clinically: does the child treat Buddy as a social agent or as a slot machine?

---

## 4. CURRENT MODULE AUDIT

### 4.1 Module 1 — Gaze (Joint Attention Response)

**Mechanic:** Buddy looks at one of 3 picture cards. Child taps the card Buddy is looking at.

**Clinical validity gaps:**

*Gap 1 — Only response, no initiation.* The entire module measures *response* to joint attention: the child is told (implicitly) to follow Buddy's gaze. It never measures whether the child *initiates* joint attention (looks to Buddy for reference, then back to object). Initiation is at least as clinically significant as response. Zero initiation data collected.

*Gap 2 — Social cue is ambiguous.* Buddy "looks" via a head turn animation toward a direction. This is a reasonable proxy for eye gaze, but there is no Buddy face graphic — just a sprite with a head turn. Children aged 18–30 months may not parse this as a social gaze cue at all. Validated tools use an actual face with clear eye direction.

*Gap 3 — No response-to-name embedded.* The single most validated ASD marker is not measured here. There is no trial type where Buddy calls the child's name and we measure whether the child looks toward Buddy.

*Gap 4 — Forced choice removes ambiguity.* The child knows they must tap *something*. There is no trial where the correct response is to *not* tap — or to tap Buddy instead of a card. This means random guessing (1/3 accuracy) is not distinguishable from genuine joint attention following at low trial counts.

*Gap 5 — Icons (apple, star, fish) are completely nonsocial.* Klin (2002) showed children with ASD attend to nonsocial objects on social stimuli screens. Using nonsocial icons as targets on a social attention task potentially confounds the signal: high accuracy could reflect either good joint attention *or* a preference for the particular object Buddy happened to look at.

**Engagement gaps:**

*Gap 1 — 3-second gaze delay before cards appear (younger group) is too long.* For 30–42 month olds, 3 seconds of watching Buddy look at nothing is disengaging. The younger group needs more interesting gap-filler (Buddy makes a sound, does a small animation).

*Gap 2 — 8 identical trial types in a row.* After the first few trials, the game structure is fully predictable. A child who figures out the pattern (watch Buddy's head → tap that direction) is demonstrating executive function, not joint attention.

**Mechanic-age-appropriateness mismatches:**

The 3-choice horizontal card layout works for 30–42 months but is completely wrong for 18–30 months. At 18–24 months, a 3-choice discrimination is at the edge of working memory capacity. A single highlighted card or 2-choice would be more appropriate.

---

### 4.2 Module 2 — Imitate (Peer Imitation)

**Mechanic:** Buddy performs a 1–3 gesture sequence. Child taps corresponding icon buttons in order.

**Clinical validity gaps:**

*Gap 1 — This is not imitation. It is icon recognition.* The child is not imitating Buddy. The child is watching Buddy perform a gesture, then tapping a 2D icon that represents that gesture. This is icon-to-gesture mapping (a visual discrimination task) followed by memory recall. True imitation requires the child to perform the action themselves. We collect zero data on actual motor imitation.

*Gap 2 — Fixed gesture vocabulary across all trials.* After 2 trials, the child knows all 5 gestures (wave, clap, stomp, spin, jump). From trial 3 onward, this is working memory for a known set — not imitation capacity. Novel gesture imitation (Ingersoll 2008) is the validated signal. We collect zero novel imitation data.

*Gap 3 — All 5 buttons always visible.* The child can see all choices at all times. This is a recognition task, not a recall task. Even a child with complete imitation deficits could achieve 20% accuracy by random guessing across 5 buttons. A child who watched Buddy carefully and a child who ignored Buddy and tapped randomly are not distinguishable below ~50% accuracy on this design.

*Gap 4 — Social stimulus but social interaction not measured.* The events collected are `imitation_attempt` with `stimulus_type: 'social'`. But the social interaction component (does the child look at Buddy's face during the gesture? does the child look to Buddy for confirmation after tapping?) is not captured. The gesture is performed by a social agent, but we do not measure social engagement with that agent.

*Gap 5 — Gesture sequence is the clinical target, but incorrect step still advances.* If a child taps incorrectly on step 1, the game still collects a step 2 event. This means the step 2 data for a child who got step 1 wrong is in a contaminated state (their "sequence" has already diverged from the intended evaluation).

**Engagement gaps:**

*Gap 1 — 5 identical button circle at bottom.* These are hand-drawn icon buttons with no clear affordance that they are interactive. For a 36-month-old, the connection between "Buddy waved" and "I should tap the hand icon" is not obvious. There are no practice trials.

*Gap 2 — Buddy disappears conceptually during response phase.* While the child taps buttons, Buddy does nothing. This breaks the social loop. A genuine imitation game would have Buddy react to each of the child's gesture choices.

**Mechanic-age-appropriateness mismatches:**

The 5-button simultaneous choice display is inappropriate for 18–30 months and marginal for 30–36 months. At these ages, single-button forced choice (did you see Buddy do this? tap if yes) is more appropriate.

---

### 4.3 Module 3 — Sort (Object Sorting)

**Mechanic:** Colored shapes fall from the top. Child drags (or taps) to matching color bin.

**Clinical validity gaps:**

*Gap 1 — Drag-to-bin is a fine motor task, not a cognitive flexibility task.* The module is labeled "DSM-5 Criteria B3 + B1 proxy." B3 is restricted/repetitive behaviors and insistence on sameness. Color sorting does not measure insistence on sameness. It measures color discrimination and basic categorization — which is a 24-month cognitive milestone that most children in our screening range (18–60 months) have already passed. This module measures whether a child can *categorize*, not whether they are *rigid*.

*Gap 2 — No rule-change embedded.* A genuine cognitive flexibility probe requires a rule change mid-task (e.g., sort by shape instead of color). The current module uses a single rule throughout. This is a categorization task, not a flexibility task.

*Gap 3 — Shape is completely uninformative.* The shape of each object varies independently of its color, but the correct bin is always determined by color alone. The shape data is collected but adds no clinical signal — the analysis engine cannot extract anything from "the child dropped a blue star into the blue bin" vs. "the child dropped a blue circle into the blue bin." This is noise in the data.

*Gap 4 — Auto-resolve at bottom removes the clinical signal.* If the child doesn't touch an object and it reaches the catch line, it auto-resolves to the nearest bin. This means an inattentive child who ignores all objects will still generate "correct" placements at ~33% rate (one bin is always nearest). The disengagement signal gets merged with the accuracy signal.

*Gap 5 — Motor signal (drag_path_deviation) is underpowered.* For the motor differential to be meaningful, we need clean drag paths. Objects that are auto-resolved or tapped-not-dragged produce zero drag path data. In practice, many younger children will tap rather than drag, producing very sparse drag_path data.

**Engagement gaps:**

*Gap 1 — Objects falling from top is visually engaging but cognitively stressful.* Time pressure from falling objects is appropriate for 42–60 months but stressful for 18–36 months. A 24-month-old who can sort by color will struggle to sort *in time* before the object falls. The time pressure conflates motor/attention limitations with cognitive ability.

*Gap 2 — Buddy is in the corner doing nothing.* Buddy plays the encouraging role but has no functional role in the sorting activity. This reduces it to a purely nonsocial mechanical task. Missing opportunity for social referencing probe.

**Mechanic-age-appropriateness mismatches:**

Drag-and-drop is inappropriate for 18–30 months (fine motor). The falling-object mechanic with time pressure is inappropriate for 18–36 months. This module is correctly targeted at 42–60 months but is systematically misapplied to the full age range.

---

### 4.4 Module 4 — Follow (Sequence Following / Cognitive Flexibility)

**Mechanic:** Simon-says sequence shown, then optionally modified in replay. Child reproduces what they saw in the replay.

**Clinical validity gaps:**

*Gap 1 — This is working memory, not cognitive flexibility.* The sequence following task primarily measures verbal/visuospatial working memory. The "flexibility" component (detecting the modified step) is a genuine flexibility probe, but it is embedded in a working memory task. A child can fail the flexibility probe purely due to insufficient working memory capacity (couldn't hold 3–4 items), not due to rigidity. These are confounded.

*Gap 2 — Binary accuracy measure misses partial performance.* `accuracy: 0 or 1` — either the child reproduced the entire sequence correctly or not. A child who got 3/4 correct and followed the modification on step 3 gets the same score as a child who tapped randomly. The flexibility signal (followed_modification) is the actually valuable data, but a child can follow the modification and still score accuracy=0 if they got another step wrong.

*Gap 3 — Response_time_ms is the entire response phase, not per-step.* The design captures one response time for the entire sequence reproduction. Clinically, what matters is latency on the *modified step* vs. latency on standard steps. Does the child pause longer on the modified item? This would indicate they noticed the change. Current design cannot answer this.

*Gap 4 — Tapped sequence truncated on early completion.* If the child taps `shownSequence.length` buttons, the trial finalizes. But if the child's last tap was early, the remaining tapped_sequence positions are empty — not recorded as "none." This is correctly handled in `fillRemainingSteps` but only for timeout, not early finalization with fewer taps.

**Engagement gaps:**

*Gap 1 — Two-phase sequence watching is abstract and unsocial.* Phase 1 (original) + Phase 2 (replay, possibly modified). Children ages 36–42 months do not naturally segment observation into two distinct phases. The conceptual gap between "what you saw first" and "what you saw second" requires metacognitive awareness that many 36-month-olds lack.

*Gap 2 — Colored circles with no character, story, or narrative.* The most engaging tasks for this age embed sequences in a story ("Buddy showed you where the stars go — first green, then orange..."). Current implementation has no narrative frame.

**Mechanic-age-appropriateness mismatches:**

A 2-phase sequence task with modification detection is genuinely inappropriate for children under 36 months. At 30 months, reliable memory for a 2-element sequence is the upper bound. The younger group config (maxSequenceLength: 3, 6 trials) asks 30-month-olds to complete tasks calibrated for 42-month-olds.

---

### 4.5 EventCollector Structural Issues

*Issue 1 — No perseverative tap detection.* The collector records tap events but does not flag when the same location is tapped repeatedly within a trial (perseveration), which is a B3 signal.

*Issue 2 — Disengagement events are coarse.* `addDisengagement(module, timestamp, durationMs)` records that a disengagement happened but not its context: was the child mid-trial? Was Buddy speaking? Had they just failed a trial? The context of disengagement is clinically as important as the fact of it.

*Issue 3 — Social vs. nonsocial latency contrast is partially computed but opaque.* The `computeMetrics()` method mixes M1 (social) and M2 (social/icon) events into a single `reaction_latency_mean`. This is not wrong, but it destroys the social/nonsocial contrast. The contrast between gaze-following latency and sort-to-bin latency is a more sensitive signal than either alone.

*Issue 4 — `completionRate2` is a duplicate of `completionRate`.* Both are `modulesCompleted.length / totalModules`. One of these fields exists for a historical reason that is now dead weight.

*Issue 5 — Age group bucket '24-30m' used in getAgeGroup() but '24m' used in NormativeBaseline.* The `getAgeGroup()` function returns strings like `'24-30m'` while the backend's NormativeBaseline uses integer `ageGroupMonths`. This mismatch means the analysis engine comparison to normative baselines may be incorrectly aligned.

---

## 5. PROPOSED REPLACEMENT MODULE ARCHITECTURE

### 5.1 Design Principles

1. **Every module must have a spontaneous-behavior window** — at least one moment per module where the correct response is ambiguous and the child's unprompted action is the data.
2. **Social agent must be functionally integrated** — Buddy is a play partner, not a presenter. Every module measures something about the child's engagement with Buddy specifically.
3. **Three age bands** — 18–30m, 30–42m, 42–60m. Each band gets its own mechanic variants.
4. **Response-to-name is measured in every session** — it is too validated to omit.
5. **Motor and social signals must be separable** — modules alternate social/nonsocial so the analysis engine can compute the differential without confounding.
6. **No task-framing for the youngest band** — for 18–30 months, everything must feel like a toy, not a test.

### 5.2 Proposed Module Set

---

#### MODULE A: LOOK (Response to Social Bid + Joint Attention Initiation)
*Replaces Module 1, expands significantly*

**Clinical target:** DSM-5 A1 — Social-emotional reciprocity; response to name

**Game mechanic:** Buddy and 2–3 animated characters are doing things on screen. Every 8–12 seconds, Buddy (and only Buddy) calls the child's name + makes a sound + does a beckoning animation. The child must notice and tap Buddy. Separately, every 4–5 seconds, Buddy looks toward a sparkle/star that appears somewhere on screen (joint attention cue). The child can tap the star.

**Age variants:**
- 18–30m: 2 characters only. Star is large and obvious. Buddy's "call" is extremely salient (flashes + sound). Just tap Buddy when he calls.
- 30–42m: 3 characters. Buddy's call is moderately salient. Star is smaller. The child must distinguish "Buddy is calling me" from "something else happened."
- 42–60m: 4 characters. Buddy's call is subtle (just a head turn + name). Star is small. Social noise from other characters increases.

**Signals collected:**
- Signal A1: Latency from Buddy's name-call to child's tap of Buddy (response-to-name)
- Signal A2: Whether child spontaneously taps the star *before* being explicitly directed to (joint attention initiation vs. response)
- Signal A3: Whether the child taps Buddy's face vs. Buddy's body (face-salience)
- Signal A4: Whether child taps non-Buddy characters instead (social specificity)

**Estimated duration:** 2–3 minutes (12–15 trials including spontaneous windows)

**Engagement driver:** Animated world with multiple agents doing things; child is part of the world rather than performing a test

---

#### MODULE B: HELLO (Gesture Imitation — True Imitation via Simple Actions)
*Replaces Module 2, fundamentally redesigned*

**Clinical target:** DSM-5 A3 — Deficits in nonverbal communication behaviors

**Game mechanic:** Buddy does an action to an object on screen (pats a drum, pushes a ball, waves at a photo). A matching physical-world prop widget appears on the child's side. The child is asked to do the same thing. Simplified version: Buddy waves at the camera, and a "wave sensor" region appears — the child waves their hand in front of the camera (if available) OR taps a large "wave" button in rhythm. The core change: instead of icon buttons for 5 gestures, there are 2–3 large action widgets that are contextually revealed based on what Buddy just did.

**Age variants:**
- 18–30m: 1-step imitation only. Buddy does one thing (pat, wave). 2-choice widget (do it / not do it). Large targets. No sequence.
- 30–42m: 1–2 step imitation. Buddy does 2 things. Contextual widgets. Novel gestures introduced from trial 4 onward.
- 42–60m: 2–3 step imitation. Novel gestures. One "trick" gesture per session that requires the child to invent a novel imitation.

**Signals collected:**
- Signal B1: Per-step imitation accuracy
- Signal B2: Latency from Buddy finishing gesture to first child action (initiation latency)
- Signal B3: Whether child attempts novel gesture when Buddy introduces it (novel imitation capacity)
- Signal B4: Whether child looks at Buddy's face between steps (social monitoring)
- Signal B5: Perseveration — whether child repeats a prior gesture when a new one is shown

**Estimated duration:** 2.5 minutes (8 trials, shorter with younger group)

**Engagement driver:** Buddy is a play partner doing real play actions; contextual widget removes the "icon recognition" problem

---

#### MODULE C: PEEK (Object Permanence + Social Referencing)
*New module — replaces nothing; currently absent from SEED*

**Clinical target:** Developmental milestone (18–30m) + A1 social referencing; relevant for youngest band, becomes a working-memory probe at upper bands

**Game mechanic:** Buddy places an object (a small animal character) under one of 2–3 cups, then shuffles them. The child taps the cup where the animal is hiding. On "social referencing" trials, Buddy shuffles very quickly and then looks confused — making eye contact with the camera and shrugging. A neurotypical child will look to Buddy for a hint; a child with ASD social communication differences will guess randomly without checking Buddy. Buddy then gives a subtle gaze-cue toward the correct cup.

**Age variants:**
- 18–30m: 2 cups, no shuffle or 1 swap. Object is very salient. Buddy's "confused" moment is exaggerated.
- 30–42m: 3 cups, 1–2 swaps. Buddy's confusion is moderate.
- 42–60m: 3 cups, 2–3 swaps. Buddy's confusion is subtle. Child must proactively check Buddy.

**Signals collected:**
- Signal C1: Accuracy (object found vs. not found)
- Signal C2: On social-referencing trials — latency from Buddy's confusion expression to child's gaze-cue response (tap of correct cup after Buddy looks toward it)
- Signal C3: Whether child taps a cup *before* checking Buddy on referencing trials (impulse vs. social check)
- Signal C4: Number of cups tapped per trial (perseveration / rigidity)

**Estimated duration:** 2 minutes (8–10 trials)

**Engagement driver:** Intrinsically motivating hide-and-seek; Buddy as a confused friend to help

---

#### MODULE D: SORT+ (Categorization + Rule Flexibility)
*Replaces Module 3; retains drag mechanic, adds rule-switch*

**Clinical target:** DSM-5 B3 — Inflexible adherence to routines; motor precision (B1 proxy)

**Game mechanic:** Objects are sorted into bins, but the rule changes mid-session. Phase 1 (first 5 objects): sort by color. A clear rule-change signal occurs (Buddy: "Now let's try something new!" + bins transform visually). Phase 2 (next 5 objects): sort by shape. A child with high cognitive flexibility adapts immediately; a rigid child continues using the color rule in Phase 2.

**Age variants:**
- 18–30m: Drop entirely. No substitute — a bare forced-choice game at this age would duplicate signal already captured by Modules A and C without adding a real categorization or motor-drag component.
- 30–42m: Sort by color only (no rule switch). Focus on drag smoothness as motor signal.
- 42–60m: Full color-then-shape rule switch. 5 objects per phase.

**Signals collected:**
- Signal D1: Error rate in Phase 2 trials 1–2 (perseverative errors after rule switch = rigidity score)
- Signal D2: Trials to criterion after rule switch (how quickly child adapts)
- Signal D3: Drag path deviation (motor consistency)
- Signal D4: Reaction time comparison Phase 1 vs. Phase 2 (cost of switching)
- Signal D5: Social check during rule-switch moment (does child look to Buddy when confused?)

**Estimated duration:** 2.5 minutes

**Engagement driver:** Rule-change feels like a game twist, not a test requirement; Buddy frames it as "let's try it differently!"

---

#### MODULE E: FOLLOW+ (Sequence Following with Per-Step Timing)
*Replaces Module 4; same mechanic, critical data collection fix*

**Clinical target:** DSM-5 B3 — Insistence on sameness; cognitive flexibility; working memory

**Game mechanic:** Simon-says sequence with modification. Core mechanic unchanged from Module 4 but with critical engineering fixes:
1. Per-step timing recorded (not just total response time)
2. Social check window: after the modification is revealed, Buddy pauses 1.5s and looks at the child. The child's behavior in this 1.5s window (tap Buddy? look confused? immediately tap the sequence?) is recorded.
3. Perseveration detection: if child taps the same circle twice in a row when the sequence doesn't include a repeat, it's flagged.

**Age variants:**
- 18–30m: Drop entirely. Cannot test.
- 30–42m: Drop entirely. The two-phase watch-then-detect-change structure is the mechanism being measured; removing modification removes the thing the module exists to test, and the age band is below the point (36–42m) where modification-detection is reliably interpretable. A "simplified" version without modification would show the child an identical sequence twice for no clinical reason.
- 42–60m: Full design with modification. Length 3–4.

**Signals collected:**
- Signal E1: Per-step accuracy and latency (not just trial-level)
- Signal E2: Latency on modified step vs. standard steps (pause = noticing)
- Signal E3: followed_modification proportion across all modified trials
- Signal E4: Social check behavior during Buddy's pause (tap Buddy = social referencing; ignore = no referencing)
- Signal E5: Perseverative taps (same position repeated when not in sequence)

**Estimated duration:** 2.5 minutes (6–8 trials depending on age)

---

### 5.3 Module Architecture Table

| Module | Clinical Target | DSM-5 Locus | Game Mechanic | Signals Collected | Age Bands | Duration |
|---|---|---|---|---|---|---|
| **A: LOOK** | Response to name; Joint attention initiation + response | A1 | Multi-character world; Buddy calls name; Buddy looks at star | Latency-to-name-response; initiation vs. response rate; social specificity; face-vs-body tap | 18–30m, 30–42m, 42–60m | 2–3 min |
| **B: HELLO** | Gesture imitation — true motor + novel | A3 | Buddy acts on object; contextual action widgets; novel gesture trials | Per-step imitation accuracy; initiation latency; novel imitation; inter-step social monitoring; perseveration | 18–30m (1-step), 30–42m (2-step), 42–60m (3-step) | 2.5 min |
| **C: PEEK** | Object permanence; social referencing; joint attention | A1 + developmental | Hide object under cup; shuffle; Buddy's "confused" social referencing probe | Search accuracy; referencing latency; pre-check impulsivity; per-trial cup taps | 18–30m (2 cups), 30–42m (3 cups), 42–60m (3+shuffle) | 2 min |
| **D: SORT+** | Cognitive flexibility; insistence on sameness; motor | B3 + B1 proxy | Color sort then shape sort; rule switch mid-game | Perseverative errors post-switch; trials to criterion; drag deviation; reaction-time switch cost; social check at switch | 30–42m (color only), 42–60m (full switch) | 2.5 min |
| **E: FOLLOW+** | Sequence memory; rigidity detection; flexibility | B3 | Modified Simon-says with per-step timing and Buddy social pause | Per-step latency; modified-step pause; followed_modification; social check during pause; perseverative taps | 42–60m only | 2.5 min |

**Total session time:** 11–13 minutes across all 5 modules for 42–60m band. Approximately 7–9 minutes for 30–42m (Modules A, B, C, D-simple). Approximately 5–6 minutes for 18–30m (Modules A-simple, B-simple, C-simple).

---

### 5.4 Signal Coverage vs. Clinical Targets

| Clinical Signal | Module Coverage | Improvement Over Current |
|---|---|---|
| Response to name | A (primary) | Not present in current SEED |
| Joint attention initiation | A (primary) | Not present in current SEED |
| Joint attention response | A (secondary) | Current Module 1 (weak) |
| Social referencing | C (primary), D (secondary), E (secondary) | Not present in current SEED |
| Gesture imitation (familiar) | B (partial) | Current Module 2 (but icons, not imitation) |
| Gesture imitation (novel) | B (primary) | Not present in current SEED |
| Object permanence | C (primary) | Not present in current SEED |
| Cognitive flexibility / rule switch | D (primary), E (secondary) | E is minor improvement; D is new |
| Insistence on sameness / rigidity | D (primary), E (primary) | E exists but conflated with working memory; D is new and cleaner |
| Motor precision / drag smoothness | D (secondary) | Current Module 3 (retained) |
| Repetitive/perseverative behavior | B, D, E (all track perseveration) | Not present in current SEED |
| Social vs. nonsocial latency contrast | A vs. D (cleanly separable) | Current SEED mixes within metrics |
| Disengagement context | All modules (context-stamped) | Currently context-free |

---

### 5.5 What Is Deliberately Not Proposed

**Eye tracking / gaze detection via camera:** High clinical value (Klin 2002), but requires camera permission, reliable lighting, and calibration. Not viable in a self-administered browser tool.

**Voice response (name response via microphone):** Would provide cleaner response-to-name data but same access/reliability problem as camera. Module A uses tap-based response-to-name as a reasonable proxy.

**Repetitive movement detection via accelerometer:** Phone sensors could detect stereotyped rocking, but the platform runs on laptop browser. Out of scope.

**Preferential looking paradigm:** Could measure social vs. nonsocial visual preference (the Klin 2002 finding) but requires gaze tracking.

These are flagged for a future native app version.

---

### 5.6 AgeAdapter Restructuring Required

The current two-band split (< 48m / ≥ 48m) must become a three-band split:

```
Band 1: 18–30 months  → Modules A, B, C (simplified variants)
Band 2: 30–42 months  → Modules A, B, C, D (no rule switch)
Band 3: 42–60 months  → Modules A, B, C, D, E (full)
```

Children below 24 months are outside SEED's stated screening range (18 months minimum). The AgeAdapter should hard-gate at `ageMonths >= 18` and should not silently clamp (current code does `Math.max(24, Math.min(60, ageMonths))` — this silently converts a 20-month-old into a 24-month-old).

---

### 5.7 EventCollector Redesign Requirements

1. **Social check events** — new event type: `{ type: 'social_check', module_id, timestamp_ms, trigger: 'buddy_pause' | 'rule_change' | 'confusion', action: 'tap_buddy' | 'tap_other' | 'no_action', latency_ms }`.
2. **Perseveration events** — new event type: `{ type: 'perseveration', module_id, timestamp_ms, position, count }`.
3. **Disengagement context** — extend: `{ ..., context: 'mid_trial' | 'inter_trial' | 'post_feedback', trial_id, preceding_event }`.
4. **Remove `completionRate2`** — it is a duplicate of `completionRate`.
5. **Fix age group string format** — align with backend: `ageGroupMonths: number` instead of `'24-30m'` string, or guarantee the format contract is the same across frontend and analysis engine.
6. **Per-step events in E** — Module E must emit one event per sequence step, not one event per trial (current Module 4 behavior). The existing `FollowEvent` per-step timing extension is the correct direction.

---

## SUMMARY ASSESSMENT OF CURRENT SYSTEM

**What is built well:**
- BaseGameScene inactivity detection is robust and clinically honest (records disengagements correctly)
- Module 3 drag mechanic is well-engineered (deviation calculation, auto-resolve, dual-event emission)
- Module 4's modification detection design is conceptually the right idea
- EventCollector's `mapEvents()` normalization is clean
- AgeAdapter's config interface is extensible
- Buddy's sprite and animation system (BuddySprite) is reusable as-is

**What must change:**
- The 18–30 month age band is completely unhandled — this is the highest-risk population for false negatives
- Module 2 does not measure imitation; it measures icon recognition
- Response to name — the most validated ASD marker — is absent
- Social referencing is absent
- Object permanence is absent
- Cognitive flexibility (Module 3) is actually a categorization task
- Social/nonsocial latency contrast is contaminated by mixing events in `computeMetrics()`
- The EventCollector has no perseveration detection or social-check event type

**Estimated rebuild scope:** Modules A, B, C are new. Module D is a significant redesign of Module 3. Module E is a targeted rework of Module 4. BaseGameScene, BuddySprite, SoundManager, ProgressBar — retain as-is. AgeAdapter — restructure to 3 bands. EventCollector — extend (do not replace; the interface is correct, the schema needs additions).

---

*Research complete. No game code written. Ready for design approval before implementation.*
