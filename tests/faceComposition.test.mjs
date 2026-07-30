import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import {
  METADATA_EYE_STYLES,
  METADATA_FACE_EXPRESSIONS,
  resolveFaceEquipmentPolicy,
} from '../src/character/appearance/faceCompositionContract.js'
import { auditCharacterRoot } from '../src/export/exportCharacterGlb.js'

function finiteBox(object) {
  object.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(object)
  return !box.isEmpty() && [...box.min, ...box.max].every(Number.isFinite)
}

test('all thirty metadata Eyes × Face combinations have finite, exportable bounds', () => {
  const assembly = createCatAssembly({})
  try {
    let count = 0
    for (const eyes of METADATA_EYE_STYLES) {
      for (const face of METADATA_FACE_EXPRESSIONS) {
        assembly.apply({ eyes, face })
        const eyeLeft = assembly.root.getObjectByName('FaceEyeLeft')
        const eyeRight = assembly.root.getObjectByName('FaceEyeRight')
        const mouth = assembly.registry.getSocket('face-mouth')
        const eyeTarget = eyes === 'VR' ? assembly.model._vrHeadset : eyeLeft
        assert.equal(finiteBox(eyeTarget), true, `${eyes}:${face}:eyes`)
        if (eyes !== 'VR') assert.equal(finiteBox(eyeRight), true, `${eyes}:${face}:right-eye`)
        assert.equal(finiteBox(mouth), true, `${eyes}:${face}:mouth`)
        assert.equal(eyeLeft.userData.eyeStyle, eyes)
        assert.equal(mouth.userData.faceExpression, face)
        assert.equal(auditCharacterRoot(assembly.root).valid, true)
        count++
      }
    }
    assert.equal(count, 30)
  } finally {
    assembly.dispose()
  }
})

test('face sockets expose independently parameterized eye and mouth components', () => {
  const assembly = createCatAssembly({ eyes: 'Blue Ring', face: 'Excited' })
  try {
    const eye = assembly.root.getObjectByName('FaceEyeLeft')
    const mouth = assembly.registry.getSocket('face-mouth')
    assert.deepEqual(eye.userData.componentContract, ['eyeball', 'rim', 'pupil', 'highlight', 'wearable'])
    assert.deepEqual(mouth.userData.componentContract, ['mouth-cavity', 'teeth', 'tongue', 'lip-line'])
    assert.ok(eye.userData.eyeBounds.radius > 0)
    assert.ok(mouth.userData.faceBounds.width > 0)
  } finally {
    assembly.dispose()
  }
})

test('Sunglasses and VR use explicit head-equipment conflict policies', () => {
  assert.equal(resolveFaceEquipmentPolicy('Sunglasses', 'Gold Round Glasses').strategy, 'eyes-win')
  assert.equal(resolveFaceEquipmentPolicy('VR', 'Gold Round Glasses').equipmentVisible, false)
  assert.equal(resolveFaceEquipmentPolicy('VR', 'Baseball Cap').strategy, 'offset-equipment')
  assert.equal(resolveFaceEquipmentPolicy('Original', 'Baseball Cap').strategy, 'compose')
})
