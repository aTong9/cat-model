const REFERENCE_BACKGROUNDS = Object.freeze({
  'Thunderous Might': '#737b82',
  'Galactic Voyage': '#17183e',
  'Onsen journey': '#545873',
  'Fitness Guru': '#81958d',
})

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
    background: REFERENCE_BACKGROUNDS[type] || null,
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
