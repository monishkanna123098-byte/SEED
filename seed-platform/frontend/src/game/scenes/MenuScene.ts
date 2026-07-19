/**
 * S.E.E.D. — Buddy's World
 * MenuScene.ts
 *
 * Animated start screen. Buddy waves a greeting. A large pulsing
 * mint "play" button is the sole call-to-action — no text, per the
 * no-reading-required design requirement for ages 3-5.
 */

import Phaser from 'phaser'
import { BuddySprite } from '../utils/BuddySprite'
import { SoundManager } from '../utils/SoundManager'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

export class MenuScene extends Phaser.Scene {
  private buddy?: BuddySprite

  constructor() {
    super('MenuScene')
  }

  create(): void {
    const soundManager = this.game.registry.get('soundManager') as SoundManager

    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'sky-bg').setDepth(-10)
    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 75, 'hills').setDepth(-9)

    const cloudPositions: Array<[number, number]> = [[130, 90], [630, 75], [400, 130]]
    cloudPositions.forEach(([x, y]) => {
      this.add.image(x, y, 'cloud').setDepth(-8).setAlpha(0.9)
    })

    this.buddy = new BuddySprite(this, CANVAS_WIDTH / 2, 250, 1.3)
    this.buddy.enableInteraction()
    this.buddy.playWaveGreeting(() => {
      this.time.addEvent({
        delay: 4000,
        loop: true,
        callback: () => this.buddy?.playGesture('wave'),
      })
    })

    // Large pulsing play button
    const buttonY = 460
    const buttonRadius = 90

    const glow = this.add.circle(CANVAS_WIDTH / 2, buttonY, buttonRadius + 14, 0x02c39a, 0.25)
    const button = this.add.circle(CANVAS_WIDTH / 2, buttonY, buttonRadius, 0x02c39a)
    button.setStrokeStyle(6, 0xffffff)

    const triangle = this.add.triangle(
      CANVAS_WIDTH / 2 - 14, buttonY,
      0, -38,
      0, 38,
      56, 0,
      0xffffff
    )
    triangle.setOrigin(0.5, 0.5)

    this.tweens.add({
      targets: [glow],
      scale: 1.18,
      alpha: 0.1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    this.tweens.add({
      targets: [button, triangle],
      scale: 1.06,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const hitArea = this.add.circle(CANVAS_WIDTH / 2, buttonY, buttonRadius)
    hitArea.setAlpha(0.001)
    hitArea.setInteractive({ useHandCursor: true })

    let starting = false
    hitArea.on('pointerdown', () => {
      if (starting) return
      starting = true
      soundManager.play('tap')

      this.tweens.add({
        targets: [button, triangle, glow],
        scale: 0.85,
        duration: 100,
        yoyo: true,
      })

      this.buddy?.playCheer()
      soundManager.play('success')

      this.cameras.main.fadeOut(350, 224, 244, 255)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Module1_Gaze')
      })
    })

    this.cameras.main.fadeIn(300, 224, 244, 255)
  }
}
