import { describe, it, expect } from 'vitest'
import { nextSceneKey, MODULE_KEY_TO_SCENE_KEY } from './moduleNavigation'

describe('MODULE_KEY_TO_SCENE_KEY', () => {
  it('maps all 5 ModuleKeys to distinct scene keys, matching each scene\'s own constructor', () => {
    const values = Object.values(MODULE_KEY_TO_SCENE_KEY)
    expect(new Set(values).size).toBe(5) // no accidental duplicates
    expect(MODULE_KEY_TO_SCENE_KEY.LOOK).toBe('ModuleA_Look')
    expect(MODULE_KEY_TO_SCENE_KEY.HELLO).toBe('ModuleB_Hello')
    expect(MODULE_KEY_TO_SCENE_KEY.PEEK).toBe('ModuleC_Peek')
    expect(MODULE_KEY_TO_SCENE_KEY.SORT_PLUS).toBe('ModuleD_SortPlus')
    expect(MODULE_KEY_TO_SCENE_KEY.FOLLOW_PLUS).toBe('ModuleE_FollowPlus')
  })
})

describe('nextSceneKey', () => {
  it('Band 1 sequence: LOOK -> HELLO -> PEEK -> ResultScene', () => {
    expect(nextSceneKey('LOOK', 20)).toBe('ModuleB_Hello')
    expect(nextSceneKey('HELLO', 20)).toBe('ModuleC_Peek')
    expect(nextSceneKey('PEEK', 20)).toBe('ResultScene')
  })

  it('Band 2 sequence: ...PEEK -> SORT_PLUS -> ResultScene', () => {
    expect(nextSceneKey('PEEK', 35)).toBe('ModuleD_SortPlus')
    expect(nextSceneKey('SORT_PLUS', 35)).toBe('ResultScene')
  })

  it('Band 3 sequence: ...SORT_PLUS -> FOLLOW_PLUS -> ResultScene', () => {
    expect(nextSceneKey('SORT_PLUS', 50)).toBe('ModuleE_FollowPlus')
    expect(nextSceneKey('FOLLOW_PLUS', 50)).toBe('ResultScene')
  })

  it('the exact edge case found and fixed on self-review: a ModuleKey that is valid overall but not in THIS band\'s sequence returns ResultScene, not the first module', () => {
    // SORT_PLUS is a real ModuleKey but is not part of Band 1's sequence.
    // The original (buggy) implementation's OR-based "isRecognized" check
    // would have treated this as recognized, then computed
    // sequence.indexOf('SORT_PLUS') === -1, then sequence[-1+1] ===
    // sequence[0] -- silently returning the FIRST module instead of
    // ResultScene.
    expect(nextSceneKey('SORT_PLUS', 20)).toBe('ResultScene')
    expect(nextSceneKey('FOLLOW_PLUS', 20)).toBe('ResultScene')
    expect(nextSceneKey('FOLLOW_PLUS', 35)).toBe('ResultScene')
  })

  it('old-style module keys (not part of the new system at all) return ResultScene', () => {
    expect(nextSceneKey('module1_gaze', 50)).toBe('ResultScene')
  })
})
