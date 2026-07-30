import { getSpecialRecipe } from '../character/appearance/environmentRecipes.js'

export function createLatestLoadGuard() {
  let version = 0

  return Object.freeze({
    begin() {
      version += 1
      return version
    },
    isCurrent(candidate) {
      return candidate === version
    },
    invalidate() {
      version += 1
    },
  })
}

export async function loadReferenceSpecialScene(type) {
  const { createReferenceSpecialScene } = await import('./scenes/ReferenceSpecialScenes.js')
  return {
    group: createReferenceSpecialScene(type),
    background: getSpecialRecipe(type)?.lightingProfile.background ?? null,
  }
}

export async function loadDetailedSpecialScene(type) {
  if (type === 'Realm of Mt.Fuji') {
    const { createFujiRealmScene } = await import('./scenes/FujiScene.js')
    return createFujiRealmScene
  }
  if (type === 'Time Traveler') {
    const { createTimeTravelerScene } = await import('./scenes/TimeTravelerScene.js')
    return createTimeTravelerScene
  }
  return null
}
