export const STORM_QUALITY = Object.freeze({
  desktop: Object.freeze({ rain: [700, 420, 180], clouds: 110, rocks: 48, splashes: 36 }),
  mobile: Object.freeze({ rain: [380, 220, 90], clouds: 70, rocks: 32, splashes: 20 }),
  low: Object.freeze({ rain: [180, 100, 40], clouds: 42, rocks: 22, splashes: 10 }),
})
export const stormWorld11Config = Object.freeze({ enabled: true, targetTokenId: 11, worldSize: 120, playableRadius: 42, terrainHeight: 4, rainDensity: 1, rainSpeed: 1.2, rainAngle: 18, windStrength: .75, lightningEnabled: true, lightningFrequency: .35, lightningBrightness: .8, reducedFlashing: false, puddlesEnabled: true, groundSplashesEnabled: true, fogNear: 22, fogFar: 90, collisionEnabled: true, postProcessingEnabled: false, quality: 'desktop', debug: Object.freeze({ showColliders: false, showWalkableAreas: false, showObjectNames: false }) })
export function normalizeStormWorld11Config(overrides = {}) { const value = { ...stormWorld11Config, ...overrides, debug: { ...stormWorld11Config.debug, ...(overrides.debug || {}) } }; value.quality = STORM_QUALITY[value.quality] ? value.quality : 'desktop'; value.playableRadius = Math.max(24, Math.min(50, Number(value.playableRadius) || 42)); return value }
export function shouldUseStormWorld11(tokenId, special) { return String(tokenId) === '11' && special === 'Thunderous Might' }
