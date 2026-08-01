import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createGymWorld9066 } from '../src/three/gym/createGymWorld9066.js'
import { shouldUseGymWorld9066 } from '../src/three/gym/GymWorld9066Config.js'

test('gym replacement is strictly scoped to token 9066', () => {
  assert.equal(shouldUseGymWorld9066(9066, 'Fitness Guru'), true)
  assert.equal(shouldUseGymWorld9066('9066', 'Fitness Guru'), true)
  assert.equal(shouldUseGymWorld9066(9065, 'Fitness Guru'), false)
  assert.equal(shouldUseGymWorld9066(9066, 'Onsen journey'), false)
})

test('gym owns the complete room and training-zone hierarchy without a second character', () => {
  const runtime = createGymWorld9066({ quality: 'low' })
  assert.deepEqual(runtime.world.children.map(child => child.name), ['architecture', 'cardioZone', 'strengthZone', 'centralZone', 'decorations', 'display', 'lighting', 'navigation'])
  for (const name of ['floor', 'ceiling', 'glassLeft', 'glassRight', 'treadmills', 'punchingBag', 'dumbbellRack', 'weightBench', 'trainingMat', 'hangingClouds', 'mainScreen', 'screenContent', 'walkableArea']) assert.ok(runtime.world.getObjectByName(name), name)
  const characterLike = []; runtime.world.traverse(object => { if (/cat|character/i.test(object.name) && object.name !== 'catEarGymBalls' && object.name !== 'catEar') characterLike.push(object.name) })
  assert.deepEqual(characterLike, [])
  runtime.dispose()
})

test('spawn is clear while room walls and large equipment block movement', () => {
  const runtime = createGymWorld9066({ quality: 'low' })
  const spawn = new THREE.Vector3(0, 0, 0)
  assert.equal(runtime.resolveMovement(spawn, spawn).collided, false)
  const wall = runtime.resolveMovement(spawn, new THREE.Vector3(100, 0, 0))
  assert.equal(wall.collided, true)
  assert.ok(wall.position.x < 21)
  const treadmill = runtime.colliders.find(value => value.name.startsWith('treadmill'))
  const blocked = runtime.resolveMovement(spawn, new THREE.Vector3(treadmill.x, 0, treadmill.z))
  assert.equal(blocked.collided, true)
  runtime.dispose()
})
