import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  TOKEN_CATALOG_COLUMNS,
  TOKEN_CATALOG_EXCLUSIONS,
  TOKEN_CATALOG_SCHEMA_VERSION,
  decodeTokenCatalogRow,
  validateTokenCatalog,
} from '../src/core/tokenCatalogSchema.js'

const payload = JSON.parse(fs.readFileSync(new URL('../public/data/token-catalog.json', import.meta.url), 'utf8'))

test('generated token catalog matches the supported product scope', () => {
  assert.equal(payload.schemaVersion, TOKEN_CATALOG_SCHEMA_VERSION)
  assert.deepEqual(payload.columns, TOKEN_CATALOG_COLUMNS)
  assert.deepEqual(payload.excluded, TOKEN_CATALOG_EXCLUSIONS)
  assert.equal(payload.count, 9901)
  assert.equal(payload.tokens.length, 9901)
  const ids = new Set(payload.tokens.map(row => row[0]))
  assert.equal(ids.size, 9901)
  assert.equal(ids.has('4768'), false)
  assert.equal(ids.has('0'), true)
  assert.equal(ids.has('9901'), true)
})

test('catalog schema decodes compact rows and reports a self-consistent payload', () => {
  const validation = validateTokenCatalog(payload)
  assert.deepEqual(validation, { valid: true, errors: [] })
  const token = decodeTokenCatalogRow(payload.tokens.find(row => row[0] === '414'))
  assert.deepEqual({
    tokenId: token.tokenId, eyes: token.eyes, face: token.face, fur: token.fur,
    gear: token.gear, background: token.background, special: token.special,
  }, {
    tokenId: '414', eyes: 'Blue Ring', face: 'Wow', fur: 'Calico',
    gear: 'Ramen', background: null, special: 'Realm of Mt.Fuji',
  })
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
