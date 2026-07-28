import test from 'node:test'
import assert from 'node:assert/strict'
import { createLane, createLaneWindow } from '../src/games/crossy/laneGenerator.js'
import { GridHopController } from '../src/games/crossy/GridHopController.js'

test('lane generation is deterministic and starts with safe lanes', () => {
  assert.deepEqual(createLaneWindow(42, 0, 12), createLaneWindow(42, 0, 12))
  assert.equal(createLane(0, 42).type, 'safe')
  assert.equal(createLane(1, 42).type, 'safe')
  assert.equal(createLane(8, 42).type, 'safe')
})

test('grid controller hops one cell and tracks score', () => {
  const controller = new GridHopController({ hopDuration: 0.2 })
  controller.enqueue('forward')
  controller.update(0.1)
  assert.ok(controller.visual.y > 0)
  controller.update(0.1)
  assert.deepEqual(controller.grid, { x: 0, z: 1 })
  assert.equal(controller.maxForward, 1)
})

test('grid controller rejects bounds and blocked cells', () => {
  const controller = new GridHopController({ columns: 3, hopDuration: 0.1, isBlocked: (x, z) => x === 0 && z === 1 })
  controller.enqueue('forward')
  controller.update(0.1)
  assert.deepEqual(controller.grid, { x: 0, z: 0 })
  controller.enqueue('left'); controller.update(0.1)
  controller.enqueue('left'); controller.update(0.1)
  assert.deepEqual(controller.grid, { x: -1, z: 0 })
})
