import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderQualityController, resolveQualityProfile } from '../src/three/RenderQualityController.js'

test('auto quality selects a profile from viewport and memory', () => {
  assert.equal(resolveQualityProfile('auto', { width: 390, deviceMemory: 8 }).id, 'balanced')
  assert.equal(resolveQualityProfile('auto', { width: 1280, deviceMemory: 2 }).id, 'performance')
  assert.equal(resolveQualityProfile('auto', { width: 1440, deviceMemory: 8 }).id, 'high')
})

test('quality mode applies bounded pixel ratio and shadows', () => {
  const calls = []
  const renderer = { setPixelRatio(value) { calls.push(value) }, shadowMap: { enabled: true, needsUpdate: false } }
  const controller = createRenderQualityController({ renderer, capabilities: { width: 390, deviceMemory: 8, devicePixelRatio: 3 } })
  assert.equal(controller.setMode('auto').id, 'balanced')
  assert.equal(calls.at(-1), 1.5)
  controller.setMode('performance')
  assert.equal(calls.at(-1), 1)
  assert.equal(renderer.shadowMap.enabled, false)
})

test('frame gate follows the selected target frame rate', () => {
  const renderer = { setPixelRatio() {}, shadowMap: {} }
  const controller = createRenderQualityController({ renderer })
  controller.setMode('performance')
  assert.equal(controller.shouldRender(0), true)
  assert.equal(controller.shouldRender(16), false)
  assert.equal(controller.shouldRender(34), true)
})

test('auto mode responds to viewport changes while manual mode stays fixed', () => {
  const renderer = { setPixelRatio() {}, shadowMap: {} }
  const controller = createRenderQualityController({ renderer, capabilities: { width: 1200, deviceMemory: 8 } })
  controller.setMode('auto')
  assert.equal(controller.profile.id, 'high')
  controller.updateCapabilities({ width: 390 })
  assert.equal(controller.profile.id, 'balanced')
  controller.setMode('high')
  controller.updateCapabilities({ width: 320 })
  assert.equal(controller.profile.id, 'high')
})
