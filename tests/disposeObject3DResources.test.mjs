import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { disposeObject3DResources } from '../src/character/resources/disposeObject3DResources.js'

test('shared resource disposal is deduplicated and supports exclusions', () => {
  const parent = new THREE.Group()
  const root = new THREE.Group()
  parent.add(root)
  const geometry = new THREE.BoxGeometry()
  const excluded = new THREE.SphereGeometry()
  const texture = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ map: texture })
  root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material), new THREE.Mesh(excluded, material))
  const calls = { geometry: 0, excluded: 0, material: 0, texture: 0 }
  for (const [key, resource] of Object.entries({ geometry, excluded, material, texture })) {
    const original = resource.dispose.bind(resource)
    resource.dispose = () => { calls[key]++; original() }
  }
  const report = disposeObject3DResources(root, { excludeGeometries: [excluded] })
  assert.deepEqual(report, { geometries: 1, materials: 1, textures: 1 })
  assert.deepEqual(calls, { geometry: 1, excluded: 0, material: 1, texture: 1 })
  assert.equal(root.parent, null)
  excluded.dispose()
})
