/**
 * S.E.E.D. Sound Manager
 *
 * Generates all game sounds using the Web Audio API.
 * No external audio files required.
 *
 * Sounds:
 *   success    — ascending 3-note chord (C5, E5, G5)
 *   try_again  — soft descending tone
 *   buddy_call — two-note "hey!" pattern
 *   completion — full ascending scale with reverb-like echo
 *   tap        — short percussive click
 *   flash      — brief tone for Simon sequence flashes
 */

export class SoundManager {
  private ctx: AudioContext | null = null
  private muted: boolean = false

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  play(
    type: 'success' | 'try_again' | 'buddy_call' | 'completion' | 'tap' | 'flash'
  ): void {
    if (this.muted) return
    try {
      const ctx = this.getCtx()
      switch (type) {
        case 'success':    this.playSuccess(ctx);    break
        case 'try_again':  this.playTryAgain(ctx);   break
        case 'buddy_call': this.playBuddyCall(ctx);  break
        case 'completion': this.playCompletion(ctx); break
        case 'tap':        this.playTap(ctx);        break
        case 'flash':      this.playFlash(ctx);      break
      }
    } catch {
      // Audio context may fail in some environments — fail silently
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    volume: number = 0.28,
    type: OscillatorType = 'sine'
  ): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, startTime)
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    osc.start(startTime)
    osc.stop(startTime + duration + 0.05)
  }

  private playSuccess(ctx: AudioContext): void {
    const now = ctx.currentTime
    // Ascending 3-note chord: C5 E5 G5
    this.playTone(ctx, 523.25, now,        0.35, 0.28)
    this.playTone(ctx, 659.25, now + 0.10, 0.35, 0.28)
    this.playTone(ctx, 783.99, now + 0.20, 0.50, 0.30)
  }

  private playTryAgain(ctx: AudioContext): void {
    const now = ctx.currentTime
    // Soft descending two-note
    this.playTone(ctx, 392.00, now,        0.25, 0.18)
    this.playTone(ctx, 349.23, now + 0.18, 0.35, 0.16)
  }

  private playBuddyCall(ctx: AudioContext): void {
    const now = ctx.currentTime
    // Two-note "hey!" — staccato and bright
    this.playTone(ctx, 523.25, now,        0.12, 0.30, 'triangle')
    this.playTone(ctx, 659.25, now + 0.18, 0.18, 0.28, 'triangle')
  }

  private playCompletion(ctx: AudioContext): void {
    const now = ctx.currentTime
    // Full ascending C major scale
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]
    notes.forEach((freq, i) => {
      this.playTone(ctx, freq, now + i * 0.11, 0.30, 0.24)
    })
    // Reverb echo layer (quieter, slightly delayed)
    notes.forEach((freq, i) => {
      this.playTone(ctx, freq, now + i * 0.11 + 0.055, 0.28, 0.10)
    })
    // Final hold on high C
    this.playTone(ctx, 523.25, now + notes.length * 0.11, 0.80, 0.25)
  }

  private playTap(ctx: AudioContext): void {
    const now = ctx.currentTime
    // Short percussive click
    this.playTone(ctx, 440.00, now, 0.08, 0.18, 'square')
  }

  private playFlash(ctx: AudioContext): void {
    const now = ctx.currentTime
    // Brief rising tone for Simon circle flash
    this.playTone(ctx, 587.33, now, 0.15, 0.22, 'sine')
  }

  // Frequency mapped to each Simon circle (D5, G5, B4, E5)
  playCircleFlash(circleIndex: number): void {
    if (this.muted) return
    const freqs = [587.33, 783.99, 493.88, 659.25]
    try {
      const ctx = this.getCtx()
      const now = ctx.currentTime
      this.playTone(ctx, freqs[circleIndex] ?? 440, now, 0.20, 0.26)
    } catch { /* fail silently */ }
  }

  destroy(): void {
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }
}
