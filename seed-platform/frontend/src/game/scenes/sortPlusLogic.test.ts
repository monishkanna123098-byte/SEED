import { describe, it, expect } from 'vitest'
import { correctSlotForRule, evaluateSortPlusDrop, ruleForPhase } from './sortPlusLogic'

describe('ruleForPhase', () => {
  it('Phase 1 is color, Phase 2 is shape', () => {
    expect(ruleForPhase(1)).toBe('color')
    expect(ruleForPhase(2)).toBe('shape')
  })
})

describe('correctSlotForRule', () => {
  it('resolves by color when rule is color, ignoring shape', () => {
    expect(correctSlotForRule('red', 'square', 'color')).toBe(0) // red is slot 0 regardless of shape
    expect(correctSlotForRule('blue', 'triangle', 'color')).toBe(1)
  })

  it('resolves by shape when rule is shape, ignoring color', () => {
    expect(correctSlotForRule('green', 'circle', 'shape')).toBe(0) // circle is slot 0 regardless of color
    expect(correctSlotForRule('red', 'triangle', 'shape')).toBe(2)
  })
})

describe('evaluateSortPlusDrop', () => {
  it('Phase 1: correct when dropped in the color-matching bin', () => {
    const result = evaluateSortPlusDrop('red', 'square', 0, 1)
    expect(result.correct).toBe(true)
    expect(result.isPerseverativeError).toBe(false)
  })

  it('Phase 1: incorrect drop is never flagged as perseverative (no prior rule to perseverate toward)', () => {
    const result = evaluateSortPlusDrop('red', 'square', 1, 1)
    expect(result.correct).toBe(false)
    expect(result.isPerseverativeError).toBe(false)
  })

  it('Phase 2: correct when dropped in the shape-matching bin', () => {
    // green/triangle object -> triangle is slot 2, regardless of color
    const result = evaluateSortPlusDrop('green', 'triangle', 2, 2)
    expect(result.correct).toBe(true)
  })

  it('Phase 2: the exact perseverative pattern — wrong under shape rule, but matches the OLD color rule', () => {
    // A green/circle object: shape rule says slot 0 (circle), color rule says slot 2 (green).
    // Dropping it in slot 2 is wrong now, but exactly matches Phase 1's rule.
    const result = evaluateSortPlusDrop('green', 'circle', 2, 2)
    expect(result.correct).toBe(false)
    expect(result.isPerseverativeError).toBe(true)
  })

  it('Phase 2: an ordinary wrong answer that matches NEITHER rule is not perseverative', () => {
    // green/circle object: shape rule -> slot 0, color rule -> slot 2. Dropping in slot 1 matches neither.
    const result = evaluateSortPlusDrop('green', 'circle', 1, 2)
    expect(result.correct).toBe(false)
    expect(result.isPerseverativeError).toBe(false)
  })

  it('Phase 2: when color and shape rules happen to agree on the same slot, a correct drop is not miscounted as perseverative', () => {
    // red/circle: both color rule and shape rule point to slot 0.
    const result = evaluateSortPlusDrop('red', 'circle', 0, 2)
    expect(result.correct).toBe(true)
    expect(result.isPerseverativeError).toBe(false)
  })
})
