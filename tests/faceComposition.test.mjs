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

test('VR eyes reproduce the layered visor and cyan holographic HUD contract', () => {
  const assembly = createCatAssembly({ eyes: 'VR' })
  try {
    const headset = assembly.model._vrHeadset
    assert.equal(headset.visible, true)
    assert.deepEqual(headset.userData.componentContract, [
      'metal-shell', 'cyan-light-ring', 'curved-visor', 'head-strap', 'holographic-hud',
    ])
    assert.ok(headset.getObjectByName('VRMetalShell'))
    assert.ok(headset.getObjectByName('VRCyanLightRing'))
    assert.ok(headset.getObjectByName('VRCurvedVisor'))
    assert.ok(headset.getObjectByName('VRHeadStrap'))
    const hud = headset.getObjectByName('VRHolographicHUD')
    assert.equal(hud?.children.length, 3)
    assert.ok(headset.getObjectByName('VRCyanLightRing').material.emissiveIntensity >= 1)
  } finally { assembly.dispose() }
})

test('VR fabric gasket contains the visor across kitten and morphology extremes', () => {
  const assembly = createCatAssembly({ eyes: 'VR' })
  try {
    for (const morphology of [
      { bodyScale: .86, bodyWidth: .92, bodyHeight: .88, bodyDepth: .9, headScale: 1.2 },
      { bodyScale: .75, headScale: .75 },
      { bodyScale: 1.25, headScale: 1.25 },
    ]) {
      assembly.apply({ eyes: 'VR', morphology: { ...assembly.traits.morphology, ...morphology } })
      const gasket = assembly.model._vrHeadset.getObjectByName('VRFabricGasket')
      const visor = assembly.model._vrHeadset.getObjectByName('VRCurvedVisor')
      const gasketBounds = new THREE.Box3().setFromObject(gasket)
      const visorBounds = new THREE.Box3().setFromObject(visor)
      assert.ok(gasketBounds.min.x < visorBounds.min.x)
      assert.ok(gasketBounds.max.x > visorBounds.max.x)
      assert.ok(gasketBounds.min.y < visorBounds.min.y)
      assert.ok(gasketBounds.max.y > visorBounds.max.y)
      assert.ok(gasket.material.roughness >= .9)
      assert.equal(finiteBox(assembly.model._vrHeadset), true)
    }
  } finally { assembly.dispose() }
})
