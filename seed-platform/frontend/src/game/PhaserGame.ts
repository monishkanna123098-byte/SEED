/**
 * S.E.E.D. — Buddy's World
 * PhaserGame.ts
 *
 * Creates and configures the Phaser.Game instance. Shared singletons
 * (EventCollector, AgeAdapter, SoundManager) are placed in the game
 * registry so every scene can access them without prop-drilling.
 */

import Phaser from 'phaser'
import { LoadScene } from './scenes/LoadScene'
import { MenuScene } from './scenes/MenuScene'
import { Module1_Gaze } from './scenes/Module1_Gaze'
import { Module2_Imitate } from './scenes/Module2_Imitate'
import { Module3_Sort } from './scenes/Module3_Sort'
import { Module4_Follow } from './scenes/Module4_Follow'
import { ResultScene } from './scenes/ResultScene'
import { EventCollector, GameCompletionPayload } from './analytics/EventCollector'
import { AgeAdapter } from './utils/AgeAdapter'
import { SoundManager } from './utils/SoundManager'

export const CANVAS_WIDTH = 800
export const CANVAS_HEIGHT = 600

export interface BuddysWorldConfig {
  parent: string | HTMLElement
  sessionId: string
  ageMonths: number
  onGameComplete: (payload: GameCompletionPayload) => void
}

export function createBuddysWorldGame(config: BuddysWorldConfig): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    parent: config.parent,
    backgroundColor: '#E0F4FF',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    },
    scene: [
      LoadScene,
      MenuScene,
      Module1_Gaze,
      Module2_Imitate,
      Module3_Sort,
      Module4_Follow,
      ResultScene,
    ],
    audio: { disableWebAudio: false },
    disableContextMenu: true,
    render: { pixelArt: false, antialias: true },
  })

  game.registry.set('sessionId', config.sessionId)
  game.registry.set('ageMonths', config.ageMonths)
  game.registry.set('ageAdapter', new AgeAdapter(config.ageMonths))
  game.registry.set('soundManager', new SoundManager())
  game.registry.set('eventCollector', new EventCollector(config.sessionId, config.ageMonths))
  game.registry.set('onGameComplete', config.onGameComplete)

  return game
}

export function destroyBuddysWorldGame(game: Phaser.Game): void {
  const soundManager = game.registry.get('soundManager') as SoundManager | undefined
  soundManager?.destroy()
  game.destroy(true)
}
