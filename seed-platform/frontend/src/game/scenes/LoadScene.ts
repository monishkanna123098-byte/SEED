/**
 * S.E.E.D. — Buddy's World
 * LoadScene.ts
 *
 * No external assets. Generates shared background textures procedurally
 * via Phaser Graphics -> generateTexture, then shows a brief loading
 * animation (Buddy + pulsing dots) before transitioning to MenuScene.
 */

import Phaser from 'phaser'
import { BuddySprite } from '../utils/BuddySprite'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

export class LoadScene extends Phaser.Scene {
  constructor() {
    super('LoadScene')
  }

  create(): void {
    this.generateSkyTexture()
    this.generateHillsTexture()
    this.generateCloudTexture()
    this.generateParticleTextures()

    this.cameras.main.setBackgroundColor('#E0F4FF')
    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'sky-bg')
    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 75, 'hills')

    const buddy = new BuddySprite(this, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30, 1)
    buddy.playWaveGreeting()

    // Pulsing loading dots
    const dotY = CANVAS_HEIGHT / 2 + 110
    const dots: Phaser.GameObjects.Arc[] = []
    for (let i = 0; i < 3; i++) {
      const dot = this.add.circle(CANVAS_WIDTH / 2 - 30 + i * 30, dotY, 9, 0x028090)
      dots.push(dot)
      this.tweens.add({
        targets: dot,
        scale: 1.5,
        alpha: 0.4,
        duration: 450,
        yoyo: true,
        repeat: -1,
        delay: i * 150,
        ease: 'Sine.easeInOut',
      })
    }

    this.time.delayedCall(1100, () => {
      buddy.destroy()
      dots.forEach((d) => d.destroy())
      this.scene.start('MenuScene')
    })
  }

  // ── Texture generation ──────────────────────────────────────────────────────

  /** Vertical sky gradient: #E0F4FF (top) to #B8E4FF (bottom). */
  private generateSkyTexture(): void {
    const g = this.add.graphics()
    g.fillGradientStyle(0xe0f4ff, 0xe0f4ff, 0xb8e4ff, 0xb8e4ff, 1)
    g.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    g.generateTexture('sky-bg', CANVAS_WIDTH, CANVAS_HEIGHT)
    g.destroy()
  }

  /** Rolling green hills along the bottom edge, color #90EE90. */
  private generateHillsTexture(): void {
    const g = this.add.graphics()
    g.fillStyle(0x90ee90, 1)
    g.fillEllipse(110, 110, 320, 170)
    g.fillEllipse(380, 95, 360, 200)
    g.fillEllipse(650, 112, 320, 180)
    g.fillEllipse(820, 100, 300, 170)
    // Slightly darker foreground band for depth
    g.fillStyle(0x7fe07f, 1)
    g.fillEllipse(250, 135, 380, 140)
    g.fillEllipse(580, 138, 400, 145)
    g.generateTexture('hills', CANVAS_WIDTH, 150)
    g.destroy()
  }

  /** Simple cloud — three overlapping white ellipses. */
  private generateCloudTexture(): void {
    const g = this.add.graphics()
    g.fillStyle(0xffffff, 0.85)
    g.fillEllipse(40, 30, 60, 36)
    g.fillEllipse(75, 22, 50, 32)
    g.fillEllipse(15, 22, 44, 28)
    g.generateTexture('cloud', 110, 50)
    g.destroy()
  }

  /** White circle + 5-point star, tinted at use-site for confetti bursts. */
  private generateParticleTextures(): void {
    const dot = this.add.graphics()
    dot.fillStyle(0xffffff, 1)
    dot.fillCircle(8, 8, 8)
    dot.generateTexture('particle-dot', 16, 16)
    dot.destroy()

    const star = this.add.graphics()
    star.fillStyle(0xffffff, 1)
    const points: Phaser.Types.Math.Vector2Like[] = []
    const outerR = 11
    const innerR = 4.5
    const cx = 12
    const cy = 12
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR
      const angle = (Math.PI / 5) * i - Math.PI / 2
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
    }
    star.fillPoints(points, true)
    star.generateTexture('particle-star', 24, 24)
    star.destroy()
  }
}
