import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { CatModel } from '../src/three/CatModel.js'
import { BUILTIN_EXPORT_ANIMATIONS, POSE_CHANNELS, applyPose, capturePose, createPoseDocument, poseDocumentToClip, reduceQuaternionTrack, upsertPoseKeyframe } from '../src/character/animation/poseAuthoring.js'

test('pose API exposes stable editable channels and round-trips rotations', () => {
  const model = new CatModel()
  try {
    assert.equal(POSE_CHANNELS.length, 15)
    const pose = capturePose(model.registry)
    pose['arm-right/elbow'] = [.4, .1, -.2]
    applyPose(model.registry, pose)
    assert.deepEqual(model.registry.getJoints('arm-right').elbow.rotation.toArray().slice(0, 3), [.4, .1, -.2])
  } finally { model.dispose() }
})

test('custom pose documents become portable quaternion clips', () => {
  const model = new CatModel()
  try {
    let document = createPoseDocument({ id: 'UserWave', duration: 1 })
    const poseA = capturePose(model.registry)
    const poseB = structuredClone(poseA)
    poseB['arm-right'][2] = 1.4
    document = upsertPoseKeyframe(document, 0, poseA)
    document = upsertPoseKeyframe(document, 1, poseB)
    const clip = poseDocumentToClip(document, model.registry)
    assert.equal(clip.name, 'UserWave')
    assert.equal(clip.duration, 1)
    assert.ok(clip.tracks.some(track => track.name === 'ArmRight.quaternion'))
  } finally { model.dispose() }
})

test('built-in export templates bake through the same generic clip pipeline', () => {
  const model = new CatModel()
  try {
    const clips = model.createExportAnimationClips({ fps: 12 })
    assert.deepEqual(clips.map(clip => clip.name), BUILTIN_EXPORT_ANIMATIONS.map(item => item.name))
    clips.forEach(clip => { assert.ok(clip.duration > 0); assert.ok(clip.tracks.length > 0) })
    assert.ok(clips.every(clip => clip.tracks.some(track => track.name === 'Head.quaternion')))
  } finally { model.dispose() }
})

test('quaternion reduction preserves endpoints while removing redundant samples', () => {
  const times = Array.from({ length: 31 }, (_, index) => index / 30)
  const values = times.flatMap(time => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.sin(time * Math.PI * 2) * .2)).toArray())
  const source = new THREE.QuaternionKeyframeTrack('Head.quaternion', times, values)
  const reduced = reduceQuaternionTrack(source)
  assert.ok(reduced.times.length < source.times.length)
  assert.equal(reduced.times[0], source.times[0])
  assert.equal(reduced.times.at(-1), source.times.at(-1))
})
