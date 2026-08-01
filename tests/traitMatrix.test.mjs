import test from 'node:test'
import assert from 'node:assert/strict'
import { BACKGROUND_TRAITS, EYE_STYLES, FACE_EXPRESSIONS, FUR_TRAITS, GEAR_TRAITS, SPECIAL_TRAITS } from '../src/config/traits.js'
import { getTraitStatus } from '../src/core/traitStatus.js'

test('trait implementation matrix covers the full 45-item catalog', () => {
  const groups = [
    ['fur', FUR_TRAITS.map(item => item.id)], ['eyes', EYE_STYLES], ['face', FACE_EXPRESSIONS],
    ['gear', GEAR_TRAITS.map(item => item.id)], ['background', BACKGROUND_TRAITS],
    ['special', SPECIAL_TRAITS.map(item => item.id)],
  ]
  const statuses = groups.flatMap(([type, values]) => values.map(value => getTraitStatus(type, value)))
  assert.equal(statuses.length, 45)
  assert.equal(statuses.every(item => ['implemented', 'partial', 'blocked'].includes(item.status)), true)
  assert.equal(statuses.filter(item => item.status === 'blocked').length, 0)
})
