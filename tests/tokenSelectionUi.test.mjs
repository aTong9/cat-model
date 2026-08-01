import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_TOKEN_ID, useCatStore } from '../src/stores/cat.js'

const parameterPanel = fs.readFileSync(new URL('../src/components/ParamPanel.vue', import.meta.url), 'utf8')
const collectionDrawer = fs.readFileSync(new URL('../src/components/CollectionDrawer.vue', import.meta.url), 'utf8')

test('the application and store default to Liberty Cat 9038', () => {
  setActivePinia(createPinia())
  assert.equal(DEFAULT_TOKEN_ID, 9038)
  assert.equal(useCatStore().tokenId, DEFAULT_TOKEN_ID)
})

test('external token selections synchronize the controller query and archive cards expose ids', () => {
  assert.match(parameterPanel, /watch\(\(\) => store\.tokenId,[\s\S]*tokenQuery\.value = String\(tokenId\)/)
  assert.match(collectionDrawer, /<span>#\{\{ token\.tokenId \}\}<\/span>/)
})
