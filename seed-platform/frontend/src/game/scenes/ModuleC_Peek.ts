/**
 * S.E.E.D. — Buddy's World
 * ModuleC_Peek.ts
 *
 * Object permanence + social referencing. Design spec:
 * docs/superpowers/specs/2026-07-18-module-c-peek-design.md
 *
 * Two trial types: plain (hide-shuffle-find) and referencing (adds
 * Buddy's confusion moment + checking window before the cue fires).
 * "Checking Buddy" is operationalized as an actual tap (see spec §2) —
 * reuses playCurious() for the confusion expression, which was already
 * written anticipating this exact reuse (its own doc comment names
 * Modules C/D/E explicitly).
 */

import Phaser from 'phaser'
import { BaseGameScene, CANVAS_WIDTH } from './BaseGameScene'
import { getPeekConfig, type PeekModuleConfig } from '../utils/AgeAdapter'
import { buildPeekTrialSequence, type PeekTrialType } from './peekTrialSequence'

const CUP_Y = 340
const OBJECT_COLOR = 0x02c39a
const CUP_COLOR = 0x8a5a1e
const CUP_RIM_COLOR = 0xf2a23e

interface Cup {
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Rectangle
}

export class ModuleC_Peek extends BaseGameScene {
  protected moduleKey = 'PEEK'

  private cfg!: PeekModuleConfig
  private trialSequence: PeekTrialType[] = []
  private trialIndex = 0
  private currentTrialType: PeekTrialType = 'plain'
  private currentTrialId = 0
  private trialActive = false
  private trialStartElapsedMs = 0

  private cups: Cup[] = []
  private cupX: number[] = []
  /** Which SLOT (index into cups[]/cupX[]) currently holds the object —
   *  updated as shuffle swaps happen, since the object stays put while
   *  the CUPS move over it. */
  private targetSlot = 0
  private hiddenObject?: Phaser.GameObjects.Arc
  private cupTaps: number[] = []

  private checkedBuddy = false
  private checkLatencyMs: number | null = null
  private cueOnsetElapsedMs: number | null = null
  private actualNumShuffles = 0

  private checkingTimer?: Phaser.Time.TimerEvent
  private responseTimer?: Phaser.Time.TimerEvent

  protected onCreate(): void {
    this.cfg = getPeekConfig(this.ageMonths)
    this.trialSequence = buildPeekTrialSequence(this.cfg.trialCounts.plain, this.cfg.trialCounts.referencing)

    this.buddy.enableInteraction(() => this.handleBuddyTap())
    this.spawnCups()

    this.time.delayedCall(500, () => this.runNextTrial())
  }

  protected forceAdvance(): void {
    this.resolveTrial(false)
  }

  // ── Trial sequencing ─────────────────────────────────────────────────────

  private runNextTrial(): void {
    if (this.trialIndex >= this.trialSequence.length) {
      this.completeModule()
      return
    }
    this.currentTrialType = this.trialSequence[this.trialIndex]
    this.currentTrialId = this.trialIndex + 1
    this.trialIndex++

    this.cupTaps = []
    this.checkedBuddy = false
    this.checkLatencyMs = null
    this.cueOnsetElapsedMs = null
    this.trialActive = true
    this.trialStartElapsedMs = this.eventCollector.getElapsedMs()

    this.hideObjectUnderRandomCup(() => {
      const numShuffles = Phaser.Math.Between(this.cfg.numShufflesRange[0], this.cfg.numShufflesRange[1])
      this.actualNumShuffles = numShuffles
      this.runShuffles(numShuffles, () => {
        if (this.currentTrialType === 'plain') {
          this.openCupResponseWindow()
        } else {
          this.startReferencingSequence()
        }
      })
    })
  }

  private advanceTrial(): void {
    this.resetInactivityTimer()
    this.time.delayedCall(500, () => this.runNextTrial())
  }

  // ── Hide & shuffle ────────────────────────────────────────────────────────

  private hideObjectUnderRandomCup(onComplete: () => void): void {
    this.targetSlot = Phaser.Math.Between(0, this.cfg.numCups - 1)
    const x = this.cupX[this.targetSlot]

    this.hiddenObject = this.add.circle(x, CUP_Y + 40, 18, OBJECT_COLOR)
    this.hiddenObject.setDepth(5)
    this.lowerCup(this.targetSlot, false)

    this.time.delayedCall(700, () => {
      this.hiddenObject?.destroy()
      this.hiddenObject = undefined
      this.lowerCup(this.targetSlot, true)
      onComplete()
    })
  }

  /** Visually raise a cup briefly to show/hide the object underneath. */
  private lowerCup(slot: number, covered: boolean): void {
    this.tweens.add({
      targets: this.cups[slot].container,
      y: covered ? CUP_Y : CUP_Y - 50,
      duration: 250,
      ease: 'Sine.easeInOut',
    })
  }

  private runShuffles(remaining: number, onComplete: () => void): void {
    if (remaining <= 0) {
      onComplete()
      return
    }
    const a = Phaser.Math.Between(0, this.cfg.numCups - 1)
    let b = Phaser.Math.Between(0, this.cfg.numCups - 1)
    while (b === a) b = Phaser.Math.Between(0, this.cfg.numCups - 1)

    const swapDurationMs = this.currentTrialType === 'referencing' ? 220 : 380 // referencing trials shuffle faster, per spec §3

    const cupA = this.cups[a].container
    const cupB = this.cups[b].container
    const xA = this.cupX[a]
    const xB = this.cupX[b]

    this.tweens.add({ targets: cupA, x: xB, duration: swapDurationMs, ease: 'Sine.easeInOut' })
    this.tweens.add({
      targets: cupB,
      x: xA,
      duration: swapDurationMs,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Swap the container references AND the cupX bookkeeping so slot
        // indices keep meaning "the cup currently at this on-screen position."
        const tempCup = this.cups[a]
        this.cups[a] = this.cups[b]
        this.cups[b] = tempCup
        if (this.targetSlot === a) this.targetSlot = b
        else if (this.targetSlot === b) this.targetSlot = a

        this.runShuffles(remaining - 1, onComplete)
      },
    })
  }

  // ── Plain trial response ─────────────────────────────────────────────────

  private openCupResponseWindow(): void {
    this.responseTimer = this.time.delayedCall(this.cfg.cupResponseWindowMs, () => {
      this.resolveTrial(false)
    })
  }

  // ── Referencing trial: confusion, check, cue ─────────────────────────────

  private startReferencingSequence(): void {
    this.buddy.playCurious() // "confusion" expression — see file header
    this.soundManager.play('flash')

    const checkStartElapsedMs = this.eventCollector.getElapsedMs()
    this.checkingTimer = this.time.delayedCall(this.cfg.checkingWindowMs, () => {
      if (!this.trialActive || this.checkedBuddy) return // already checked or trial already resolved by an early cup-tap
      this.fireGazeCue()
    })
    // Stashing the check-window start so handleBuddyTap can compute latency.
    this.checkWindowStartElapsedMs = checkStartElapsedMs

    this.openCupResponseWindowForReferencing(true)
  }

  private checkWindowStartElapsedMs = 0

  private handleBuddyTap(): void {
    if (!this.trialActive || this.currentTrialType !== 'referencing' || this.checkedBuddy || this.cueOnsetElapsedMs !== null) return
    this.checkedBuddy = true
    this.checkLatencyMs = this.eventCollector.getElapsedMs() - this.checkWindowStartElapsedMs
    this.checkingTimer?.remove()
    this.fireGazeCue()
  }

  private fireGazeCue(): void {
    if (this.cueOnsetElapsedMs !== null) return // already fired
    this.cueOnsetElapsedMs = this.eventCollector.getElapsedMs()
    this.buddy.resetLook()
    this.soundManager.play('flash')
    // Gaze toward the target cup's current position — reusing the same
    // 3-slot left/center/right convention Module A established, since
    // cup layout uses the same x-positions.
    const direction = this.slotToDirection(this.targetSlot)
    this.buddy.lookAt(direction)
  }

  private slotToDirection(slot: number): 'left' | 'center' | 'right' {
    const x = this.cupX[slot]
    if (x < CANVAS_WIDTH / 3) return 'left'
    if (x > (CANVAS_WIDTH * 2) / 3) return 'right'
    return 'center'
  }

  /** Referencing trials keep the cup-response window open THE WHOLE TIME
   *  (from the moment shuffling ends), not just after the cue fires — an
   *  early cup-tap during the checking window is a valid, resolvable
   *  impulsive-guess attempt per spec §3 step 6, not an ignored input. */
  private openCupResponseWindowForReferencing(_fromCheckingWindow: boolean): void {
    this.responseTimer = this.time.delayedCall(this.cfg.checkingWindowMs + this.cfg.cupResponseWindowMs, () => {
      this.resolveTrial(false)
    })
  }

  // ── Cup taps & resolution ─────────────────────────────────────────────────

  private spawnCups(): void {
    const count = this.cfg.numCups
    const spacing = CANVAS_WIDTH / (count + 1)
    for (let i = 0; i < count; i++) {
      const x = spacing * (i + 1)
      this.cupX.push(x)
      this.cups.push(this.createCup(x, i))
    }
  }

  private createCup(x: number, slotIndex: number): Cup {
    const body = this.add.rectangle(0, 0, 70, 80, CUP_COLOR)
    const rim = this.add.ellipse(0, -38, 74, 18, CUP_RIM_COLOR)
    const container = this.add.container(x, CUP_Y, [body, rim])
    container.setDepth(10)

    body.setInteractive({ useHandCursor: true })
    body.on('pointerup', () => this.handleCupTap(slotIndex))

    return { container, body }
  }

  private handleCupTap(slot: number): void {
    if (!this.trialActive) return
    // slot here is the ORIGINAL spawn position index, but cups physically
    // move during shuffles — this.cups[] is kept in sync with on-screen
    // position (see runShuffles), so we need the cup whose container is
    // AT this slot's x position right now, not the original index.
    const currentIndex = this.cups.findIndex((c) => Math.abs(c.container.x - this.cupX[slot]) < 1)
    this.cupTaps.push(currentIndex)

    if (currentIndex === this.targetSlot) {
      // Reveal the object under the correct cup before resolving — a
      // child wants to SEE they were right, not just hear a sound. This
      // was previously asymmetric: incorrect taps already got a peek
      // (below), correct taps got none at all.
      const revealX = this.cups[currentIndex].container.x
      const reveal = this.add.circle(revealX, CUP_Y + 40, 18, OBJECT_COLOR)
      reveal.setDepth(5)
      this.lowerCup(currentIndex, false)
      this.time.delayedCall(600, () => {
        reveal.destroy()
        this.resolveTrial(true)
      })
    } else if (this.cupTaps.length >= this.cfg.maxCupTaps) {
      this.resolveTrial(false)
    } else {
      this.soundManager.play('try_again')
      this.lowerCup(currentIndex, false) // brief peek to show it's empty
      this.time.delayedCall(400, () => this.lowerCup(currentIndex, true))
    }
  }

  private resolveTrial(correct: boolean): void {
    if (!this.trialActive) return
    this.trialActive = false
    this.checkingTimer?.remove()
    this.responseTimer?.remove()

    if (this.currentTrialType === 'plain') {
      this.eventCollector.addPeekEvent({
        type: 'peek_plain',
        trial_id: this.currentTrialId,
        timestamp_ms: this.trialStartElapsedMs,
        num_cups: this.cfg.numCups,
        num_shuffles: this.actualNumShuffles,
        cup_taps: [...this.cupTaps],
        correct,
        latency_ms: this.cupTaps.length > 0 ? this.eventCollector.getElapsedMs() - this.trialStartElapsedMs : null,
      })
    } else {
      this.eventCollector.addPeekEvent({
        type: 'peek_referencing',
        trial_id: this.currentTrialId,
        timestamp_ms: this.trialStartElapsedMs,
        num_cups: this.cfg.numCups,
        num_shuffles: this.actualNumShuffles,
        checked_buddy: this.checkedBuddy,
        check_latency_ms: this.checkLatencyMs,
        cue_onset_ms: this.cueOnsetElapsedMs ?? this.eventCollector.getElapsedMs(),
        cup_taps: [...this.cupTaps],
        correct,
        response_latency_ms: this.cupTaps.length > 0 ? this.eventCollector.getElapsedMs() - this.trialStartElapsedMs : null,
      })
    }

    this.buddy.resetLook()
    if (correct) {
      this.soundManager.play('success')
      this.buddy.playCheer()
    } else {
      this.soundManager.play('try_again')
      this.buddy.playEncourage()
    }

    this.time.delayedCall(900, () => this.advanceTrial())
  }

  // ── Completion ────────────────────────────────────────────────────────────

  private completeModule(): void {
    this.eventCollector.markModuleComplete('PEEK')
    this.playCompletionBurst()
    this.soundManager.play('completion')
    this.buddy.playExcited()
    // TEMPORARY, same as ModuleA_Look — see that file's completeModule()
    // comment. Stage E will chain modules together once all 5 exist.
    this.time.delayedCall(1200, () => this.fadeToScene('ResultScene'))
  }

  shutdown(): void {
    this.cups.forEach((c) => c.container.destroy())
    this.hiddenObject?.destroy()
    super.shutdown()
  }
}
