import * as THREE from 'three'
import { BACKGROUND_RECIPES } from '../character/appearance/environmentRecipes.js'

export const BACKGROUND_COLORS = Object.freeze(Object.fromEntries(
  Object.entries(BACKGROUND_RECIPES).map(([id, recipe]) => [id, recipe.colors.base]),
))

export function createPreviewEnvironmentController(scene) {
  if (!scene) throw new Error('PreviewEnvironmentController requires a scene')
  const lightBaselines = new Map()
  scene.traverse(object => {
    if (object.isLight && object.type !== 'HemisphereLight') lightBaselines.set(object.uuid, { object, intensity: object.intensity })
  })
  let background = null
  let lightIntensity = 1

  function setBackground(name) {
    background = Object.hasOwn(BACKGROUND_COLORS, name) ? name : null
    const color = BACKGROUND_COLORS[background] || '#11111c'
    if (scene.background?.isColor) scene.background.set(color)
    else scene.background = new THREE.Color(color)
    if (scene.fog?.color) scene.fog.color.set(color)
    return color
  }

  function setLightIntensity(value) {
    lightIntensity = THREE.MathUtils.clamp(Number(value) || 0, 0, 1)
    for (const { object, intensity } of lightBaselines.values()) object.intensity = intensity * lightIntensity
  }

  return {
    setBackground, setLightIntensity,
    get background() { return background },
    get lightIntensity() { return lightIntensity },
    get controlledLightCount() { return lightBaselines.size },
  }
}
