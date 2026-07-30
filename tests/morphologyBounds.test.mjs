import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { MORPHOLOGY_DEFINITIONS } from '../src/core/catTraits.js'
import { createCatAssembly } from '../src/core/createCatAssembly.js'

function getBounds(root) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  assert.equal(box.isEmpty(), false)
  assert.ok([...box.min, ...box.max, ...size].every(Number.isFinite))
  assert.ok(size.x > 0 && size.y > 0 && size.z > 0)
  assert.ok(Math.max(size.x, size.y, size.z) < 10)
  return { box, size }
}

test('every morphology minimum and maximum keeps finite character bounds', () => {
  const assembly = createCatAssembly({ tokenId: '2' })
  try {
    for (const [key, definition] of Object.entries(MORPHOLOGY_DEFINITIONS)) {
      for (const value of [definition.min, definition.max]) {
        assembly.apply({ morphology: { ...assembly.traits.morphology, [key]: value } })
        getBounds(assembly.root)
      }
    }
  } finally {
    assembly.dispose()
  }
})

test('morphology extremes reach the intended character nodes', () => {
  const assembly = createCatAssembly({ morphology: {
    bodyScale: 1.25, headScale: 0.8, earScale: 1.35,
    legLength: 1.25, tailLength: 1.4, tailCurl: 0.8,
  } })
  try {
    assert.equal(assembly.model._bodyGroup.scale.x, 1.25)
    assert.equal(assembly.model._headGroup.scale.x, 0.8)
    assert.equal(assembly.model._earLGroup.scale.x, 1.35)
    assert.equal(assembly.model._footLGroup.scale.y, 1.25)
    assert.equal(assembly.model._tailGroup.scale.y, 1.4)
    assert.equal(assembly.model._tailGroup.userData.tailCurl, 0.8)
    getBounds(assembly.root)
  } finally {
    assembly.dispose()
  }
})

test('tail updates replace and dispose the previous geometry', () => {
  const assembly = createCatAssembly({ morphology: { tailCurl: -0.6 } })
  try {
    const surface = assembly.root.getObjectByName('TailSurface')
    const previous = surface.geometry
    let disposed = false
    const dispose = previous.dispose.bind(previous)
    previous.dispose = () => { disposed = true; dispose() }
    assembly.apply({ morphology: { ...assembly.traits.morphology, tailCurl: 0.8 } })
    assert.notEqual(surface.geometry, previous)
    assert.equal(disposed, true)
    assert.ok(surface.geometry.boundingBox)
    assert.ok(surface.geometry.boundingSphere)
  } finally {
    assembly.dispose()
  }
})
