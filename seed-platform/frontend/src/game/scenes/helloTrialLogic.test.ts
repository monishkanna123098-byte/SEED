import { describe, it, expect } from 'vitest'
import {
  sequenceLengthRange,
  pickGesture,
  pickWidgetChoices,
  isPerseverativeTap,
  ALL_GESTURES,
  type GestureType,
} from './helloTrialLogic'

describe('sequenceLengthRange', () => {
  it('Band 1 (maxSequenceSteps=1) is a fixed 1-step range', () => {
    expect(sequenceLengthRange(1)).toEqual([1, 1])
  })

  it('Band 2 (maxSequenceSteps=2) is 1-2 steps, matching "1-2 step imitation" in the research', () => {
    expect(sequenceLengthRange(2)).toEqual([1, 2])
  })

  it('Band 3 (maxSequenceSteps=3) is 2-3 steps, matching "2-3 step" in the research', () => {
    expect(sequenceLengthRange(3)).toEqual([2, 3])
  })
})

describe('pickGesture', () => {
  it('always returns wave for the very first step of a session', () => {
    expect(pickGesture([], false)).toBe('wave')
    expect(pickGesture([], true)).toBe('wave')
  })

  it('never introduces a novel gesture when allowNovel is false, even with a biased rng', () => {
    const seen: GestureType[] = ['wave', 'clap']
    // rng always returns 0 - would pick from unseen pool if allowed to
    const result = pickGesture(seen, false, () => 0)
    expect(seen).toContain(result)
  })

  it('can introduce a novel gesture when allowNovel is true and rng favors it', () => {
    const seen: GestureType[] = ['wave']
    const result = pickGesture(seen, true, () => 0) // 0 < 0.6 threshold, and picks index 0 of unseen
    expect(seen).not.toContain(result)
  })

  it('falls back to a seen gesture when allowNovel is true but rng does not favor novelty', () => {
    const seen: GestureType[] = ['wave', 'clap']
    const result = pickGesture(seen, true, () => 0.9) // 0.9 >= 0.6 threshold
    expect(seen).toContain(result)
  })
})

describe('pickWidgetChoices', () => {
  it('always includes the correct gesture', () => {
    const choices = pickWidgetChoices('wave', 3, () => 0.5)
    expect(choices).toContain('wave')
  })

  it('produces exactly `count` choices with no duplicates', () => {
    const choices = pickWidgetChoices('clap', 3, () => 0.3)
    expect(choices).toHaveLength(3)
    expect(new Set(choices).size).toBe(3)
  })

  it('the correct gesture appears exactly once, never duplicated as a decoy', () => {
    const choices = pickWidgetChoices('stomp', 2, () => 0.7)
    const stompCount = choices.filter((g) => g === 'stomp').length
    expect(stompCount).toBe(1)
    expect(choices).toHaveLength(2)
  })

  it('respects count=2 (Band 1/2) producing exactly 2 choices from the 5-gesture pool', () => {
    const choices = pickWidgetChoices('wave', 2)
    expect(choices).toHaveLength(2)
    expect(choices.every((g) => ALL_GESTURES.includes(g))).toBe(true)
  })
})

describe('isPerseverativeTap', () => {
  it('flags a tap matching a prior step, not the current one', () => {
    expect(isPerseverativeTap('wave', ['wave', 'clap'])).toBe(true)
  })

  it('does not flag a tap that has no prior-step match', () => {
    expect(isPerseverativeTap('stomp', ['wave', 'clap'])).toBe(false)
  })

  it('does not flag anything on the first step (empty prior list)', () => {
    expect(isPerseverativeTap('wave', [])).toBe(false)
  })
})
