export const QUALITY_MODES = Object.freeze([
  { id: 'auto', label: '自动', labelKey: 'settings.quality.auto' },
  { id: 'high', label: '高画质', labelKey: 'settings.quality.high' },
  { id: 'balanced', label: '均衡', labelKey: 'settings.quality.balanced' },
  { id: 'performance', label: '省电', labelKey: 'settings.quality.performance' },
])

export const QUALITY_PROFILES = Object.freeze({
  high: Object.freeze({ id: 'high', maxPixelRatio: 2, shadows: true, targetFps: 60 }),
  balanced: Object.freeze({ id: 'balanced', maxPixelRatio: 1.5, shadows: true, targetFps: 45 }),
  performance: Object.freeze({ id: 'performance', maxPixelRatio: 1, shadows: false, targetFps: 30 }),
})

export function resolveQualityProfile(mode, capabilities = {}) {
  if (QUALITY_PROFILES[mode]) return QUALITY_PROFILES[mode]
  const width = Number(capabilities.width) || 1280
  const memory = Number(capabilities.deviceMemory) || 8
  if (memory <= 2) return QUALITY_PROFILES.performance
  if (width <= 700 || memory <= 4) return QUALITY_PROFILES.balanced
  return QUALITY_PROFILES.high
}

export function createRenderQualityController({ renderer, capabilities = {} }) {
  if (!renderer) throw new Error('RenderQualityController requires a renderer')
  capabilities = { ...capabilities }
  let profile = QUALITY_PROFILES.high
  let mode = 'auto'
  let lastFrameTime = -Infinity

  function setMode(nextMode) {
    mode = QUALITY_PROFILES[nextMode] ? nextMode : 'auto'
    profile = resolveQualityProfile(mode, capabilities)
    const devicePixelRatio = Number(capabilities.devicePixelRatio) || 1
    renderer.setPixelRatio(Math.min(devicePixelRatio, profile.maxPixelRatio))
    renderer.shadowMap.enabled = profile.shadows
    renderer.shadowMap.needsUpdate = true
    lastFrameTime = -Infinity
    return profile
  }

  function updateCapabilities(nextCapabilities = {}) {
    capabilities = { ...capabilities, ...nextCapabilities }
    if (mode === 'auto') setMode('auto')
    return profile
  }

  function shouldRender(time) {
    const interval = 1000 / profile.targetFps
    if (time - lastFrameTime + 0.01 < interval) return false
    lastFrameTime = time
    return true
  }

  return { setMode, updateCapabilities, shouldRender, get profile() { return profile }, get mode() { return mode } }
}
