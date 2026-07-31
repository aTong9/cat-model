import test from 'node:test'
import assert from 'node:assert/strict'
import { createExportRequest, serializeExportRequest, validateExportBudget } from '../src/export/exportRequest.js'

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
    optimize: true,
    meshopt: true,
    budget: { maxTriangles: 180000, maxMaterials: 64, maxMeshes: 140, maxBytes: 10485760 },
    filename: 'camera.glb',
  })
  assert.equal(JSON.parse(serializeExportRequest({})).schemaVersion, 1)
})

test('static, game and DCC presets freeze independent production budgets', () => {
  assert.equal(createExportRequest({ preset: 'editor' }).preset, 'dcc')
  assert.equal(createExportRequest({ preset: 'dcc' }).optimize, false)
  assert.equal(createExportRequest({ preset: 'game' }).meshopt, true)
  assert.equal(validateExportBudget({ audit: { stats: { triangles: 1, materials: 1, meshes: 1 } }, bytes: 100 }, { preset: 'game' }).valid, true)
  assert.equal(validateExportBudget({ audit: { stats: { triangles: 999999, materials: 1, meshes: 1 } }, bytes: 100 }, { preset: 'game' }).valid, false)
})
