import test from 'node:test'
import assert from 'node:assert/strict'
import { CatModel } from '../src/three/CatModel.js'

test('arms and legs use continuous skinned surfaces with three-bone chains', () => {
  const model = new CatModel()
  const surfaces = []
  model.group.traverse(object => {
    if (object.isSkinnedMesh && /ContinuousSurface$/.test(object.name)) surfaces.push(object)
  })
  assert.equal(surfaces.length, 4)
  surfaces.forEach(surface => {
    assert.equal(surface.skeleton.bones.length, 3)
    assert.ok(surface.geometry.getAttribute('skinIndex'))
    assert.ok(surface.geometry.getAttribute('skinWeight'))
  })
  model.dispose()
})

test('default arms expose embedded shoulder blends and attachment contracts', () => {
  const model = new CatModel()
  try {
    for (const [name, socket] of [['ArmLeft', 'shoulder-left'], ['ArmRight', 'shoulder-right']]) {
      const arm = model.group.getObjectByName(name)
      const blend = model.group.getObjectByName(`${name}ShoulderBlend`)
      assert.ok(blend?.isMesh, name)
      assert.equal(arm.userData.attachment.parentId, 'body')
      assert.equal(arm.userData.attachment.parentSocket, socket)
      assert.equal(arm.userData.attachment.contactType, 'embedded')
      assert.ok(arm.userData.attachment.embedDepth >= 0.1)
      assert.ok(arm.userData.attachment.gapTolerance <= 0.01)
    }
  } finally {
    model.dispose()
  }
})

test('continuous limbs remain finite through every configured pose', () => {
  const model = new CatModel()
  for (const animation of ['standing', 'sit', 'run', 'jump', 'curious', 'stretch', 'wave']) {
    model.setAnimation(animation)
    model.update(0.75)
    model.group.updateMatrixWorld(true)
    model.group.traverse(object => {
      if (!object.isBone) return
      assert.ok(object.matrixWorld.elements.every(Number.isFinite), `${animation}:${object.name}`)
    })
  }
  model.dispose()
})

test('animator owns normalized pose and bounded run-speed state', () => {
  const model = new CatModel()
  model.setAnimation('idle')
  model.setRunSpeed(99)
  assert.equal(model.animator.mode, 'standing')
  assert.equal(model.animator.runSpeed, 2.5)
  model.setRunSpeed(0)
  assert.equal(model.animator.runSpeed, 1)
  model.dispose()
})

test('animator exposes a validated strategy registration contract', () => {
  const model = new CatModel()
  let updatedAt = null
  model.animator.registerStrategy('custom-test', time => { updatedAt = time })
  assert.equal(model.animator.hasStrategy('custom-test'), true)
  model.animator.mode = 'custom-test'
  model.update(1.25)
  assert.equal(updatedAt, 1.25)
  assert.throws(() => model.animator.registerStrategy('', () => {}), /Invalid animation strategy/)
  assert.throws(() => model.animator.registerStrategy('broken', null), /Invalid animation strategy/)
  model.dispose()
})

test('pose switching resets transforms through the explicit animation rig', () => {
  const model = new CatModel()
  assert.notEqual(model.animationRig, model)
  assert.equal(model.animationRig.parts.armRight, model.registry.getPart('arm-right'))
  model.setAnimation('curious')
  model.update(0.8)
  assert.notEqual(model.animationRig.parts.head.rotation.y, 0)
  model.animator.registerStrategy('reset-probe', () => {})
  model.animator.mode = 'reset-probe'
  model.update(1)
  assert.deepEqual(model.animationRig.parts.head.rotation.toArray(), [0, 0, 0, 'XYZ'])
  assert.deepEqual(model.animationRig.parts.armRight.rotation.toArray(), [0, 0, 0, 'XYZ'])
  assert.equal(model.animationRig.parts.body.position.y, 0)
  model.dispose()
})

test('safe static poses preserve body proportions while changing joints', () => {
  const model = new CatModel()
  for (const pose of ['sit', 'curious', 'stretch']) {
    model.setAnimation(pose)
    model.update(0.8)
    assert.deepEqual(model.group.scale.toArray(), [1, 1, 1], pose)
    assert.equal(model._bodyGroup.position.y, 0, pose)
  }
  model.setAnimation('wave')
  model.update(0.3)
  assert.ok(model.group.getObjectByName('ArmRight').rotation.z > 1.5)
  assert.ok(model.group.getObjectByName('ArmLeft').rotation.z < 0)
  model.dispose()
})

test('sit bends both knees without splaying or scaling the body', () => {
  const model = new CatModel()
  model.setAnimation('sit')
  model.update(0.5)
  const left = model.group.getObjectByName('LegLeft')
  const right = model.group.getObjectByName('LegRight')
  assert.equal(model._bodyGroup.position.y, 0)
  assert.ok(left.rotation.z > -0.25)
  assert.ok(right.rotation.z < 0.25)
  assert.ok(model.registry.getJoints('leg-left').knee.rotation.x > 0.7)
  assert.ok(model.registry.getJoints('leg-right').knee.rotation.x > 0.7)
  model.dispose()
})

test('continuous limb surfaces follow fur trait changes', () => {
  const model = new CatModel()
  model.setFurTrait('Midnight Black', '#222222')
  const colors = []
  model.group.traverse(object => {
    if (object.isSkinnedMesh && /ContinuousSurface$/.test(object.name)) colors.push(object.material.color.getHexString())
  })
  assert.equal(new Set(colors).size, 1)
  assert.notEqual(colors[0], 'f4c430')
  model.dispose()
})

test('idle and run embed shoulders while hands flare slightly outward', () => {
  const model = new CatModel()
  const left = model.group.getObjectByName('ArmLeft')
  const right = model.group.getObjectByName('ArmRight')

  model.setAnimation('idle')
  model.update(0.7)
  assert.equal(Math.abs(left.position.x), 0.40)
  assert.equal(Math.abs(right.position.x), 0.40)
  assert.equal(left.rotation.z, -0.035)
  assert.equal(right.rotation.z, 0.035)

  model.setAnimation('run')
  for (const time of [0, 0.15, 0.3, 0.45]) {
    model.update(time)
    assert.ok(left.rotation.z < -0.05, `run:left:${time}`)
    assert.ok(right.rotation.z > 0.05, `run:right:${time}`)
  }
  model.dispose()
})
