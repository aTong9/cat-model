import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveCharacterConfig } from '../src/core/resolveCharacterConfig.js'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import catalog from '../public/data/token-catalog.json' with { type: 'json' }
import { decodeTokenCatalogRow } from '../src/core/tokenCatalogSchema.js'

test('trait resolution produces one immutable runtime configuration', () => {
  const resolved = resolveCharacterConfig({
    tokenId: '414',
    fur: 'Calico',
    eyes: 'VR',
    face: 'Wow',
    gear: 'Baseball Cap',
    special: 'Realm of Mt.Fuji',
    morphology: { headScale: 1.2 },
  })
  assert.equal(resolved.source.tokenId, '414')
  assert.equal(resolved.appearance.fur.pattern, 'calico')
  assert.equal(resolved.appearance.eyes.family, 'visor')
  assert.equal(resolved.appearance.face.family, 'vertical-open')
  assert.equal(resolved.equipment.recipe.attachment.socket, 'head-top')
  assert.equal(resolved.equipment.policy.strategy, 'offset-equipment')
  assert.equal(resolved.environment.kind, 'special')
  assert.equal(resolved.environment.background, null)
  assert.equal(resolved.morphology.headScale, 1.2)
  assert.equal(Object.isFrozen(resolved), true)
  assert.equal(Object.isFrozen(resolved.appearance.fur.masks), true)
})

test('every catalog token resolves through the shared recipe pipeline', () => {
  for (const row of catalog.tokens) {
    const token = decodeTokenCatalogRow(row)
    const resolved = resolveCharacterConfig(token)
    assert.equal(resolved.source.tokenId, token.tokenId)
    assert.ok(resolved.appearance.fur.id)
    assert.ok(resolved.appearance.eyes.id)
    assert.ok(resolved.appearance.face.id)
    if (token.gear) assert.equal(resolved.equipment.id, token.gear)
    assert.equal(resolved.environment.kind, token.special ? 'special' : 'background')
  }
})

test('full-scene special suppresses equipment without losing its recipe metadata', () => {
  const resolved = resolveCharacterConfig({ gear: 'Camera', special: 'Time Traveler' })
  assert.equal(resolved.equipment.id, 'Camera')
  assert.equal(resolved.equipment.visible, false)
  assert.equal(resolved.equipment.suppressedBySpecial, true)
})

test('assembly refreshes resolved config through the same apply entrypoint', () => {
  const assembly = createCatAssembly({ fur: 'Golden', eyes: 'Original' })
  try {
    assert.equal(assembly.resolvedConfig.appearance.fur.id, 'Golden')
    assembly.apply({ fur: 'Tuxedo', eyes: 'Blue Ring' })
    assert.equal(assembly.resolvedConfig, assembly.root.userData.resolvedConfig)
    assert.equal(assembly.resolvedConfig.appearance.fur.id, 'Tuxedo')
    assert.equal(assembly.resolvedConfig.appearance.eyes.id, 'Blue Ring')
  } finally {
    assembly.dispose()
  }
})
