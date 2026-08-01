export const SYNTHWAVE_QUALITY = Object.freeze({
  desktop: Object.freeze({ nearBuildings: 42, middleBuildings: 64, skylineBuildings: 86, palms: 18, particles: 180, flyingLights: 18 }),
  mobile: Object.freeze({ nearBuildings: 30, middleBuildings: 42, skylineBuildings: 58, palms: 12, particles: 90, flyingLights: 10 }),
  low: Object.freeze({ nearBuildings: 22, middleBuildings: 30, skylineBuildings: 40, palms: 8, particles: 40, flyingLights: 6 }),
})

export const synthwaveWorld9038Config = Object.freeze({
  enabled: true,
  targetTokenId: 9038,
  worldSize: 140,
  playableRadius: 48,
  gridSize: 2,
  gridColor: '#29d9ff',
  gridBrightness: 0.88,
  gridFlowSpeed: 0.18,
  horizonColor: '#ff168f',
  skyColor: '#10072f',
  sunTopColor: '#fff35a',
  sunBottomColor: '#ff6a77',
  sunScale: 22,
  skylineDensity: 0.75,
  buildingNeonDensity: 0.25,
  gridPulseEnabled: true,
  catStepGlowEnabled: true,
  particlesEnabled: true,
  dynamicLightsEnabled: true,
  bloomEnabled: true,
  crtEffectEnabled: false,
  scanlinesEnabled: false,
  chromaticAberrationEnabled: false,
  collisionEnabled: true,
  quality: 'desktop',
  debug: Object.freeze({ showColliders: false, showWalkableAreas: false, showObjectNames: false }),
})

export function normalizeSynthwaveWorld9038Config(overrides = {}) {
  const value = { ...synthwaveWorld9038Config, ...overrides, debug: { ...synthwaveWorld9038Config.debug, ...(overrides.debug || {}) } }
  value.quality = SYNTHWAVE_QUALITY[value.quality] ? value.quality : 'desktop'
  value.worldSize = Math.max(100, Number(value.worldSize) || 140)
  value.playableRadius = Math.max(32, Math.min(value.worldSize * .42, Number(value.playableRadius) || 48))
  value.gridSize = Math.max(1, Number(value.gridSize) || 2)
  return value
}

export function shouldUseSynthwaveWorld9038(tokenId, special) {
  return String(tokenId) === '9038' && special === 'Time Traveler'
}
