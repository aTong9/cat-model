import { createWinterWorld } from '../winter/createWinterWorld.js'

/** Compatibility adapter for the existing special-scene loader. */
export function createFujiRealmScene(options = {}) {
  return createWinterWorld(options).world
}
