import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createEquipmentScatterController, createSeededRandom } from '../src/three/EquipmentScatterController.js'
import { createGear } from '../src/three/EquipmentFactory.js'

function createHarness(seed = 'stable-layout') {
  const scene = new THREE.Scene()
  const controller = createEquipmentScatterController({
    scene,
    camera: new THREE.PerspectiveCamera(),
    canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) },
    gearIds: ['Camera', 'Ramen', 'Sake'],
    createGear: id => {
      const group = new THREE.Group()
      group.name = id
      group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()))
      return group
    },
    seed,
    now: () => 1000,
  })
  controller.createAll()
  return { controller, scene }
}

test('seeded random sequences and equipment layouts are reproducible', () => {
  const randomA = createSeededRandom('cat')
  const randomB = createSeededRandom('cat')
  assert.deepEqual([randomA(), randomA(), randomA()], [randomB(), randomB(), randomB()])

  const first = createHarness()
  const second = createHarness()
  const positions = harness => harness.controller.entries.map(entry => entry.group.position.toArray())
  assert.deepEqual(positions(first), positions(second))
  const initialPositions = positions(first)
  first.controller.createAll()
  assert.deepEqual(positions(first), initialPositions)
  first.controller.dispose()
  second.controller.dispose()
})

test('equipment controller exposes reusable impulses, physics and cleanup', () => {
  const harness = createHarness()
  assert.equal(harness.controller.kickById('Ramen'), true)
  const ramen = harness.controller.entries.find(entry => entry.id === 'Ramen')
  assert.ok(ramen.velocity.y > 0)
  const previousY = ramen.group.position.y
  harness.controller.update(0.016)
  assert.ok(ramen.group.position.y > previousY)
  harness.controller.dispose()
  assert.equal(harness.controller.entries.length, 0)
  assert.equal(harness.scene.children.length, 0)
})

test('dragged equipment stays where the user leaves it and effects are transient', () => {
  const harness = createHarness()
  const camera = harness.controller.entries[0].group.parent
  const ramen = harness.controller.entries.find(entry => entry.id === 'Ramen')
  const destination = new THREE.Vector3(1.4, ramen.group.position.y, -0.8)
  ramen.group.position.copy(destination)
  harness.controller.update(2)
  assert.deepEqual(ramen.group.position.toArray(), destination.toArray())

  assert.equal(harness.controller.triggerEffect(ramen), true)
  assert.ok(ramen.group.getObjectByName('EquipmentEffect:Ramen'))
  for (let frame = 0; frame < 180; frame++) harness.controller.update(1 / 60)
  assert.equal(ramen.group.getObjectByName('EquipmentEffect:Ramen'), undefined)
  harness.controller.dispose()
})

test('ground camera uses a compact display scale independent from equipped size', () => {
  const scene = new THREE.Scene()
  const controller = createEquipmentScatterController({
    scene,
    camera: new THREE.PerspectiveCamera(),
    canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) },
    gearIds: ['Camera'],
    createGear,
    seed: 'camera-display-scale',
  })
  try {
    controller.createAll()
    const camera = controller.entries[0].group
    assert.ok(camera.scale.x <= .44, `camera scatter scale ${camera.scale.x} is too large`)
  } finally { controller.dispose() }
})
