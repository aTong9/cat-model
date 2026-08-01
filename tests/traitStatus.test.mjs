import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeTraitStatuses } from '../src/core/traitStatus.js'

test('audited fur, eyes, face, gear and special report implemented', () => {
  const result = summarizeTraitStatuses({ fur: 'Golden', eyes: 'VR', face: 'Smile', gear: 'Camera', background: null, special: 'Time Traveler' })
  assert.equal(result.implemented, 5)
  assert.equal(result.partial, 0)
  assert.equal(result.blocked, 0)
})

test('background status documents that it is preview-only', () => {
  const result = summarizeTraitStatuses({ fur: null, eyes: null, face: null, gear: null, background: 'Blue Gradient', special: null })
  assert.match(result.items[0].note, /GLB/)
})
