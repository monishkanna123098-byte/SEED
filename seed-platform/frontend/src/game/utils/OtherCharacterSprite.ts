/**
 * S.E.E.D. — Buddy's World
 * OtherCharacterSprite.ts
 *
 * Simple background characters for Module A (LOOK) — the 2-4 "other
 * things happening on screen" per docs/superpowers/specs/2026-07-18-module-a-look-design.md §5.
 *
 * Deliberately simple and low-salience: a plain colored circle with dot
 * eyes, no limbs, no expressive face, gentle slow idle sway only — never
 * more visually active than Buddy at any point, especially during his
 * name-call window. This is load-bearing, not just visual economy: if a
 * decoy character were more active than Buddy, a tap on it would stop
 * being evidence of reduced social specificity (Signal A4) and become
 * evidence the module itself is unbalanced.
 */

import Phaser from 'phaser'

// Palette variants distinct from Buddy's warm orange (BUDDY_BODY 0xffb347) —
// cool/neutral tones so these read as "other things," not "other Buddies."
const PALETTE = [0x028090, 0x8ecae6, 0xb8b8d1]

export class OtherCharacterSprite {
  root: Phaser.GameObjects.Container
  private scene: Phaser.Scene
  private idleTween?: Phaser.Tweens.Tween
  private destroyed = false

  constructor(scene: Phaser.Scene, x: number, y: number, paletteIndex: number) {
    this.scene = scene
    this.root = scene.add.container(x, y)

    const color = PALETTE[paletteIndex % PALETTE.length]
    const body = scene.add.circle(0, 0, 34, color)
    const leftEye = scene.add.circle(-10, -4, 4, 0x1a2b3c)
    const rightEye = scene.add.circle(10, -4, 4, 0x1a2b3c)

    this.root.add([body, leftEye, rightEye])
    this.startIdle()
  }

  private startIdle(): void {
    // Slower, smaller-amplitude than Buddy's bob (1100ms/6px) — 1900ms and
    // 3px — so this never competes with Buddy for visual attention.
    this.idleTween = this.scene.tweens.add({
      targets: this.root,
      y: this.root.y - 3,
      duration: 1900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })
  }

  /** Opt-in, same pattern as BuddySprite — most callers just want the
   *  idle presence; Module A additionally needs taps for Signal A4. */
  enableInteraction(onTap: () => void): void {
    const hitArea = this.root.getAt(0) as Phaser.GameObjects.Arc
    hitArea.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Circle(0, 0, 34), hitAreaCallback: Phaser.Geom.Circle.Contains })
    hitArea.on('pointerup', () => {
      if (this.destroyed) return
      onTap()
    })
  }

  setPosition(x: number, y: number): void {
    this.root.setPosition(x, y)
  }

  destroy(): void {
    this.destroyed = true
    this.idleTween?.stop()
    this.root.destroy()
  }
}
