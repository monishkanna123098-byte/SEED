/**
 * S.E.E.D. — Buddy's World
 * Module1_Gaze.ts — Joint Attention (DSM-5 Criterion A1)
 *
 * Buddy looks toward one of 3 picture cards (apple, star, fish).
 * The child must tap the card Buddy is looking at.
 *
 * Adaptive difficulty:
 *   Ages 3-4: cards stay hidden for 3s while Buddy looks (gazeBeforeCardsMs)
 *   Ages 4-5: cards appear simultaneously with Buddy's look
 */

import Phaser from 'phaser'
import { BaseGameScene, CANVAS_WIDTH } from './BaseGameScene'
import { GazeEvent } from '../analytics/EventCollector'
import { LookDirection } from '../utils/BuddySprite'

type CardIcon = 'apple' | 'star' | 'fish'
type Position = 'left' | 'center' | 'right'

const POSITIONS: Position[] = ['left', 'center', 'right']
const ICONS: CardIcon[] = ['apple', 'star', 'fish']

const POSITION_X: Record<Position, number> = {
  left: 170,
  center: 400,
  right: 630,
}
const CARD_Y = 440
const CARD_SIZE = 150

export class Module1_Gaze extends BaseGameScene {
  constructor() {
    super('Module1_Gaze')
  }

  protected moduleIndex = 0
  protected moduleKey = 'module1_gaze'

  private trialIndex = 0
  private totalTrials = 8
  private targetSequence: Position[] = []
  private cards: Partial<Record<Position, Phaser.GameObjects.Container>> = {}
  private cardIcons: Partial<Record<Position, CardIcon>> = {}
  private stimulusOnsetMs = 0
  private trialActive = false
  private responseTimer?: Phaser.Time.TimerEvent
  private refreshGlanceTimer?: Phaser.Time.TimerEvent

  protected onCreate(): void {
    const cfg = this.ageAdapter.getConfig().gaze
    this.totalTrials = cfg.trials
    this.targetSequence = this.buildTargetSequence(this.totalTrials)

    this.buddy.setPosition(CANVAS_WIDTH / 2, 230)
    this.buddy.setScale(1.15)

    this.createCards()
    this.startTrial()
  }

  protected forceAdvance(): void {
    this.responseTimer?.remove()
    this.refreshGlanceTimer?.remove()
    this.trialActive = false

    for (let i = this.trialIndex; i < this.totalTrials; i++) {
      this.recordTimeout(i)
    }
    this.completeModule()
  }

  // ── Trial sequencing ─────────────────────────────────────────────────────────

  /** Even-ish distribution of left/center/right targets across trials. */
  private buildTargetSequence(n: number): Position[] {
    const seq: Position[] = []
    for (let i = 0; i < n; i++) seq.push(POSITIONS[i % 3])
    return Phaser.Utils.Array.Shuffle(seq)
  }

  private startTrial(): void {
    if (this.trialIndex >= this.totalTrials) {
      this.completeModule()
      return
    }

    this.trialActive = false
    this.buddy.resetLook(250)

    // Re-shuffle which icon sits in which position each trial
    const shuffledIcons = Phaser.Utils.Array.Shuffle([...ICONS]) as CardIcon[]
    POSITIONS.forEach((pos, i) => {
      this.cardIcons[pos] = shuffledIcons[i]
      this.drawCardIcon(pos, shuffledIcons[i])
    })

    const target = this.targetSequence[this.trialIndex]
    const cfg = this.ageAdapter.getConfig().gaze
    const delayedReveal = cfg.gazeBeforeCardsMs > 0

    POSITIONS.forEach((pos) => {
      const card = this.cards[pos]!
      card.setAlpha(delayedReveal ? 0 : 1)
      card.disableInteractive()
      card.removeAllListeners('pointerdown')
    })

    this.time.delayedCall(450, () => {
      this.stimulusOnsetMs = this.eventCollector.getElapsedMs()
      this.buddy.lookAt(target as LookDirection, 450)

      // A second "still looking" glance partway through, for sustained
      // joint-attention cueing (buddyLookDurationMs from AgeAdapter).
      this.refreshGlanceTimer = this.time.delayedCall(cfg.buddyLookDurationMs, () => {
        if (this.trialActive || !delayedReveal) {
          this.buddy.lookAt(target as LookDirection, 200)
        }
      })

      if (delayedReveal) {
        this.time.delayedCall(cfg.gazeBeforeCardsMs, () => this.revealCards(target))
      } else {
        this.revealCards(target)
      }
    })
  }

  private revealCards(target: Position): void {
    POSITIONS.forEach((pos) => {
      const card = this.cards[pos]!
      this.tweens.add({ targets: card, alpha: 1, duration: 250 })
      this.makeCardInteractive(pos, target)
    })

    this.trialActive = true
    const cfg = this.ageAdapter.getConfig().gaze
    this.responseTimer = this.time.delayedCall(cfg.responseWindowMs, () => {
      if (this.trialActive) this.handleResponse(target, null, 0, 0)
    })
  }

  private makeCardInteractive(pos: Position, target: Position): void {
    const card = this.cards[pos]!
    card.removeAllListeners('pointerdown')
    card.setInteractive(
      new Phaser.Geom.Rectangle(-CARD_SIZE / 2, -CARD_SIZE / 2, CARD_SIZE, CARD_SIZE),
      Phaser.Geom.Rectangle.Contains
    )
    card.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.trialActive) return
      this.handleResponse(target, pos, pointer.x, pointer.y)
    })
  }

  private handleResponse(
    target: Position,
    tapped: Position | null,
    x: number,
    y: number
  ): void {
    if (!this.trialActive) return
    this.trialActive = false
    this.responseTimer?.remove()
    this.refreshGlanceTimer?.remove()
    this.resetInactivityTimer()

    const responseMs = this.eventCollector.getElapsedMs()
    const reactionTimeMs = responseMs - this.stimulusOnsetMs
    const correct = tapped === target

    const event: GazeEvent = {
      type: 'tap',
      trial_id: this.trialIndex,
      stimulus_onset_ms: this.stimulusOnsetMs,
      response_ms: responseMs,
      target_card: this.cardIcons[target] ?? 'apple',
      tapped_card: tapped ? (this.cardIcons[tapped] ?? 'apple') : 'none',
      correct,
      reaction_time_ms: reactionTimeMs,
      tap_x: x,
      tap_y: y,
      stimulus_type: 'social',
    }
    this.eventCollector.addGazeEvent(event)

    POSITIONS.forEach((pos) => this.cards[pos]!.disableInteractive())

    if (correct) {
      this.soundManager.play('success')
      this.buddy.playCheer(() => this.nextTrial())
      this.pulseCard(target, true)
    } else {
      this.soundManager.play('try_again')
      this.buddy.playEncourage(() => this.nextTrial())
      if (tapped) this.pulseCard(tapped, false)
    }
  }

  private recordTimeout(trialIdx: number): void {
    const target = this.targetSequence[trialIdx]
    const responseWindowMs = this.ageAdapter.getConfig().gaze.responseWindowMs
    this.eventCollector.addGazeEvent({
      type: 'tap',
      trial_id: trialIdx,
      stimulus_onset_ms: this.eventCollector.getElapsedMs(),
      response_ms: this.eventCollector.getElapsedMs(),
      target_card: this.cardIcons[target] ?? 'apple',
      tapped_card: 'none',
      correct: false,
      reaction_time_ms: responseWindowMs,
      tap_x: 0,
      tap_y: 0,
      stimulus_type: 'social',
    })
  }

  private pulseCard(pos: Position, success: boolean): void {
    const card = this.cards[pos]!
    this.tweens.add({
      targets: card,
      scaleX: success ? 1.12 : 0.94,
      scaleY: success ? 1.12 : 0.94,
      duration: 200,
      yoyo: true,
    })
  }

  private nextTrial(): void {
    this.trialIndex++
    this.time.delayedCall(400, () => this.startTrial())
  }

  private completeModule(): void {
    this.eventCollector.markModuleComplete(this.moduleKey)
    this.soundManager.play('completion')
    this.playCompletionBurst(CANVAS_WIDTH / 2, 280)
    this.buddy.playCheer(() => {
      this.time.delayedCall(600, () => this.fadeToScene('Module2_Imitate'))
    })
  }

  // ── Card construction & icons ───────────────────────────────────────────────

  private createCards(): void {
    POSITIONS.forEach((pos) => {
      const container = this.add.container(POSITION_X[pos], CARD_Y)

      const bg = this.add.graphics()
      bg.fillStyle(0x000000, 0.08)
      bg.fillRoundedRect(-CARD_SIZE / 2 + 5, -CARD_SIZE / 2 + 7, CARD_SIZE, CARD_SIZE, 18)
      bg.fillStyle(0xffffff, 1)
      bg.fillRoundedRect(-CARD_SIZE / 2, -CARD_SIZE / 2, CARD_SIZE, CARD_SIZE, 18)

      container.add(bg)
      this.cards[pos] = container
    })
  }

  private drawCardIcon(pos: Position, icon: CardIcon): void {
    const container = this.cards[pos]!
    while (container.length > 1) {
      const child = container.getAt(1)
      if (child) container.remove(child, true)
    }

    const g = this.add.graphics()
    switch (icon) {
      case 'apple': this.drawApple(g); break
      case 'star':  this.drawStar(g);  break
      case 'fish':  this.drawFish(g);  break
    }
    container.add(g)
  }

  private drawApple(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xe63946, 1)
    g.fillCircle(-9, 8, 32)
    g.fillCircle(11, 8, 32)
    g.fillStyle(0x6b4226, 1)
    g.fillRect(-3, -36, 6, 18)
    g.fillStyle(0x02c39a, 1)
    g.fillEllipse(13, -30, 24, 13)
  }

  private drawStar(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xf4a261, 1)
    const points: Phaser.Types.Math.Vector2Like[] = []
    const outerR = 38
    const innerR = 16
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR
      const angle = (Math.PI / 5) * i - Math.PI / 2
      points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) })
    }
    g.fillPoints(points, true)
  }

  private drawFish(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x028090, 1)
    g.fillEllipse(4, 0, 64, 38)
    g.fillTriangle(-28, 0, -50, -16, -50, 16)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(18, -6, 6)
    g.fillStyle(0x1a2b3c, 1)
    g.fillCircle(19, -6, 3)
  }
}
