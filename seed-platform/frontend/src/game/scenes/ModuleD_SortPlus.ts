/**
 * S.E.E.D. — Buddy's World
 * ModuleD_SortPlus.ts
 *
 * Categorization + rule-flexibility. Design spec:
 * docs/superpowers/specs/2026-07-18-module-d-sortplus-design.md
 *
 * Adapts Module3_Sort.ts's proven drag mechanic (falling objects,
 * drag-to-nearest-bin, auto-resolve at the catch line) rather than
 * rewriting it — that part isn't broken and isn't touched beyond what
 * the phase system needs. What's new: a rule-switch between Phase 1
 * (color) and Phase 2 (shape) for Band 3, with a Buddy-tappable
 * check window at the switch (the generic SocialCheckEvent,
 * trigger: 'rule_change', already anticipated exactly this in
 * sub-project 3 before this module existed).
 */

import Phaser from 'phaser'
import { BaseGameScene, CANVAS_WIDTH, CANVAS_HEIGHT } from './BaseGameScene'
import { DragPoint } from '../analytics/EventCollector'
import { getSortPlusConfig, type SortPlusModuleConfig } from '../utils/AgeAdapter'
import { BIN_ASSIGNMENTS, evaluateSortPlusDrop, type BinColor, type SortShape } from './sortPlusLogic'

const BIN_COLOR_HEX: Record<BinColor, number> = { red: 0xe63946, blue: 0x065a82, green: 0x02c39a }
const BIN_X = [160, 400, 640]
const BIN_Y = 540
const SPAWN_Y = 90
const CATCH_Y = 380
const MIN_HIT_RADIUS = 40

interface BinSlot {
  container: Phaser.GameObjects.Container
  fill: Phaser.GameObjects.Arc
  shapeIcon: Phaser.GameObjects.Graphics
}

export class ModuleD_SortPlus extends BaseGameScene {
  protected moduleKey = 'SORT_PLUS'

  constructor() {
    super('ModuleD_SortPlus')
  }

  private cfg!: SortPlusModuleConfig
  private phase: 1 | 2 = 1
  private objectIndexInPhase = 0
  private bins: BinSlot[] = []
  private binRadius = 65

  private currentObject?: Phaser.GameObjects.Container
  private currentColor: BinColor = 'red'
  private currentShape: SortShape = 'circle'
  private globalObjectId = 0
  private spawnTimeMs = 0
  private fallTween?: Phaser.Tweens.Tween

  private dragging = false
  private dragPath: DragPoint[] = []
  private dragStartMs = 0
  private resolved = false

  protected onCreate(): void {
    this.cfg = getSortPlusConfig(this.ageMonths)
    this.phase = 1

    this.buddy.setPosition(110, 250)
    this.buddy.setScale(0.85)

    this.createBins()

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p))
    this.input.on('pointerup', () => this.onPointerUp())

    this.spawnNext()
  }

  protected forceAdvance(): void {
    this.fallTween?.stop()
    if (this.currentObject && !this.resolved) {
      this.currentObject.destroy()
      this.currentObject = undefined
    }
    this.completeModule()
  }

  // ── Bins ──────────────────────────────────────────────────────────────────

  private createBins(): void {
    BIN_ASSIGNMENTS.forEach((assignment, i) => {
      const x = BIN_X[i]
      const container = this.add.container(x, BIN_Y)
      const shadow = this.add.circle(4, 6, this.binRadius, 0x000000, 0.1)
      const fill = this.add.circle(0, 0, this.binRadius, BIN_COLOR_HEX[assignment.color])
      fill.setStrokeStyle(4, 0xffffff)
      const shapeIcon = this.add.graphics()
      shapeIcon.setVisible(false) // only shown in Phase 2

      container.add([shadow, fill, shapeIcon])
      this.bins.push({ container, fill, shapeIcon })
    })
  }

  /** Phase 1 -> Phase 2 transform: color fill fades to neutral, a shape
   *  icon fades in. Otherwise a bin that still visibly "looks red" could
   *  act as an accidental crutch even though sorting is now by shape —
   *  see design spec §3. */
  private transformBinsToShapeMode(): void {
    this.bins.forEach((bin, i) => {
      const shapeType = BIN_ASSIGNMENTS[i].shape
      // Fade out, swap the fill color + reveal the shape icon while
      // invisible, then fade back in. Alpha tweens are always reliable in
      // Phaser; interpolating a fillColor value directly is not something
      // to depend on without confirming its exact tween behavior first.
      this.tweens.add({
        targets: bin.fill,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          bin.fill.setFillStyle(0xb8b8b8)
          this.drawShapeIcon(bin.shapeIcon, shapeType, 0xffffff)
          bin.shapeIcon.setVisible(true)
          this.tweens.add({ targets: bin.fill, alpha: 1, duration: 250 })
        },
      })
    })
  }

  private drawShapeIcon(g: Phaser.GameObjects.Graphics, shape: SortShape, color: number): void {
    g.clear()
    g.fillStyle(color, 1)
    const size = 44
    switch (shape) {
      case 'circle':
        g.fillCircle(0, 0, size / 2)
        break
      case 'square':
        g.fillRoundedRect(-size / 2, -size / 2, size, size, size * 0.15)
        break
      case 'triangle':
        g.fillTriangle(0, -size / 2, -size / 2, size / 2, size / 2, size / 2)
        break
    }
  }

  // ── Rule-switch moment (Band 3 only) ─────────────────────────────────────

  private startRuleSwitch(): void {
    this.buddy.playExcited()
    this.soundManager.play('flash')

    const checkStartElapsedMs = this.eventCollector.getElapsedMs()
    this.ruleChangeChecked = false
    this.buddy.enableInteraction(() => {
      if (this.ruleChangeChecked) return // already recorded — ignore extra taps
      this.ruleChangeChecked = true
      const latency = this.eventCollector.getElapsedMs() - checkStartElapsedMs
      this.eventCollector.addSocialCheckEvent({
        type: 'social_check',
        module: 'SORT_PLUS',
        timestamp_ms: checkStartElapsedMs,
        trigger: 'rule_change',
        action: 'tap_buddy',
        latency_ms: latency,
      })
    })

    this.time.delayedCall(this.cfg.ruleSwitchCheckWindowMs, () => {
      // If never tapped during the window, record the no-action outcome.
      // (A tap during the window already recorded 'tap_buddy' above and
      // this delayed call still fires, but addSocialCheckEvent has
      // already run — recording a second, contradictory event here would
      // be wrong, so guard with a flag.)
      if (!this.ruleChangeChecked) {
        this.eventCollector.addSocialCheckEvent({
          type: 'social_check',
          module: 'SORT_PLUS',
          timestamp_ms: checkStartElapsedMs,
          trigger: 'rule_change',
          action: 'no_action',
          latency_ms: null,
        })
      }
      this.transformBinsToShapeMode()
      this.phase = 2
      this.objectIndexInPhase = 0
      this.time.delayedCall(700, () => this.spawnNext())
    })
  }

  private ruleChangeChecked = false

  // ── Spawning (adapted from Module3_Sort.ts, phase-aware) ─────────────────

  private spawnNext(): void {
    const objectsThisPhase = this.cfg.objectsPerPhase[this.phase - 1]
    if (this.objectIndexInPhase >= objectsThisPhase) {
      if (this.cfg.hasRuleSwitch && this.phase === 1) {
        this.startRuleSwitch()
      } else {
        this.completeModule()
      }
      return
    }

    this.resolved = false
    const shapes: SortShape[] = ['circle', 'square', 'triangle']
    this.currentColor = Phaser.Utils.Array.GetRandom(['red', 'blue', 'green'] as BinColor[])
    this.currentShape = Phaser.Utils.Array.GetRandom(shapes)

    const x = Phaser.Math.Between(120, CANVAS_WIDTH - 120)
    const size = 70

    const container = this.add.container(x, SPAWN_Y)
    const g = this.add.graphics()
    this.drawShapeIcon(g, this.currentShape, BIN_COLOR_HEX[this.currentColor])
    container.add(g)
    container.setDepth(50)

    container.setInteractive(new Phaser.Geom.Circle(0, 0, Math.max(MIN_HIT_RADIUS, size / 2 + 10)), Phaser.Geom.Circle.Contains)
    container.on('pointerdown', () => this.onGrabObject())

    this.currentObject = container
    this.spawnTimeMs = this.eventCollector.getElapsedMs()

    this.fallTween = this.tweens.add({
      targets: container,
      y: CATCH_Y,
      duration: this.cfg.fallSpeedMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (!this.resolved) this.autoResolveAtBottom()
      },
    })
  }

  // ── Interaction (unchanged from Module3_Sort.ts) ─────────────────────────

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
    if (dist > 3) this.dragPath.push({ x, y, t: this.eventCollector.getElapsedMs() - this.dragStartMs })
  }

  private onPointerUp(): void {
    if (!this.dragging || !this.currentObject) return
    this.dragging = false
    this.resetInactivityTimer()
    const obj = this.currentObject
    this.tweens.add({ targets: obj, scaleX: 1, scaleY: 1, duration: 100 })
    const dropSlot = this.nearestBinSlot(obj.x, obj.y)
    const reactionTimeMs = this.dragStartMs - this.spawnTimeMs
    this.resolveObject(dropSlot, obj.x, obj.y, [...this.dragPath], reactionTimeMs, false)
  }

  private autoResolveAtBottom(): void {
    if (!this.currentObject) return
    const obj = this.currentObject
    const dropSlot = this.nearestBinSlot(obj.x, obj.y)
    this.resolveObject(dropSlot, obj.x, obj.y, [], this.cfg.fallSpeedMs, true)
  }

  private nearestBinSlot(x: number, y: number): number {
    let best = 0
    let bestDist = Infinity
    BIN_X.forEach((binX, i) => {
      const d = Phaser.Math.Distance.Between(x, y, binX, BIN_Y)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    return best
  }

  private resolveObject(dropSlot: number, finalX: number, finalY: number, dragPath: DragPoint[], reactionTimeMs: number, wasAutoResolved: boolean): void {
    if (!this.currentObject || this.resolved) return
    this.resolved = true
    this.fallTween?.stop()

    const obj = this.currentObject
    const targetX = BIN_X[dropSlot]
    const targetY = BIN_Y
    const precisionError = Phaser.Math.Distance.Between(finalX, finalY, targetX, targetY)
    const deviation = this.computeDragDeviation(dragPath)
    const { correct, isPerseverativeError } = evaluateSortPlusDrop(this.currentColor, this.currentShape, dropSlot, this.phase)

    this.eventCollector.addSortPlusEvent({
      type: dragPath.length > 1 ? 'drag' : 'tap',
      object_id: this.globalObjectId++,
      phase: this.phase,
      rule: this.phase === 1 ? 'color' : 'shape',
      timestamp_ms: this.eventCollector.getElapsedMs(),
      color: this.currentColor,
      shape: this.currentShape,
      target_bin: this.phase === 1 ? this.currentColor : this.currentShape,
      drop_bin: BIN_ASSIGNMENTS[dropSlot][this.phase === 1 ? 'color' : 'shape'],
      correct,
      is_perseverative_error: isPerseverativeError,
      was_auto_resolved: wasAutoResolved,
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
    })

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
          this.pulseBin(dropSlot, true)
          this.buddy.playCheer()
        } else {
          this.soundManager.play('try_again')
          this.pulseBin(dropSlot, false)
          this.buddy.playEncourage()
        }
        this.objectIndexInPhase++
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

  private pulseBin(slot: number, success: boolean): void {
    const bin = this.bins[slot]
    if (!bin) return
    this.tweens.add({ targets: bin.container, scaleX: success ? 1.18 : 0.92, scaleY: success ? 1.18 : 0.92, duration: 200, yoyo: true })
  }

  // ── Completion ────────────────────────────────────────────────────────────

  private completeModule(): void {
    this.eventCollector.markModuleComplete('SORT_PLUS')
    this.soundManager.play('completion')
    this.playCompletionBurst(CANVAS_WIDTH / 2, 280)
    this.buddy.playCheer()
    // Stage E wiring complete — see ModuleA_Look's completeModule() comment.
    this.time.delayedCall(1200, () => this.advanceToNextModule())
  }

  shutdown(): void {
    this.currentObject?.destroy()
    this.bins.forEach((b) => b.container.destroy())
    super.shutdown()
  }
}
