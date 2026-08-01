import test from 'node:test'
import assert from 'node:assert/strict'
import { CatModel } from '../src/three/CatModel.js'
import { HAND_DIGIT_KEYS, FOOT_DIGIT_KEYS, applyHandGesture } from '../src/character/limbs/createCatPaws.js'

test('both hands and feet expose five stable articulated digits', () => {
  const model = new CatModel()
  try {
    for (const partId of ['arm-left', 'arm-right']) {
      const joints = model.registry.getJoints(partId)
      HAND_DIGIT_KEYS.forEach(key => {
        assert.ok(joints[key]?.isBone, `${partId}/${key}`)
        assert.ok(joints[`${key}Distal`]?.isBone, `${partId}/${key}Distal`)
      })
    }
    for (const partId of ['leg-left', 'leg-right']) {
      const joints = model.registry.getJoints(partId)
      FOOT_DIGIT_KEYS.forEach(key => assert.ok(joints[key]?.isBone, `${partId}/${key}`))
    }
  } finally { model.dispose() }
})

test('hand gestures deform digits without changing the wrist transform', () => {
  const model = new CatModel()
  try {
    const joints = model.registry.getJoints('arm-right')
    const wrist = joints.wrist.rotation.toArray()
    applyHandGesture(joints, 'fist')
    assert.ok(HAND_DIGIT_KEYS.every(key => joints[key].rotation.x > .8))
    assert.ok(HAND_DIGIT_KEYS.every(key => joints[`${key}Distal`].rotation.x > .6))
    assert.deepEqual(joints.wrist.rotation.toArray(), wrist)
    applyHandGesture(joints, 'open')
    assert.ok(HAND_DIGIT_KEYS.every(key => joints[key].rotation.x < 0))
    applyHandGesture(joints, 'peace')
    assert.ok(joints.index.rotation.x < 0 && joints.middle.rotation.x < 0)
    assert.ok(joints.ring.rotation.x > .9 && joints.little.rotation.x > .9)
  } finally { model.dispose() }
})

test('foot digits project forward as five separated toe silhouettes', () => {
  const model = new CatModel()
  try {
    for (const partId of ['leg-left', 'leg-right']) {
      const joints = model.registry.getJoints(partId)
      const xs = FOOT_DIGIT_KEYS.map(key => joints[key].position.x)
      const zs = FOOT_DIGIT_KEYS.map(key => joints[key].position.z)
      assert.equal(new Set(xs.map(value => value.toFixed(3))).size, 5)
      assert.ok(zs.every(value => value > .2))
      assert.ok(model.registry.getPart(partId).getObjectByName(
        `${partId === 'leg-left' ? 'LegLeft' : 'LegRight'}ToeCreases`,
      ))
    }
  } finally { model.dispose() }
})

test('front-facing palms preserve four seams for a readable five-finger paw', () => {
  const model = new CatModel()
  try {
    for (const side of ['Left', 'Right']) {
      const hand = model.group.getObjectByName(`Arm${side}Paw`)
      const palm = model.group.getObjectByName(`Hand${side}Palm`)
      assert.ok(hand)
      assert.ok(palm)
      assert.equal(palm.parent, hand)
      assert.equal(palm.userData.fingerCreases, 4)
      assert.equal(palm.geometry.groups.length, 2)
      assert.equal(Array.isArray(palm.material), true)
    }
  } finally { model.dispose() }
})

test('five hand digits extend beyond the palm and preserve a readable length hierarchy', () => {
  const model = new CatModel()
  try {
    const hand = model.registry.getPart('arm-left').getObjectByName('ArmLeftPaw')
    const palm = hand.getObjectByName('HandLeftPalm')
    const joints = model.registry.getJoints('arm-left')
    const lengths = HAND_DIGIT_KEYS.map(key => {
      const proximal = joints[key].children.find(child => child.isMesh)
      return proximal.geometry.boundingBox ?? (proximal.geometry.computeBoundingBox(), proximal.geometry.boundingBox)
    }).map(box => box.max.y - box.min.y)
    const palmBox = palm.geometry.boundingBox ?? (palm.geometry.computeBoundingBox(), palm.geometry.boundingBox)
    const palmHeight = palmBox.max.y - palmBox.min.y
    assert.ok(lengths.every(length => length > palmHeight * .08))
    assert.ok(lengths[2] > lengths[0])
    assert.ok(lengths[2] > lengths[4])
  } finally { model.dispose() }
})

test('Pack 5 updates assign semantic finger poses', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-boxing')
    model.update(.25)
    assert.ok(model.registry.getJoints('arm-left').middle.rotation.x > 1)
    model.setAnimation('emoji-yoga')
    model.update(.25)
    assert.ok(model.registry.getJoints('arm-left').middle.rotation.x < 0)
    model.setAnimation('emoji-so-cute')
    model.update(.25)
    assert.ok(model.registry.getJoints('arm-left').index.rotation.x > .5)
    assert.ok(model.registry.getJoints('arm-right').middle.rotation.x > .8)
  } finally { model.dispose() }
})
