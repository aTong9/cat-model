import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { CatModel } from '../src/three/CatModel.js'
import { BUILTIN_EXPORT_ANIMATIONS, POSE_CHANNELS, applyPose, capturePose, createPoseDocument, poseDocumentToClip, reduceQuaternionTrack, upsertPoseKeyframe } from '../src/character/animation/poseAuthoring.js'

test('pose API exposes stable editable channels and round-trips rotations', () => {
  const model = new CatModel()
  try {
    assert.equal(POSE_CHANNELS.length, 53)
    assert.ok(POSE_CHANNELS.some(channel => channel.id === 'face/brow-left'))
    assert.ok(POSE_CHANNELS.some(channel => channel.id === 'face/brow-right'))
    const pose = capturePose(model.registry)
    pose['arm-right/elbow'] = [.4, .1, -.2]
    applyPose(model.registry, pose)
    assert.deepEqual(model.registry.getJoints('arm-right').elbow.rotation.toArray().slice(0, 3), [.4, .1, -.2])
  } finally { model.dispose() }
})

test('pose API exposes every hand and foot digit for custom animation export', () => {
  const model = new CatModel()
  try {
    const channelIds = new Set(POSE_CHANNELS.map(channel => channel.id))
    for (const side of ['left', 'right']) {
      for (const digit of ['thumb', 'index', 'middle', 'ring', 'little']) {
        assert.ok(channelIds.has(`arm-${side}/${digit}`))
        assert.ok(channelIds.has(`arm-${side}/${digit}-distal`))
      }
      for (let index = 1; index <= 5; index++) {
        assert.ok(channelIds.has(`leg-${side}/toe${index}`))
      }
    }
    const poseA = capturePose(model.registry)
    const poseB = structuredClone(poseA)
    poseB['arm-left/index'] = [.7, 0, 0]
    poseB['arm-left/index-distal'] = [.5, 0, 0]
    let document = createPoseDocument({ id: 'finger-wave', duration: 1 })
    document = upsertPoseKeyframe(document, 0, poseA)
    document = upsertPoseKeyframe(document, 1, poseB)
    const names = new Set(poseDocumentToClip(document, model.registry).tracks.map(track => track.name))
    assert.ok(names.has('HandLeftIndexBone.quaternion'))
    assert.ok(names.has('HandLeftIndexDistalBone.quaternion'))
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
    assert.ok(clips.every(clip => clip.tracks.some(track => track.name === 'CharacterMotion.position')))
  } finally { model.dispose() }
})

test('backflip bakes a full root rotation and airborne trajectory', () => {
  const model = new CatModel()
  try {
    const [clip] = model.createExportAnimationClips({
      fps: 24,
      include: [{ id: 'emoji-backflip', name: 'Backflip', duration: 1.4, loop: false }],
    })
    const rotation = clip.tracks.find(track => track.name === 'CharacterMotion.quaternion')
    const position = clip.tracks.find(track => track.name === 'CharacterMotion.position')
    assert.ok(rotation)
    assert.ok(position)
    const heights = Array.from({ length: position.values.length / 3 }, (_, index) => position.values[index * 3 + 1])
    assert.ok(Math.max(...heights) - Math.min(...heights) > .25)
    assert.ok(rotation.times.length >= 3)
  } finally { model.dispose() }
})

test('abs action is a reclined crunch instead of an in-place body pulse', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-abs')
    model.update(.45)
    const motion = model.registry.getPart('motion-root')
    assert.ok(motion.rotation.x > .35 && motion.rotation.x < .65)
    assert.ok(motion.position.z < -.1)
    assert.ok(model.registry.getJoints('leg-left').knee.rotation.x > .8)
    assert.ok(Math.abs(model.registry.getJoints('leg-left').ankle.rotation.y - Math.PI) < 1e-9)
    assert.ok(Math.abs(model.registry.getJoints('leg-right').ankle.rotation.y - Math.PI) < 1e-9)
  } finally { model.dispose() }
})

test('procedural action exports preserve authored limb translations', () => {
  const model = new CatModel()
  try {
    const clips = model.createExportAnimationClips({
      fps: 12,
      include: [
        { id: 'emoji-yoga', name: 'Yoga', duration: 1.8, loop: true },
        { id: 'emoji-so-cold', name: 'Cold', duration: 1.64, loop: true },
      ],
    })
    const yogaLeg = clips[0].tracks.find(track => track.name === 'LegLeft.position')
    const coldArm = clips[1].tracks.find(track => track.name === 'ArmLeft.position')
    assert.ok(yogaLeg)
    assert.ok(coldArm)
    const yogaHeights = Array.from({ length: yogaLeg.values.length / 3 }, (_, index) => yogaLeg.values[index * 3 + 1])
    const yogaRestY = model.registry.getPart('leg-left').userData.restPosition[1]
    assert.ok(Math.max(...yogaHeights) > yogaRestY + .15)
    const coldXs = Array.from({ length: coldArm.values.length / 3 }, (_, index) => coldArm.values[index * 3])
    const coldYs = Array.from({ length: coldArm.values.length / 3 }, (_, index) => coldArm.values[index * 3 + 1])
    assert.ok(coldXs.every(value => Math.abs(value + .12) < 1e-4))
    assert.ok(coldYs.every(value => Math.abs(value - .32) < 1e-4))
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
