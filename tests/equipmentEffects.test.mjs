import test from 'node:test'
import assert from 'node:assert/strict'
import { GEAR_TRAITS } from '../src/config/traits.js'
import { createEquipmentEffect, EQUIPMENT_EFFECT_RECIPES } from '../src/character/equipment/EquipmentEffects.js'

test('every equipment has an independent finite interaction recipe', () => {
  assert.deepEqual(Object.keys(EQUIPMENT_EFFECT_RECIPES).sort(), GEAR_TRAITS.map(item => item.id).sort())
  assert.equal(new Set(Object.values(EQUIPMENT_EFFECT_RECIPES).map(recipe => recipe.kind)).size, 8)
  for (const { id } of GEAR_TRAITS) {
    const effect = createEquipmentEffect(id)
    assert.ok(effect, id)
    assert.ok(effect.recipe.duration > 0, id)
    let complete = false
    for (let frame = 0; frame < 240 && !complete; frame++) complete = effect.update(1 / 60)
    assert.equal(complete, true, id)
    effect.dispose()
  }
})
