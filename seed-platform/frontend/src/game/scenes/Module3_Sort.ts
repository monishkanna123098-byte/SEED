/**
 * S.E.E.D. — Buddy's World
 * Module3_Sort.ts — Object Sorting (DSM-5 Criteria B3 + B1 proxy)
 *
 * Colored shapes fall one at a time from the top. The child drags (or taps,
 * which resolves to the nearest bin on release) each object into the bin
 * matching its color. Shape varies independently of color — this gives the
 * analysis engine raw color/shape/reaction data per object.
 *
 * Single unified interaction model:
 *   - pointerdown on a falling object pauses its fall and starts drag tracking
 *   - pointerup resolves to the NEAREST bin to the release position
 *   - if never touched, the object auto-resolves when it reaches the
 *     catch line (nearest bin by x, large precision error, no drag path)
 */

import Phaser from 'phaser'
import { BaseGameScene, CANVAS_WIDTH, CANVAS_HEIGHT } from './BaseGameScene'
import { SortEvent, DragPoint } from '../analytics/EventCollector'

type BinColor = 'red' | 'blue' | 'green'
type ShapeType = 'circle' | 'square' | 'triangle' | 'star'

const BIN_KEYS: BinColor[] = ['red', 'blue', 'green']
const BIN_COLOR_HEX: Record<BinColor, number> = {
  red: 0xe63946,
  blue: 0x065a82,
  green: 0x02c39a,
}
const BIN_X: Record<BinColor, number> = { red: 160, blue: 400, green: 640 }
const BIN_Y = 540

const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'star']

const SPAWN_Y = 90
const CATCH_Y = 380
const MIN_HIT_RADIUS = 40 // 80px diameter minimum touch target

export class Module3_Sort extends BaseGameScene {
  constructor() {
    super('Module3_Sort')
  }

  protected moduleIndex = 2
  protected moduleKey = 'module3_sort'

  private objectIndex = 0
  private totalObjects = 12
  private colorSequence: BinColor[] = []
  private bins: Partial<Record<BinColor, Phaser.GameObjects.Container>> = {}
  private binRadius = 65

  private currentObject?: Phaser.GameObjects.Container
  private currentColor: BinColor = 'red'
  private currentShape: ShapeType = 'circle'
  private spawnTimeMs = 0
  private fallTween?: Phaser.Tweens.Tween

  private dragging = false
  private dragPath: DragPoint[] = []
  private dragStartMs = 0
  private resolved = false

  protected onCreate(): void {
    const cfg = this.ageAdapter.getConfig().sort
    this.totalObjects = cfg.objectCount
    this.binRadius = cfg.targetRadius

    this.buddy.setPosition(110, 250)
    this.buddy.setScale(0.85)

    this.colorSequence = this.buildColorSequence(this.totalObjects)
    this.createBins()

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p))
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p))

    this.spawnNext()
  }

  protected forceAdvance(): void {
    this.fallTween?.stop()
    if (this.currentObject && !this.resolved) {
      this.recordUntouched(this.objectIndex, this.currentColor, this.currentShape, true)
      this.currentObject.destroy()
      this.currentObject = undefined
    }
    for (let i = this.objectIndex + 1; i < this.totalObjects; i++) {
      const color = this.colorSequence[i]
      const shape = Phaser.Utils.Array.GetRandom(SHAPES)
      this.recordUntouched(i, color, shape, false)
    }
    this.completeModule()
  }

  // ── Setup ────────────────────────────────────────────────────────────────────

  /** Even distribution of colors across the 3 bins, shuffled. */
  private buildColorSequence(n: number): BinColor[] {
    const seq: BinColor[] = []
    for (let i = 0; i < n; i++) seq.push(BIN_KEYS[i % 3])
    return Phaser.Utils.Array.Shuffle(seq)
  }

  private createBins(): void {
    BIN_KEYS.forEach((key) => {
      const container = this.add.container(BIN_X[key], BIN_Y)

      const shadow = this.add.circle(4, 6, this.binRadius, 0x000000, 0.1)
      const outer = this.add.circle(0, 0, this.binRadius, BIN_COLOR_HEX[key])
      outer.setStrokeStyle(4, 0xffffff)
      const inner = this.add.circle(0, -this.binRadius * 0.25, this.binRadius * 0.55, 0xffffff, 0.25)

      container.add([shadow, outer, inner])
      this.bins[key] = container
    })
  }

  // ── Spawning ─────────────────────────────────────────────────────────────────

  private spawnNext(): void {
    if (this.objectIndex >= this.totalObjects) {
      this.completeModule()
      return
    }

    this.resolved = false
    this.currentColor = this.colorSequence[this.objectIndex]
    this.currentShape = Phaser.Utils.Array.GetRandom(SHAPES)

    const x = Phaser.Math.Between(120, CANVAS_WIDTH - 120)
    const size = this.ageAdapter.getConfig().sort.objectSize

    const container = this.add.container(x, SPAWN_Y)
    const g = this.add.graphics()
    this.drawShape(g, this.currentShape, size, BIN_COLOR_HEX[this.currentColor])
    container.add(g)
    container.setDepth(50)

    container.setInteractive(
      new Phaser.Geom.Circle(0, 0, Math.max(MIN_HIT_RADIUS, size / 2 + 10)),
      Phaser.Geom.Circle.Contains
    )
    container.on('pointerdown', () => this.onGrabObject())

    this.currentObject = container
    this.spawnTimeMs = this.eventCollector.getElapsedMs()

    const fallSpeedMs = this.ageAdapter.getConfig().sort.fallSpeedMs
    this.fallTween = this.tweens.add({
      targets: container,
      y: CATCH_Y,
      duration: fallSpeedMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (!this.resolved) this.autoResolveAtBottom()
      },
    })
  }

  // ── Interaction ──────────────────────────────────────────────────────────────

  private onGrabObject(): void {
    if (!this.currentObject || this.resolved || this.dragging) return
    this.resetInactivityTimer()

    this.fallTween?.pause()
    this.dragging = true
    this.dragStartMs = this.eventCollector.getElapsedMs()
    this.dragPath = [{ x: this.currentObject.x, y: this.currentObject.y, t: 0 }]

    this.tweens.add({ targets: this.currentObject, scaleX: 1.15, scaleY: 1.15, duration: 100 })
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || !this.currentObject) return

    const x = Phaser.Math.Clamp(pointer.x, 30, CANVAS_WIDTH - 30)
    const y = Phaser.Math.Clamp(pointer.y, 60, CANVAS_HEIGHT - 30)
    this.currentObject.setPosition(x, y)

    const last = this.dragPath[this.dragPath.length - 1]
    const dist = Phaser.Math.Distance.Between(last.x, last.y, x, y)
    if (dist > 3) {
      this.dragPath.push({ x, y, t: this.eventCollector.getElapsedMs() - this.dragStartMs })
    }
  }

  private onPointerUp(_pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || !this.currentObject) return
    this.dragging = false
    this.resetInactivityTimer()

    const obj = this.currentObject
    this.tweens.add({ targets: obj, scaleX: 1, scaleY: 1, duration: 100 })

    const dropBin = this.nearestBin(obj.x, obj.y)
    const reactionTimeMs = this.dragStartMs - this.spawnTimeMs

    this.resolveObject(dropBin, obj.x, obj.y, [...this.dragPath], reactionTimeMs)
  }

  /** Object reached the catch line without ever being touched. */
  private autoResolveAtBottom(): void {
    if (!this.currentObject) return
    const obj = this.currentObject
    const dropBin = this.nearestBin(obj.x, obj.y)
    const fallSpeedMs = this.ageAdapter.getConfig().sort.fallSpeedMs
    this.resolveObject(dropBin, obj.x, obj.y, [], fallSpeedMs)
  }

  private nearestBin(x: number, y: number): BinColor {
    let best: BinColor = 'red'
    let bestDist = Infinity
    BIN_KEYS.forEach((key) => {
      const d = Phaser.Math.Distance.Between(x, y, BIN_X[key], BIN_Y)
      if (d < bestDist) {
        bestDist = d
        best = key
      }
    })
    return best
  }

  private resolveObject(
    dropBin: BinColor,
    finalX: number,
    finalY: number,
    dragPath: DragPoint[],
    reactionTimeMs: number
  ): void {
    if (!this.currentObject || this.resolved) return
    this.resolved = true
    this.fallTween?.stop()

    const obj = this.currentObject
    const targetX = BIN_X[dropBin]
    const targetY = BIN_Y
    const precisionError = Phaser.Math.Distance.Between(finalX, finalY, targetX, targetY)
    const correct = dropBin === this.currentColor
    const deviation = this.computeDragDeviation(dragPath)

    const event: SortEvent = {
      type: dragPath.length > 1 ? 'drag' : 'tap',
      object_id: this.objectIndex,
      timestamp_ms: this.eventCollector.getElapsedMs(),
      color: this.currentColor,
      shape: this.currentShape,
      target_bin: this.currentColor,
      drop_bin: dropBin,
      correct,
      target_x: targetX,
      target_y: targetY,
      target_radius: this.binRadius,
      actual_x: finalX,
      actual_y: finalY,
      tap_x: finalX,
      tap_y: finalY,
      drag_path: dragPath,
      drag_path_deviation: deviation,
      reaction_time_ms: Math.max(0, reactionTimeMs),
      precision_error_px: precisionError,
      stimulus_type: 'nonsocial',
    }
    this.eventCollector.addSortEvent(event)

    // Animate object flying to bin center, then feedback
    this.tweens.add({
      targets: obj,
      x: targetX,
      y: targetY,
      scaleX: 0.4,
      scaleY: 0.4,
      alpha: 0.6,
      duration: 220,
      ease: 'Back.easeIn',
      onComplete: () => {
        obj.destroy()
        this.currentObject = undefined

        if (correct) {
          this.soundManager.play('success')
          this.pulseBin(dropBin, true)
          this.buddy.playCheer()
        } else {
          this.soundManager.play('try_again')
          this.pulseBin(dropBin, false)
          this.buddy.playEncourage()
        }

        this.objectIndex++
        this.time.delayedCall(550, () => this.spawnNext())
      },
    })
  }

  private computeDragDeviation(path: DragPoint[]): number {
    if (path.length < 2) return 0
    const start = path[0]
    const end = path[path.length - 1]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const lineLenSq = dx * dx + dy * dy

    if (lineLenSq < 1) return 0

    let totalDev = 0
    for (const p of path) {
      const t = ((p.x - start.x) * dx + (p.y - start.y) * dy) / lineLenSq
      const projX = start.x + t * dx
      const projY = start.y + t * dy
      totalDev += Phaser.Math.Distance.Between(p.x, p.y, projX, projY)
    }
    return totalDev / path.length
  }

  private pulseBin(key: BinColor, success: boolean): void {
    const bin = this.bins[key]
    if (!bin) return
    this.tweens.add({
      targets: bin,
      scaleX: success ? 1.18 : 0.92,
      scaleY: success ? 1.18 : 0.92,
      duration: 200,
      yoyo: true,
    })
  }

  // ── Force-advance filler records ────────────────────────────────────────────

  private recordUntouched(
    index: number,
    color: BinColor,
    shape: ShapeType,
    wasFalling: boolean
  ): void {
    const fallSpeedMs = this.ageAdapter.getConfig().sort.fallSpeedMs
    const x = wasFalling && this.currentObject ? this.currentObject.x : CANVAS_WIDTH / 2
    const y = wasFalling && this.currentObject ? this.currentObject.y : SPAWN_Y

    this.eventCollector.addSortEvent({
      type: 'tap',
      object_id: index,
      timestamp_ms: this.eventCollector.getElapsedMs(),
      color,
      shape,
      target_bin: color,
      drop_bin: 'none',
      correct: false,
      target_x: BIN_X[color],
      target_y: BIN_Y,
      target_radius: this.binRadius,
      actual_x: x,
      actual_y: y,
      tap_x: x,
      tap_y: y,
      drag_path: [],
      drag_path_deviation: 0,
      reaction_time_ms: fallSpeedMs,
      precision_error_px: 150,
      stimulus_type: 'nonsocial',
    })
  }

  // ── Module completion ───────────────────────────────────────────────────────

  private completeModule(): void {
    this.eventCollector.markModuleComplete(this.moduleKey)
    this.soundManager.play('completion')
    this.playCompletionBurst(CANVAS_WIDTH / 2, 280)
    this.buddy.playCheer(() => {
      this.time.delayedCall(600, () => this.fadeToScene('Module4_Follow'))
    })
  }

  // ── Shape drawing ────────────────────────────────────────────────────────────

  private drawShape(g: Phaser.GameObjects.Graphics, shape: ShapeType, size: number, color: number): void {
    g.fillStyle(color, 1)
    g.lineStyle(2, 0xffffff, 0.8)

    switch (shape) {
      case 'circle':
        g.fillCircle(0, 0, size / 2)
        g.strokeCircle(0, 0, size / 2)
        break

      case 'square':
        g.fillRoundedRect(-size / 2, -size / 2, size, size, size * 0.15)
        g.strokeRoundedRect(-size / 2, -size / 2, size, size, size * 0.15)
        break

      case 'triangle':
        g.fillTriangle(0, -size / 2, -size / 2, size / 2, size / 2, size / 2)
        g.strokeTriangle(0, -size / 2, -size / 2, size / 2, size / 2, size / 2)
        break

      case 'star': {
        const points: Phaser.Types.Math.Vector2Like[] = []
        const outerR = size / 2
        const innerR = size / 4.2
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR
          const angle = (Math.PI / 5) * i - Math.PI / 2
          points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) })
        }
        g.fillPoints(points, true)
        g.strokePoints(points, true)
        break
      }
    }
  }
}
