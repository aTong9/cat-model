import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createSakuraOnsenWorld } from '../src/three/onsen/createSakuraOnsenWorld.js'
import { shouldUseSakuraOnsen } from '../src/three/onsen/SakuraOnsenConfig.js'

test('sakura onsen replacement follows the Onsen journey trait for every token', () => {
  assert.equal(shouldUseSakuraOnsen(3001, 'Onsen journey'), true)
  assert.equal(shouldUseSakuraOnsen('3001', 'Onsen journey'), true)
  assert.equal(shouldUseSakuraOnsen(3002, 'Onsen journey'), true)
  assert.equal(shouldUseSakuraOnsen(3001, 'Realm of Mt.Fuji'), false)
})

test('sakura onsen exposes the requested deep module hierarchy', () => {
  const runtime = createSakuraOnsenWorld({ quality: 'low' })
  assert.deepEqual(runtime.world.children.map(child => child.name), [
    'terrain', 'onsen', 'pavilion', 'entrance', 'vegetation', 'decorations', 'distantWorld', 'effects', 'navigation',
  ])
  for (const name of ['waterSurface', 'poolRocks', 'noren', 'onsenSymbol', 'sakuraTrees', 'mountFuji', 'fallingPetals', 'waterExclusionAreas']) assert.ok(runtime.world.getObjectByName(name), name)
  runtime.dispose()
})

test('spawn stays dry while the pool, obstacles and world edge block movement', () => {
  const runtime = createSakuraOnsenWorld({ quality: 'low' })
  const spawn = new THREE.Vector3(0, 0, 0)
  assert.equal(runtime.resolveMovement(spawn, spawn).collided, false)
  const pool = runtime.exclusions[0]
  const waterAttempt = runtime.resolveMovement(spawn, new THREE.Vector3(pool.x, 0, pool.z))
  assert.equal(waterAttempt.collided, true)
  assert.ok(Math.hypot(waterAttempt.position.x - pool.x, waterAttempt.position.z - pool.z) >= pool.radius + .419)
  const boundaryAttempt = runtime.resolveMovement(spawn, new THREE.Vector3(100, 0, 0))
  assert.equal(boundaryAttempt.collided, true)
  assert.ok(Math.hypot(boundaryAttempt.position.x, boundaryAttempt.position.z) < 38)
  runtime.dispose()
})
