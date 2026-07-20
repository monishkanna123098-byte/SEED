/**
 * S.E.E.D. Game Event Collector
 *
 * Accumulates raw events from all 4 Buddy's World modules.
 * On completion, computes summary metrics and produces the
 * payload POSTed to /api/screening/game-complete.
 *
 * Each module's interface captures the rich, typed data that module
 * needs for its own gameplay/metrics. `mapEvents()` normalizes all of
 * these into the flat shape expected by the analysis engine's
 * GameEvent schema (main.py) and landmark_extractor.py signal
 * extraction functions.
 */

import type { ModuleKey } from '../utils/AgeAdapter'
import { getModuleSequence, getAgeBand } from '../utils/AgeAdapter'

// ─── Module 1: Joint Attention (Gaze) ────────────────────────────────────────
export interface GazeEvent {
  type: 'tap'
  trial_id: number
  stimulus_onset_ms: number
  response_ms: number
  target_card: string
  tapped_card: string
  correct: boolean
  reaction_time_ms: number
  tap_x: number
  tap_y: number
  stimulus_type: 'social'
}

// ─── Module 2: Peer Imitation ────────────────────────────────────────────────
// One event per gesture STEP within a trial (not per trial), so
// extract_imitation_signals can compute per-step accuracy/latency/sequence
// weighting directly.
export interface ImitateEvent {
  type: 'imitation_attempt'
  trial_id: number
  timestamp_ms: number
  sequence_shown: string[]
  sequence_tapped: string[]
  sequence_step: number      // 1-indexed position within this trial
  sequence_length: number    // total steps in this trial's sequence
  is_correct: boolean
  latency_ms: number
  stimulus_type: 'social'
}

// ─── Module 3: Object Sorting ────────────────────────────────────────────────
export interface DragPoint {
  x: number
  y: number
  t: number
}

export interface SortEvent {
  type: 'tap' | 'drag'
  object_id: number
  timestamp_ms: number
  color: string
  shape: string
  target_bin: string
  drop_bin: string
  correct: boolean
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

// ─── Module 4: Sequence Following ────────────────────────────────────────────
export interface FollowEvent {
  type: 'response'
  trial_id: number
  timestamp_ms: number
  original_sequence: number[]
  shown_sequence: number[]
  tapped_sequence: number[]
  was_modified: boolean
  followed_modification: boolean
  response_time_ms: number
  accuracy: number   // 0 or 1
  stimulus_type: 'nonsocial'
}

export interface DisengagementEvent {
  timestamp: number
  duration_ms: number
  module: string
  context: DisengagementContext
  preceding_event: PrecedingEvent
  trial_id: number | null
}

export type DisengagementContext = 'mid_trial' | 'inter_trial' | 'post_feedback'
export type PrecedingEvent =
  | 'buddy_call'
  | 'trial_failure'
  | 'trial_success'
  | 'rule_change'
  | 'social_check_prompt'
  | 'none'

// ─── Generic, module-agnostic infrastructure (sub-project 3) ────────────────
// Cross-cutting mechanics used by multiple new modules — social-check
// (Modules C, D, E) and perseveration (Modules B, D, E) — collected the
// same way regardless of which specific module triggers them, the same
// way DisengagementEvent already worked generically across every module.
// See docs/superpowers/specs/2026-07-18-eventcollector-schema-design.md
export interface SocialCheckEvent {
  type: 'social_check'
  module: ModuleKey
  timestamp_ms: number
  trigger: 'buddy_pause' | 'rule_change' | 'confusion'
  action: 'tap_buddy' | 'tap_other' | 'no_action'
  latency_ms: number | null // null when action is 'no_action' — nothing to time
}

export interface PerseverationEvent {
  type: 'perseveration'
  module: ModuleKey
  timestamp_ms: number
  position: string // module-defined identifier of what was repeated — deliberately free-form, see design spec §4
  count: number
}

export interface GameMetrics {
  reaction_latency_mean: number
  touch_precision_mean: number
  imitation_accuracy: number
  rigidity_score: number
  social_following_ratio: number
  flexibility_score: number
}

export interface GameCompletionPayload {
  sessionId: string
  childAgeMonths: number
  totalDurationMs: number
  completionRate: number
  modulesCompleted: string[]
  disengagementEvents: DisengagementEvent[]
  disengagementCount: number
  gameMetrics: GameMetrics
  // Flat fields expected by /api/screening/game-complete
  reactionLatencyMean: number
  touchPrecisionScore: number
  imitationAccuracy: number
  rigidityScore: number
  // Normalized events for the analysis engine (GameEvent schema)
  events: Record<string, unknown>[]
  ageGroup: string
  gameModuleId: string
}

// ─── Module A: LOOK ──────────────────────────────────────────────────────
// See docs/superpowers/specs/2026-07-18-module-a-look-design.md §3
export interface NameCallEvent {
  type: 'name_call'
  trial_id: number
  timestamp_ms: number
  response_target: 'buddy_face' | 'buddy_body' | 'other_character' | 'none'
  latency_ms: number | null // null when response_target is 'none' (timed out)
  stimulus_type: 'social'
}

export interface JointAttentionEvent {
  type: 'joint_attention'
  trial_id: number
  timestamp_ms: number // when the star first appeared
  cue_onset_ms: number | null // when Buddy's gaze cue fired; null if tapped before the cue ever fired
  tap_ms: number | null // null if no tap at all
  initiated: boolean // true if the tap happened before cue_onset_ms (or the cue never fired)
  correct: boolean
  stimulus_type: 'social'
}

export type LookEvent = NameCallEvent | JointAttentionEvent

export class EventCollector {
  private sessionId: string
  private ageMonths: number
  private startTime: number

  private module1Events: GazeEvent[] = []
  private module2Events: ImitateEvent[] = []
  private module3Events: SortEvent[] = []
  private module4Events: FollowEvent[] = []
  private disengagementEvents: DisengagementEvent[] = []
  private socialCheckEvents: SocialCheckEvent[] = []
  private perseverationEvents: PerseverationEvent[] = []
  private lookEvents: LookEvent[] = []
  private modulesCompleted: string[] = []

  constructor(sessionId: string, ageMonths: number) {
    // Fail fast: getAgeGroup() (called inside buildCompletionPayload, at
    // session END) now depends on getAgeBand(), which throws below the
    // floor. Validating here instead means a bad age surfaces immediately
    // at session start, not after 10 minutes of collected data is lost.
    getAgeBand(ageMonths)
    this.sessionId = sessionId
    this.ageMonths = ageMonths
    this.startTime = Date.now()
  }

  getElapsedMs(): number {
    return Date.now() - this.startTime
  }

  // ── Per-module event recording ──────────────────────────────────────────────
  addGazeEvent(event: GazeEvent): void {
    this.module1Events.push(event)
  }

  addImitateEvent(event: ImitateEvent): void {
    this.module2Events.push(event)
  }

  addSortEvent(event: SortEvent): void {
    this.module3Events.push(event)
  }

  addFollowEvent(event: FollowEvent): void {
    this.module4Events.push(event)
  }

  /**
   * Extended per sub-project 3's spec §3. The three new params default
   * to values matching the ONE existing call site (BaseGameScene's
   * inactivity-advance timer), traced directly rather than guessed:
   * it always fires after onInactivityCall() already played Buddy's
   * call animation, and always mid-response, never between trials.
   * Old call sites (3 args) are unaffected.
   */
  addDisengagement(
    module: string,
    timestamp: number,
    durationMs: number,
    context: DisengagementContext = 'mid_trial',
    precedingEvent: PrecedingEvent = 'buddy_call',
    trialId: number | null = null
  ): void {
    this.disengagementEvents.push({
      timestamp,
      duration_ms: durationMs,
      module,
      context,
      preceding_event: precedingEvent,
      trial_id: trialId,
    })
  }

  /** Generic, module-agnostic — any of the new modules can call this
   *  during a confusion/pause/rule-change moment. See design spec §4. */
  addSocialCheckEvent(event: SocialCheckEvent): void {
    this.socialCheckEvents.push(event)
  }

  /** Generic, module-agnostic — any of the new modules can call this
   *  when a perseverative repeat is detected. See design spec §4. */
  addPerseverationEvent(event: PerseverationEvent): void {
    this.perseverationEvents.push(event)
  }

  addLookEvent(event: LookEvent): void {
    this.lookEvents.push(event)
  }

  // ── Module completion tracking ──────────────────────────────────────────────
  markModuleComplete(moduleId: string): void {
    if (!this.modulesCompleted.includes(moduleId)) {
      this.modulesCompleted.push(moduleId)
    }
  }

  getCompletedModules(): string[] {
    return [...this.modulesCompleted]
  }

  // ── Metric computation (EventCollector's own summary) ────────────────────────
  private computeMetrics(): GameMetrics {
    const socialLatencies: number[] = [
      ...this.module1Events
        .filter((e) => e.correct && e.reaction_time_ms > 50 && e.reaction_time_ms < 5000)
        .map((e) => e.reaction_time_ms),
      ...this.module2Events
        .filter((e) => e.latency_ms > 50 && e.latency_ms < 5000)
        .map((e) => e.latency_ms),
    ]
    const reaction_latency_mean =
      socialLatencies.length > 0
        ? socialLatencies.reduce((a, b) => a + b, 0) / socialLatencies.length
        : 1200

    const precisions = this.module3Events
      .filter((e) => e.precision_error_px >= 0)
      .map((e) => Math.max(0, 1 - e.precision_error_px / 120))
    const touch_precision_mean =
      precisions.length > 0
        ? precisions.reduce((a, b) => a + b, 0) / precisions.length
        : 0.65

    const correctImitations = this.module2Events.filter((e) => e.is_correct).length
    const imitation_accuracy =
      this.module2Events.length > 0
        ? correctImitations / this.module2Events.length
        : 0.5

    const modifiedTrials = this.module4Events.filter((e) => e.was_modified)
    const rigidResponses = modifiedTrials.filter((e) => !e.followed_modification).length
    const rigidity_score =
      modifiedTrials.length > 0 ? rigidResponses / modifiedTrials.length : 0

    const correctGaze = this.module1Events.filter((e) => e.correct).length
    const social_following_ratio =
      this.module1Events.length > 0
        ? correctGaze / this.module1Events.length
        : 0.5

    const flexibleResponses = modifiedTrials.filter((e) => e.followed_modification).length
    const flexibility_score =
      modifiedTrials.length > 0 ? flexibleResponses / modifiedTrials.length : 0.5

    return {
      reaction_latency_mean,
      touch_precision_mean,
      imitation_accuracy,
      rigidity_score,
      social_following_ratio,
      flexibility_score,
    }
  }

  /**
   * Fixed per sub-project 3's spec §6. Previously produced a stale
   * six-bucket format ('24-30m' etc.) borrowed from the analysis
   * engine's own video-normative lookup — a different, legitimate
   * subsystem serving a different modality, not something this game
   * session's ageGroup label should have been copying. Traced the
   * actual data flow: this field is stored on GameSession for display
   * only and never reaches scoring (processGameData forwards only
   * session_id/child_age_months/game_events), so this was never a
   * scoring bug — just a label that would mislead a clinician reading
   * it, since it had nothing to do with which modules actually ran.
   */
  private getAgeGroup(): string {
    return `${getAgeBand(this.ageMonths)}_${this.ageMonths}m`
  }

  // ── Normalization for analysis engine ────────────────────────────────────────
  private mapEvents(): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = []

    for (const e of this.module1Events) {
      out.push({
        type: 'tap',
        module_id: 'module1_gaze',
        trial_index: e.trial_id,
        timestamp: e.stimulus_onset_ms,
        latency_ms: e.reaction_time_ms,
        is_correct: e.correct,
        stimulus_type: 'social',
        actual_x: e.tap_x,
        actual_y: e.tap_y,
      })
    }

    for (const e of this.module2Events) {
      out.push({
        type: 'imitation_attempt',
        module_id: 'module2_imitate',
        trial_index: e.trial_id,
        timestamp: e.timestamp_ms,
        latency_ms: e.latency_ms,
        is_correct: e.is_correct,
        sequence_step: e.sequence_step,
        sequence_length: e.sequence_length,
        stimulus_type: 'social',
      })
    }

    for (const e of this.module3Events) {
      // Primary 'tap' entry — drives accuracy_score / motor_consistency
      out.push({
        type: 'tap',
        module_id: 'module3_sort',
        trial_index: e.object_id,
        timestamp: e.timestamp_ms,
        target_x: e.target_x,
        target_y: e.target_y,
        actual_x: e.actual_x,
        actual_y: e.actual_y,
        target_radius: e.target_radius,
        latency_ms: e.reaction_time_ms,
        is_correct: e.correct,
        stimulus_type: 'nonsocial',
      })
      // Secondary 'drag' entry — only when a real drag path was recorded.
      // Drives drag_smoothness.
      if (e.drag_path.length > 1) {
        out.push({
          type: 'drag',
          module_id: 'module3_sort',
          trial_index: e.object_id,
          timestamp: e.timestamp_ms,
          drag_path_deviation: e.drag_path_deviation,
          stimulus_type: 'nonsocial',
        })
      }
    }

    for (const e of this.module4Events) {
      out.push({
        type: 'response',
        module_id: 'module4_follow',
        trial_index: e.trial_id,
        timestamp: e.timestamp_ms,
        latency_ms: e.response_time_ms,
        is_correct: e.accuracy === 1,
        response_type: e.was_modified
          ? (e.followed_modification ? 'adapted' : 'rigid')
          : 'standard',
        stimulus_type: 'nonsocial',
      })
    }

    for (const d of this.disengagementEvents) {
      out.push({
        type: 'disengage',
        module_id: d.module,
        timestamp: d.timestamp,
        latency_ms: d.duration_ms,
        stimulus_type: 'nonsocial',
      })
    }

    // Generic infrastructure (sub-project 3). NOTE: main.py's GameEvent
    // Pydantic model doesn't yet have trigger/action/position/count fields
    // (confirmed by inspection — it's one flat model, not a discriminated
    // union). These parse without error today but carry zero signal until
    // the analysis engine sub-project adds them. See design spec §5.
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

    for (const e of this.lookEvents) {
      if (e.type === 'name_call') {
        out.push({
          type: 'name_call',
          module_id: 'LOOK',
          trial_index: e.trial_id,
          timestamp: e.timestamp_ms,
          response_target: e.response_target,
          latency_ms: e.latency_ms,
          is_correct: e.response_target === 'buddy_face' || e.response_target === 'buddy_body',
          stimulus_type: 'social',
        })
      } else {
        out.push({
          type: 'joint_attention',
          module_id: 'LOOK',
          trial_index: e.trial_id,
          timestamp: e.timestamp_ms,
          cue_onset_ms: e.cue_onset_ms,
          latency_ms: e.tap_ms !== null ? e.tap_ms - e.timestamp_ms : null,
          initiated: e.initiated,
          is_correct: e.correct,
          stimulus_type: 'social',
        })
      }
    }

    return out
  }

  buildCompletionPayload(): GameCompletionPayload {
    const totalDurationMs = Date.now() - this.startTime
    const metrics = this.computeMetrics()
    // Fixed: was hardcoded to 4, which caps completionRate at 0.75 for a
    // fully-completed Band 1 session (3 modules) or double-penalizes/
    // under-credits any band whose module count isn't exactly 4 — a bug
    // this exact age-band restructuring (Stage B) introduced. Found
    // while implementing this, not in the original design spec.
    const totalModules = getModuleSequence(this.ageMonths).length
    const completionRate = this.modulesCompleted.length / totalModules

    return {
      sessionId: this.sessionId,
      childAgeMonths: this.ageMonths,
      totalDurationMs,
      completionRate,
      modulesCompleted: [...this.modulesCompleted],
      disengagementEvents: [...this.disengagementEvents],
      disengagementCount: this.disengagementEvents.length,
      gameMetrics: metrics,
      reactionLatencyMean: metrics.reaction_latency_mean,
      touchPrecisionScore: metrics.touch_precision_mean,
      imitationAccuracy: metrics.imitation_accuracy,
      rigidityScore: metrics.rigidity_score,
      events: this.mapEvents(),
      ageGroup: this.getAgeGroup(),
      gameModuleId: 'buddys-world-combined',
    }
  }
}
