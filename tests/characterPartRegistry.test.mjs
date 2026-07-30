import test from 'node:test'
import assert from 'node:assert/strict'
import { createCatAssembly } from '../src/core/createCatAssembly.js'

const PARTS = ['body', 'head', 'ear-left', 'ear-right', 'arm-left', 'arm-right', 'leg-left', 'leg-right', 'tail', 'gear-root']
const SOCKETS = ['head-top', 'face-eyes', 'chest-front', 'back', 'paw-left']

test('character assembly exposes registered parts and semantic sockets', () => {
  const assembly = createCatAssembly({ tokenId: '3' })
  try {
    assert.deepEqual([...assembly.registry.partNames].sort(), [...PARTS].sort())
    assert.deepEqual(assembly.registry.socketNames, SOCKETS)
    assert.deepEqual(assembly.root.userData.socketNames, SOCKETS)
    for (const name of PARTS) assert.equal(assembly.parts[name]?.isObject3D, true, name)
    for (const name of SOCKETS) assert.equal(assembly.sockets[name]?.isObject3D, true, name)
    assert.equal(assembly.parts['ear-left'].name, 'EarLeft')
    assert.equal(assembly.parts['ear-right'].name, 'EarRight')
    assert.ok(assembly.parts['ear-left'].getObjectByName('InnerEarLeft'))
    assert.ok(assembly.parts['ear-right'].getObjectByName('InnerEarRight'))
    assert.equal(assembly.registry.getJoints(assembly.parts['arm-left']).elbow?.isBone, true)
    assert.equal(assembly.registry.getJoints(assembly.parts['leg-right']).ankle?.isBone, true)
    assert.equal(assembly.parts['arm-left'].userData.joints, undefined)
  } finally {
    assembly.dispose()
  }
})

test('registry returns null for unknown parts and sockets', () => {
  const assembly = createCatAssembly({})
  try {
    assert.equal(assembly.registry.getPart('unknown'), null)
    assert.equal(assembly.registry.getSocket('unknown'), null)
  } finally {
    assembly.dispose()
  }
})
