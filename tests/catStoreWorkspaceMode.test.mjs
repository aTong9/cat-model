import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useCatStore } from '../src/stores/cat.js'

test('workspace mode is normalized and excluded from CatTraits', () => {
  setActivePinia(createPinia())
  const store = useCatStore()
  assert.equal(store.workspaceMode, 'create')
  store.setWorkspaceMode('verify')
  assert.equal(store.workspaceMode, 'verify')
  assert.equal(Object.hasOwn(store.currentTraits, 'workspaceMode'), false)
  store.setWorkspaceMode('unknown')
  assert.equal(store.workspaceMode, 'create')
})

test('verification mode opens available 2D evidence', () => {
  setActivePinia(createPinia())
  const store = useCatStore()
  store.referenceImage = '/reference.png'
  store.comparisonOpen = false
  store.setWorkspaceMode('verify')
  assert.equal(store.comparisonOpen, true)
})
