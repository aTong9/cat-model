import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const summary = JSON.parse(fs.readFileSync(new URL('../public/audit/full-audit-summary.json', import.meta.url), 'utf8'))
const representatives = JSON.parse(fs.readFileSync(new URL('../public/audit/representative-review.json', import.meta.url), 'utf8'))
const thumbnails = JSON.parse(fs.readFileSync(new URL('../public/audit/thumbnail-index.json', import.meta.url), 'utf8'))

test('frozen full-token audit reaches every zero-failure acceptance target', () => {
  assert.equal(summary.generatorVersion, '3.0.0')
  assert.equal(summary.generatorVersionFrozen, true)
  for (const field of ['total', 'normalized', 'assembled', 'rendered', 'metadataMatched']) {
    assert.equal(summary[field], 9901, field)
  }
  for (const field of [
    'missingAssets', 'invalidBounds', 'detachedSockets', 'cameraClipping',
    'transparentOutputFailures', 'resourceLeaks', 'exportFailures', 'unexplainedVisualExceptions',
  ]) assert.equal(summary[field], 0, field)
  assert.deepEqual(summary.failureClusters, [])
  assert.deepEqual(summary.tokenSpecificExceptions, [])
})

test('all audit thumbnails and CatTraits records are materialized', () => {
  assert.equal(thumbnails.length, 9901)
  assert.equal(new Set(thumbnails.map(item => item.tokenId)).size, 9901)
  for (const item of thumbnails) {
    assert.equal(fs.existsSync(new URL(`../public/${item.thumbnail}`, import.meta.url)), true, item.tokenId)
  }
  const traitLines = fs.readFileSync(new URL('../public/audit/token-traits.jsonl', import.meta.url), 'utf8').trim().split('\n')
  assert.equal(traitLines.length, 9901)
  assert.equal(JSON.parse(traitLines[0]).generatorVersion, '3.0.0')
})

test('representative gate pairs 133 tokens with four views and original 2D evidence', () => {
  assert.equal(representatives.length, 133)
  for (const item of representatives) {
    assert.deepEqual(item.views, ['front', 'three-quarter', 'side', 'back'])
    assert.match(item.source2d, /^liberty_cats_download\/images\/\d+\.(png|webp)$/)
    assert.equal(item.humanReview.status, 'ready')
    assert.ok(Object.values(item.checks).every(status => ['automated-pass', 'not-applicable'].includes(status)))
  }
})
