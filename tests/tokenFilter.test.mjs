import test from 'node:test'
import assert from 'node:assert/strict'
import { countTokenFilterOptions, filterTokenCatalog } from '../src/data/tokenCatalog.js'

const tokens = [
  { tokenId: '1', fur: 'Golden', eyes: 'Original', gear: null },
  { tokenId: '2', fur: 'Black', eyes: 'Relaxed', gear: 'Camera' },
  { tokenId: '3', fur: 'Black', eyes: 'Original', gear: 'Camera' },
]

test('token filters combine traits and report total before rendering limit', () => {
  assert.deepEqual(filterTokenCatalog(tokens, { fur: 'Black', gear: 'Camera' }, 1), { total: 2, tokens: [tokens[1]] })
  assert.deepEqual(filterTokenCatalog(tokens, { fur: 'Black', eyes: 'Original' }), { total: 1, tokens: [tokens[2]] })
})

test('empty filters preserve catalog order', () => {
  assert.deepEqual(filterTokenCatalog(tokens, {}, 2), { total: 3, tokens: tokens.slice(0, 2) })
})

test('mutually exclusive background and special filters produce no guessed matches', () => {
  const special = [{ tokenId: '9', background: null, special: 'Time Traveler' }]
  assert.equal(filterTokenCatalog(special, { background: 'Blue Gradient', special: 'Time Traveler' }).total, 0)
})

test('facet counts ignore their own filter and respect every other active filter', () => {
  const counts = countTokenFilterOptions(tokens, { fur: 'Black', eyes: 'Original' }, 'fur')
  assert.equal(counts.get('Golden'), 1)
  assert.equal(counts.get('Black'), 1)
  assert.equal(counts.size, 2)
})
