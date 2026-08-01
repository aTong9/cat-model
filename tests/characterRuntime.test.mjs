import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHARACTER_LOCOMOTION_STATES,
  CHARACTER_RUNTIME_VERSION,
  createCharacterRuntime,
} from '../src/character/runtime/CharacterRuntime.js'

test('runtime creates the shared assembly with collider, probes and LOD contract', () => {
  const runtime = createCharacterRuntime({ tokenId: '414', fur: 'Calico' })
  try {
    assert.equal(runtime.root, runtime.assembly.root)
    assert.equal(runtime.root.userData.runtime.version, CHARACTER_RUNTIME_VERSION)
    assert.equal(runtime.root.userData.runtime.collider.type, 'capsule')
    assert.equal(runtime.getLod(3).id, 'LOD0')
    assert.equal(runtime.getLod(12).id, 'LOD1')
    assert.equal(runtime.getLod(200).id, 'LOD2')
  } finally { runtime.dispose() }
})

test('runtime maps normalized input to deterministic locomotion states', () => {
  const runtime = createCharacterRuntime()
  try {
    assert.deepEqual(CHARACTER_LOCOMOTION_STATES, ['idle', 'walk', 'run', 'jump', 'fall', 'land'])
    assert.equal(runtime.applyInput({ x: 1 }, 1 / 60).state, 'walk')
    assert.equal(runtime.applyInput({ z: 1, sprinting: true }, 1 / 60).state, 'run')
    assert.equal(runtime.applyInput({ jump: true }, 1 / 60).state, 'jump')
    for (let index = 0; index < 30; index++) runtime.applyInput({}, 1 / 60)
    assert.equal(runtime.state, 'fall')
    runtime.setGrounded(true)
    assert.equal(runtime.state, 'land')
    assert.equal(runtime.velocity.y, 0)
  } finally { runtime.dispose() }
})

test('runtime and GLB pipeline consume the same animation document contract', () => {
  const runtime = createCharacterRuntime()
  try {
    const document = {
      id: 'nod', duration: 0.5, loop: false,
      tracks: [{ channel: 'head', property: 'rotation', keyframes: [
        { time: 0, value: [0, 0, 0] }, { time: 0.5, value: [0.2, 0, 0] },
      ] }],
    }
    const runtimeClip = runtime.playAnimationDocument(document)
    const exportClip = runtime.assembly.model.createExportAnimationClips({ include: [], customDocuments: [{ ...document, schemaVersion: 1 }] })[0]
    assert.deepEqual(runtimeClip.tracks.map(track => track.name), exportClip.tracks.map(track => track.name))
  } finally { runtime.dispose() }
})
