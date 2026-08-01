import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createStormWorld11 } from '../src/three/storm/createStormWorld11.js'
import { shouldUseStormWorld11 } from '../src/three/storm/StormWorld11Config.js'

test('storm replacement is strictly scoped to token 11', () => {
  assert.equal(shouldUseStormWorld11(11, 'Thunderous Might'), true)
  assert.equal(shouldUseStormWorld11('11', 'Thunderous Might'), true)
  assert.equal(shouldUseStormWorld11(12, 'Thunderous Might'), false)
})
test('storm world exposes terrain, four landmarks, layered rain and spatial lightning', () => {
  const runtime = createStormWorld11({ quality: 'low' })
  assert.deepEqual(runtime.world.children.map(c => c.name), ['terrain', 'landmarks', 'atmosphere', 'weather', 'lightning', 'decorations', 'navigation'])
  for (const name of ['northernPeak', 'easternRockPillars', 'southernStormPlain', 'westernRuins', 'rainNear', 'rainMiddle', 'rainFar', 'lightningBolts', 'puddles']) assert.ok(runtime.world.getObjectByName(name), name)
  runtime.dispose()
})
test('central ground stays stable while obstacles and natural boundary resolve movement', () => {
  const runtime = createStormWorld11({ quality: 'low' }); const spawn = new THREE.Vector3()
  assert.ok(Math.abs(runtime.sampleCharacterGroundY(0, 0)) < .001)
  assert.equal(runtime.resolveMovement(spawn, new THREE.Vector3(100, 0, 0)).collided, true)
  const obstacle = runtime.colliders[0]; assert.equal(runtime.resolveMovement(spawn, new THREE.Vector3(obstacle.x, 0, obstacle.z)).collided, true)
  runtime.update(3); runtime.update(3.1); runtime.dispose()
})
