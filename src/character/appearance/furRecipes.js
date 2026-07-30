import * as THREE from 'three'
import { getFurAppearanceProfile } from '../../three/AppearanceProfiles.js'

export const FUR_MASK_SCHEMA_VERSION = 1
export const FUR_SEMANTIC_MASKS = Object.freeze([
  'muzzle', 'chest', 'belly', 'paw', 'tailTip',
  'leftFace', 'rightFace', 'stripe', 'spot',
])

export const DEFAULT_FUR_MASK_PARAMETERS = Object.freeze({
  muzzle: Object.freeze({ minY: 0.64, maxY: 1.04, halfWidth: 0.27, minZ: 0.08 }),
  chest: Object.freeze({ minY: -0.38, maxY: 0.74, topHalfWidth: 0.13, flare: 0.25, minZ: 0.08 }),
  belly: Object.freeze({ minY: -0.30, maxY: 0.42, halfWidth: 0.22, minZ: 0.08 }),
  paw: Object.freeze({ maxY: -0.30, minAbsX: 0.065, minZ: 0.08 }),
  tailTip: Object.freeze({ start: 0.78 }),
  faceSplit: Object.freeze({ minY: 0.70, deadZone: 0.035, minZ: 0.08 }),
  stripe: Object.freeze({ frequency: 34, width: 0.052 }),
  spot: Object.freeze({ scale: 8.5, threshold: 0.56 }),
})

function smoothNoise(x, y, z, seed = 0) {
  const a = Math.sin(x * 4.17 + y * 7.13 + z * 5.31 + seed * 1.91)
  const b = Math.sin(x * 8.73 - y * 3.77 + z * 6.19 + seed * 2.47)
  const c = Math.cos(x * 2.91 + y * 9.23 - z * 4.43 + seed * 0.83)
  return (a * 0.46 + b * 0.31 + c * 0.23 + 1) * 0.5
}

export function evaluateSemanticFurMasks(x, y, z, parameters = DEFAULT_FUR_MASK_PARAMETERS) {
  const ax = Math.abs(x)
  const front = z > parameters.muzzle.minZ
  const muzzle = front && y > parameters.muzzle.minY && y < parameters.muzzle.maxY && ax < parameters.muzzle.halfWidth
  const chestWidth = parameters.chest.topHalfWidth + Math.max(0, parameters.chest.maxY - y) * parameters.chest.flare
  const chest = front && y > parameters.chest.minY && y < parameters.chest.maxY && ax < chestWidth
  const belly = front && y > parameters.belly.minY && y < parameters.belly.maxY && ax < parameters.belly.halfWidth
  const paw = front && y < parameters.paw.maxY && ax > parameters.paw.minAbsX
  const face = front && y > parameters.faceSplit.minY
  const stripeWave = Math.sin(y * parameters.stripe.frequency + z * 13 + ax * 9)
  const stripe = face && Math.abs(x - Math.sin(y * 25) * 0.055) < parameters.stripe.width
    || (y > 0.46 && stripeWave > 0.62 && ax > 0.20)
  const spotValue = smoothNoise(x * parameters.spot.scale, y * parameters.spot.scale, z * parameters.spot.scale, 7)
  return Object.freeze({
    muzzle, chest, belly, paw,
    tailTip: false,
    leftFace: face && x < -parameters.faceSplit.deadZone,
    rightFace: face && x > parameters.faceSplit.deadZone,
    stripe,
    spot: spotValue > parameters.spot.threshold,
    spotValue,
  })
}

export function createSerializableFurRecipe(style, customColor) {
  const profile = getFurAppearanceProfile(style, customColor)
  return {
    schemaVersion: FUR_MASK_SCHEMA_VERSION,
    id: style,
    pattern: profile.pattern,
    colors: {
      base: profile.base,
      accent: profile.accent,
      white: '#f5f1e6',
      dark: '#29272f',
    },
    masks: structuredClone(DEFAULT_FUR_MASK_PARAMETERS),
  }
}

export function applyFurRecipeToGeometry(geometry, style, customColor) {
  const recipe = createSerializableFurRecipe(style, customColor)
  const colorsByName = Object.fromEntries(Object.entries(recipe.colors).map(([key, value]) => [key, new THREE.Color(value)]))
  const positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3)
  const color = new THREE.Color()
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const z = positions.getZ(index)
    const masks = evaluateSemanticFurMasks(x, y, z, recipe.masks)
    const whiteRegion = masks.muzzle || masks.chest || masks.belly || masks.paw
    color.copy(colorsByName.base)
    if (recipe.pattern === 'tuxedo') {
      if (whiteRegion || (y > 0.74 && Math.abs(x) < 0.07 && z > 0.08)) color.copy(colorsByName.white)
      else color.copy(colorsByName.dark)
    } else if (recipe.pattern === 'calico') {
      color.copy(colorsByName.white)
      if (!whiteRegion && masks.leftFace) color.copy(colorsByName.accent)
      else if (!whiteRegion && masks.rightFace) color.copy(colorsByName.dark)
      else if (!whiteRegion && masks.spot) color.copy(masks.spotValue > 0.72 ? colorsByName.dark : colorsByName.accent)
    } else if (recipe.pattern === 'leopard') {
      if (whiteRegion) color.copy(colorsByName.white)
      else if (masks.spot) color.copy(colorsByName.accent)
    } else if (recipe.pattern === 'lightning-tabby') {
      if (whiteRegion) color.copy(colorsByName.white)
      else if (masks.stripe) color.copy(colorsByName.accent)
    } else if (whiteRegion) {
      color.copy(colorsByName.white)
    }
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.attributes.color.needsUpdate = true
  geometry.userData.furRecipe = recipe
  return recipe
}
