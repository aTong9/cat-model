import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { CatModel } from '../src/three/CatModel.js'

const PROP_ACTIONS = [
  'emoji-jump-rope', 'emoji-dumbbells', 'emoji-pull-up', 'emoji-bench-press',
  'emoji-hula-hoop', 'emoji-boxing', 'emoji-yoga', 'emoji-foodie', 'emoji-snowboarding',
  'emoji-snow-fight', 'emoji-snowball', 'emoji-so-comfy',
]

test('Pack 5 semantic actions expose independent exportable props', () => {
  const model = new CatModel()
  try {
    assert.equal(model.actionProps.root.parent, model.registry.getPart('motion-root'))
    assert.equal(model.actionProps.worldRoot.parent, model.root)
    assert.equal(model.actionProps.root.userData.exportable, true)
    assert.equal(model.actionProps.props['emoji-pull-up'].parent, model.actionProps.worldRoot)
    assert.equal(model.actionProps.props['emoji-bench-press'].parent, model.actionProps.worldRoot)
    assert.equal(model.actionProps.props['emoji-snowboarding'].parent, model.actionProps.root)
    for (const id of PROP_ACTIONS) {
      model.setAnimation(id)
      model.update(.37)
      assert.equal(model.actionProps.currentId, id)
      assert.equal(model.actionProps.props[id].visible, true)
      assert.ok(model.actionProps.props[id].children.some(child => child.isMesh || child.children.length))
    }
  } finally { model.dispose() }
})

test('jump rope endpoints follow both wrists while the cord sweeps through depth', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-jump-rope')
    model.update(.31)
    model.root.updateMatrixWorld(true)
    const prop = model.actionProps.props['emoji-jump-rope']
    const positions = prop.userData.cord.geometry.getAttribute('position')
    for (const [handleIndex, index, partId] of [[0, 0, 'arm-left'], [1, positions.count - 1, 'arm-right']]) {
      const expected = model.registry.getJoints(partId).wrist.localToWorld(new THREE.Vector3(0, -.11, .08))
      const actual = prop.localToWorld(new THREE.Vector3(positions.getX(index), positions.getY(index), positions.getZ(index)))
      assert.ok(actual.distanceTo(expected) < 1e-5, partId)
      const handle = prop.userData.handles[handleIndex].getWorldPosition(new THREE.Vector3())
      assert.ok(handle.distanceTo(expected) < 1e-5, `${partId} handle`)
    }
    assert.equal(prop.userData.handles[0].name, 'JumpRope_HandleLeft')
    assert.equal(prop.userData.handles[1].name, 'JumpRope_HandleRight')
    assert.ok(Math.abs(positions.getZ(Math.floor(positions.count / 2))) > .1)
    const leftAnkle = model.registry.getJoints('leg-left').ankle.getWorldPosition(new THREE.Vector3())
    const rightAnkle = model.registry.getJoints('leg-right').ankle.getWorldPosition(new THREE.Vector3())
    assert.ok(Math.abs(leftAnkle.y - rightAnkle.y) > .015)
  } finally { model.dispose() }
})

test('snowboard follows ankle midpoint across morphology changes', () => {
  const model = new CatModel()
  try {
    for (const legLength of [.75, 1.3]) {
      model.setMorphology({ legLength })
      model.setAnimation('emoji-snowboarding')
      model.update(.42)
      model.root.updateMatrixWorld(true)
      const left = model.registry.getJoints('leg-left').ankle.localToWorld(new THREE.Vector3(0, -.08, .08))
      const right = model.registry.getJoints('leg-right').ankle.localToWorld(new THREE.Vector3(0, -.08, .08))
      const expectedX = (left.x + right.x) / 2
      const actual = model.actionProps.props['emoji-snowboarding'].getWorldPosition(new THREE.Vector3())
      assert.ok(Math.abs(actual.x - expectedX) < .002)
    }
  } finally { model.dispose() }
})

test('yoga is a one-leg balance with the lifted paw clearly above the support paw', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-yoga')
    model.update(.45)
    model.root.updateMatrixWorld(true)
    const lifted = model.registry.getJoints('leg-left').ankle.getWorldPosition(new THREE.Vector3())
    const support = model.registry.getJoints('leg-right').ankle.getWorldPosition(new THREE.Vector3())
    assert.ok(lifted.y > support.y + .055)
    assert.ok(lifted.x < support.x - .40)
    const mat = model.actionProps.props['emoji-yoga']
    const matTop = mat.getWorldPosition(new THREE.Vector3()).y + .05
    assert.ok(Math.abs(matTop - (support.y - .43)) < .03)
  } finally { model.dispose() }
})

test('pull-up wrists stay on fixed world grips while the body rises', () => {
  const model = new CatModel()
  try {
    const wristHeights = []
    for (const bodyScale of [.75, 1.25]) {
      model.setMorphology({ bodyScale, pawScale: bodyScale })
      model.setAnimation('emoji-pull-up')
      model.update(.45)
      model.root.updateMatrixWorld(true)
      for (const partId of ['arm-left', 'arm-right']) {
        const wrist = model.registry.getJoints(partId).wrist.getWorldPosition(new THREE.Vector3())
        wristHeights.push(wrist.y)
        assert.ok(wrist.y > 1.08, `${partId} height @ ${bodyScale}`)
        assert.ok(Math.abs(wrist.x) < .52, `${partId} grip width @ ${bodyScale}`)
      }
      assert.ok(model.registry.getPart('motion-root').position.y > .98)
    }
    assert.ok(Math.max(...wristHeights) - Math.min(...wristHeights) < .04)
  } finally { model.dispose() }
})

test('non-prop actions clear all semantic props', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-hula-hoop')
    model.update(.2)
    model.setAnimation('standing')
    model.update(.3)
    assert.equal(model.actionProps.currentId, null)
    assert.ok(Object.values(model.actionProps.props).every(prop => !prop.visible))
  } finally { model.dispose() }
})

test('hula hoop stays around the waist and remains visibly tilted', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-hula-hoop')
    for (const time of [0, .2, .4, .6, .8]) {
      model.update(time)
      model.root.updateMatrixWorld(true)
      const prop = model.actionProps.props['emoji-hula-hoop']
      const hoop = prop.getObjectByName('HulaHoop')
      const bounds = new THREE.Box3().setFromObject(hoop)
      const center = bounds.getCenter(new THREE.Vector3())
      assert.ok(center.y > -.02 && center.y < .18, `waist height @ ${time}: ${center.y}`)
      assert.ok(bounds.max.y - bounds.min.y > .28, `visible ellipse @ ${time}`)
    }
  } finally { model.dispose() }
})

test('bench press uses a face-readable half recline with compact gripping paws', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-bench-press')
    model.update(.42)
    const motion = model.registry.getPart('motion-root')
    assert.ok(motion.rotation.x > .35 && motion.rotation.x < .7)
    for (const [partId, pawName] of [
      ['arm-left', 'ArmLeftPaw'],
      ['arm-right', 'ArmRightPaw'],
    ]) {
      const paw = model.registry.getPart(partId).getObjectByName(pawName)
      assert.ok(Math.abs(paw.scale.x - .46) < 1e-9)
    }
    for (const [partId, footName] of [
      ['leg-left', 'FootLeft'],
      ['leg-right', 'FootRight'],
    ]) {
      const foot = model.registry.getPart(partId).getObjectByName(footName)
      assert.ok(Math.abs(foot.scale.x - .78) < 1e-9)
      assert.ok(Math.abs(model.registry.getJoints(partId).ankle.rotation.y - Math.PI) < 1e-9)
    }
  } finally { model.dispose() }
})

test('hand-held props follow registry wrists across body and paw proportions', () => {
  const model = new CatModel()
  try {
    for (const bodyScale of [.72, 1.28]) {
      model.setMorphology({ bodyScale, pawScale: bodyScale < 1 ? .75 : 1.35 })
      model.setAnimation('emoji-dumbbells')
      model.update(.43)
      model.root.updateMatrixWorld(true)
      const prop = model.actionProps.props['emoji-dumbbells']
      for (const [index, partId] of [[0, 'arm-left'], [1, 'arm-right']]) {
        const expected = model.registry.getJoints(partId).wrist.localToWorld(new THREE.Vector3(0, -.13, .08))
        const actual = prop.children[index].getWorldPosition(new THREE.Vector3())
        assert.ok(actual.distanceTo(expected) < 1e-6, `${partId} @ ${bodyScale}`)
      }
    }
  } finally { model.dispose() }
})

test('dumbbell curls alternate high and low wrist targets instead of spreading both arms', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-dumbbells')
    const sample = time => {
      model.update(time)
      model.root.updateMatrixWorld(true)
      return ['arm-left', 'arm-right'].map(partId =>
        model.registry.getJoints(partId).wrist.getWorldPosition(new THREE.Vector3()).y)
    }
    const first = sample(.3)
    const second = sample(.9)
    assert.ok(first[0] > first[1] + .25)
    assert.ok(second[1] > second[0] + .25)
  } finally { model.dispose() }
})

test('food bowl stays centered between both cupped hands', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-foodie')
    model.update(.62)
    model.root.updateMatrixWorld(true)
    const left = model.registry.getJoints('arm-left').wrist.localToWorld(new THREE.Vector3(0, -.10, .12))
    const right = model.registry.getJoints('arm-right').wrist.localToWorld(new THREE.Vector3(0, -.10, .12))
    const expectedX = (left.x + right.x) * .5
    const bowl = model.actionProps.props['emoji-foodie'].getWorldPosition(new THREE.Vector3())
    assert.ok(Math.abs(bowl.x - expectedX) < 1e-6)
  } finally { model.dispose() }
})

test('comfy action owns two side cushions and a center seat', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-so-comfy')
    model.update(.4)
    const prop = model.actionProps.props['emoji-so-comfy']
    assert.equal(prop.visible, true)
    assert.ok(prop.getObjectByName('ComfyCushion_Left'))
    assert.ok(prop.getObjectByName('ComfyCushion_Right'))
    assert.ok(prop.getObjectByName('ComfyCushion_Seat'))
    model.root.updateMatrixWorld(true)
    const left = model.registry.getJoints('arm-left').wrist.getWorldPosition(new THREE.Vector3())
    const right = model.registry.getJoints('arm-right').wrist.getWorldPosition(new THREE.Vector3())
    assert.ok(Math.abs(left.x) < .52 && Math.abs(right.x) < .52)
  } finally { model.dispose() }
})

test('comfy paws rest below the face instead of covering the expression', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-so-comfy')
    model.update(.37)
    model.root.updateMatrixWorld(true)
    const headY = model.registry.getPart('head').getWorldPosition(new THREE.Vector3()).y
    const left = model.registry.getJoints('arm-left').wrist.getWorldPosition(new THREE.Vector3())
    const right = model.registry.getJoints('arm-right').wrist.getWorldPosition(new THREE.Vector3())
    assert.ok(left.y < headY - .08)
    assert.ok(right.y < headY - .08)
    assert.ok(left.x < -.15 && right.x > .15)
  } finally { model.dispose() }
})

test('cold action overlaps both paws at the chest across body widths', () => {
  const model = new CatModel()
  try {
    for (const bodyWidth of [.72, 1.28]) {
      model.setMorphology({ bodyWidth })
      model.setAnimation('emoji-so-cold')
      model.update(.55)
      model.root.updateMatrixWorld(true)
      const left = model.registry.getJoints('arm-left').wrist.getWorldPosition(new THREE.Vector3())
      const right = model.registry.getJoints('arm-right').wrist.getWorldPosition(new THREE.Vector3())
      const headY = model.registry.getPart('head').getWorldPosition(new THREE.Vector3()).y
      assert.ok(left.distanceTo(right) < .25, `bodyWidth ${bodyWidth}`)
      assert.ok(left.y < headY - .08 && right.y < headY - .08, `bodyWidth ${bodyWidth}`)
    }
  } finally { model.dispose() }
})

test('boxing gloves follow both wrists and alternate punch scale', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-boxing')
    model.update(.18)
    model.root.updateMatrixWorld(true)
    const prop = model.actionProps.props['emoji-boxing']
    const leftExpected = model.registry.getJoints('arm-left').wrist.localToWorld(new THREE.Vector3(0, -.08, .12))
    const leftActual = prop.children[0].getWorldPosition(new THREE.Vector3())
    assert.ok(leftActual.distanceTo(leftExpected) < 1e-6)
    assert.notEqual(prop.children[0].scale.x, prop.children[1].scale.x)
  } finally { model.dispose() }
})

test('snowball action grows one rolling ball while exposing star-eye expression', () => {
  const model = new CatModel()
  try {
    const prop = model.actionProps.props['emoji-snowball']
    assert.equal(prop.children.length, 1)
    assert.equal(prop.children[0].name, 'RollingSnowball')
    model.setAnimation('emoji-snowball')
    model.update(.16)
    const earlyScale = prop.children[0].scale.x
    model.update(1.65)
    assert.ok(prop.children[0].scale.x > earlyScale + .35)
    assert.ok(model.registry.getJoints('face').eyeStarLeft.scale.x > .8)
    model.root.updateMatrixWorld(true)
    const center = prop.getWorldPosition(new THREE.Vector3())
    const radius = .38 * prop.children[0].scale.x
    for (const partId of ['arm-left', 'arm-right']) {
      const wrist = model.registry.getJoints(partId).wrist.getWorldPosition(new THREE.Vector3())
      assert.ok(wrist.x < center.x)
      const radialDistance = Math.hypot(wrist.x - center.x, wrist.y - center.y)
      assert.ok(radialDistance > radius * .5)
      assert.ok(radialDistance < radius + .2)
    }
  } finally { model.dispose() }
})

test('snow fight stages an incoming face impact before the return throw', () => {
  const model = new CatModel()
  try {
    const prop = model.actionProps.props['emoji-snow-fight']
    model.setAnimation('emoji-snow-fight')
    model.update(.08)
    const earlyX = prop.children[0].position.x
    model.update(.36)
    assert.ok(prop.children[0].position.x > earlyX + .5)
    assert.ok(prop.children[0].scale.x > 1.5)
    model.update(.68)
    assert.equal(prop.children[0].visible, false)
    model.update(1.35)
    assert.ok(prop.children[1].position.x > .5)
  } finally { model.dispose() }
})

test('hand-held prop transforms are baked into their action clip', () => {
  const model = new CatModel()
  try {
    model.setAnimation('emoji-dumbbells')
    const [clip] = model.createExportAnimationClips({
      fps: 12,
      include: [{ id: 'emoji-dumbbells', name: 'Dumbbells', duration: 1.6, loop: true }],
    })
    assert.ok(clip.tracks.some(track => track.name === 'DumbbellLeft.position'))
    assert.ok(clip.tracks.some(track => track.name === 'DumbbellRight.position'))
    assert.ok(clip.tracks.some(track => track.name === 'ActionProp_Dumbbells.quaternion'))
  } finally { model.dispose() }
})
