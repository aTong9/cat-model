export const WINTER_QUALITY_PROFILES = Object.freeze({
  desktop: Object.freeze({ snow: [720, 260, 90], trees: 92, rocks: 38, crystals: 22, cloudBlocks: 64, shadows: true }),
  mobile: Object.freeze({ snow: [380, 130, 42], trees: 58, rocks: 26, crystals: 14, cloudBlocks: 42, shadows: true }),
  low: Object.freeze({ snow: [180, 60, 18], trees: 34, rocks: 16, crystals: 8, cloudBlocks: 26, shadows: false }),
})

export const winterWorldConfig = Object.freeze({
  enabled: true,
  worldSize: 120,
  playableRadius: 42,
  terrainHeight: 3,
  snowDensity: 1,
  snowSpeed: 1,
  treeDensity: .7,
  mountainDistance: 48,
  fogNear: 25,
  fogFar: 100,
  fogColor: '#9dc6ee',
  windStrength: .35,
  footprintEnabled: true,
  collisionEnabled: true,
  postProcessingEnabled: false,
  shadowEnabled: true,
  debugColliders: false,
  showTerrain: true,
  showMountains: true,
  showForest: true,
  showIceLake: true,
  showDecorations: true,
  quality: 'desktop',
})

export function normalizeWinterWorldConfig(overrides = {}) {
  const config = { ...winterWorldConfig, ...overrides }
  config.quality = WINTER_QUALITY_PROFILES[config.quality] ? config.quality : 'desktop'
  config.worldSize = Math.max(60, Number(config.worldSize) || winterWorldConfig.worldSize)
  config.playableRadius = Math.min(config.worldSize * .42, Math.max(18, Number(config.playableRadius) || winterWorldConfig.playableRadius))
  config.snowDensity = Math.max(0, Number(config.snowDensity) || 0)
  config.treeDensity = Math.max(0, Number(config.treeDensity) || 0)
  return config
}

export function appQualityToWinterQuality(profileId) {
  if (profileId === 'performance') return 'low'
  if (profileId === 'balanced') return 'mobile'
  return 'desktop'
}
