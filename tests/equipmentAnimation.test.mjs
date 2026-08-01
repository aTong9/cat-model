import test from 'node:test'
import assert from 'node:assert/strict'
import { createGear } from '../src/three/EquipmentFactory.js'
import { captureEquipmentTransform, createEquipmentAnimationClips, createEquipmentAnimationDocument, equipmentDocumentToClip, upsertEquipmentKeyframe } from '../src/character/equipment/equipmentAnimation.js'
import { exportEquipmentGlb } from '../src/export/exportEquipmentGlb.js'

if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.() }) }
  }
}

test('every equipment exposes a stable three-bone animation rig and default clips', () => {
  const gear = createGear('Camera')
  assert.deepEqual(gear.userData.animationRig.bones, [
    'EquipmentCameraRootBone', 'EquipmentCameraMotionBone', 'EquipmentCameraAccentBone',
  ])
  assert.equal(gear.equipmentAnimationRig.marker.isSkinnedMesh, true)
  assert.deepEqual(createEquipmentAnimationClips(gear).map(clip => clip.name), ['Hover', 'Spin', 'Pulse', 'ShutterFlash'])
})

test('equipment keyframes become a portable custom action', () => {
  const gear = createGear('Ramen')
  const first = captureEquipmentTransform(gear)
  const second = structuredClone(first)
  second.rotation[2] = .8
  let document = createEquipmentAnimationDocument({ id: 'UserGearAction', duration: 1 })
  document = upsertEquipmentKeyframe(document, 0, first)
  document = upsertEquipmentKeyframe(document, 1, second)
  const clip = equipmentDocumentToClip(document, gear)
  assert.equal(clip.name, 'UserGearAction')
  assert.ok(clip.tracks.some(track => track.name === 'EquipmentRamenMotionBone.quaternion'))
})

test('standalone equipment GLB round-trip preserves skeleton and actions', async () => {
  const gear = createGear('Camera')
  const { arrayBuffer, report } = await exportEquipmentGlb(gear)
  assert.ok(arrayBuffer.byteLength > 0)
  assert.ok(report.skinnedMeshes >= 1)
  assert.ok(report.bones >= 3)
  assert.deepEqual(report.animationNames, ['Hover', 'Spin', 'Pulse', 'ShutterFlash'])
})
