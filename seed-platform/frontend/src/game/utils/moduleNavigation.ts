/**
 * S.E.E.D. — Buddy's World
 * moduleNavigation.ts
 *
 * Pure logic for Stage E's scene wiring — computing which scene comes
 * next given a module and an age, kept Phaser-free so it's directly
 * testable rather than only exercised implicitly through a live scene.
 * A typo in the ModuleKey-to-SceneKey mapping (wrong name, wrong order)
 * would compile fine but silently break navigation, which is exactly
 * the class of bug this file's test exists to catch.
 */

import { getModuleSequence, type ModuleKey } from './AgeAdapter'

export const MODULE_KEY_TO_SCENE_KEY: Record<ModuleKey, string> = {
  LOOK: 'ModuleA_Look',
  HELLO: 'ModuleB_Hello',
  PEEK: 'ModuleC_Peek',
  SORT_PLUS: 'ModuleD_SortPlus',
  FOLLOW_PLUS: 'ModuleE_FollowPlus',
}

/** Returns the next scene key in this session's actual sequence, or
 *  'ResultScene' if this module is last, or not part of this band's
 *  sequence at all (old Module 1-4 keys, or a new-style key that's
 *  valid overall but happens not to run in this particular band). */
export function nextSceneKey(currentModuleKey: string, ageMonths: number): string {
  const sequence = getModuleSequence(ageMonths)
  const currentIndex = (sequence as readonly string[]).indexOf(currentModuleKey)
  if (currentIndex === -1) return 'ResultScene'

  const next = sequence[currentIndex + 1]
  return next ? MODULE_KEY_TO_SCENE_KEY[next] : 'ResultScene'
}
