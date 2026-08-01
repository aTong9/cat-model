import { BACKGROUND_TRAITS, SPECIAL_TRAITS } from '../../config/traits.js'

const BACKGROUND_PALETTE = Object.freeze({
  'Blue Gradient': ['#253f88', '#5675bd'],
  'Green Gradient': ['#28624a', '#5f9b72'],
  'Green To Blue Gradient': ['#277b88', '#49a879'],
  'Orange Gradient': ['#9b4d2e', '#e08a4b'],
  'Pink To Orange Gradient': ['#b4506e', '#e88b51'],
  'Purple Gradient': ['#5f3e9f', '#9674d0'],
  'Red To Pink Gradient': ['#9a3e59', '#d86b91'],
  'Yellow To Green Gradient': ['#878e31', '#c5b94b'],
})

export const BACKGROUND_RECIPES = Object.freeze(Object.fromEntries(BACKGROUND_TRAITS.map(id => {
  const [base, accent] = BACKGROUND_PALETTE[id]
  return [id, Object.freeze({
    schemaVersion: 1,
    id,
    colors: Object.freeze({ base, accent }),
    lightingProfile: Object.freeze({ intensity: 1, keyTint: accent }),
    fogProfile: Object.freeze({ color: base, near: 6, far: 18 }),
    exportPolicy: Object.freeze({ includeInCharacterGlb: false, includeInSceneCapture: true }),
  })]
})))

const SPECIAL_CONFIG = Object.freeze({
  'Fitness Guru': { factory: 'reference', background: '#81958d', animation: 'run', hero: false },
  'Galactic Voyage': { factory: 'reference', background: '#17183e', animation: 'idle', hero: true },
  'Golden General': { factory: 'golden-general-hero', background: '#3d2915', animation: 'idle', hero: true },
  'Onsen journey': { factory: 'reference', background: '#545873', animation: 'sit', hero: false },
  'Realm of Mt.Fuji': { factory: 'fuji-detailed', background: '#3471df', animation: 'idle', hero: false },
  'Thunderous Might': { factory: 'reference', background: '#737b82', animation: 'idle', hero: false },
  'Time Traveler': { factory: 'time-traveler-detailed', background: '#090522', animation: 'run', hero: false },
})

export const SPECIAL_RECIPES = Object.freeze(Object.fromEntries(SPECIAL_TRAITS.map(({ id, fullScene }) => {
  const config = SPECIAL_CONFIG[id]
  return [id, Object.freeze({
    schemaVersion: 1,
    id,
    hero: config.hero,
    characterOverrides: Object.freeze({ preserveMissingTraits: true }),
    equipmentOverrides: Object.freeze({ strategy: fullScene ? 'suppress' : 'preserve-metadata' }),
    environmentFactory: config.factory,
    lightingProfile: Object.freeze({ background: config.background, intensity: id === 'Thunderous Might' ? 0.72 : 1 }),
    animationProfile: Object.freeze({ default: config.animation }),
    cameraProfile: Object.freeze({ view: id === 'Time Traveler' ? 'three-quarter' : 'front', fov: 38 }),
    exportPolicy: Object.freeze({ includeEnvironmentInCharacterGlb: false, captureScene: true }),
    precedence: Object.freeze(['special', 'gear', 'background', 'fur', 'eyes', 'face']),
  })]
})))

export function getBackgroundRecipe(id) { return BACKGROUND_RECIPES[id] ?? null }
export function getSpecialRecipe(id) { return SPECIAL_RECIPES[id] ?? null }

export function resolveEnvironmentRecipe({ background = null, special = null } = {}) {
  if (special) return Object.freeze({ kind: 'special', background: null, recipe: getSpecialRecipe(special) })
  return Object.freeze({ kind: 'background', special: null, recipe: getBackgroundRecipe(background) })
}
