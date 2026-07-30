import test from 'node:test'
import assert from 'node:assert/strict'
import { captureOutput, captureViewSet } from '../src/export/captureCanvasOutputs.js'
import { QUALITY_BASELINE, validateQualityBaseline } from '../src/export/qualityBaseline.js'

test('canvas output profiles and three-view capture are deterministic', async () => {
  const canvas = { toBlob: callback => callback(new Blob(['png'], { type: 'image/png' })) }
  const visited = []
  const views = await captureViewSet(canvas, { setView: view => visited.push(view), wait: async () => {} })
  assert.deepEqual(visited, ['front', 'side', 'back'])
  assert.equal(views.every(item => item.blob.type === 'image/png'), true)
  canvas.width = 800; canvas.height = 600
  const calls = []
  const output = { toBlob: callback => callback(new Blob(['png'], { type: 'image/png' })), getContext: () => ({ fillRect: (...args) => calls.push(['fill', ...args]), drawImage: (...args) => calls.push(['draw', ...args]) }) }
  const social = await captureOutput(canvas, 'social', { createCanvas: () => output })
  assert.equal(social.spec.width, 1080)
  assert.deepEqual([output.width, output.height], [1080, 1080])
  assert.equal(calls[0][0], 'fill')
  calls.length = 0
  const transparent = await captureOutput(canvas, 'transparent', { createCanvas: () => output })
  assert.equal(transparent.spec.alpha, true)
  assert.equal(calls.some(call => call[0] === 'fill'), false)
  assert.equal(validateQualityBaseline(QUALITY_BASELINE).valid, true)
})
