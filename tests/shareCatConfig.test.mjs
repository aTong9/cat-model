import test from 'node:test'
import assert from 'node:assert/strict'
import { createShareQuery, createShareUrl, parseShareQuery, serializeCatConfig } from '../src/core/shareCatConfig.js'

const traits = { tokenId: '42', fur: 'Tuxedo', furColor: '#53515b', eyes: 'VR', face: 'Smile', gear: 'Camera', background: 'Purple Gradient', special: null, morphology: { bodyScale: 1.2, bodyWidth: 1, bodyHeight: 1, bodyDepth: 1, headScale: 0.9, eyeScale: 1, eyeSpacing: 1, mouthScale: 1, earScale: 1.1, earWidth: 1, earHeight: 1, pawScale: 1, footScale: 1, legLength: 1.15, tailLength: 1.3, tailCurl: 0.4 } }

test('share query round-trips normalized cat traits', () => {
  const restored = parseShareQuery(createShareQuery(traits))
  assert.equal(restored.tokenId, '42')
  assert.equal(restored.fur, 'Tuxedo')
  assert.equal(restored.gear, 'Camera')
  assert.equal(restored.special, null)
  assert.deepEqual(restored.morphology, traits.morphology)
})

test('share query preserves seed and editable identity', () => {
  const shared = parseShareQuery(createShareQuery({ tokenId: '7', seed: 99, identity: { name: 'Nova', personality: ['好奇'], story: '星际旅行' } }))
  assert.equal(shared.seed, 99)
  assert.equal(shared.identity.name, 'Nova')
  assert.deepEqual(shared.identity.personality, ['好奇'])
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
