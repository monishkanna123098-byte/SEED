/**
 * S.E.E.D. — Buddy's World
 * ResultScene.ts
 *
 * Final scene. Big celebration animation, all 4 progress segments
 * shown complete, multiple confetti bursts. Builds the completion
 * payload and hands it to the React wrapper via the `onGameComplete`
 * callback stored in the game registry.
 */

import Phaser from 'phaser'
import { BuddySprite } from '../utils/BuddySprite'
import { ProgressBar } from '../utils/ProgressBar'
import { SoundManager } from '../utils/SoundManager'
import { EventCollector, GameCompletionPayload } from '../analytics/EventCollector'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene')
  }

  create(): void {
    const soundManager = this.game.registry.get('soundManager') as SoundManager
    const eventCollector = this.game.registry.get('eventCollector') as EventCollector
    const onGameComplete = this.game.registry.get('onGameComplete') as
      | ((payload: GameCompletionPayload) => void)
      | undefined

    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'sky-bg').setDepth(-10)
    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 75, 'hills').setDepth(-9)

    const cloudPositions: Array<[number, number]> = [[130, 90], [630, 75], [400, 130]]
    cloudPositions.forEach(([x, y]) => {
      this.add.image(x, y, 'cloud').setDepth(-8).setAlpha(0.9)
    })

    const progressBar = new ProgressBar(this, 60, 24, CANVAS_WIDTH - 120, 4)
    progressBar.setAllComplete()

    const buddy = new BuddySprite(this, CANVAS_WIDTH / 2, 300, 1.4)

    this.cameras.main.fadeIn(300, 224, 244, 255)
    soundManager.play('completion')

    this.playBigBurst(CANVAS_WIDTH / 2, 250)
    this.time.delayedCall(700, () => this.playBigBurst(220, 350))
    this.time.delayedCall(1100, () => this.playBigBurst(580, 350))

    const celebrate = () => {
      buddy.playCheer(() => {
        this.time.delayedCall(200, () => {
          buddy.playGesture('jump', () => {
            this.time.delayedCall(150, () => {
              buddy.playGesture('spin', () => {
                this.time.delayedCall(300, celebrate)
              })
            })
          })
        })
      })
    }
    celebrate()

    // Hand off completion payload to the React wrapper
    if (onGameComplete) {
      const payload = eventCollector.buildCompletionPayload()
      this.time.delayedCall(400, () => onGameComplete(payload))
    }
  }

  private playBigBurst(x: number, y: number): void {
    const confettiColors = [0x02c39a, 0xf4a261, 0x065a82, 0xe63946, 0xffb347, 0xffd700]

    const dotEmitter = this.add.particles(x, y, 'particle-dot', {
      speed: { min: 180, max: 420 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 1100,
      quantity: 28,
      tint: confettiColors,
      gravityY: 280,
      emitting: false,
    })

    const starEmitter = this.add.particles(x, y, 'particle-star', {
      speed: { min: 120, max: 280 },
      angle: { min: 200, max: 340 },
      scale: { start: 1.1, end: 0.2 },
      rotate: { start: 0, end: 360 },
      lifespan: 1300,
      quantity: 10,
      tint: [0xffd700, 0xf4a261, 0xffffff],
      gravityY: 180,
      emitting: false,
    })

    dotEmitter.setDepth(200)
    starEmitter.setDepth(200)
    dotEmitter.explode(28)
    starEmitter.explode(10)

    this.time.delayedCall(1500, () => {
      dotEmitter.destroy()
      starEmitter.destroy()
    })
  }
}
