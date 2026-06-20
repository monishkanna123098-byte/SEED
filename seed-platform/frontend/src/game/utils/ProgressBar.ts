/**
 * S.E.E.D. — Buddy's World
 * ProgressBar.ts
 *
 * 4-segment progress indicator shown at the top of each module scene.
 * Completed segments: mint. Current segment: pulsing amber. Upcoming: white.
 */

import Phaser from 'phaser'

const MINT = 0x02c39a
const AMBER = 0xf4a261
const WHITE = 0xffffff
const BORDER = 0xb8e4ff

export class ProgressBar {
  private segments: Phaser.GameObjects.Rectangle[] = []
  private pulseTween?: Phaser.Tweens.Tween
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene, x: number, y: number, totalWidth: number, count: number) {
    this.scene = scene
    const gap = 10
    const segW = (totalWidth - gap * (count - 1)) / count
    const segH = 14

    for (let i = 0; i < count; i++) {
      const seg = scene.add.rectangle(
        x + i * (segW + gap),
        y,
        segW,
        segH,
        WHITE,
        1
      )
      seg.setOrigin(0, 0.5)
      seg.setStrokeStyle(2, BORDER)
      seg.setDepth(100)
      this.segments.push(seg)
    }
  }

  /** Set which segment (0-indexed) is active. Earlier segments shown complete. */
  setActive(index: number): void {
    this.pulseTween?.stop()
    this.pulseTween = undefined

    this.segments.forEach((seg, i) => {
      seg.setScale(1)
      if (i < index) {
        seg.setFillStyle(MINT, 1)
        seg.setStrokeStyle(2, MINT)
      } else if (i === index) {
        seg.setFillStyle(AMBER, 1)
        seg.setStrokeStyle(2, AMBER)
        this.pulseTween = this.scene.tweens.add({
          targets: seg,
          scaleY: 1.35,
          duration: 480,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      } else {
        seg.setFillStyle(WHITE, 1)
        seg.setStrokeStyle(2, BORDER)
      }
    })
  }

  /** Mark all 4 segments complete (used by ResultScene). */
  setAllComplete(): void {
    this.pulseTween?.stop()
    this.segments.forEach((seg) => {
      seg.setScale(1)
      seg.setFillStyle(MINT, 1)
      seg.setStrokeStyle(2, MINT)
    })
  }

  destroy(): void {
    this.pulseTween?.stop()
    this.segments.forEach((s) => s.destroy())
  }
}
