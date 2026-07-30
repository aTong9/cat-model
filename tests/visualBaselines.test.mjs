import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const files = ['seed-414-front.jpg', 'seed-414-side.jpg', 'seed-414-back.jpg', 'mobile-390x844.jpg']

test('fixed-seed desktop and mobile visual baselines are valid JPEG artifacts', async () => {
  for (const file of files) {
    const bytes = await readFile(new URL(`../docs/baselines/${file}`, import.meta.url))
    assert.deepEqual([...bytes.subarray(0, 3)], [255, 216, 255], file)
    assert.deepEqual([...bytes.subarray(-2)], [255, 217], file)
    assert.ok(bytes.byteLength > 10000, `${file}:too-small`)
  }
})
