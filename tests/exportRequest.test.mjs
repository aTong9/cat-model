import test from 'node:test'
import assert from 'node:assert/strict'
import { createExportRequest, serializeExportRequest } from '../src/export/exportRequest.js'

test('export requests normalize UI and API inputs into a stable schema', () => {
  assert.deepEqual(createExportRequest({ target: 'equipment', preset: 'static', filename: 'camera.glb' }), {
    schemaVersion: 1,
    target: 'equipment',
    preset: 'static',
    format: 'glb',
    binary: true,
    includeBuiltInAnimations: false,
    includeCustomAnimation: false,
    includeMetadata: true,
    filename: 'camera.glb',
  })
  assert.equal(JSON.parse(serializeExportRequest({})).schemaVersion, 1)
})
