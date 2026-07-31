import * as THREE from 'three'

export const DEFAULT_ACTION_PARAMETERS = Object.freeze({
  speed: 1,
  intensity: 1,
  rootMotion: 1,
  propScale: 1,
})

export const ACTION_PARAMETER_DEFINITIONS = Object.freeze({
  speed: Object.freeze({ label: '动作速度', min: .25, max: 2.5, step: .05 }),
  intensity: Object.freeze({ label: '动作力度', min: 0, max: 1.5, step: .05 }),
  rootMotion: Object.freeze({ label: '根运动幅度', min: 0, max: 1.5, step: .05 }),
  propScale: Object.freeze({ label: '动作道具比例', min: .5, max: 1.8, step: .05 }),
})

export function normalizeActionParameters(parameters = {}) {
  return Object.fromEntries(Object.entries(ACTION_PARAMETER_DEFINITIONS).map(([key, definition]) => {
    const fallback = DEFAULT_ACTION_PARAMETERS[key]
    const value = Number(parameters[key])
    return [key, THREE.MathUtils.clamp(Number.isFinite(value) ? value : fallback, definition.min, definition.max)]
  }))
}
