import test from 'node:test'
import assert from 'node:assert/strict'
import { createLatestLoadGuard, loadDetailedSpecialScene, loadReferenceSpecialScene } from '../src/three/SpecialSceneLoader.js'

test('latest special-scene request invalidates earlier async work', () => {
  const guard = createLatestLoadGuard()
  const first = guard.begin()
  const second = guard.begin()
  assert.equal(guard.isCurrent(first), false)
  assert.equal(guard.isCurrent(second), true)
  guard.invalidate()
  assert.equal(guard.isCurrent(second), false)
})

test('special-scene modules expose reference and detailed factories on demand', async () => {
  const reference = await loadReferenceSpecialScene('Fitness Guru')
  assert.equal(reference.group.name, 'FitnessGuruScene')
  assert.equal(reference.background, '#81958d')

  const createFuji = await loadDetailedSpecialScene('Realm of Mt.Fuji')
  const createTimeTraveler = await loadDetailedSpecialScene('Time Traveler')
  assert.equal(createFuji.name, 'createFujiRealmScene')
  assert.equal(createTimeTraveler.name, 'createTimeTravelerScene')
  assert.equal(await loadDetailedSpecialScene('Golden General'), null)
})
