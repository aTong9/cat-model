import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useCatStore } from '../src/stores/cat.js'

test('Pinia history restores traits without mixing editor state into CatTraits', () => {
  setActivePinia(createPinia())
  const store = useCatStore()
  const initial = store.morphology.bodyScale
  store.setMorphology('bodyScale', 1.2)
  assert.equal(store.undo(), true)
  assert.equal(store.morphology.bodyScale, initial)
  assert.equal(store.redo(), true)
  assert.equal(store.morphology.bodyScale, 1.2)
  assert.equal(Object.hasOwn(store.currentTraits, 'panelExpanded'), false)
})

test('store applies a complete shared trait document including identity and morphology', () => {
  setActivePinia(createPinia())
  const store = useCatStore()
  store.applyTraits({ tokenId: '77', seed: 1234, fur: 'Tuxedo', morphology: { headScale: 1.2, tailCurl: 0.6 }, identity: { name: 'Mochi', personality: ['勇敢'], story: '远行。' } }, { record: false })
  assert.equal(store.seed, 1234)
  assert.equal(store.furStyle, 'Tuxedo')
  assert.equal(store.morphology.headScale, 1.2)
  assert.equal(store.morphology.tailCurl, 0.6)
  assert.equal(store.identity.name, 'Mochi')
})
