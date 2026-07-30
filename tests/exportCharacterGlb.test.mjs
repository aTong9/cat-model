import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import { auditCharacterRoot, createPbrExportMaterial, exportCharacterGlb, summarizeExportReport } from '../src/export/exportCharacterGlb.js'

if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(result => {
        this.result = result
        this.onloadend?.()
      })
    }
  }
}

test('accepts a character root and reports export statistics', () => {
  const assembly = createCatAssembly({ tokenId: '1', fur: 'Golden', eyes: 'Original', face: 'Smile' })
  const report = auditCharacterRoot(assembly.root)
  assert.equal(report.valid, true)
  assert.ok(report.stats.meshes > 0)
  assert.ok(report.stats.triangles > 0)
  assert.ok(report.warnings.some(value => value.startsWith('toon-material-will-be-converted:')))
  assembly.dispose()
})

test('summarizes export statistics for interface feedback', () => {
  assert.equal(summarizeExportReport({ audit: { stats: { meshes: 12, triangles: 3456 } }, bytes: 1048576 }), '12 个网格 · 3456 个三角面 · 1.00 MB')
})

test('rejects exporting an environment scene', () => {
  const scene = new THREE.Scene()
  scene.add(new THREE.DirectionalLight())
  const report = auditCharacterRoot(scene)
  assert.equal(report.valid, false)
  assert.ok(report.errors.includes('scene-root-is-not-exportable-character'))
  assert.ok(report.errors.some(value => value.startsWith('environment-node:')))
})

test('maps toon materials to an explicit Blender-friendly PBR profile', () => {
  const toon = new THREE.MeshToonMaterial({ color: '#f4dc7a', vertexColors: true, transparent: true, opacity: 0.8 })
  const pbr = createPbrExportMaterial(toon)
  assert.equal(pbr.isMeshStandardMaterial, true)
  assert.equal(pbr.color.getHexString(), toon.color.getHexString())
  assert.equal(pbr.vertexColors, true)
  assert.equal(pbr.transparent, true)
  assert.equal(pbr.opacity, 0.8)
  assert.equal(pbr.roughness, 0.82)
  assert.equal(pbr.metalness, 0)
  assert.equal(pbr.userData.exportProfile, 'blender-pbr-v1')
  toon.dispose()
  pbr.dispose()
})

test('GLB round-trip preserves morphology metadata', async () => {
  const morphology = { bodyScale: 1.1, headScale: 0.9, earScale: 1.2, legLength: 1.15, tailLength: 1.25, tailCurl: 0.35 }
  const assembly = createCatAssembly({ tokenId: '12', gear: 'Camera', morphology })
  try {
    const { report } = await exportCharacterGlb(assembly.root)
    assert.equal(report.roundTrip.valid, true)
    assert.deepEqual(report.roundTrip.morphology, morphology)
    assert.ok(report.roundTrip.socketNames.includes('chest-front'))
    assert.equal(report.roundTrip.equipmentAttachment.socket, 'chest-front')
  } finally {
    assembly.dispose()
  }
})
