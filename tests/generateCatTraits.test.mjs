import test from 'node:test'
import assert from 'node:assert/strict'
import { generateCatTraits, generateSimilarCatTraits, GENERATION_THEMES } from '../src/core/generateCatTraits.js'
import { validateCatTraits } from '../src/core/catTraits.js'

test('rule generation is deterministic, themed and valid', () => {
  const first = generateCatTraits(4242, { theme: 'explorer' })
  const second = generateCatTraits(4242, { theme: 'explorer' })
  assert.deepEqual(first, second)
  assert.equal(validateCatTraits(first).valid, true)
  assert.ok(GENERATION_THEMES.explorer.gear.includes(first.gear) || first.gear === null)
})

test('locks survive generation and similar variants mutate deterministically', () => {
  const base = generateCatTraits(12)
  const locks = { fur: true, morphology: { headScale: true } }
  const variant = generateSimilarCatTraits(base, 99, { locks, mutationRate: 1 })
  assert.equal(variant.fur, base.fur)
  assert.equal(variant.morphology.headScale, base.morphology.headScale)
  assert.deepEqual(variant, generateSimilarCatTraits(base, 99, { locks, mutationRate: 1 }))
})

test('locking one trait does not perturb the seeded sequence for other traits', () => {
  const base = generateCatTraits(1)
  const unlocked = generateCatTraits(8080, { base })
  const locked = generateCatTraits(8080, { base, locks: { fur: true } })
  assert.equal(locked.fur, base.fur)
  for (const key of ['eyes', 'face', 'gear', 'background', 'special']) assert.equal(locked[key], unlocked[key], key)
  assert.deepEqual(locked.morphology, unlocked.morphology)
})

test('special scenes override backgrounds and full scenes reject equipment', () => {
  for (let seed = 0; seed < 500; seed++) {
    const traits = generateCatTraits(seed, { theme: 'cosmic' })
    if (!traits.special) continue
    assert.equal(traits.background, null)
    if (['Galactic Voyage', 'Golden General', 'Time Traveler'].includes(traits.special)) assert.equal(traits.gear, null)
  }
})

test('weighted rarity produces rare results without dominating generation', () => {
  const tiers = Array.from({ length: 1000 }, (_, seed) => generateCatTraits(seed).generation.rarity)
  const rare = tiers.filter(value => value === 'rare').length
  assert.ok(rare >= 30 && rare <= 90, rare)
})
