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

test('continuous limbs remain finite through every configured pose', () => {
  const model = new CatModel()
  for (const animation of ['standing', 'sit-splay', 'run', 'jump', 'lie-down', 'sleep', 'wave']) {
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

test('lie down and sleep keep the body low while wave raises the right arm', () => {
  const model = new CatModel()
  for (const pose of ['lie-down', 'sleep']) {
    model.setAnimation(pose)
    model.update(0.8)
    assert.ok(model._bodyGroup.position.y <= -0.2, pose)
    assert.ok(model.group.scale.y < 0.7, pose)
  }
  model.setAnimation('wave')
  model.update(0.3)
  assert.ok(model.group.getObjectByName('ArmRight').rotation.z > 1.5)
  assert.ok(model.group.getObjectByName('ArmLeft').rotation.z < 0)
  model.dispose()
})

test('splay sit lowers the body and opens both legs', () => {
  const model = new CatModel()
  model.setAnimation('sit-splay')
  model.update(0.5)
  const left = model.group.getObjectByName('LegLeft')
  const right = model.group.getObjectByName('LegRight')
  assert.ok(model._bodyGroup.position.y < 0)
  assert.ok(left.rotation.z < -0.5)
  assert.ok(right.rotation.z > 0.5)
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
  assert.equal(Math.abs(left.position.x), 0.34)
  assert.equal(Math.abs(right.position.x), 0.34)
  assert.ok(left.rotation.z < -0.06)
  assert.ok(right.rotation.z > 0.06)

  model.setAnimation('run')
  for (const time of [0, 0.15, 0.3, 0.45]) {
    model.update(time)
    assert.ok(left.rotation.z < -0.05, `run:left:${time}`)
    assert.ok(right.rotation.z > 0.05, `run:right:${time}`)
  }
  model.dispose()
})
