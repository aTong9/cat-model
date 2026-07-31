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

test('GLB round-trip preserves versioned morphology and identity metadata', async () => {
  const morphology = {
    bodyScale: 1.1, bodyWidth: 1, bodyHeight: 1, bodyDepth: 1,
    headScale: 0.9, eyeScale: 1, eyeSpacing: 1, mouthScale: 1,
    earScale: 1.2, earWidth: 1, earHeight: 1,
    pawScale: 1, footScale: 1, legLength: 1.15, tailLength: 1.25, tailCurl: 0.35,
  }
  const identity = { name: 'Nova', personality: ['好奇'], occupation: '摄影师', theme: '城市', story: '记录每次相遇。', catchphrase: '出发！' }
  const assembly = createCatAssembly({ tokenId: '12', seed: 42, gear: 'Camera', morphology, identity })
  try {
    const { report } = await exportCharacterGlb(assembly.root)
    assert.equal(report.roundTrip.valid, true)
    assert.deepEqual(report.roundTrip.morphology, morphology)
    assert.deepEqual(report.roundTrip.identity, identity)
    assert.equal(report.roundTrip.schemaVersion, 2)
    assert.equal(report.roundTrip.generatorVersion, '3.0.0')
    assert.equal(report.roundTrip.seed, 42)
    assert.ok(report.roundTrip.socketNames.includes('chest-front'))
    assert.equal(report.roundTrip.equipmentAttachment.socket, 'chest-front')
  } finally {
    assembly.dispose()
  }
})

test('GLB round-trip preserves named animation clips for DCC and game engines', async () => {
  const assembly = createCatAssembly({ tokenId: '414', fur: 'Calico', eyes: 'Blue Ring', face: 'Wow' })
  try {
    const animations = assembly.model.createExportAnimationClips({ fps: 12 })
    const { report } = await exportCharacterGlb(assembly.root, { animations })
    assert.deepEqual(report.roundTrip.animationNames, ['Idle', 'Run', 'Jump', 'Wave'])
    assert.equal(report.roundTrip.stats.animations, 4)
    assert.equal(report.roundTrip.compatibility.blender.valid, true)
    assert.equal(report.roundTrip.compatibility.unity.valid, true)
    assert.equal(report.roundTrip.compatibility.unreal.valid, true)
  } finally { assembly.dispose() }
})

test('GLB round-trip preserves wrist-driven Pack 5 prop tracks', async () => {
  const assembly = createCatAssembly({ tokenId: '414', morphology: { bodyScale: 1.2, pawScale: 1.25 } })
  try {
    assembly.model.setAnimation('emoji-dumbbells')
    assembly.model.update(.2)
    const animations = assembly.model.createExportAnimationClips({
      fps: 12,
      include: [{ id: 'emoji-dumbbells', name: 'Dumbbells', duration: 1.6, loop: true }],
    })
    const { report } = await exportCharacterGlb(assembly.root, { animations })
    assert.ok(report.roundTrip.animationTracks.Dumbbells.includes('DumbbellLeft.position'))
    assert.ok(report.roundTrip.animationTracks.Dumbbells.includes('DumbbellRight.position'))
  } finally { assembly.dispose() }
})
