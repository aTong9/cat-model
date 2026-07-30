import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { MORPHOLOGY_PRESETS, useCatStore } from '../src/stores/cat.js'
import { MORPHOLOGY_DEFINITIONS } from '../src/core/catTraits.js'

test('base morphology presets are distinct and stay inside the CatTraits contract', () => {
  assert.ok(MORPHOLOGY_PRESETS.length >= 6 && MORPHOLOGY_PRESETS.length <= 10)
  assert.equal(new Set(MORPHOLOGY_PRESETS.map(preset => JSON.stringify(preset.values))).size, MORPHOLOGY_PRESETS.length)
  for (const preset of MORPHOLOGY_PRESETS) {
    for (const [key, definition] of Object.entries(MORPHOLOGY_DEFINITIONS)) {
      assert.ok(preset.values[key] >= definition.min && preset.values[key] <= definition.max, `${preset.id}:${key}`)
    }
  }
})

test('a preset applies as one history step and remains freely adjustable', () => {
  setActivePinia(createPinia())
  const store = useCatStore()
  store.applyMorphologyPreset(MORPHOLOGY_PRESETS[1].values)
  assert.deepEqual({ ...store.morphology }, MORPHOLOGY_PRESETS[1].values)
  store.setMorphology('tailLength', 1.37)
  assert.equal(store.morphology.tailLength, 1.37)
})
