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
  if (type === 'Galactic Voyage') {
    const { createCosmicWorld3000Scene } = await import('./scenes/CosmicWorld3000Scene.js')
    return createCosmicWorld3000Scene
  }
  if (type === 'Realm of Mt.Fuji') {
    const { createFujiRealmScene } = await import('./scenes/FujiScene.js')
    return createFujiRealmScene
  }
  if (type === 'Onsen journey') {
    const { createSakuraOnsenScene } = await import('./scenes/SakuraOnsenScene.js')
    return createSakuraOnsenScene
  }
  if (type === 'Fitness Guru') {
    const { createGymWorld9066Scene } = await import('./scenes/GymWorld9066Scene.js')
    return createGymWorld9066Scene
  }
  if (type === 'Thunderous Might') {
    const { createStormWorld11Scene } = await import('./scenes/StormWorld11Scene.js')
    return createStormWorld11Scene
  }
  if (type === 'Time Traveler') {
    const { createSynthwaveWorld9038Scene } = await import('./scenes/SynthwaveWorld9038Scene.js')
    return createSynthwaveWorld9038Scene
  }
  return null
}
