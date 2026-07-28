import test from 'node:test'
import assert from 'node:assert/strict'
import { createCatTraits, isExcludedTokenId, normalizeMetadataRecord, toMetadataAttributes, validateCatTraits } from '../src/core/catTraits.js'
import { createCatAssembly } from '../src/core/createCatAssembly.js'

test('normalizes a Liberty Cats metadata record', () => {
  const result = normalizeMetadataRecord({ tokenId: '42', raw: { metadata: { properties: [
    { trait_type: 'Eyes', value: 'VR' }, { trait_type: 'Face', value: 'Smile' },
    { trait_type: 'Fur Color', value: 'Tuxedo' }, { trait_type: 'Gear', value: 'Camera' },
    { trait_type: 'Background', value: 'Purple Gradient' },
  ] } } })
  assert.equal(result.ok, true)
  assert.deepEqual(result.traits, createCatTraits({ tokenId: '42', eyes: 'VR', face: 'Smile', fur: 'Tuxedo', gear: 'Camera', background: 'Purple Gradient' }))
  assert.equal(validateCatTraits(result.traits).valid, true)
})

test('excludes the two out-of-scope records', () => {
  assert.equal(isExcludedTokenId('4768'), true)
  assert.equal(isExcludedTokenId('4188087532617125273825521422781690267136463389660746064323733694581280079873'), true)
})

test('reports unknown traits instead of guessing', () => {
  const result = normalizeMetadataRecord({ tokenId: '7', properties: [{ trait_type: 'Eyes', value: 'Laser' }] })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'unknown-traits')
})

test('serializes only present attributes', () => {
  const attributes = toMetadataAttributes(createCatTraits({ tokenId: '1', gear: null, special: null }))
  assert.equal(attributes.some(item => item.trait_type === 'Gear'), false)
  assert.equal(attributes.some(item => item.trait_type === 'Special'), false)
})

test('builds and updates a character without Vue or the DOM', () => {
  const assembly = createCatAssembly({ tokenId: '1', fur: 'Golden', eyes: 'Original', face: 'Smile' })
  assert.equal(assembly.root.name, 'LibertyCat')
  assert.equal(assembly.root.userData.catTraits.tokenId, '1')
  assembly.apply({ fur: 'Tuxedo', eyes: 'VR' })
  assert.equal(assembly.traits.fur, 'Tuxedo')
  assert.equal(assembly.traits.eyes, 'VR')
  assembly.dispose()
})
