import test from 'node:test'
import assert from 'node:assert/strict'
import { CatModel } from '../src/three/CatModel.js'
import { applyFaceMotion, resetFaceMotion } from '../src/character/animation/faceMotion.js'

test('face exposes stable animation joints and resets to neutral', () => {
  const model = new CatModel()
  try {
    const joints = model.registry.getJoints('face')
    assert.deepEqual(Object.keys(joints).sort(), [
      'actionEyeLeft', 'actionEyeRight',
      'browLeft', 'browRight', 'cheekLeft', 'cheekRight',
      'eyeLeft', 'eyeRight', 'eyeStarLeft', 'eyeStarRight',
      'eyelidLeft', 'eyelidRight', 'jaw',
    ])
    const baseScale = joints.jaw.scale.x
    applyFaceMotion(joints, {
      blinkLeft: 1, blinkRight: .5, gazeX: .7, gazeY: -.4,
      jawOpen: .8, mouthWide: -.4, mouthRound: .7,
      eyeWideLeft: .6, eyeWideRight: -.4, browLeft: -.8, browRight: .7,
      blush: .8, starEyes: .9, actionFace: 1,
    })
    assert.ok(Math.abs(joints.eyelidLeft.rotation.x) < 1e-8)
    assert.ok(joints.jaw.rotation.x > .2)
    assert.ok(joints.eyeLeft.rotation.y > 0)
    assert.ok(joints.jaw.scale.y > baseScale)
    assert.ok(joints.jaw.scale.x < baseScale)
    assert.ok(joints.actionEyeLeft.scale.y < joints.actionEyeLeft.userData.baseScale)
    assert.ok(joints.actionEyeRight.scale.y < joints.actionEyeRight.userData.baseScale)
    assert.ok(joints.browLeft.rotation.z < 0)
    assert.ok(joints.browRight.rotation.z < 0)
    assert.ok(joints.cheekLeft.scale.x > .7)
    assert.ok(joints.eyeStarLeft.scale.x > 1)
    assert.ok(joints.eyeLeft.scale.x < .01)
    assert.ok(joints.actionEyeLeft.scale.x < .2)
    resetFaceMotion(joints)
    assert.equal(joints.jaw.rotation.x, 0)
    assert.ok(Math.abs(joints.jaw.scale.x - baseScale) < 1e-8)
    assert.ok(Math.abs(joints.eyelidLeft.rotation.x - Math.PI / 2) < 1e-8)
    assert.equal(joints.browLeft.rotation.z, 0)
    assert.equal(joints.cheekLeft.scale.x, .01)
    assert.ok(joints.eyeStarLeft.scale.x < .01)
    assert.ok(Math.abs(joints.eyeLeft.scale.x - joints.eyeLeft.userData.baseScale) < 1e-8)
    assert.ok(joints.actionEyeLeft.scale.x < .01)
  } finally { model.dispose() }
})

test('Pack 5 facial motion is baked into portable rotation tracks', () => {
  const model = new CatModel()
  try {
    const clips = model.createExportAnimationClips({
      fps: 12,
      include: [{ id: 'emoji-backflip', name: 'Backflip', duration: 1, loop: false }],
    })
    const names = clips[0].tracks.map(track => track.name)
    assert.ok(names.includes('FaceEyelidLeft.quaternion'))
    assert.ok(names.includes('FaceEyeLeft.quaternion'))
    assert.ok(names.includes('FaceMouth.quaternion'))
    assert.ok(names.includes('FaceMouth.scale'))
    assert.ok(names.includes('FaceEyeLeft.scale'))
    assert.ok(names.includes('FaceActionEyeLeft.scale'))
    assert.ok(names.includes('FaceBrowLeft.quaternion'))
    assert.ok(names.includes('FaceCheekLeft.scale'))
    assert.ok(names.includes('FaceEyeStarLeft.scale'))
  } finally { model.dispose() }
})

test('Pack 5 replaces wearable eyes with exportable performance eyes and restores traits afterwards', () => {
  const model = new CatModel({ eyes: 'Sunglasses' })
  try {
    const joints = model.registry.getJoints('face')
    model.setAnimation('emoji-so-cute')
    model.update(.35)
    assert.ok(joints.eyeLeft.scale.x < .01)
    assert.ok(joints.actionEyeLeft.scale.x < .01)
    assert.ok(joints.eyeStarLeft.scale.x > .85)
    model.setAnimation('standing')
    model.update(0)
    assert.ok(Math.abs(joints.eyeLeft.scale.x - joints.eyeLeft.userData.baseScale) < 1e-8)
    assert.ok(joints.actionEyeLeft.scale.x < .01)
  } finally { model.dispose() }
})
