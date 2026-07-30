import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { GEAR_TRAITS } from '../src/config/traits.js'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import { getEquipmentAttachment } from '../src/three/EquipmentAttachments.js'

if (!globalThis.document) {
  const context = {
    clearRect() {}, fillRect() {}, fillText() {}, beginPath() {}, moveTo() {}, lineTo() {},
    closePath() {}, fill() {}, stroke() {}, save() {}, restore() {}, translate() {}, rotate() {},
    getImageData: () => ({ data: new Uint8ClampedArray(128 * 128 * 4) }),
  }
  globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => context }) }
}

test('every equipment trait is parented to its registered semantic socket', () => {
  const assembly = createCatAssembly({ gear: null })
  try {
    for (const { id } of GEAR_TRAITS) {
      assembly.apply({ gear: id })
      const gear = assembly.model._equippedGear
      const profile = getEquipmentAttachment(id)
      assert.ok(gear, id)
      assert.equal(gear.parent, assembly.registry.getSocket(profile.socket), id)
      assert.deepEqual(gear.position.toArray(), profile.position, id)
      assert.equal(gear.userData.attachment.socket, profile.socket, id)
    }
  } finally {
    assembly.dispose()
  }
})

test('head equipment follows headScale through socket-local transforms', () => {
  const assembly = createCatAssembly({ gear: 'Baseball Cap', morphology: { headScale: 0.8 } })
  try {
    const head = assembly.registry.getPart('head')
    const gear = assembly.model._equippedGear
    assembly.root.updateMatrixWorld(true)
    const headPosition = head.getWorldPosition(new THREE.Vector3())
    const smallDistance = gear.getWorldPosition(new THREE.Vector3()).distanceTo(headPosition)

    assembly.apply({ morphology: { ...assembly.traits.morphology, headScale: 1.25 } })
    assembly.root.updateMatrixWorld(true)
    const largeDistance = gear.getWorldPosition(new THREE.Vector3()).distanceTo(headPosition)
    assert.ok(largeDistance > smallDistance)
    assert.ok(Math.abs(largeDistance / smallDistance - 1.25 / 0.8) < 0.01)
  } finally {
    assembly.dispose()
  }
})

test('body equipment follows bodyScale through socket-local transforms', () => {
  const assembly = createCatAssembly({ gear: 'Camera', morphology: { bodyScale: 0.8 } })
  try {
    assembly.root.updateMatrixWorld(true)
    const smallZ = assembly.model._equippedGear.getWorldPosition(new THREE.Vector3()).z
    assembly.apply({ morphology: { ...assembly.traits.morphology, bodyScale: 1.25 } })
    assembly.root.updateMatrixWorld(true)
    const largeZ = assembly.model._equippedGear.getWorldPosition(new THREE.Vector3()).z
    assert.ok(largeZ > smallZ)
    assert.ok(Math.abs(largeZ / smallZ - 1.25 / 0.8) < 0.01)
  } finally {
    assembly.dispose()
  }
})
