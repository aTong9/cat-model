export const GYM_QUALITY_PROFILES = Object.freeze({
  desktop: Object.freeze({ treadmillCount: 5, cloudCount: 10, ceilingLights: 18, shadows: true, screenFps: 30 }),
  mobile: Object.freeze({ treadmillCount: 4, cloudCount: 7, ceilingLights: 12, shadows: true, screenFps: 18 }),
  low: Object.freeze({ treadmillCount: 3, cloudCount: 5, ceilingLights: 8, shadows: false, screenFps: 10 }),
})

export const gymWorld9066Config = Object.freeze({
  enabled: true,
  targetTokenId: 9066,
  roomWidth: 42,
  roomDepth: 34,
  roomHeight: 12,
  corridorWidth: 3,
  treadmillCount: 5,
  cloudCount: 10,
  displayAnimationEnabled: true,
  glassReflectionEnabled: true,
  cloudAnimationEnabled: true,
  collisionEnabled: true,
  shadowsEnabled: true,
  postProcessingEnabled: false,
  quality: 'desktop',
  colors: Object.freeze({ primaryOrange: '#f57c00', goldenYellow: '#ffbd20', warmWhite: '#fff4dc', accentRed: '#ff3b21' }),
  debug: Object.freeze({ showColliders: false, showWalkableArea: false, showObjectNames: false }),
})

export function normalizeGymWorld9066Config(overrides = {}) {
  const value = { ...gymWorld9066Config, ...overrides, colors: { ...gymWorld9066Config.colors, ...(overrides.colors || {}) }, debug: { ...gymWorld9066Config.debug, ...(overrides.debug || {}) } }
  value.quality = GYM_QUALITY_PROFILES[value.quality] ? value.quality : 'desktop'
  value.roomWidth = Math.max(30, Number(value.roomWidth) || 42)
  value.roomDepth = Math.max(24, Number(value.roomDepth) || 34)
  value.roomHeight = Math.max(8, Number(value.roomHeight) || 12)
  return value
}

export function shouldUseGymWorld9066(tokenId, special) {
  return String(tokenId) === '9066' && special === 'Fitness Guru'
}
