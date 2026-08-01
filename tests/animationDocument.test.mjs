import test from 'node:test'
import assert from 'node:assert/strict'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import {
  animationDocumentToClip, blendAnimationDocuments, createAnimationDocument,
  createAnimationTransition, mirrorAnimationDocument,
} from '../src/character/animation/animationDocument.js'
import { createStaticPoseDocument } from '../src/character/animation/poseAuthoring.js'

test('animation documents normalize configurable tracks, parameters and events', () => {
  const document = createAnimationDocument({
    id: 'wave-config',
    duration: 2,
    speed: 2,
    amplitude: 0.5,
    tracks: [{ channel: 'arm-right', property: 'rotation', interpolation: 'smooth', keyframes: [
      { time: 2, value: [1, 0, 0] }, { time: -1, value: [0, 0, 0] },
    ] }],
    events: [{ time: 0.4, type: 'sound', value: 'meow' }],
  })
  assert.equal(document.parameters.speed, 2)
  assert.equal(document.parameters.amplitude, 0.5)
  assert.deepEqual(document.tracks[0].keyframes.map(frame => frame.time), [0, 2])
  assert.equal(Object.isFrozen(document.tracks), true)
})

test('animation documents support mirroring, blending and pose transitions', () => {
  const left = createAnimationDocument({ id: 'left', duration: 1, tracks: [{
    channel: 'arm-left', property: 'rotation', keyframes: [{ time: 0, value: [0, 0, 0] }, { time: 1, value: [1, 0.2, 0.3] }],
  }] })
  const right = mirrorAnimationDocument(left)
  assert.equal(right.tracks[0].channel, 'arm-right')
  assert.deepEqual(right.tracks[0].keyframes[1].value, [-1, 0.2, -0.3])
  const blend = blendAnimationDocuments(left, right, 0.5)
  assert.equal(blend.tracks.length, 2)
  const transition = createAnimationTransition(
    createStaticPoseDocument({ channels: { head: [0, 0, 0] } }),
    createStaticPoseDocument({ channels: { head: [0.2, 0, 0] } }),
  )
  assert.equal(transition.loop, false)
  assert.equal(transition.tracks[0].keyframes.length, 2)
})

test('animation documents compile through semantic registry channels', () => {
  const assembly = createCatAssembly()
  try {
    const clip = animationDocumentToClip({
      id: 'wave-config',
      duration: 2,
      speed: 2,
      amplitude: 0.5,
      rootMotion: false,
      tracks: [{ channel: 'arm-right', property: 'rotation', keyframes: [
        { time: 0, value: [0, 0, 0] }, { time: 2, value: [1, 0, 0] },
      ] }],
      events: [{ time: 0.5, type: 'effect', value: 'spark' }],
    }, assembly.registry)
    assert.equal(clip.duration, 1)
    assert.equal(clip.tracks.length, 1)
    assert.equal(clip.tracks[0].name, 'ArmRight.quaternion')
    assert.equal(clip.userData.events[0].value, 'spark')
  } finally { assembly.dispose() }
})
