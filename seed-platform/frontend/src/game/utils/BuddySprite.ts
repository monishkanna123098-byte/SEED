/**
 * S.E.E.D. — Buddy's World
 * BuddySprite.ts
 *
 * Buddy: a round, warm, expressive cartoon avatar built entirely from
 * Phaser shape primitives (circles, ellipses, graphics arcs). No image
 * assets. Designed to read clearly to children aged 3-5 at a distance.
 *
 * Structure (Container hierarchy):
 *   root (Container) — position controlled by scene
 *     ├─ leftLeg, rightLeg (Ellipse)
 *     ├─ leftArm, rightArm (Ellipse, origin at shoulder for rotation)
 *     ├─ body (Circle)
 *     └─ face (Container, sits on body — rotates slightly for "looking")
 *          ├─ leftCheek, rightCheek (Ellipse)
 *          ├─ leftEyeWhite, rightEyeWhite (Circle)
 *          ├─ leftPupil, rightPupil (Circle)
 *          ├─ leftBrow, rightBrow (Graphics)
 *          └─ mouth (Graphics)
 */

import Phaser from 'phaser'

// ─── SEED Buddy palette ─────────────────────────────────────────────────────
const BUDDY_BODY    = 0xffb347
const BUDDY_LIMB    = 0xf2a23e
const EYE_WHITE     = 0xffffff
const PUPIL_COLOR   = 0x1a2b3c
const CHEEK_COLOR   = 0xffc1cc
const MOUTH_COLOR   = 0x1a2b3c
const BROW_COLOR    = 0x8a5a1e

export type LookDirection = 'left' | 'center' | 'right'
export type GestureType = 'wave' | 'clap' | 'stomp' | 'spin' | 'jump'
export type MouthState = 'smile' | 'open' | 'small_o' | 'flat'

const BODY_RADIUS = 58

export class BuddySprite {
  scene: Phaser.Scene
  root: Phaser.GameObjects.Container
  face: Phaser.GameObjects.Container

  private body!: Phaser.GameObjects.Arc
  private leftArm!: Phaser.GameObjects.Ellipse
  private rightArm!: Phaser.GameObjects.Ellipse
  private leftLeg!: Phaser.GameObjects.Ellipse
  private rightLeg!: Phaser.GameObjects.Ellipse

  private leftEyeWhite!: Phaser.GameObjects.Arc
  private rightEyeWhite!: Phaser.GameObjects.Arc
  private leftPupil!: Phaser.GameObjects.Arc
  private rightPupil!: Phaser.GameObjects.Arc
  private leftBrow!: Phaser.GameObjects.Graphics
  private rightBrow!: Phaser.GameObjects.Graphics
  private mouth!: Phaser.GameObjects.Graphics

  private idleTween?: Phaser.Tweens.Tween
  private blinkTimer?: Phaser.Time.TimerEvent
  private destroyed = false

  constructor(scene: Phaser.Scene, x: number, y: number, scale: number = 1) {
    this.scene = scene
    this.root = scene.add.container(x, y)
    this.root.setScale(scale)

    this.buildBody()
    this.face = this.buildFace()
    this.root.add(this.face)

    this.startIdle()
    this.scheduleBlink()
  }

  // ── Construction ────────────────────────────────────────────────────────

  private buildBody(): void {
    const s = this.scene

    // Legs — peek out below the body
    this.leftLeg = s.add.ellipse(-22, 60, 26, 22, BUDDY_LIMB)
    this.rightLeg = s.add.ellipse(22, 60, 26, 22, BUDDY_LIMB)

    // Arms — origin at shoulder (top-center) so rotation pivots naturally
    this.leftArm = s.add.ellipse(-56, -8, 26, 50, BUDDY_LIMB)
    this.leftArm.setOrigin(0.5, 0)
    this.leftArm.setAngle(18)

    this.rightArm = s.add.ellipse(56, -8, 26, 50, BUDDY_LIMB)
    this.rightArm.setOrigin(0.5, 0)
    this.rightArm.setAngle(-18)

    // Body
    this.body = s.add.circle(0, 0, BODY_RADIUS, BUDDY_BODY)
    this.body.setStrokeStyle(3, 0xe6963d)

    this.root.add([this.leftLeg, this.rightLeg, this.leftArm, this.rightArm, this.body])
  }

  private buildFace(): Phaser.GameObjects.Container {
    const s = this.scene
    const face = s.add.container(0, -6)

    // Cheeks
    const leftCheek = s.add.ellipse(-34, 14, 18, 12, CHEEK_COLOR, 0.55)
    const rightCheek = s.add.ellipse(34, 14, 18, 12, CHEEK_COLOR, 0.55)

    // Eyes
    this.leftEyeWhite = s.add.circle(-22, -8, 15, EYE_WHITE)
    this.rightEyeWhite = s.add.circle(22, -8, 15, EYE_WHITE)
    this.leftEyeWhite.setStrokeStyle(2, 0xd9ecf2)
    this.rightEyeWhite.setStrokeStyle(2, 0xd9ecf2)

    this.leftPupil = s.add.circle(-22, -8, 6.5, PUPIL_COLOR)
    this.rightPupil = s.add.circle(22, -8, 6.5, PUPIL_COLOR)

    // Eyebrows
    this.leftBrow = s.add.graphics()
    this.rightBrow = s.add.graphics()
    this.drawBrow(this.leftBrow, -22, -24)
    this.drawBrow(this.rightBrow, 22, -24)

    // Mouth
    this.mouth = s.add.graphics()
    this.setMouth('smile')

    face.add([
      leftCheek, rightCheek,
      this.leftEyeWhite, this.rightEyeWhite,
      this.leftPupil, this.rightPupil,
      this.leftBrow, this.rightBrow,
      this.mouth,
    ])

    return face
  }

  private drawBrow(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    g.clear()
    g.lineStyle(4, BROW_COLOR, 1)
    g.beginPath()
    // Gentle downward arc above the eye — reads as a relaxed brow
    g.arc(cx, cy + 10, 11, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false)
    g.strokePath()
  }

  private setBrowsRaised(raised: boolean): void {
    const yOffset = raised ? -3 : 0
    this.leftBrow.setY(yOffset)
    this.rightBrow.setY(yOffset)
  }

  // ── Mouth states ─────────────────────────────────────────────────────────

  setMouth(state: MouthState): void {
    const m = this.mouth
    m.clear()

    switch (state) {
      case 'smile':
        m.lineStyle(4, MOUTH_COLOR, 1)
        m.beginPath()
        m.arc(0, 14, 15, Phaser.Math.DegToRad(15), Phaser.Math.DegToRad(165), false)
        m.strokePath()
        break

      case 'open':
        m.fillStyle(MOUTH_COLOR, 1)
        m.fillEllipse(0, 18, 22, 18)
        m.fillStyle(0xffffff, 1)
        m.fillEllipse(0, 11, 16, 6)
        break

      case 'small_o':
        m.fillStyle(MOUTH_COLOR, 1)
        m.fillCircle(0, 16, 6)
        break

      case 'flat':
        m.lineStyle(4, MOUTH_COLOR, 1)
        m.beginPath()
        m.moveTo(-10, 16)
        m.lineTo(10, 16)
        m.strokePath()
        break
    }
  }

  // ── Idle & blink ─────────────────────────────────────────────────────────

  startIdle(): void {
    this.idleTween?.stop()
    this.idleTween = this.scene.tweens.add({
      targets: this.root,
      y: this.root.y - 6,
      duration: 1100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })
  }

  stopIdle(): void {
    this.idleTween?.stop()
  }

  private scheduleBlink(): void {
    if (this.destroyed) return
    const delay = Phaser.Math.Between(2200, 5000)
    this.blinkTimer = this.scene.time.delayedCall(delay, () => {
      if (this.destroyed) return
      this.blink()
      this.scheduleBlink()
    })
  }

  private blink(): void {
    const targets = [this.leftEyeWhite, this.rightEyeWhite, this.leftPupil, this.rightPupil]
    this.scene.tweens.add({
      targets,
      scaleY: 0.12,
      duration: 70,
      yoyo: true,
      ease: 'Sine.easeInOut',
    })
  }

  // ── Looking (Module 1 — joint attention) ────────────────────────────────

  /**
   * Turn Buddy's gaze toward left, center, or right.
   * Shifts pupils, raises brows slightly, and tilts the face for emphasis.
   */
  lookAt(direction: LookDirection, durationMs: number = 450): void {
    let pupilDx = 0
    let faceAngle = 0

    switch (direction) {
      case 'left':
        pupilDx = -5.5
        faceAngle = -7
        break
      case 'right':
        pupilDx = 5.5
        faceAngle = 7
        break
      case 'center':
        pupilDx = 0
        faceAngle = 0
        break
    }

    this.setBrowsRaised(direction !== 'center')

    this.scene.tweens.add({
      targets: this.leftPupil,
      x: -22 + pupilDx,
      duration: durationMs,
      ease: 'Sine.easeInOut',
    })
    this.scene.tweens.add({
      targets: this.rightPupil,
      x: 22 + pupilDx,
      duration: durationMs,
      ease: 'Sine.easeInOut',
    })
    this.scene.tweens.add({
      targets: this.face,
      angle: faceAngle,
      duration: durationMs,
      ease: 'Sine.easeInOut',
    })
  }

  resetLook(durationMs: number = 300): void {
    this.lookAt('center', durationMs)
  }

  // ── Gestures (Module 2 — peer imitation) ────────────────────────────────

  /**
   * Play one of 5 distinct gestures. Returns the approximate total
   * duration in ms so the calling scene can sequence around it.
   * onBeat fires at salient "impact" moments (e.g. each clap / stomp).
   */
  playGesture(gesture: GestureType, onComplete?: () => void, onBeat?: () => void): number {
    switch (gesture) {
      case 'wave':  return this.gestureWave(onComplete)
      case 'clap':  return this.gestureClap(onComplete, onBeat)
      case 'stomp': return this.gestureStomp(onComplete, onBeat)
      case 'spin':  return this.gestureSpin(onComplete)
      case 'jump':  return this.gestureJump(onComplete)
    }
  }

  private gestureWave(onComplete?: () => void): number {
    const duration = 1400
    this.scene.tweens.chain({
      targets: this.rightArm,
      tweens: [
        { angle: -100, duration: 220, ease: 'Sine.easeOut' },
        { angle: -70, duration: 160, ease: 'Sine.easeInOut', yoyo: true, repeat: 3 },
        { angle: -18, duration: 220, ease: 'Sine.easeIn' },
      ],
      onComplete: () => onComplete?.(),
    })
    return duration
  }

  private gestureClap(onComplete?: () => void, onBeat?: () => void): number {
    const duration = 1200
    const claps = 3
    let completed = 0

    for (let i = 0; i < claps; i++) {
      const startDelay = i * 380

      this.scene.tweens.add({
        targets: this.leftArm,
        angle: 65,
        duration: 160,
        delay: startDelay,
        ease: 'Sine.easeOut',
        yoyo: true,
        onYoyo: () => onBeat?.(),
      })
      this.scene.tweens.add({
        targets: this.rightArm,
        angle: -65,
        duration: 160,
        delay: startDelay,
        ease: 'Sine.easeOut',
        yoyo: true,
        onComplete: () => {
          completed++
          if (completed === claps) onComplete?.()
        },
      })
    }
    return duration
  }

  private gestureStomp(onComplete?: () => void, onBeat?: () => void): number {
    const duration = 1100
    const baseScaleX = this.root.scaleX
    const baseScaleY = this.root.scaleY

    this.scene.tweens.chain({
      targets: this.rightLeg,
      tweens: [
        { y: 48, angle: -8, duration: 200, ease: 'Sine.easeOut' },
        { y: 64, angle: 4, duration: 130, ease: 'Sine.easeIn', onComplete: () => onBeat?.() },
        { y: 60, angle: 0, duration: 120, ease: 'Sine.easeOut' },
        { y: 48, angle: -8, duration: 180, ease: 'Sine.easeOut', delay: 80 },
        { y: 64, angle: 4, duration: 120, ease: 'Sine.easeIn', onComplete: () => onBeat?.() },
        { y: 60, angle: 0, duration: 120, ease: 'Sine.easeOut' },
      ],
    })

    this.scene.tweens.chain({
      targets: this.root,
      tweens: [
        { scaleX: baseScaleX * 1.06, scaleY: baseScaleY * 0.92, duration: 130, delay: 280 },
        { scaleX: baseScaleX, scaleY: baseScaleY, duration: 120 },
        { scaleX: baseScaleX * 1.06, scaleY: baseScaleY * 0.92, duration: 130, delay: 280 },
        { scaleX: baseScaleX, scaleY: baseScaleY, duration: 120, onComplete: () => onComplete?.() },
      ],
    })
    return duration
  }

  private gestureSpin(onComplete?: () => void): number {
    const duration = 850
    this.scene.tweens.add({
      targets: this.root,
      angle: 360,
      duration,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.root.setAngle(0)
        onComplete?.()
      },
    })
    return duration
  }

  private gestureJump(onComplete?: () => void): number {
    const duration = 700
    const baseY = this.root.y
    const baseScaleX = this.root.scaleX
    const baseScaleY = this.root.scaleY

    this.scene.tweens.chain({
      targets: this.root,
      tweens: [
        { y: baseY - 42, scaleX: baseScaleX * 0.96, scaleY: baseScaleY * 1.06, duration: 240, ease: 'Sine.easeOut' },
        { y: baseY, scaleX: baseScaleX * 1.08, scaleY: baseScaleY * 0.88, duration: 220, ease: 'Sine.easeIn' },
        { scaleX: baseScaleX, scaleY: baseScaleY, duration: 240, ease: 'Sine.easeOut', onComplete: () => onComplete?.() },
      ],
    })
    return duration
  }

  // ── Feedback states ──────────────────────────────────────────────────────

  /** Positive feedback: arms up, happy bounce, big smile. */
  playCheer(onComplete?: () => void): number {
    const duration = 900
    this.setMouth('open')
    this.setBrowsRaised(true)
    const baseY = this.root.y

    this.scene.tweens.add({
      targets: this.leftArm, angle: -150, duration: 260, ease: 'Back.easeOut', yoyo: true, hold: 300,
    })
    this.scene.tweens.add({
      targets: this.rightArm, angle: 150, duration: 260, ease: 'Back.easeOut', yoyo: true, hold: 300,
    })

    this.scene.tweens.chain({
      targets: this.root,
      tweens: [
        { y: baseY - 18, scaleX: 1.08, scaleY: 1.08, duration: 200, ease: 'Sine.easeOut' },
        { y: baseY, scaleX: 1, scaleY: 1, duration: 260, ease: 'Bounce.easeOut' },
      ],
      onComplete: () => {
        this.setMouth('smile')
        this.setBrowsRaised(false)
        onComplete?.()
      },
    })
    return duration
  }

  /**
   * Gentle, encouraging feedback for an incorrect response.
   * Designed to feel like "oh! let's try that again" — never sad or punitive.
   */
  playEncourage(onComplete?: () => void): number {
    const duration = 750
    this.setMouth('small_o')

    this.scene.tweens.chain({
      targets: this.root,
      tweens: [
        { angle: -4, duration: 110, ease: 'Sine.easeInOut' },
        { angle: 4, duration: 110, ease: 'Sine.easeInOut' },
        { angle: -3, duration: 100, ease: 'Sine.easeInOut' },
        { angle: 0, duration: 100, ease: 'Sine.easeInOut' },
      ],
      onComplete: () => {
        this.setMouth('smile')
        onComplete?.()
      },
    })
    return duration
  }

  /** Buddy bounces and "calls" toward the camera after inactivity. */
  playCall(onComplete?: () => void): number {
    const duration = 1000
    const baseY = this.root.y
    this.lookAt('center', 200)

    this.scene.tweens.chain({
      targets: this.root,
      tweens: [
        { y: baseY - 16, duration: 180, ease: 'Sine.easeOut' },
        { y: baseY, duration: 220, ease: 'Bounce.easeOut' },
        { y: baseY - 16, duration: 180, ease: 'Sine.easeOut' },
        { y: baseY, duration: 220, ease: 'Bounce.easeOut', onComplete: () => onComplete?.() },
      ],
    })

    this.scene.tweens.add({
      targets: this.leftArm, angle: -60, duration: 200, yoyo: true, repeat: 1,
    })
    this.scene.tweens.add({
      targets: this.rightArm, angle: 60, duration: 200, yoyo: true, repeat: 1,
    })
    return duration
  }

  /** Friendly wave used on the menu screen. */
  playWaveGreeting(onComplete?: () => void): number {
    return this.gestureWave(onComplete)
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  setPosition(x: number, y: number): void {
    this.root.setPosition(x, y)
  }

  setScale(scale: number): void {
    this.root.setScale(scale)
  }

  destroy(): void {
    this.destroyed = true
    this.idleTween?.stop()
    this.blinkTimer?.remove()
    this.root.destroy()
  }
}
