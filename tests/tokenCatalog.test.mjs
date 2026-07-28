import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const payload = JSON.parse(fs.readFileSync(new URL('../public/data/token-catalog.json', import.meta.url), 'utf8'))

test('generated token catalog matches the supported product scope', () => {
  assert.equal(payload.schemaVersion, 1)
  assert.equal(payload.count, 9901)
  assert.equal(payload.tokens.length, 9901)
  const ids = new Set(payload.tokens.map(row => row[0]))
  assert.equal(ids.size, 9901)
  assert.equal(ids.has('4768'), false)
  assert.equal(ids.has('0'), true)
  assert.equal(ids.has('9901'), true)
})

test('every catalog row has a local image extension and valid traits', () => {
  for (const row of payload.tokens) {
    assert.equal(row.length, 9)
    assert.match(row[0], /^\d+$/)
    assert.match(row[7], /^(png|webp)$/)
    assert.match(row[8], /^https:\/\//)
    assert.ok(row[2] || row[6], `token ${row[0]} must have a face or special trait`)
  }
})
