export const COSMIC_QUALITY = Object.freeze({
  desktop: Object.freeze({ stars: [1000, 420, 160], asteroids: 36, cometTail: 64, rocketTrail: 28, platformDetails: 32, sphereSegments: 24 }),
  mobile: Object.freeze({ stars: [560, 240, 80], asteroids: 22, cometTail: 36, rocketTrail: 16, platformDetails: 20, sphereSegments: 16 }),
  low: Object.freeze({ stars: [260, 100, 36], asteroids: 12, cometTail: 18, rocketTrail: 8, platformDetails: 12, sphereSegments: 12 }),
})

export const cosmicWorld3000Config = Object.freeze({
  enabled: true, targetTokenId: 3000, platformSize: 80, playableRadius: 34, pathWidth: 6,
  starCount: 1600, asteroidCount: 36, ringedPlanetScale: 15, homePlanetScale: 38,
  cometEnabled: true, cometFrequency: .15, rocketEnabled: true, rocketFrequency: .1,
  starTwinkleEnabled: true, reducedFlashing: false, stepParticlesEnabled: true,
  energyBarrierEnabled: true, collisionEnabled: true, bloomEnabled: true, pixelEffectEnabled: false,
  quality: 'desktop',
  colors: Object.freeze({ space: '#080d2e', platform: '#181b48', cyan: '#36e5ef', pink: '#ff8ba7', yellow: '#ffe56f', orange: '#ff765c' }),
  debug: Object.freeze({ showColliders: false, showWalkableAreas: false, showObjectNames: false }),
})

export function normalizeCosmicWorld3000Config(overrides = {}) {
  const value = { ...cosmicWorld3000Config, ...overrides, colors: { ...cosmicWorld3000Config.colors, ...(overrides.colors || {}) }, debug: { ...cosmicWorld3000Config.debug, ...(overrides.debug || {}) } }
  value.quality = COSMIC_QUALITY[value.quality] ? value.quality : 'desktop'
  value.platformSize = Math.max(60, Number(value.platformSize) || 80)
  value.playableRadius = Math.max(26, Math.min(value.platformSize * .46, Number(value.playableRadius) || 34))
  value.pathWidth = Math.max(5, Number(value.pathWidth) || 6)
  return value
}

export function shouldUseCosmicWorld3000(tokenId, special) {
  return String(tokenId) === '3000' && special === 'Galactic Voyage'
}
