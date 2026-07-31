import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import {
  PACK5_AUTHORED_FOOT_Y,
  PACK5_BASE_SCALE,
  PACK5_EAR_BASE_SCALE,
  PACK5_FLOOR_Y,
} from '../src/character/morphology/applyMorphology.js'

test('ear, hand and foot proportions are independently parameterized', () => {
  const assembly = createCatAssembly({ morphology: {
    earScale: 1.1, earWidth: 1.2, earHeight: .8, pawScale: 1.3, footScale: .9,
  } })
  try {
    assert.ok(Math.abs(assembly.parts['ear-left'].scale.x - PACK5_EAR_BASE_SCALE[0] * 1.1 * 1.2) < 1e-9)
    assert.ok(Math.abs(assembly.parts['ear-left'].scale.y - PACK5_EAR_BASE_SCALE[1] * 1.1 * .8) < 1e-9)
    assert.ok(Math.abs(assembly.parts['ear-left'].scale.z - PACK5_EAR_BASE_SCALE[2] * 1.1) < 1e-9)
    assert.deepEqual(assembly.root.getObjectByName('ArmLeftPaw').scale.toArray(), [1.3, 1.3, 1.3])
    assert.deepEqual(assembly.root.getObjectByName('FootRight').scale.toArray(), [.9, .9, .9])
  } finally { assembly.dispose() }
})

test('both ear roots overlap the head shell without crossing the face centerline', () => {
  const assembly = createCatAssembly()
  try {
    const bodyBounds = new THREE.Box3().setFromObject(assembly.parts.body)
    const eyePlaneZ = assembly.root.getObjectByName('FaceEyeLeft').getWorldPosition(new THREE.Vector3()).z
    for (const [partId, side] of [['ear-left', -1], ['ear-right', 1]]) {
      const bounds = new THREE.Box3().setFromObject(assembly.parts[partId])
      assert.ok(bounds.min.y < bodyBounds.max.y, `${partId} must embed into the skull`)
      assert.ok(bounds.max.y > bodyBounds.max.y + .35, `${partId} must retain a visible peak`)
      assert.ok(bounds.max.z < eyePlaneZ, `${partId} must remain behind the eye plane`)
      if (side < 0) assert.ok(bounds.max.x < .03, `${partId} must stay on its side`)
      else assert.ok(bounds.min.x > -.03, `${partId} must stay on its side`)
    }
  } finally { assembly.dispose() }
})

test('body width, height and depth share one stable morphology root', () => {
  const assembly = createCatAssembly({ morphology: {
    bodyWidth: 1.2, bodyHeight: .82, bodyDepth: 1.15,
  } })
  try {
    const root = assembly.root.getObjectByName('CharacterMorphology')
    assert.ok(root)
    assert.deepEqual(root.scale.toArray(), [
      PACK5_BASE_SCALE[0] * 1.2,
      PACK5_BASE_SCALE[1] * .82,
      PACK5_BASE_SCALE[2] * 1.15,
    ])
    assert.equal(assembly.traits.morphology.bodyWidth, 1.2)
    assert.equal(assembly.traits.morphology.bodyHeight, .82)
    assert.equal(assembly.traits.morphology.bodyDepth, 1.15)
  } finally { assembly.dispose() }
})

test('body-height changes stay anchored to the authored paw floor', () => {
  const assembly = createCatAssembly()
  try {
    for (const bodyHeight of [.72, 1, 1.28]) {
      assembly.model.setMorphology({ bodyHeight })
      const root = assembly.root.getObjectByName('CharacterMorphology')
      const transformedFloor = root.position.y + root.scale.y * PACK5_AUTHORED_FOOT_Y
      assert.ok(Math.abs(transformedFloor - PACK5_FLOOR_Y) < 1e-8)
    }
  } finally { assembly.dispose() }
})

test('eye size, eye spacing and mouth size are independent API parameters', () => {
  const assembly = createCatAssembly({ morphology: {
    eyeScale: 1.3, eyeSpacing: 1.18, mouthScale: 1.24,
  } })
  try {
    const left = assembly.root.getObjectByName('FaceEyeLeft')
    const right = assembly.root.getObjectByName('FaceEyeRight')
    const mouth = assembly.root.getObjectByName('FaceMouth')
    assert.ok(Math.abs(left.scale.x - 1.16 * 1.3) < 1e-9)
    assert.ok(Math.abs(right.position.x / right.userData.restPosition[0] - 1.18) < 1e-9)
    assert.ok(Math.abs(mouth.scale.x - mouth.userData.profileScale * 1.12 * 1.24) < 1e-9)
  } finally { assembly.dispose() }
})

test('rounded ears expose root blend, beveled shell and recessed inner surface', () => {
  const assembly = createCatAssembly({})
  try {
    for (const side of ['Left', 'Right']) {
      assert.ok(assembly.root.getObjectByName(`Ear${side}RootBlend`))
      assert.ok(assembly.root.getObjectByName(`Ear${side}Outer`)?.geometry?.boundingBox)
      assert.ok(assembly.root.getObjectByName(`InnerEar${side}`))
    }
  } finally { assembly.dispose() }
})
