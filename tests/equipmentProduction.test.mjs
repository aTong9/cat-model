import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import { GEAR_TRAITS } from '../src/config/traits.js'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import { EQUIPMENT_RECIPES } from '../src/character/equipment/equipmentRecipes.js'
import { auditCharacterRoot } from '../src/export/exportCharacterGlb.js'

if (!globalThis.document) {
  const context = {
    clearRect() {}, fillRect() {}, fillText() {}, beginPath() {}, moveTo() {}, lineTo() {},
    closePath() {}, fill() {}, stroke() {}, save() {}, restore() {}, translate() {}, rotate() {},
    getImageData: () => ({ data: new Uint8ClampedArray(128 * 128 * 4) }),
  }
  globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => context }) }
}

test('ten production equipment recipes classify evidence and fallback behavior', () => {
  assert.deepEqual(Object.keys(EQUIPMENT_RECIPES).sort(), GEAR_TRAITS.map(item => item.id).sort())
  for (const [id, recipe] of Object.entries(EQUIPMENT_RECIPES)) {
    assert.equal(recipe.id, id)
    assert.ok(recipe.attachment.socket)
    assert.ok(recipe.collider.type)
    assert.equal(recipe.fallback.missingTexture, 'procedural-material')
    for (const evidence of recipe.evidence) {
      const relative = evidence.path.replace(/^\//, 'public/')
      assert.equal(fs.existsSync(new URL(`../${relative}`, import.meta.url)), true, `${id}:${evidence.path}`)
      assert.match(evidence.role, /^(front-style-evidence|procedural-geometry-prototype)$/)
    }
  }
})

test('gold bars use the left paw while food and drink balance on the head', () => {
  const handheld = ['Good Luck Gold Bar', 'Wealth Gold Bar']
  for (const id of handheld) {
    assert.equal(EQUIPMENT_RECIPES[id].attachment.socket, 'paw-left', id)
    assert.equal(EQUIPMENT_RECIPES[id].attachment.handedness, 'left', id)
  }
  for (const id of ['Hot Coffee', 'Investment Book', 'Ramen', 'Sake']) {
    assert.equal(EQUIPMENT_RECIPES[id].attachment.socket, 'head-top', id)
    assert.equal(EQUIPMENT_RECIPES[id].attachment.handedness, 'none', id)
  }
})

test('all gear survives morphology extremes with named finite parts and export metadata', () => {
  const assembly = createCatAssembly({ gear: null })
  try {
    for (const morphology of [
      { bodyScale: 0.8, headScale: 0.8, legLength: 0.75 },
      { bodyScale: 1.25, headScale: 1.25, legLength: 1.25 },
    ]) {
      for (const { id } of GEAR_TRAITS) {
        assembly.apply({ gear: id, morphology: { ...assembly.traits.morphology, ...morphology } })
        assembly.root.updateMatrixWorld(true)
        const gear = assembly.model._equippedGear
        const box = new THREE.Box3().setFromObject(gear)
        assert.equal(box.isEmpty(), false, id)
        assert.ok([...box.min, ...box.max].every(Number.isFinite), id)
        assert.equal(gear.userData.equipmentRecipe.id, id)
        assert.ok(gear.userData.collider.type)
        const namedMeshes = []
        gear.traverse(object => { if (object.isMesh) namedMeshes.push(object.name) })
        assert.ok(namedMeshes.length > 0 && namedMeshes.every(Boolean), id)
        assert.equal(auditCharacterRoot(assembly.root).valid, true, id)
      }
    }
  } finally {
    assembly.dispose()
  }
})
