import test from 'node:test'
import assert from 'node:assert/strict'
import { FUR_TRAITS } from '../src/config/traits.js'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import {
  applyFurRecipeToGeometry,
  createSerializableFurRecipe,
  evaluateSemanticFurMasks,
  FUR_SEMANTIC_MASKS,
} from '../src/character/appearance/furRecipes.js'

test('fur recipes expose every stable semantic mask and serialize deterministically', () => {
  assert.deepEqual(FUR_SEMANTIC_MASKS, [
    'muzzle', 'chest', 'belly', 'paw', 'tailTip',
    'leftFace', 'rightFace', 'stripe', 'spot',
  ])
  for (const { id } of FUR_TRAITS) {
    const first = createSerializableFurRecipe(id)
    const second = createSerializableFurRecipe(id)
    assert.deepEqual(first, second, id)
    assert.equal(first.id, id)
    assert.equal(first.schemaVersion, 1)
    assert.ok(first.masks.muzzle && first.masks.chest && first.masks.spot)
  }
})

test('semantic masks identify reference-aligned front regions', () => {
  assert.equal(evaluateSemanticFurMasks(0, 0.88, 0.3).muzzle, true)
  assert.equal(evaluateSemanticFurMasks(0, 0.2, 0.3).belly, true)
  assert.equal(evaluateSemanticFurMasks(-0.2, 0.82, 0.3).leftFace, true)
  assert.equal(evaluateSemanticFurMasks(0.2, 0.82, 0.3).rightFace, true)
  assert.equal(evaluateSemanticFurMasks(0, 0.2, -0.3).belly, false)
})

test('all eight fur recipes produce deterministic finite vertex colors', () => {
  const assembly = createCatAssembly({})
  try {
    const geometry = assembly.root.getObjectByName('SdfCatBody').geometry
    for (const { id } of FUR_TRAITS) {
      const first = applyFurRecipeToGeometry(geometry, id)
      const colors = [...geometry.attributes.color.array]
      const second = applyFurRecipeToGeometry(geometry, id)
      assert.deepEqual(second, first, id)
      assert.deepEqual([...geometry.attributes.color.array], colors, id)
      assert.ok(colors.every(Number.isFinite), id)
      assert.ok(new Set(colors.map(value => value.toFixed(4))).size >= 2, id)
    }
  } finally {
    assembly.dispose()
  }
})

test('fur masks remain geometry-local through morphology extremes', () => {
  const assembly = createCatAssembly({})
  try {
    const geometry = assembly.root.getObjectByName('SdfCatBody').geometry
    assembly.apply({ fur: 'Calico', morphology: { ...assembly.traits.morphology, bodyScale: 0.8, headScale: 1.2 } })
    const before = [...geometry.attributes.color.array]
    assembly.apply({ morphology: { ...assembly.traits.morphology, bodyScale: 1.25, headScale: 0.8 } })
    assert.deepEqual([...geometry.attributes.color.array], before)
  } finally {
    assembly.dispose()
  }
})
