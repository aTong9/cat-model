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
    imageUrl: token.remoteImage, fallbackImageUrl: '/audit/thumbnails/42.svg', imageSource: 'remote',
  })
})

test('local mode uses the complete audited thumbnail set instead of placeholder source files', () => {
  assert.deepEqual(createReferenceImagePolicy({ mode: 'local', localBaseUrl: './reference-images' }).resolve(token), {
    imageUrl: '/audit/thumbnails/42.svg', fallbackImageUrl: null, imageSource: 'preview',
  })
})
