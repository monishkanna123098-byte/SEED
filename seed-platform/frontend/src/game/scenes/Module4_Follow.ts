/**
 * S.E.E.D. — Buddy's World
 * Module4_Follow.ts — Sequence Following (DSM-5 Criterion B2)
 *
 * Two-phase Simon-says trial:
 *   PHASE 1: flash the original_sequence
 *   PHASE 2 (REPLAY): flash shown_sequence — on modified trials, ONE step
 *     is secretly changed from the original
 *   RESPONSE: child reproduces what they just saw (shown_sequence)
 *
 * A flexible child adapts and taps the REPLAY's changed value.
 * A rigid child taps the now-stale ORIGINAL value at that position,
 * ignoring the change they just watched.
 */

import Phaser from 'phaser'
import { BaseGameScene, CANVAS_WIDTH } from './BaseGameScene'
import { FollowEvent } from '../analytics/EventCollector'

const CIRCLE_COLORS = [0x02c39a, 0xf4a261, 0x065a82, 0xe63946]
const CIRCLE_POS = [
  { x: 280, y: 260 },
  { x: 500, y: 260 },
  { x: 280, y: 440 },
  { x: 500, y: 440 },
]
const CIRCLE_RADIUS = 68

export class Module4_Follow extends BaseGameScene {
  constructor() {
    super('Module4_Follow')
  }

  protected moduleIndex = 3
  protected moduleKey = 'module4_follow'

  private trialIndex = 0
  private totalTrials = 6
  private modifiedFlags: boolean[] = []
  private circles: Phaser.GameObjects.Arc[] = []
  private circlesEnabled = false

  private originalSequence: number[] = []
  private shownSequence: number[] = []
  private tappedSequence: number[] = []
  private wasModified = false
  private modIndex = -1

  private responsePhaseActive = false
  private responseStartMs = 0
  private responseTimer?: Phaser.Time.TimerEvent

  protected onCreate(): void {
    const cfg = this.ageAdapter.getConfig().follow
    this.totalTrials = cfg.trials
    this.modifiedFlags = this.buildModifiedFlags(this.totalTrials, cfg.modifiedTrialProportion)

    this.buddy.setPosition(110, 250)
    this.buddy.setScale(0.85)

    this.createCircles()
    this.startTrial()
  }

  protected forceAdvance(): void {
    this.responseTimer?.remove()

    if (this.responsePhaseActive) {
      this.finalizeTrial()
    } else {
      const seq = this.originalSequence.length > 0 ? this.originalSequence : [0]
      const shown = this.shownSequence.length > 0 ? this.shownSequence : seq
      this.recordEmptyTrial(this.trialIndex, seq, shown, this.wasModified)
      this.trialIndex++
    }

    for (let t = this.trialIndex; t < this.totalTrials; t++) {
      const length = this.getSequenceLength(t)
      const seq = Array.from({ length }, () => 0)
      this.recordEmptyTrial(t, seq, seq, this.modifiedFlags[t])
    }

    this.completeModule()
  }

  // ── Setup ────────────────────────────────────────────────────────────────────

  private getSequenceLength(trialIdx: number): number {
    const cfg = this.ageAdapter.getConfig().follow
    const span = Math.max(1, cfg.maxSequenceLength - 1)
    const divisor = Math.max(1, Math.ceil(this.totalTrials / span))
    return Math.min(cfg.maxSequenceLength, 2 + Math.floor(trialIdx / divisor))
  }

  /** Exactly round(n * proportion) trials get a secret replay modification. */
  private buildModifiedFlags(n: number, proportion: number): boolean[] {
    const modCount = Math.round(n * proportion)
    const flags = Array.from({ length: n }, (_, i) => i < modCount)
    return Phaser.Utils.Array.Shuffle(flags)
  }

  private createCircles(): void {
    CIRCLE_POS.forEach((pos, i) => {
      const circle = this.add.circle(pos.x, pos.y, CIRCLE_RADIUS, CIRCLE_COLORS[i])
      circle.setStrokeStyle(4, 0xffffff)
      circle.setAlpha(0.55)
      circle.setInteractive(
        new Phaser.Geom.Circle(0, 0, CIRCLE_RADIUS),
        Phaser.Geom.Circle.Contains
      )
      circle.on('pointerdown', () => {
        if (!this.circlesEnabled) return
        this.onCircleTap(i)
      })
      this.circles.push(circle)
    })
  }

  private setCirclesEnabled(enabled: boolean): void {
    this.circlesEnabled = enabled
    this.circles.forEach((c) => {
      this.tweens.add({ targets: c, alpha: enabled ? 1 : 0.55, duration: 200 })
    })
  }

  // ── Trial flow ───────────────────────────────────────────────────────────────

  private startTrial(): void {
    if (this.trialIndex >= this.totalTrials) {
      this.completeModule()
      return
    }

    const length = this.getSequenceLength(this.trialIndex)
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
    this.responsePhaseActive = false
    this.setCirclesEnabled(false)
    this.buddy.resetLook(200)

    this.time.delayedCall(500, () => {
      this.playSequence(this.originalSequence, 0, () => {
        this.time.delayedCall(650, () => {
          this.playSequence(this.shownSequence, 0, () => this.startResponsePhase())
        })
      })
    })
  }

  private playSequence(seq: number[], idx: number, onComplete: () => void): void {
    if (idx >= seq.length) {
      onComplete()
      return
    }
    const cfg = this.ageAdapter.getConfig().follow
    this.flashCircle(seq[idx], cfg.litDurationMs, () => {
      this.time.delayedCall(cfg.betweenFlashMs, () => this.playSequence(seq, idx + 1, onComplete))
    })
  }

  private flashCircle(index: number, durationMs: number, onComplete?: () => void): void {
    const circle = this.circles[index]
    this.soundManager.playCircleFlash(index)

    const pos = CIRCLE_POS[index]
    const glow = this.add.circle(pos.x, pos.y, CIRCLE_RADIUS + 8, 0xffffff, 0.55)
    glow.setDepth(40)

    this.tweens.add({
      targets: circle,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: Math.max(120, durationMs * 0.4),
      yoyo: true,
    })
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

  private startResponsePhase(): void {
    this.responsePhaseActive = true
    this.responseStartMs = this.eventCollector.getElapsedMs()
    this.setCirclesEnabled(true)

    const cfg = this.ageAdapter.getConfig().follow
    this.responseTimer = this.time.delayedCall(cfg.responseWindowMs, () => {
      if (this.responsePhaseActive) this.finalizeTrial()
    })
  }

  private onCircleTap(index: number): void {
    if (!this.responsePhaseActive) return
    this.resetInactivityTimer()

    this.tappedSequence.push(index)
    this.pulseCircle(index)
    this.soundManager.play('tap')

    if (this.tappedSequence.length >= this.shownSequence.length) {
      this.responseTimer?.remove()
      this.finalizeTrial()
    }
  }

  private pulseCircle(index: number): void {
    const circle = this.circles[index]
    this.tweens.add({ targets: circle, scaleX: 1.2, scaleY: 1.2, duration: 100, yoyo: true })
  }

  private finalizeTrial(): void {
    if (!this.responsePhaseActive) return
    this.responsePhaseActive = false
    this.setCirclesEnabled(false)

    const now = this.eventCollector.getElapsedMs()
    const responseTimeMs = now - this.responseStartMs

    const accuracy =
      this.tappedSequence.length === this.shownSequence.length &&
      this.tappedSequence.every((v, i) => v === this.shownSequence[i])
        ? 1
        : 0

    let followedModification = false
    if (this.wasModified && this.modIndex >= 0 && this.modIndex < this.tappedSequence.length) {
      followedModification = this.tappedSequence[this.modIndex] === this.shownSequence[this.modIndex]
    }

    const event: FollowEvent = {
      type: 'response',
      trial_id: this.trialIndex,
      timestamp_ms: now,
      original_sequence: [...this.originalSequence],
      shown_sequence: [...this.shownSequence],
      tapped_sequence: [...this.tappedSequence],
      was_modified: this.wasModified,
      followed_modification: followedModification,
      response_time_ms: Math.max(0, responseTimeMs),
      accuracy,
      stimulus_type: 'nonsocial',
    }
    this.eventCollector.addFollowEvent(event)

    if (accuracy === 1) {
      this.soundManager.play('success')
      this.buddy.playCheer(() => this.nextTrial())
    } else {
      this.soundManager.play('try_again')
      this.buddy.playEncourage(() => this.nextTrial())
    }
  }

  private recordEmptyTrial(
    trialIdx: number,
    original: number[],
    shown: number[],
    wasModified: boolean
  ): void {
    const responseWindowMs = this.ageAdapter.getConfig().follow.responseWindowMs
    this.eventCollector.addFollowEvent({
      type: 'response',
      trial_id: trialIdx,
      timestamp_ms: this.eventCollector.getElapsedMs(),
      original_sequence: [...original],
      shown_sequence: [...shown],
      tapped_sequence: [],
      was_modified: wasModified,
      followed_modification: false,
      response_time_ms: responseWindowMs,
      accuracy: 0,
      stimulus_type: 'nonsocial',
    })
  }

  private nextTrial(): void {
    this.trialIndex++
    this.time.delayedCall(450, () => this.startTrial())
  }

  private completeModule(): void {
    this.eventCollector.markModuleComplete(this.moduleKey)
    this.soundManager.play('completion')
    this.playCompletionBurst(CANVAS_WIDTH / 2, 300)
    this.buddy.playCheer(() => {
      this.time.delayedCall(600, () => this.fadeToScene('ResultScene'))
    })
  }
}
