import { describe, it, expect } from 'vitest'
import { EventCollector } from './EventCollector'

// Covers what actually changed in this pass: the two new generic event
// types, addDisengagement's backward-compatible extension, the
// getAgeGroup fix, the totalModules bug found while implementing this,
// and the constructor's new fail-fast validation. Not re-testing the
// four old module-specific event types, which are unchanged.

describe('EventCollector constructor', () => {
  it('throws immediately for a below-floor age, not later at session end', () => {
    expect(() => new EventCollector('session-1', 10)).toThrow(RangeError)
  })

  it('accepts a valid age without throwing', () => {
    expect(() => new EventCollector('session-1', 24)).not.toThrow()
  })
})

describe('addDisengagement — backward compatibility', () => {
  it('the old 3-argument call site gets defaults matching the one real caller (mid_trial / buddy_call)', () => {
    const collector = new EventCollector('session-1', 24)
    collector.addDisengagement('LOOK', 5000, 20000)
    const payload = collector.buildCompletionPayload()
    expect(payload.disengagementEvents).toHaveLength(1)
    expect(payload.disengagementEvents[0]).toMatchObject({
      module: 'LOOK',
      timestamp: 5000,
      duration_ms: 20000,
      context: 'mid_trial',
      preceding_event: 'buddy_call',
      trial_id: null,
    })
  })

  it('accepts the new optional context/precedingEvent/trialId params when a module provides them', () => {
    const collector = new EventCollector('session-1', 50)
    collector.addDisengagement('SORT_PLUS', 8000, 5000, 'post_feedback', 'trial_failure', 3)
    const payload = collector.buildCompletionPayload()
    expect(payload.disengagementEvents[0]).toMatchObject({
      context: 'post_feedback',
      preceding_event: 'trial_failure',
      trial_id: 3,
    })
  })
})

describe('addSocialCheckEvent / addPerseverationEvent', () => {
  it('social_check events are normalized into the mapped events array', () => {
    const collector = new EventCollector('session-1', 50)
    collector.addSocialCheckEvent({
      type: 'social_check',
      module: 'PEEK',
      timestamp_ms: 1200,
      trigger: 'confusion',
      action: 'tap_buddy',
      latency_ms: 400,
    })
    const payload = collector.buildCompletionPayload()
    const mapped = payload.events.find((e) => e.type === 'social_check')
    expect(mapped).toMatchObject({
      module_id: 'PEEK',
      trigger: 'confusion',
      action: 'tap_buddy',
      latency_ms: 400,
    })
  })

  it('perseveration events are normalized into the mapped events array', () => {
    const collector = new EventCollector('session-1', 50)
    collector.addPerseverationEvent({
      type: 'perseveration',
      module: 'SORT_PLUS',
      timestamp_ms: 2000,
      position: 'bin_2',
      count: 3,
    })
    const payload = collector.buildCompletionPayload()
    const mapped = payload.events.find((e) => e.type === 'perseveration')
    expect(mapped).toMatchObject({ module_id: 'SORT_PLUS', position: 'bin_2', count: 3 })
  })
})

describe('getAgeGroup (via buildCompletionPayload)', () => {
  it('uses the new AgeBand format, not the old stale six-bucket format', () => {
    const collector = new EventCollector('session-1', 22)
    const payload = collector.buildCompletionPayload()
    expect(payload.ageGroup).toBe('BAND_1_22m')
  })

  it('reflects Band 3 correctly for an older child', () => {
    const collector = new EventCollector('session-1', 50)
    const payload = collector.buildCompletionPayload()
    expect(payload.ageGroup).toBe('BAND_3_50m')
  })
})

describe('addFollowPlusStepEvent', () => {
  it('reaches the mapped events output — catches the orphaned-method class of bug directly (found and fixed during Module E implementation)', () => {
    const collector = new EventCollector('session-1', 50)
    collector.addFollowPlusStepEvent({
      type: 'follow_step',
      trial_id: 3,
      sequence_step: 2,
      sequence_length: 4,
      timestamp_ms: 5000,
      latency_ms: 600,
      tapped_position: 1,
      expected_position: 1,
      is_correct: true,
      is_modified_step: false,
      was_modified_trial: true,
      stimulus_type: 'nonsocial',
    })
    const payload = collector.buildCompletionPayload()
    const mapped = payload.events.find((e) => e.type === 'follow_step')
    expect(mapped).toMatchObject({
      module_id: 'FOLLOW_PLUS',
      trial_index: 3,
      sequence_step: 2,
      is_correct: true,
      was_modified_trial: true,
    })
  })
})

describe('buildCompletionPayload — totalModules fix', () => {
  it('Band 1 (3 modules) reaches completionRate 1.0 after 3 completions, not 0.75', () => {
    const collector = new EventCollector('session-1', 22) // Band 1: LOOK, HELLO, PEEK
    collector.markModuleComplete('LOOK')
    collector.markModuleComplete('HELLO')
    collector.markModuleComplete('PEEK')
    const payload = collector.buildCompletionPayload()
    expect(payload.completionRate).toBe(1)
  })

  it('Band 3 (5 modules) requires all 5 for completionRate 1.0', () => {
    const collector = new EventCollector('session-1', 50)
    collector.markModuleComplete('LOOK')
    collector.markModuleComplete('HELLO')
    collector.markModuleComplete('PEEK')
    collector.markModuleComplete('SORT_PLUS')
    const payload = collector.buildCompletionPayload()
    expect(payload.completionRate).toBe(0.8) // 4 of 5
  })

  it('does not include completionRate2 — removed as dead weight with zero downstream consumers', () => {
    const collector = new EventCollector('session-1', 24)
    const payload = collector.buildCompletionPayload()
    expect('completionRate2' in payload).toBe(false)
  })
})
