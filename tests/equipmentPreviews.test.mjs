import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { GEAR_TRAITS } from '../src/config/traits.js'

test('all ten equipment choices expose a bundled image preview', () => {
  assert.equal(GEAR_TRAITS.length, 10)
  for (const gear of GEAR_TRAITS) {
    assert.match(gear.preview, /^\/equipment\/[A-Za-z]+\.png$/)
    assert.equal(fs.existsSync(new URL(`../public${gear.preview}`, import.meta.url)), true, gear.id)
  }
})
