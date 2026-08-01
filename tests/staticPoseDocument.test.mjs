import test from 'node:test'
import assert from 'node:assert/strict'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import {
  applyStaticPoseDocument,
  blendStaticPoseDocuments,
  captureStaticPoseDocument,
  createStaticPoseDocument,
  mirrorStaticPoseDocument,
} from '../src/character/animation/poseAuthoring.js'

test('static pose documents normalize, apply and round-trip semantic channels', () => {
  const assembly = createCatAssembly()
  try {
    const document = createStaticPoseDocument({
      id: 'hello',
      channels: { head: [0.1, 0.2, 0.3], unknown: [9, 9, 9], 'arm-left/wrist': [0.4, 0, 0] },
    })
    assert.equal(document.channels.unknown, undefined)
    applyStaticPoseDocument(assembly.registry, document)
    const captured = captureStaticPoseDocument(assembly.registry, { id: 'captured' })
    assert.deepEqual(captured.channels.head.rotation, [0.1, 0.2, 0.3])
    assert.deepEqual(captured.channels['arm-left/wrist'].rotation, [0.4, 0, 0])
  } finally { assembly.dispose() }
})

test('static poses support deterministic mirroring and blending', () => {
  const left = createStaticPoseDocument({ id: 'left', channels: { 'arm-left': [0.2, 0.3, 0.4] } })
  const mirrored = mirrorStaticPoseDocument(left)
  assert.deepEqual(mirrored.channels['arm-right'].rotation, [-0.2, 0.3, -0.4])
  const blended = blendStaticPoseDocuments(left, mirrored, 0.25)
  assert.deepEqual(blended.channels['arm-left'].rotation, [0.15000000000000002, 0.22499999999999998, 0.30000000000000004])
  assert.deepEqual(blended.channels['arm-right'].rotation, [-0.05, 0.075, -0.1])
})

test('static pose documents clamp unsafe joint transforms', () => {
  const document = createStaticPoseDocument({ channels: {
    head: { rotation: [99, -99, 0], position: [20, 0, -20], scale: [0, 2, 99] },
  } })
  assert.deepEqual(document.channels.head.rotation, [Math.PI, -Math.PI, 0])
  assert.deepEqual(document.channels.head.position, [5, 0, -5])
  assert.deepEqual(document.channels.head.scale, [0.1, 2, 4])
})
