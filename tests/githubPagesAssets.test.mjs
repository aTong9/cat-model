import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const catalog = JSON.parse(fs.readFileSync(new URL('../public/data/token-catalog.json', import.meta.url), 'utf8'))
const byId = new Map(catalog.tokens.map(row => [row[0], row]))

test('packaged NFT image extensions match their WebP encoding', () => {
  for (const tokenId of ['0', '414', '3000']) {
    const row = byId.get(tokenId)
    assert.equal(row[7], 'webp')
    const image = fs.readFileSync(new URL(`../public/liberty_cats_download/images/${tokenId}.webp`, import.meta.url))
    assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF')
    assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP')
  }
})
