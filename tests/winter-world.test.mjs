import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createWinterWorld } from '../src/three/winter/createWinterWorld.js'
import { normalizeWinterWorldConfig, WINTER_QUALITY_PROFILES } from '../src/three/winter/WinterWorldConfig.js'

test('winter world exposes the complete directional environment contract', () => {
  const runtime = createWinterWorld({ quality: 'low' })
  assert.deepEqual(runtime.world.children.slice(0, 6).map(child => child.name), [
    'terrain', 'nearEnvironment', 'middleEnvironment', 'farEnvironment', 'atmosphere', 'navigation',
  ])
  for (const direction of ['mountainNorth', 'mountainSouth', 'mountainEast', 'mountainWest']) {
    assert.ok(runtime.world.getObjectByName(direction), `${direction} is required`)
  }
  assert.ok(runtime.world.getObjectByName('iceLake'))
  assert.ok(runtime.world.getObjectByName('frozenRiver'))
  assert.ok(runtime.world.getObjectByName('sky'))
  assert.ok(runtime.world.getObjectByName('snowfallNear'))
  assert.equal(runtime.world.getObjectByName('FujiRealm:blue-sky'), undefined)
  runtime.dispose()
})

test('central walk area is smooth and movement resolves terrain, obstacles and natural bounds', () => {
  const runtime = createWinterWorld({ quality: 'low', playableRadius: 42 })
  assert.ok(Math.abs(runtime.sampleCharacterGroundY(0, 0)) < .001)
  assert.ok(Math.abs(runtime.sampleCharacterGroundY(5, 4)) < .001)
  const bounded = runtime.resolveMovement(new THREE.Vector3(), new THREE.Vector3(100, 0, 0))
  assert.ok(bounded.collided)
  assert.ok(Math.hypot(bounded.position.x, bounded.position.z) <= 41.36)
  assert.ok(Number.isFinite(bounded.position.y))
  const obstacle = runtime.colliders[0]
  const blocked = runtime.resolveMovement(new THREE.Vector3(), new THREE.Vector3(obstacle.x, 0, obstacle.z))
  assert.ok(blocked.collided)
  assert.ok(Math.hypot(blocked.position.x - obstacle.x, blocked.position.z - obstacle.z) >= obstacle.radius + .419)
  runtime.dispose()
})

test('quality profiles lower deterministic environment budgets', () => {
  const desktop = createWinterWorld({ quality: 'desktop' })
  const low = createWinterWorld({ quality: 'low' })
  assert.ok(desktop.getStats().snowParticles > low.getStats().snowParticles)
  assert.ok(WINTER_QUALITY_PROFILES.desktop.trees > WINTER_QUALITY_PROFILES.low.trees)
  assert.equal(normalizeWinterWorldConfig({ quality: 'unknown' }).quality, 'desktop')
  desktop.setModuleVisible('farEnvironment', false)
  assert.equal(desktop.modules.farEnvironment.visible, false)
  desktop.setModuleVisible('farEnvironment', true)
  desktop.update(.016, { position: new THREE.Vector3(), moving: true, yaw: 0 })
  desktop.dispose(); low.dispose()
})
