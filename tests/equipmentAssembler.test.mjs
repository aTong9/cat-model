import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { EquipmentAssembler } from '../src/character/equipment/EquipmentAssembler.js'
import { CharacterPartRegistry } from '../src/character/registry/CharacterPartRegistry.js'

test('switching equipment disposes replaced geometry, material and texture', () => {
  const root = new THREE.Group()
  const registry = new CharacterPartRegistry(root)
  registry.createSocket('chest-front', root)
  registry.createSocket('back', root)
  const created = []
  const assembler = new EquipmentAssembler(registry, {
    supportedTypes: new Set(['Camera', 'Hiking Backpack']),
    createGear: type => {
      const texture = new THREE.Texture()
      const material = new THREE.MeshStandardMaterial({ map: texture })
      const geometry = new THREE.BoxGeometry()
      const gear = new THREE.Mesh(geometry, material)
      gear.name = type
      created.push({ gear, geometry, material, texture })
      return gear
    },
  })

  assembler.set('Camera')
  const first = created[0]
  const disposed = { geometry: 0, material: 0, texture: 0 }
  for (const [key, resource] of Object.entries({ geometry: first.geometry, material: first.material, texture: first.texture })) {
    const original = resource.dispose.bind(resource)
    resource.dispose = () => { disposed[key]++; original() }
  }

  assembler.set('Hiking Backpack')
  assert.deepEqual(disposed, { geometry: 1, material: 1, texture: 1 })
  assert.equal(first.gear.parent, null)
  assert.equal(assembler.current.parent, registry.getSocket('back'))
  assembler.dispose()
  assert.equal(assembler.current, null)
})

test('setting the active equipment type is idempotent', () => {
  const root = new THREE.Group()
  const registry = new CharacterPartRegistry(root)
  registry.createSocket('chest-front', root)
  let creations = 0
  const assembler = new EquipmentAssembler(registry, {
    supportedTypes: new Set(['Camera']),
    createGear: () => { creations++; return new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()) },
  })
  const first = assembler.set('Camera')
  assert.equal(assembler.set('Camera'), first)
  assert.equal(creations, 1)
  assembler.dispose()
})
