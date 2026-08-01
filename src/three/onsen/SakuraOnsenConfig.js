export const SAKURA_ONSEN_QUALITY = Object.freeze({
  desktop: Object.freeze({ petals: 700, steam: 110, trees: 34, blossoms: 210, shadows: true }),
  mobile: Object.freeze({ petals: 360, steam: 62, trees: 24, blossoms: 130, shadows: true }),
  low: Object.freeze({ petals: 170, steam: 30, trees: 16, blossoms: 72, shadows: false }),
})

export const sakuraOnsenConfig = Object.freeze({
  enabled: true,
  targetTokenId: 3001,
  worldSize: 100,
  playableRadius: 38,
  onsenRadius: 8.5,
  pathWidth: 4,
  petalCount: 700,
  steamDensity: .6,
  waterReflectionQuality: .5,
  waterRippleEnabled: true,
  fogNear: 30,
  fogFar: 95,
  collisionEnabled: true,
  postProcessingEnabled: false,
  quality: 'desktop',
  debug: Object.freeze({ showColliders: false, showWalkableAreas: false, showObjectNames: false }),
})

export function normalizeSakuraOnsenConfig(overrides = {}) {
  const value = { ...sakuraOnsenConfig, ...overrides, debug: { ...sakuraOnsenConfig.debug, ...(overrides.debug || {}) } }
  value.quality = SAKURA_ONSEN_QUALITY[value.quality] ? value.quality : 'desktop'
  value.worldSize = Math.max(60, Number(value.worldSize) || 100)
  value.playableRadius = Math.min(value.worldSize * .42, Math.max(24, Number(value.playableRadius) || 38))
  value.onsenRadius = Math.min(value.playableRadius * .4, Math.max(6, Number(value.onsenRadius) || 8.5))
  return value
}

export function shouldUseSakuraOnsen(tokenId, special) {
  return String(tokenId) === '3001' && special === 'Onsen journey'
}
