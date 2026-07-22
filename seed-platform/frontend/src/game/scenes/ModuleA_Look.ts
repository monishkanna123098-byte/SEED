/**
 * S.E.E.D. — Buddy's World
 * ModuleA_Look.ts
 *
 * Response to social bid (name-call) + joint attention (initiation and
 * response). Design spec: docs/superpowers/specs/2026-07-18-module-a-look-design.md
 *
 * Two trial types, interleaved (not run as independent parallel timers —
 * see spec §2 for why): NAME_CALL and JOINT_ATTENTION. Buddy is the
 * anchor throughout; 2-4 low-salience background characters (per band)
 * provide the "other things happening" context Signal A4 needs.
 */

import Phaser from 'phaser'
import { BaseGameScene, CANVAS_WIDTH } from './BaseGameScene'
import { OtherCharacterSprite } from '../utils/OtherCharacterSprite'
import { getLookConfig, type LookModuleConfig } from '../utils/AgeAdapter'
import type { LookDirection } from '../utils/BuddySprite'
import { buildLookTrialSequence, type LookTrialType } from './lookTrialSequence'

type TrialType = LookTrialType

const STAR_POSITIONS: Record<LookDirection, number> = { left: 200, center: 400, right: 600 }
const STAR_Y = 320

export class ModuleA_Look extends BaseGameScene {
  protected moduleKey = 'LOOK'

  constructor() {
    super('ModuleA_Look')
  }

  private cfg!: LookModuleConfig
  private trialSequence: TrialType[] = []
  private trialIndex = 0
  private currentTrialType: TrialType = 'name_call'
  private currentTrialId = 0
  private trialActive = false
  private trialStartElapsedMs = 0
  private cueOnsetElapsedMs: number | null = null

  private otherCharacters: OtherCharacterSprite[] = []
  private star?: Phaser.GameObjects.Container
  private starDirection: LookDirection = 'center'

  private initiationTimer?: Phaser.Time.TimerEvent
  private responseTimer?: Phaser.Time.TimerEvent

  protected onCreate(): void {
    this.cfg = getLookConfig(this.ageMonths)
    this.trialSequence = this.buildTrialSequence()

    this.buddy.enableInteraction((region) => this.handleBuddyTap(region))
    this.spawnOtherCharacters()

    this.time.delayedCall(500, () => this.runNextTrial())
  }

  protected forceAdvance(): void {
    // 30s unresponsive — resolve whatever trial is active as a timeout
    // and move on, same principle as every other module: don't punish,
    // don't stall, keep the session moving.
    if (this.currentTrialType === 'name_call') {
      this.resolveNameCallTrial('none')
    } else {
      this.resolveJointAttentionTrial(false)
    }
  }

  // ── Trial sequencing ─────────────────────────────────────────────────────

  private buildTrialSequence(): TrialType[] {
    return buildLookTrialSequence(this.cfg.trialCounts.nameCall, this.cfg.trialCounts.jointAttention)
  }

  private runNextTrial(): void {
    if (this.trialIndex >= this.trialSequence.length) {
      this.completeModule()
      return
    }
    this.currentTrialType = this.trialSequence[this.trialIndex]
    this.currentTrialId = this.trialIndex + 1
    this.trialIndex++

    if (this.currentTrialType === 'name_call') {
      this.runNameCallTrial()
    } else {
      this.runJointAttentionTrial()
    }
  }

  private advanceTrial(): void {
    this.resetInactivityTimer()
    this.time.delayedCall(400, () => this.runNextTrial())
  }

  // ── NAME_CALL trials (Signals A1, A3, A4) ────────────────────────────────

  private runNameCallTrial(): void {
    this.trialActive = true
    this.trialStartElapsedMs = this.eventCollector.getElapsedMs()

    this.soundManager.play('buddy_call')
    this.buddy.playCall()

    this.responseTimer = this.time.delayedCall(this.cfg.responseWindowMs, () => {
      this.resolveNameCallTrial('none')
    })
  }

  private handleBuddyTap(region: 'face' | 'body'): void {
    if (!this.trialActive || this.currentTrialType !== 'name_call') return
    this.resolveNameCallTrial(region === 'face' ? 'buddy_face' : 'buddy_body')
  }

  private handleCharacterTap(): void {
    if (!this.trialActive || this.currentTrialType !== 'name_call') return
    this.resolveNameCallTrial('other_character')
  }

  private resolveNameCallTrial(target: 'buddy_face' | 'buddy_body' | 'other_character' | 'none'): void {
    if (!this.trialActive) return
    this.trialActive = false
    this.responseTimer?.remove()

    const latencyMs = target === 'none' ? null : this.eventCollector.getElapsedMs() - this.trialStartElapsedMs
    this.eventCollector.addLookEvent({
      type: 'name_call',
      trial_id: this.currentTrialId,
      timestamp_ms: this.trialStartElapsedMs,
      response_target: target,
      latency_ms: latencyMs,
      stimulus_type: 'social',
    })

    const correct = target === 'buddy_face' || target === 'buddy_body'
    if (correct) {
      this.soundManager.play('success')
      this.buddy.playCheer()
    } else {
      this.soundManager.play('try_again')
      this.buddy.playEncourage()
    }

    this.advanceTrial()
  }

  // ── JOINT_ATTENTION trials (Signals A2, response accuracy) ───────────────

  private runJointAttentionTrial(): void {
    this.trialActive = true
    this.trialStartElapsedMs = this.eventCollector.getElapsedMs()
    this.cueOnsetElapsedMs = null

    this.spawnStar()

    this.initiationTimer = this.time.delayedCall(this.cfg.initiationWindowMs, () => {
      if (!this.trialActive) return // already resolved during the initiation window
      this.fireGazeCue()
    })
  }

  private fireGazeCue(): void {
    this.cueOnsetElapsedMs = this.eventCollector.getElapsedMs()
    this.buddy.lookAt(this.starDirection)

    this.responseTimer = this.time.delayedCall(this.cfg.responseWindowMs, () => {
      this.resolveJointAttentionTrial(false)
    })
  }

  private handleStarTap(): void {
    if (!this.trialActive || this.currentTrialType !== 'joint_attention') return
    this.resolveJointAttentionTrial(true)
  }

  private resolveJointAttentionTrial(tapped: boolean): void {
    if (!this.trialActive) return
    this.trialActive = false
    this.initiationTimer?.remove()
    this.responseTimer?.remove()

    const tapMs = tapped ? this.eventCollector.getElapsedMs() : null
    const initiated = tapped && this.cueOnsetElapsedMs === null

    this.eventCollector.addLookEvent({
      type: 'joint_attention',
      trial_id: this.currentTrialId,
      timestamp_ms: this.trialStartElapsedMs,
      cue_onset_ms: this.cueOnsetElapsedMs,
      tap_ms: tapMs,
      initiated,
      correct: tapped,
      stimulus_type: 'social',
    })

    this.buddy.resetLook()
    this.destroyStar()

    if (tapped) {
      this.soundManager.play('success')
      this.buddy.playCheer()
    } else {
      this.soundManager.play('try_again')
      this.buddy.playEncourage()
    }

    this.advanceTrial()
  }

  // ── Visual setup ─────────────────────────────────────────────────────────

  private spawnOtherCharacters(): void {
    const count = this.cfg.numCharacters
    const positions: Array<[number, number]> = []
    // Spread evenly across the upper-middle band, above Buddy, below the
    // star's y-position, so nothing visually overlaps.
    const spacing = CANVAS_WIDTH / (count + 1)
    for (let i = 0; i < count; i++) {
      positions.push([spacing * (i + 1), 150])
    }

    positions.forEach(([x, y], i) => {
      const character = new OtherCharacterSprite(this, x, y, i)
      character.enableInteraction(() => this.handleCharacterTap())
      this.otherCharacters.push(character)
    })
  }

  private spawnStar(): void {
    const directions: LookDirection[] = ['left', 'center', 'right']
    this.starDirection = directions[Phaser.Math.Between(0, 2)]
    const x = STAR_POSITIONS[this.starDirection]

    const size = this.cfg.starSizePx
    const star = this.add.star(0, 0, 5, size * 0.4, size * 0.9, 0xffd700)
    star.setStrokeStyle(3, 0xf4a261)
    const container = this.add.container(x, STAR_Y, [star])

    this.tweens.add({
      targets: container,
      scale: 1.12,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const hitRadius = size * 0.9
    star.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Circle(0, 0, hitRadius), hitAreaCallback: Phaser.Geom.Circle.Contains })
    star.on('pointerup', () => this.handleStarTap())

    this.star = container
  }

  private destroyStar(): void {
    this.star?.destroy()
    this.star = undefined
  }

  // ── Completion ────────────────────────────────────────────────────────────

  private completeModule(): void {
    this.eventCollector.markModuleComplete('LOOK')
    this.playCompletionBurst()
    this.soundManager.play('completion')
    this.buddy.playExcited()

    // Stage E wiring complete — advances to whichever module is next
    // in this session's actual sequence (was a TEMPORARY direct fade
    // to ResultScene before Stage E existed).
    this.time.delayedCall(1200, () => this.advanceToNextModule())
  }

  shutdown(): void {
    this.otherCharacters.forEach((c) => c.destroy())
    this.destroyStar()
    super.shutdown()
  }
}
