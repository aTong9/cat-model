import test from 'node:test'
import assert from 'node:assert/strict'
import { createShareQuery, createShareUrl, parseShareQuery, serializeCatConfig } from '../src/core/shareCatConfig.js'

const traits = { tokenId: '42', fur: 'Tuxedo', furColor: '#53515b', eyes: 'VR', face: 'Smile', gear: 'Camera', background: 'Purple Gradient', special: null, morphology: { bodyScale: 1.2, headScale: 0.9, earScale: 1.1, tailLength: 1.3 } }

test('share query round-trips normalized cat traits', () => {
  const restored = parseShareQuery(createShareQuery(traits))
  assert.equal(restored.tokenId, '42')
  assert.equal(restored.fur, 'Tuxedo')
  assert.equal(restored.gear, 'Camera')
  assert.equal(restored.special, null)
  assert.deepEqual(restored.morphology, traits.morphology)
})

test('share URL replaces old search and removes hash', () => {
  const url = new URL(createShareUrl('https://example.com/studio?old=1#preview', traits))
  assert.equal(url.searchParams.has('old'), false)
  assert.equal(url.searchParams.get('tokenId'), '42')
  assert.equal(url.hash, '')
})

test('serialized config contains schema and normalized values', () => {
  const payload = JSON.parse(serializeCatConfig(traits))
  assert.equal(payload.schemaVersion, 2)
  assert.equal(payload.eyes, 'VR')
})
