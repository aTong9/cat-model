import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { MORPHOLOGY_DEFINITIONS } from '../src/core/catTraits.js'
import { useCatStore } from '../src/stores/cat.js'

function createStore() {
  setActivePinia(createPinia())
  return useCatStore()
}

test('locked morphology values survive deterministic seed generation', () => {
  const lockedStore = createStore()
  lockedStore.setMorphology('bodyScale', 1.23)
  lockedStore.toggleMorphologyLock('bodyScale')
  lockedStore.setFromSeed(20260730)

  const referenceStore = createStore()
  referenceStore.setFromSeed(20260730)

  assert.equal(lockedStore.morphology.bodyScale, 1.23)
  assert.notEqual(referenceStore.morphology.bodyScale, 1.23)
  for (const key of Object.keys(MORPHOLOGY_DEFINITIONS).filter(key => key !== 'bodyScale')) {
    assert.equal(lockedStore.morphology[key], referenceStore.morphology[key], key)
  }
})

test('unlocking restores seeded updates and unknown locks are ignored', () => {
  const store = createStore()
  const before = { ...store.morphologyLocks }
  store.toggleMorphologyLock('unknown')
  assert.deepEqual(store.morphologyLocks, before)

  store.toggleMorphologyLock('tailCurl')
  store.setMorphology('tailCurl', 0.77)
  store.setFromSeed(7)
  assert.equal(store.morphology.tailCurl, 0.77)
  store.toggleMorphologyLock('tailCurl')
  store.setFromSeed(7)
  assert.notEqual(store.morphology.tailCurl, 0.77)
})
