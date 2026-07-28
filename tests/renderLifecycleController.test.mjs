import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderLifecycleController } from '../src/three/RenderLifecycleController.js'

function eventTarget(extra = {}) {
  const listeners = new Map()
  return {
    ...extra,
    addEventListener(type, handler) { listeners.set(type, handler) },
    removeEventListener(type) { listeners.delete(type) },
    emit(type, event = {}) { listeners.get(type)?.(event) },
    get listenerCount() { return listeners.size },
  }
}

test('visibility pauses and resumes rendering', () => {
  const canvas = eventTarget()
  const documentTarget = eventTarget({ hidden: false })
  const calls = []
  const controller = createRenderLifecycleController({ canvas, documentTarget, onPause: () => calls.push('pause'), onResume: () => calls.push('resume') })
  controller.attach()
  documentTarget.hidden = true
  documentTarget.emit('visibilitychange')
  documentTarget.hidden = false
  documentTarget.emit('visibilitychange')
  assert.deepEqual(calls, ['resume', 'pause', 'resume'])
  controller.dispose()
  assert.equal(canvas.listenerCount, 0)
  assert.equal(documentTarget.listenerCount, 0)
})

test('context loss is prevented and restoration resumes safely', () => {
  const canvas = eventTarget()
  const documentTarget = eventTarget({ hidden: false })
  let prevented = false
  let restored = 0
  const controller = createRenderLifecycleController({ canvas, documentTarget, onContextRestored: () => restored++ })
  controller.attach()
  canvas.emit('webglcontextlost', { preventDefault() { prevented = true } })
  assert.equal(prevented, true)
  assert.equal(controller.active, false)
  canvas.emit('webglcontextrestored')
  assert.equal(controller.active, true)
  assert.equal(restored, 1)
})

test('resize observer is disconnected during cleanup', () => {
  let disconnected = false
  class FakeResizeObserver {
    constructor(callback) { this.callback = callback }
    observe() { this.callback() }
    disconnect() { disconnected = true }
  }
  const controller = createRenderLifecycleController({ canvas: eventTarget(), documentTarget: eventTarget({ hidden: false }), ResizeObserverClass: FakeResizeObserver })
  controller.attach()
  controller.dispose()
  assert.equal(disconnected, true)
})
