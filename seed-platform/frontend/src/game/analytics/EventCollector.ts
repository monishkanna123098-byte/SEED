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
  completionRate2: number
  // Normalized events for the analysis engine (GameEvent schema)
  events: Record<string, unknown>[]
  ageGroup: string
  gameModuleId: string
}

export class EventCollector {
  private sessionId: string
  private ageMonths: number
  private startTime: number

  private module1Events: GazeEvent[] = []
  private module2Events: ImitateEvent[] = []
  private module3Events: SortEvent[] = []
  private module4Events: FollowEvent[] = []
  private disengagementEvents: DisengagementEvent[] = []
  private modulesCompleted: string[] = []

  constructor(sessionId: string, ageMonths: number) {
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

  addDisengagement(module: string, timestamp: number, durationMs: number): void {
    this.disengagementEvents.push({ timestamp, duration_ms: durationMs, module })
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

  private getAgeGroup(): string {
    if (this.ageMonths < 30) return '24-30m'
    if (this.ageMonths < 36) return '30-36m'
    if (this.ageMonths < 42) return '36-42m'
    if (this.ageMonths < 48) return '42-48m'
    if (this.ageMonths < 54) return '48-54m'
    return '54-60m'
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

    return out
  }

  buildCompletionPayload(): GameCompletionPayload {
    const totalDurationMs = Date.now() - this.startTime
    const metrics = this.computeMetrics()
    const totalModules = 4
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
      completionRate2: completionRate,
      events: this.mapEvents(),
      ageGroup: this.getAgeGroup(),
      gameModuleId: 'buddys-world-combined',
    }
  }
}
