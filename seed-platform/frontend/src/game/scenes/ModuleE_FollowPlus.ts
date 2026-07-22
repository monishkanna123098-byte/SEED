/**
 * S.E.E.D. — Buddy's World
 * ModuleE_FollowPlus.ts
 *
 * Sequence memory + rigidity detection via per-step timing. Design spec:
 * docs/superpowers/specs/2026-07-18-module-e-followplus-design.md
 *
 * Adapts Module4_Follow.ts's proven two-phase Simon-says structure
 * (original sequence, replay with a possible secret modification,
 * response phase) — that structure isn't broken, and Buddy's confusion-
 * check pause plus real per-step timing are what's actually new.
 */

import Phaser from 'phaser'
import { BaseGameScene, CANVAS_WIDTH } from './BaseGameScene'
import { getFollowPlusConfig, type FollowPlusModuleConfig } from '../utils/AgeAdapter'
import { sequenceLengthForTrial, buildModifiedFlags, isPerseverativeStep } from './followPlusLogic'

const CIRCLE_COLORS = [0x02c39a, 0xf4a261, 0x065a82, 0xe63946]
const CIRCLE_POS = [
  { x: 280, y: 260 },
  { x: 500, y: 260 },
  { x: 280, y: 440 },
  { x: 500, y: 440 },
]
const CIRCLE_RADIUS = 68

export class ModuleE_FollowPlus extends BaseGameScene {
  protected moduleKey = 'FOLLOW_PLUS'

  private cfg!: FollowPlusModuleConfig
  private trialIndex = 0
  private modifiedFlags: boolean[] = []
  private circles: Phaser.GameObjects.Arc[] = []
  private circlesEnabled = false

  private originalSequence: number[] = []
  private shownSequence: number[] = []
  private tappedSequence: number[] = []
  private tapTimestamps: number[] = []
  private wasModified = false
  private modIndex = -1

  private responsePhaseActive = false
  private responseStartMs = 0
  private responseTimer?: Phaser.Time.TimerEvent

  private checkWindowOpen = false
  private checkWindowStartMs = 0
  private checkWindowResolved = false

  protected onCreate(): void {
    this.cfg = getFollowPlusConfig(this.ageMonths)
    this.modifiedFlags = buildModifiedFlags(this.cfg.trials, this.cfg.modifiedTrialProportion)

    this.buddy.setPosition(110, 250)
    this.buddy.setScale(0.85)

    // Called ONCE here, not per-trial — enableInteraction() adds
    // persistent listeners; calling it fresh every modified trial
    // (which recur across the session, unlike Module D's one-time
    // rule switch) would stack duplicate listeners.
    this.buddy.enableInteraction(() => this.handleBuddyTapDuringCheck())

    this.createCircles()
    this.startTrial()
  }

  protected forceAdvance(): void {
    this.responseTimer?.remove()
    if (this.responsePhaseActive) {
      this.finalizeTrial()
    } else {
      this.completeModule()
    }
  }

  // ── Setup ──────────────────────────────────────────────────────────────

  private createCircles(): void {
    CIRCLE_POS.forEach((pos, i) => {
      const circle = this.add.circle(pos.x, pos.y, CIRCLE_RADIUS, CIRCLE_COLORS[i])
      circle.setStrokeStyle(4, 0xffffff)
      circle.setAlpha(0.55)
      circle.setInteractive(new Phaser.Geom.Circle(0, 0, CIRCLE_RADIUS), Phaser.Geom.Circle.Contains)
      circle.on('pointerdown', () => {
        if (!this.circlesEnabled) return
        this.onCircleTap(i)
      })
      this.circles.push(circle)
    })
  }

  private setCirclesEnabled(enabled: boolean): void {
    this.circlesEnabled = enabled
    this.circles.forEach((c) => this.tweens.add({ targets: c, alpha: enabled ? 1 : 0.55, duration: 200 }))
  }

  // ── Trial flow ────────────────────────────────────────────────────────

  private startTrial(): void {
    if (this.trialIndex >= this.cfg.trials) {
      this.completeModule()
      return
    }

    const length = sequenceLengthForTrial(this.trialIndex, this.cfg.trials, this.cfg.sequenceLengthRange)
    this.originalSequence = Array.from({ length }, () => Phaser.Math.Between(0, 3))
    this.wasModified = this.modifiedFlags[this.trialIndex]

    if (this.wasModified) {
      this.modIndex = Phaser.Math.Between(0, length - 1)
      this.shownSequence = [...this.originalSequence]
      let newColor: number
      do {
        newColor = Phaser.Math.Between(0, 3)
      } while (newColor === this.originalSequence[this.modIndex])
      this.shownSequence[this.modIndex] = newColor
    } else {
      this.modIndex = -1
      this.shownSequence = [...this.originalSequence]
    }

    this.tappedSequence = []
    this.tapTimestamps = []
    this.responsePhaseActive = false
    this.setCirclesEnabled(false)
    this.buddy.resetLook(200)

    this.time.delayedCall(500, () => {
      this.playSequence(this.originalSequence, 0, () => {
        this.time.delayedCall(650, () => {
          this.playSequence(this.shownSequence, 0, () => {
            if (this.wasModified) {
              this.startSocialCheckPause(() => this.startResponsePhase())
            } else {
              this.startResponsePhase()
            }
          })
        })
      })
    })
  }

  private playSequence(seq: number[], idx: number, onComplete: () => void): void {
    if (idx >= seq.length) {
      onComplete()
      return
    }
    this.flashCircle(seq[idx], 550, () => {
      this.time.delayedCall(300, () => this.playSequence(seq, idx + 1, onComplete))
    })
  }

  private flashCircle(index: number, durationMs: number, onComplete?: () => void): void {
    const circle = this.circles[index]
    this.soundManager.playCircleFlash(index)
    const pos = CIRCLE_POS[index]
    const glow = this.add.circle(pos.x, pos.y, CIRCLE_RADIUS + 8, 0xffffff, 0.55)
    glow.setDepth(40)
    this.tweens.add({ targets: circle, scaleX: 1.15, scaleY: 1.15, duration: Math.max(120, durationMs * 0.4), yoyo: true })
    this.tweens.add({
      targets: glow,
      alpha: 0,
      scale: 1.35,
      duration: durationMs,
      onComplete: () => {
        glow.destroy()
        onComplete?.()
      },
    })
  }

  // ── Social-check pause (modified trials only) ────────────────────────────

  private startSocialCheckPause(onComplete: () => void): void {
    this.checkWindowOpen = true
    this.checkWindowResolved = false
    this.checkWindowStartMs = this.eventCollector.getElapsedMs()
    this.buddy.playCurious()

    this.time.delayedCall(this.cfg.socialCheckWindowMs, () => {
      this.checkWindowOpen = false
      if (!this.checkWindowResolved) {
        this.checkWindowResolved = true
        this.eventCollector.addSocialCheckEvent({
          type: 'social_check',
          module: 'FOLLOW_PLUS',
          timestamp_ms: this.checkWindowStartMs,
          trigger: 'confusion',
          action: 'no_action',
          latency_ms: null,
        })
      }
      onComplete()
    })
  }

  private handleBuddyTapDuringCheck(): void {
    if (!this.checkWindowOpen || this.checkWindowResolved) return
    this.checkWindowResolved = true
    const latency = this.eventCollector.getElapsedMs() - this.checkWindowStartMs
    this.eventCollector.addSocialCheckEvent({
      type: 'social_check',
      module: 'FOLLOW_PLUS',
      timestamp_ms: this.checkWindowStartMs,
      trigger: 'confusion',
      action: 'tap_buddy',
      latency_ms: latency,
    })
  }

  // ── Response phase ────────────────────────────────────────────────────

  private startResponsePhase(): void {
    this.responsePhaseActive = true
    this.responseStartMs = this.eventCollector.getElapsedMs()
    this.setCirclesEnabled(true)
    this.responseTimer = this.time.delayedCall(this.cfg.responseWindowMs, () => {
      if (this.responsePhaseActive) this.finalizeTrial()
    })
  }

  private onCircleTap(index: number): void {
    if (!this.responsePhaseActive) return
    this.resetInactivityTimer()

    const now = this.eventCollector.getElapsedMs()
    this.tappedSequence.push(index)
    this.tapTimestamps.push(now)
    this.pulseCircle(index)
    this.soundManager.play('tap')

    // Perseveration check (Signal E5) — per-step, via the generic
    // infrastructure, as each tap comes in rather than only at the end.
    const stepIdx = this.tappedSequence.length - 1
    if (isPerseverativeStep(this.tappedSequence, this.shownSequence, stepIdx)) {
      this.eventCollector.addPerseverationEvent({
        type: 'perseveration',
        module: 'FOLLOW_PLUS',
        timestamp_ms: now,
        position: String(index),
        count: 2,
      })
    }

    if (this.tappedSequence.length >= this.shownSequence.length) {
      this.responseTimer?.remove()
      this.finalizeTrial()
    }
  }

  private pulseCircle(index: number): void {
    this.tweens.add({ targets: this.circles[index], scaleX: 1.2, scaleY: 1.2, duration: 100, yoyo: true })
  }

  // ── Resolution — per-step events, not per-trial ──────────────────────────

  private finalizeTrial(): void {
    if (!this.responsePhaseActive) return
    this.responsePhaseActive = false
    this.setCirclesEnabled(false)

    const now = this.eventCollector.getElapsedMs()
    const trialId = this.trialIndex + 1

    for (let step = 0; step < this.shownSequence.length; step++) {
      const hasTap = step < this.tappedSequence.length
      const tapped = hasTap ? this.tappedSequence[step] : null
      const tapTime = hasTap ? this.tapTimestamps[step] : null
      const prevTime = step === 0 ? this.responseStartMs : this.tapTimestamps[step - 1] ?? this.responseStartMs
      const latencyMs = tapTime !== null ? tapTime - prevTime : null

      this.eventCollector.addFollowPlusStepEvent({
        type: 'follow_step',
        trial_id: trialId,
        sequence_step: step + 1,
        sequence_length: this.shownSequence.length,
        timestamp_ms: tapTime ?? now,
        latency_ms: latencyMs,
        tapped_position: tapped,
        expected_position: this.shownSequence[step],
        is_correct: tapped === this.shownSequence[step],
        is_modified_step: this.wasModified && step === this.modIndex,
        was_modified_trial: this.wasModified,
        stimulus_type: 'nonsocial',
      })
    }

    const accuracy = this.tappedSequence.length === this.shownSequence.length && this.tappedSequence.every((v, i) => v === this.shownSequence[i])

    if (accuracy) {
      this.soundManager.play('success')
      this.buddy.playCheer(() => this.nextTrial())
    } else {
      this.soundManager.play('try_again')
      this.buddy.playEncourage(() => this.nextTrial())
    }
  }

  private nextTrial(): void {
    this.trialIndex++
    this.time.delayedCall(450, () => this.startTrial())
  }

  // ── Completion ────────────────────────────────────────────────────────

  private completeModule(): void {
    this.eventCollector.markModuleComplete('FOLLOW_PLUS')
    this.soundManager.play('completion')
    this.playCompletionBurst(CANVAS_WIDTH / 2, 300)
    this.buddy.playCheer(() => {
      this.time.delayedCall(600, () => this.fadeToScene('ResultScene'))
    })
  }
}
