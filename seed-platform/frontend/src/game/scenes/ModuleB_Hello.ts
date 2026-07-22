/**
 * S.E.E.D. — Buddy's World
 * ModuleB_Hello.ts
 *
 * True per-step imitation (not icon recognition — the old Module 2's
 * flaw). Design spec: docs/superpowers/specs/2026-07-18-module-b-hello-design.md
 *
 * Buddy performs a gesture (reusing BuddySprite's existing 5 gesture
 * animations directly — no new gesture vocabulary needed). Widgets for
 * THIS step only are revealed after the gesture completes, never all
 * five simultaneously, which is what distinguishes this from the old
 * design. Per-step events, following ImitateEvent's proven pattern.
 */

import Phaser from 'phaser'
import { BaseGameScene, CANVAS_WIDTH } from './BaseGameScene'
import { getHelloConfig, type HelloModuleConfig } from '../utils/AgeAdapter'
import type { GestureType } from '../utils/BuddySprite'
import { sequenceLengthRange, pickGesture, pickWidgetChoices, isPerseverativeTap } from './helloTrialLogic'

const WIDGET_Y = 480

// Simple, visually-distinct shapes per gesture — not literal iconography
// of the action (that would need more elaborate Graphics drawing than
// this pass attempts), just reliably distinguishable buttons for a
// young child. Colors from the existing game palette.
const WIDGET_SHAPE: Record<GestureType, { shape: 'circle' | 'square' | 'triangle' | 'star' | 'diamond'; color: number }> = {
  wave: { shape: 'circle', color: 0x02c39a },
  clap: { shape: 'square', color: 0xf4a261 },
  stomp: { shape: 'triangle', color: 0x065a82 },
  spin: { shape: 'star', color: 0xe63946 },
  jump: { shape: 'diamond', color: 0xe0f4ff },
}

export class ModuleB_Hello extends BaseGameScene {
  protected moduleKey = 'HELLO'

  constructor() {
    super('ModuleB_Hello')
  }

  private cfg!: HelloModuleConfig
  private trialIndex = 0
  private currentTrialId = 0
  private stepIndex = 0
  private sequenceLength = 0
  private seenGestures: GestureType[] = []
  private priorStepGesturesThisTrial: GestureType[] = []
  private currentGesture: GestureType = 'wave'
  private stepActive = false
  private stepStartElapsedMs = 0

  private widgets: Phaser.GameObjects.Container[] = []
  private responseTimer?: Phaser.Time.TimerEvent

  protected onCreate(): void {
    this.cfg = getHelloConfig(this.ageMonths)
    this.time.delayedCall(500, () => this.runNextTrial())
  }

  protected forceAdvance(): void {
    this.resolveStep(null)
  }

  // ── Trial/step sequencing ────────────────────────────────────────────────

  private runNextTrial(): void {
    if (this.trialIndex >= this.cfg.trialCount) {
      this.completeModule()
      return
    }
    this.currentTrialId = this.trialIndex + 1
    this.trialIndex++
    this.priorStepGesturesThisTrial = []

    const [min, max] = sequenceLengthRange(this.cfg.maxSequenceSteps)
    this.sequenceLength = Phaser.Math.Between(min, max)
    this.stepIndex = 0

    this.runNextStep()
  }

  private runNextStep(): void {
    if (this.stepIndex >= this.sequenceLength) {
      this.time.delayedCall(500, () => this.runNextTrial())
      return
    }
    this.stepIndex++

    const allowNovel = this.cfg.novelGestureFromTrial !== null && this.currentTrialId >= this.cfg.novelGestureFromTrial
    this.currentGesture = pickGesture(this.seenGestures, allowNovel)
    const isNovel = !this.seenGestures.includes(this.currentGesture)
    if (isNovel) this.seenGestures.push(this.currentGesture)

    this.stepActive = true
    this.stepStartElapsedMs = this.eventCollector.getElapsedMs()

    this.buddy.playGesture(this.currentGesture, () => {
      this.revealWidgets(this.currentGesture, isNovel)
    })
  }

  // ── Widgets ───────────────────────────────────────────────────────────────

  private revealWidgets(correctGesture: GestureType, isNovel: boolean): void {
    const choices = pickWidgetChoices(correctGesture, this.cfg.widgetChoiceCount)
    const spacing = CANVAS_WIDTH / (choices.length + 1)

    choices.forEach((gesture, i) => {
      const x = spacing * (i + 1)
      const widget = this.createWidget(x, gesture)
      widget.setData('gesture', gesture)
      widget.setData('isNovelStep', isNovel)
      this.widgets.push(widget)
    })

    this.responseTimer = this.time.delayedCall(this.cfg.responseWindowMs, () => {
      this.resolveStep(null)
    })
  }

  private createWidget(x: number, gesture: GestureType): Phaser.GameObjects.Container {
    const { shape, color } = WIDGET_SHAPE[gesture]
    let icon: Phaser.GameObjects.GameObject
    switch (shape) {
      case 'circle':
        icon = this.add.circle(0, 0, 32, color)
        break
      case 'square':
        icon = this.add.rectangle(0, 0, 56, 56, color)
        break
      case 'triangle':
        icon = this.add.triangle(0, 0, 0, -32, -30, 26, 30, 26, color)
        break
      case 'star':
        icon = this.add.star(0, 0, 5, 14, 32, color)
        break
      case 'diamond':
        icon = this.add.rectangle(0, 0, 44, 44, color)
        ;(icon as Phaser.GameObjects.Rectangle).setAngle(45)
        break
    }
    const container = this.add.container(x, WIDGET_Y, [icon as Phaser.GameObjects.GameObject])
    container.setDepth(10)

    const hitTarget = icon as Phaser.GameObjects.Shape
    hitTarget.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Circle(0, 0, 36), hitAreaCallback: Phaser.Geom.Circle.Contains })
    hitTarget.on('pointerup', () => this.handleWidgetTap(gesture))

    return container
  }

  private clearWidgets(): void {
    this.widgets.forEach((w) => w.destroy())
    this.widgets = []
  }

  private handleWidgetTap(tappedGesture: GestureType): void {
    if (!this.stepActive) return
    this.resolveStep(tappedGesture)
  }

  // ── Resolution ────────────────────────────────────────────────────────────

  private resolveStep(tappedGesture: GestureType | null): void {
    if (!this.stepActive) return
    this.stepActive = false
    this.responseTimer?.remove()

    const isNovel = this.widgets[0]?.getData('isNovelStep') ?? false
    const isCorrect = tappedGesture === this.currentGesture
    const latencyMs = tappedGesture !== null ? this.eventCollector.getElapsedMs() - this.stepStartElapsedMs : null

    this.eventCollector.addHelloEvent({
      type: 'imitation_step',
      trial_id: this.currentTrialId,
      sequence_step: this.stepIndex,
      sequence_length: this.sequenceLength,
      timestamp_ms: this.stepStartElapsedMs,
      gesture_shown: this.currentGesture,
      is_novel_gesture: isNovel,
      widget_tapped: tappedGesture,
      is_correct: isCorrect,
      latency_ms: latencyMs,
      stimulus_type: 'social',
    })

    // Perseveration — Signal B5, via the generic infrastructure (sub-project
    // 3), not a field on HelloEvent itself. Only checked when the tap
    // didn't match the current step (a correct match can't simultaneously
    // be a perseverative error).
    if (tappedGesture !== null && !isCorrect && isPerseverativeTap(tappedGesture, this.priorStepGesturesThisTrial)) {
      this.eventCollector.addPerseverationEvent({
        type: 'perseveration',
        module: 'HELLO',
        timestamp_ms: this.eventCollector.getElapsedMs(),
        position: tappedGesture,
        count: this.priorStepGesturesThisTrial.filter((g) => g === tappedGesture).length + 1,
      })
    }

    this.priorStepGesturesThisTrial.push(this.currentGesture)
    this.clearWidgets()

    if (isCorrect) {
      this.soundManager.play('success')
      this.buddy.playCheer()
    } else {
      this.soundManager.play('try_again')
      this.buddy.playEncourage()
    }

    this.resetInactivityTimer()
    this.time.delayedCall(700, () => this.runNextStep())
  }

  // ── Completion ────────────────────────────────────────────────────────────

  private completeModule(): void {
    this.eventCollector.markModuleComplete('HELLO')
    this.playCompletionBurst()
    this.soundManager.play('completion')
    this.buddy.playExcited()
    // Stage E wiring complete — see ModuleA_Look's completeModule() comment.
    this.time.delayedCall(1200, () => this.advanceToNextModule())
  }

  shutdown(): void {
    this.clearWidgets()
    super.shutdown()
  }
}
