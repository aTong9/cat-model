import test from 'node:test'
import assert from 'node:assert/strict'
import { createCharacterInputController } from '../src/three/CharacterInputController.js'

function createEventTarget() {
  const listeners = new Map()
  return {
    addEventListener(type, handler) { listeners.set(type, handler) },
    removeEventListener(type) { listeners.delete(type) },
    emit(type, event) { listeners.get(type)?.(event) },
    get listenerCount() { return listeners.size },
  }
}

test('keyboard movement and jump are normalized into frame input', () => {
  const target = createEventTarget()
  const input = createCharacterInputController(target)
  input.attach()
  target.emit('keydown', { code: 'KeyW', target: {}, preventDefault() {} })
  target.emit('keydown', { code: 'ShiftLeft', target: {}, preventDefault() {} })
  target.emit('keydown', { code: 'Space', target: {}, repeat: false, preventDefault() {} })
  assert.deepEqual(input.consumeFrame(), { x: 0, z: -1, sprinting: true, sneaking: false, jump: true })
  assert.equal(input.consumeFrame().jump, false)
  target.emit('keyup', { code: 'KeyW' })
  assert.equal(input.isMoving, false)
  input.dispose()
  assert.equal(target.listenerCount, 0)
})

test('virtual controls share the keyboard frame contract', () => {
  const input = createCharacterInputController()
  input.setVirtualDirection(0.75, -0.5)
  input.setVirtualAction('sneak', true)
  input.setVirtualAction('jump', true)
  assert.deepEqual(input.consumeFrame(), { x: 0.75, z: -0.5, sprinting: false, sneaking: true, jump: true })
})

test('typing in a form field does not move the character', () => {
  const target = createEventTarget()
  const input = createCharacterInputController(target)
  input.attach()
  target.emit('keydown', { code: 'KeyW', target: { tagName: 'INPUT' } })
  assert.equal(input.isMoving, false)
})
