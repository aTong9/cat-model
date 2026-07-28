import test from 'node:test'
import assert from 'node:assert/strict'
import { createReferenceImagePolicy } from '../src/data/referenceImagePolicy.js'

const token = { tokenId: '42', extension: 'png', remoteImage: 'https://images.example/42.png' }

test('remote production mode never assumes local files are bundled', () => {
  assert.deepEqual(createReferenceImagePolicy({ mode: 'remote' }).resolve(token), {
    imageUrl: token.remoteImage, fallbackImageUrl: null, imageSource: 'remote',
  })
})

test('hybrid mode prefers remote and exposes a local fallback', () => {
  assert.deepEqual(createReferenceImagePolicy({ mode: 'hybrid', localBaseUrl: '/cats/' }).resolve(token), {
    imageUrl: token.remoteImage, fallbackImageUrl: '/cats/42.png', imageSource: 'remote',
  })
})

test('local WebView mode resolves only provisioned app assets', () => {
  assert.deepEqual(createReferenceImagePolicy({ mode: 'local', localBaseUrl: './reference-images' }).resolve(token), {
    imageUrl: './reference-images/42.png', fallbackImageUrl: null, imageSource: 'local',
  })
})
