import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { BACKGROUND_TRAITS, SPECIAL_TRAITS } from '../src/config/traits.js'
import { decodeTokenCatalogRow } from '../src/core/tokenCatalogSchema.js'
import {
  BACKGROUND_RECIPES,
  SPECIAL_RECIPES,
  resolveEnvironmentRecipe,
} from '../src/character/appearance/environmentRecipes.js'

test('all background recipes own color, lighting, fog and export policy', () => {
  assert.deepEqual(Object.keys(BACKGROUND_RECIPES).sort(), [...BACKGROUND_TRAITS].sort())
  for (const recipe of Object.values(BACKGROUND_RECIPES)) {
    assert.match(recipe.colors.base, /^#[0-9a-f]{6}$/i)
    assert.match(recipe.lightingProfile.keyTint, /^#[0-9a-f]{6}$/i)
    assert.equal(recipe.fogProfile.color, recipe.colors.base)
    assert.equal(recipe.exportPolicy.includeInCharacterGlb, false)
  }
})

test('all seven Special recipes implement the complete override contract', () => {
  assert.deepEqual(Object.keys(SPECIAL_RECIPES).sort(), SPECIAL_TRAITS.map(item => item.id).sort())
  const fields = [
    'characterOverrides', 'equipmentOverrides', 'environmentFactory',
    'lightingProfile', 'animationProfile', 'cameraProfile', 'exportPolicy',
  ]
  for (const recipe of Object.values(SPECIAL_RECIPES)) {
    for (const field of fields) assert.ok(recipe[field], `${recipe.id}:${field}`)
    assert.equal(recipe.exportPolicy.includeEnvironmentInCharacterGlb, false)
    assert.deepEqual(recipe.precedence, ['special', 'gear', 'background', 'fur', 'eyes', 'face'])
  }
  assert.equal(SPECIAL_RECIPES['Galactic Voyage'].hero, true)
  assert.equal(SPECIAL_RECIPES['Golden General'].hero, true)
  assert.notEqual(SPECIAL_RECIPES['Galactic Voyage'].environmentFactory, SPECIAL_RECIPES['Golden General'].environmentFactory)
})

test('all 442 Special tokens suppress ordinary backgrounds without filling missing traits', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../public/data/token-catalog.json', import.meta.url), 'utf8'))
  const specialTokens = catalog.tokens.map(decodeTokenCatalogRow).filter(token => token.special)
  assert.equal(specialTokens.length, 442)
  for (const token of specialTokens) {
    const resolved = resolveEnvironmentRecipe(token)
    assert.equal(resolved.kind, 'special', token.tokenId)
    assert.equal(resolved.background, null, token.tokenId)
    assert.equal(resolved.recipe.id, token.special, token.tokenId)
    if (token.eyes == null) assert.equal(token.eyes, null)
    if (token.face == null) assert.equal(token.face, null)
    if (token.fur == null) assert.equal(token.fur, null)
  }
})
