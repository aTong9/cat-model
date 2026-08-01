import { createSakuraOnsenWorld } from '../onsen/createSakuraOnsenWorld.js'

export function createSakuraOnsenScene(options = {}) {
  return createSakuraOnsenWorld(options).world
}
