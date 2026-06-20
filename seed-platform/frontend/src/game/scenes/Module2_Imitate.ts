/**
 * S.E.E.D. — Buddy's World
 * Module2_Imitate.ts — Peer Imitation (DSM-5 Criterion A3)
 *
 * Buddy performs a 1-3 gesture sequence (wave, clap, stomp, spin, jump).
 * The child reproduces it by tapping the matching icon buttons in order.
 *
 * One ImitateEvent is logged per STEP (not per trial), so the analysis
 * engine can compute per-step accuracy, latency, and sequence weighting.
 */

import Phaser from 'phaser'
import { BaseGameScene, CANVAS_WIDTH } from './BaseGameScene'
import { ImitateEvent } from '../analytics/EventCollector'
import { GestureType } from '../utils/BuddySprite'

const GESTURES: GestureType[] = ['wave', 'clap', 'stomp', 'spin', 'jump']
const BUTTON_Y = 520
const BUTTON_RADIUS = 50
const BUTTON_X = [100, 250, 400, 550, 700]

const HAND_COLOR = 0xf2a23e
const FOOT_COLOR = 0x8a5a1e
const SPIN_COLOR = 0x02c39a
const JUMP_COLOR = 0xf4a261

export class Module2_Imitate extends BaseGameScene {
  constructor() {
    super('Module2_Imitate')
  }

  protected moduleIndex = 1
  protected moduleKey = 'module2_imitate'

  private trialIndex = 0
  private totalTrials = 6
  private buttons: Partial<Record<GestureType, Phaser.GameObjects.Container>> = {}
  private buttonsEnabled = false

  private currentSequence: GestureType[] = []
  private tappedSequence: string[] = []
  private currentStep = 0
  private demoEndMs = 0
  private lastEventMs = 0
  private trialActive = false
  private responseTimer?: Phaser.Time.TimerEvent

  protected onCreate(): void {
    this.totalTrials = this.ageAdapter.getConfig().imitate.trials
    this.buddy.setPosition(CANVAS_WIDTH / 2, 220)
    this.buddy.setScale(1.1)

    this.createButtons()
    this.startTrial()
  }

  protected forceAdvance(): void {
    this.responseTimer?.remove()
    this.trialActive = false

    if (this.currentSequence.length > 0 && this.tappedSequence.length < this.currentSequence.length) {
      this.fillRemainingSteps()
    }
    for (let t = this.trialIndex + 1; t < this.totalTrials; t++) {
      this.recordEmptyTrial(t)
    }
    this.completeModule()
  }

  // ── Trial sequencing ─────────────────────────────────────────────────────────

  private getSequenceLength(trialIdx: number): number {
    const cfg = this.ageAdapter.getConfig().imitate
    return Math.min(cfg.maxSequenceLength, cfg.startingLength + Math.floor(trialIdx / 3))
  }

  private generateSequence(length: number): GestureType[] {
    const seq: GestureType[] = []
    for (let i = 0; i < length; i++) {
      let g: GestureType
      do {
        g = Phaser.Utils.Array.GetRandom(GESTURES)
      } while (i > 0 && g === seq[i - 1])
      seq.push(g)
    }
    return seq
  }

  private startTrial(): void {
    if (this.trialIndex >= this.totalTrials) {
      this.completeModule()
      return
    }

    this.trialActive = false
    this.tappedSequence = []
    this.currentStep = 0
    this.currentSequence = this.generateSequence(this.getSequenceLength(this.trialIndex))

    this.setButtonsEnabled(false)
    this.buddy.resetLook(200)

    this.time.delayedCall(500, () => this.playDemo(0))
  }

  private playDemo(stepIdx: number): void {
    if (stepIdx >= this.currentSequence.length) {
      this.demoEndMs = this.eventCollector.getElapsedMs()
      this.lastEventMs = this.demoEndMs
      this.startResponsePhase()
      return
    }

    const gesture = this.currentSequence[stepIdx]
    const cfg = this.ageAdapter.getConfig().imitate

    this.buddy.playGesture(gesture, () => {
      this.time.delayedCall(cfg.demonstrationPauseMs, () => this.playDemo(stepIdx + 1))
    })
  }

  private startResponsePhase(): void {
    this.trialActive = true
    this.setButtonsEnabled(true)

    const cfg = this.ageAdapter.getConfig().imitate
    this.responseTimer = this.time.delayedCall(cfg.responseWindowMs, () => {
      if (this.trialActive) {
        this.trialActive = false
        this.fillRemainingSteps()
        this.finishTrial()
      }
    })
  }

  private onButtonTap(gesture: GestureType): void {
    if (!this.trialActive) return
    this.resetInactivityTimer()

    const now = this.eventCollector.getElapsedMs()
    const latency = now - this.lastEventMs
    this.lastEventMs = now

    const step = this.currentStep + 1
    const isCorrect = gesture === this.currentSequence[this.currentStep]
    this.tappedSequence.push(gesture)

    const event: ImitateEvent = {
      type: 'imitation_attempt',
      trial_id: this.trialIndex,
      timestamp_ms: now,
      sequence_shown: [...this.currentSequence],
      sequence_tapped: [...this.tappedSequence],
      sequence_step: step,
      sequence_length: this.currentSequence.length,
      is_correct: isCorrect,
      latency_ms: latency,
      stimulus_type: 'social',
    }
    this.eventCollector.addImitateEvent(event)

    this.pulseButton(gesture)
    this.soundManager.play('tap')

    this.currentStep++

    if (this.currentStep >= this.currentSequence.length) {
      this.responseTimer?.remove()
      this.trialActive = false
      this.finishTrial()
    }
  }

  private fillRemainingSteps(): void {
    const responseWindowMs = this.ageAdapter.getConfig().imitate.responseWindowMs
    const now = this.eventCollector.getElapsedMs()

    while (this.currentStep < this.currentSequence.length) {
      const step = this.currentStep + 1
      this.tappedSequence.push('none')

      this.eventCollector.addImitateEvent({
        type: 'imitation_attempt',
        trial_id: this.trialIndex,
        timestamp_ms: now,
        sequence_shown: [...this.currentSequence],
        sequence_tapped: [...this.tappedSequence],
        sequence_step: step,
        sequence_length: this.currentSequence.length,
        is_correct: false,
        latency_ms: responseWindowMs,
        stimulus_type: 'social',
      })

      this.currentStep++
    }
  }

  private recordEmptyTrial(trialIdx: number): void {
    const length = this.getSequenceLength(trialIdx)
    const seq = this.generateSequence(length)
    const responseWindowMs = this.ageAdapter.getConfig().imitate.responseWindowMs
    const tapped = Array(length).fill('none')

    for (let step = 1; step <= length; step++) {
      this.eventCollector.addImitateEvent({
        type: 'imitation_attempt',
        trial_id: trialIdx,
        timestamp_ms: this.eventCollector.getElapsedMs(),
        sequence_shown: [...seq],
        sequence_tapped: [...tapped],
        sequence_step: step,
        sequence_length: length,
        is_correct: false,
        latency_ms: responseWindowMs,
        stimulus_type: 'social',
      })
    }
  }

  private finishTrial(): void {
    this.setButtonsEnabled(false)

    const allCorrect =
      this.tappedSequence.length === this.currentSequence.length &&
      this.tappedSequence.every((g, i) => g === this.currentSequence[i])

    if (allCorrect) {
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

  private completeModule(): void {
    this.eventCollector.markModuleComplete(this.moduleKey)
    this.soundManager.play('completion')
    this.playCompletionBurst(CANVAS_WIDTH / 2, 260)
    this.buddy.playCheer(() => {
      this.time.delayedCall(600, () => this.fadeToScene('Module3_Sort'))
    })
  }

  // ── Buttons ──────────────────────────────────────────────────────────────────

  private createButtons(): void {
    GESTURES.forEach((gesture, i) => {
      const x = BUTTON_X[i]
      const container = this.add.container(x, BUTTON_Y)

      const bg = this.add.circle(0, 0, BUTTON_RADIUS, 0xffffff)
      bg.setStrokeStyle(3, 0xb8e4ff)
      container.add(bg)

      const icon = this.add.graphics()
      this.drawGestureIcon(icon, gesture)
      container.add(icon)

      container.setAlpha(0.45)
      container.setInteractive(
        new Phaser.Geom.Circle(0, 0, BUTTON_RADIUS),
        Phaser.Geom.Circle.Contains
      )
      container.on('pointerdown', () => {
        if (!this.buttonsEnabled) return
        this.onButtonTap(gesture)
      })

      this.buttons[gesture] = container
    })
  }

  private setButtonsEnabled(enabled: boolean): void {
    this.buttonsEnabled = enabled
    GESTURES.forEach((g) => {
      const btn = this.buttons[g]
      if (!btn) return
      this.tweens.add({ targets: btn, alpha: enabled ? 1 : 0.45, duration: 200 })
    })
  }

  private pulseButton(gesture: GestureType): void {
    const btn = this.buttons[gesture]
    if (!btn) return
    this.tweens.add({ targets: btn, scaleX: 1.15, scaleY: 1.15, duration: 120, yoyo: true })
  }

  // ── Icon drawing ─────────────────────────────────────────────────────────────

  private drawGestureIcon(g: Phaser.GameObjects.Graphics, gesture: GestureType): void {
    switch (gesture) {
      case 'wave':  this.drawWaveIcon(g);  break
      case 'clap':  this.drawClapIcon(g);  break
      case 'stomp': this.drawStompIcon(g); break
      case 'spin':  this.drawSpinIcon(g);  break
      case 'jump':  this.drawJumpIcon(g);  break
    }
  }

  private drawHand(g: Phaser.GameObjects.Graphics, offsetX: number, scale: number, thumbDir: number): void {
    g.fillStyle(HAND_COLOR, 1)
    g.fillEllipse(offsetX, 8 * scale, 30 * scale, 36 * scale)
    const fingerXs = [-16, -6, 6, 16].map((x) => x * scale + offsetX)
    fingerXs.forEach((fx) => g.fillEllipse(fx, -16 * scale, 11 * scale, 22 * scale))
    g.fillEllipse(offsetX + thumbDir * 22 * scale, 4 * scale, 14 * scale, 22 * scale)
  }

  private drawWaveIcon(g: Phaser.GameObjects.Graphics): void {
    this.drawHand(g, 0, 1, 1)
    g.lineStyle(3, HAND_COLOR, 0.5)
    g.beginPath()
    g.arc(30, -8, 13, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false)
    g.strokePath()
    g.beginPath()
    g.arc(38, -8, 13, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false)
    g.strokePath()
  }

  private drawClapIcon(g: Phaser.GameObjects.Graphics): void {
    this.drawHand(g, -14, 0.62, -1)
    this.drawHand(g, 14, 0.62, 1)
    g.fillStyle(0xffd700, 1)
    g.fillCircle(0, -10, 3)
    g.fillCircle(-6, -2, 2.5)
    g.fillCircle(6, -2, 2.5)
  }

  private drawStompIcon(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(FOOT_COLOR, 1)
    g.fillRoundedRect(-30, -6, 56, 22, 10)
    g.fillRoundedRect(-32, -16, 22, 16, 8)
    g.lineStyle(4, FOOT_COLOR, 0.5)
    g.lineBetween(-20, 24, -4, 24)
    g.lineBetween(4, 29, 18, 29)
    g.lineBetween(-12, 33, 2, 33)
  }

  private drawSpinIcon(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(9, SPIN_COLOR, 1)
    g.beginPath()
    g.arc(0, 2, 26, Phaser.Math.DegToRad(-30), Phaser.Math.DegToRad(260), false)
    g.strokePath()
    g.fillStyle(SPIN_COLOR, 1)
    g.fillTriangle(16, 22, 30, 20, 26, 35)
  }

  private drawJumpIcon(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(JUMP_COLOR, 1)
    g.fillTriangle(0, -26, -20, 6, 20, 6)
    g.fillRoundedRect(-7, 4, 14, 22, 4)
    g.lineStyle(4, JUMP_COLOR, 0.5)
    g.lineBetween(-18, 33, -4, 33)
    g.lineBetween(4, 33, 18, 33)
  }
}
