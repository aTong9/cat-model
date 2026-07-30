import { BACKGROUND_TRAITS, EYE_STYLES, FACE_EXPRESSIONS, FUR_TRAITS, GEAR_TRAITS, SPECIAL_TRAITS, createRng } from '../config/traits.js'
import { MORPHOLOGY_DEFINITIONS, createCatTraits } from './catTraits.js'

export const GENERATION_THEMES = Object.freeze({
  explorer: Object.freeze({ gear: ['Camera', 'Hiking Backpack', 'Baseball Cap'], eyes: ['Alert', 'Original'], background: ['Green Gradient', 'Blue Gradient'] }),
  cozy: Object.freeze({ gear: ['Hot Coffee', 'Ramen', 'Investment Book'], eyes: ['Relaxed', 'Original'], background: ['Orange Gradient', 'Pink To Orange Gradient'] }),
  fortune: Object.freeze({ gear: ['Good Luck Gold Bar', 'Wealth Gold Bar', 'Gold Round Glasses'], fur: ['Golden', 'Tuxedo'], background: ['Red To Pink Gradient', 'Yellow To Green Gradient'] }),
  cosmic: Object.freeze({ gear: ['Camera', 'Gold Round Glasses'], eyes: ['VR', 'Blue Ring'], background: ['Purple Gradient', 'Blue Gradient'], special: ['Galactic Voyage', 'Time Traveler'] }),
})

const RARITY = Object.freeze({ common: 70, uncommon: 24, rare: 6 })

function pick(rng, values) { return values[Math.floor(rng() * values.length)] }
function chance(rng, probability) { return rng() < probability }
function weightedTier(rng) {
  const roll = rng() * 100
  return roll < RARITY.rare ? 'rare' : roll < RARITY.rare + RARITY.uncommon ? 'uncommon' : 'common'
}
function keep(key, locks, base) { return locks?.[key] && base?.[key] !== undefined }

export function generateCatTraits(seed, { theme = null, locks = {}, base = {}, mutationRate = 1 } = {}) {
  const rng = createRng(seed)
  const profile = GENERATION_THEMES[theme] ?? {}
  const tier = weightedTier(rng)
  const choose = (key, fallback) => {
    const mutate = chance(rng, mutationRate)
    const selected = pick(rng, profile[key] ?? fallback)
    return keep(key, locks, base) || !mutate ? base[key] : selected
  }
  const fur = choose('fur', FUR_TRAITS.map(item => item.id))
  const specialChance = tier === 'rare' ? 0.55 : tier === 'uncommon' ? 0.08 : 0
  const special = keep('special', locks, base) ? base.special : (chance(rng, specialChance) ? pick(rng, profile.special ?? SPECIAL_TRAITS.map(item => item.id)) : null)
  let gear = choose('gear', [null, ...GEAR_TRAITS.map(item => item.id)])
  let background = choose('background', profile.background ?? BACKGROUND_TRAITS)
  if (special) background = null
  if (SPECIAL_TRAITS.find(item => item.id === special)?.fullScene) gear = null
  const morphology = {}
  for (const [key, definition] of Object.entries(MORPHOLOGY_DEFINITIONS)) {
    const locked = locks?.morphology?.[key] && Number.isFinite(base?.morphology?.[key])
    const generated = Math.round((definition.min + rng() * (definition.max - definition.min)) * 1000) / 1000
    morphology[key] = locked ? base.morphology[key] : generated
  }
  const traits = createCatTraits({
    tokenId: String(Number(seed) >>> 0 || 1), fur, gear, special, background,
    eyes: choose('eyes', EYE_STYLES), face: choose('face', FACE_EXPRESSIONS), morphology, identity: base.identity,
  })
  return Object.freeze({ ...traits, generation: Object.freeze({ seed: Number(seed) >>> 0, theme, rarity: tier }) })
}

export function generateSimilarCatTraits(base, seed, options = {}) {
  return generateCatTraits(seed, { ...options, base, mutationRate: options.mutationRate ?? 0.28 })
}
