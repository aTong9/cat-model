import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeTraitStatuses } from '../src/core/traitStatus.js'

test('normal traits are implemented while special scenes remain partial', () => {
  const result = summarizeTraitStatuses({ fur: 'Golden', eyes: 'VR', face: 'Smile', gear: 'Camera', background: null, special: 'Time Traveler' })
  assert.equal(result.implemented, 4)
  assert.equal(result.partial, 1)
  assert.equal(result.blocked, 0)
})

test('background status documents that it is preview-only', () => {
  const result = summarizeTraitStatuses({ fur: null, eyes: null, face: null, gear: null, background: 'Blue Gradient', special: null })
  assert.match(result.items[0].note, /GLB/)
})
