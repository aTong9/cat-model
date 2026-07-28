import test from 'node:test'
import assert from 'node:assert/strict'
import { FACE_EXPRESSIONS } from '../src/config/traits.js'
import { CatModel } from '../src/three/CatModel.js'
import { FACE_APPEARANCE_PROFILES, getFaceAppearanceProfile } from '../src/three/FaceProfiles.js'

test('all face expressions have distinct, finite appearance profiles', () => {
  assert.deepEqual(Object.keys(FACE_APPEARANCE_PROFILES).sort(), [...FACE_EXPRESSIONS].sort())
  const families = FACE_EXPRESSIONS.map(expression => getFaceAppearanceProfile(expression).family)
  assert.equal(new Set(families).size, FACE_EXPRESSIONS.length)
  for (const expression of FACE_EXPRESSIONS) {
    const profile = getFaceAppearanceProfile(expression)
    assert.ok(profile.scale > 0)
    assert.ok(profile.mouthWidth > 0)
    assert.ok(profile.mouthHeight > 0)
  }
})

test('switching expressions rebuilds an identified exportable mouth group', () => {
  const model = new CatModel()
  const mouth = model.group.getObjectByName('FaceMouth')
  assert.ok(mouth)
  for (const expression of FACE_EXPRESSIONS) {
    model.setFaceExpression(expression)
    const profile = getFaceAppearanceProfile(expression)
    assert.equal(mouth.userData.faceExpression, expression)
    assert.equal(mouth.userData.faceFamily, profile.family)
    assert.deepEqual(mouth.userData.faceBounds, { width: profile.mouthWidth, height: profile.mouthHeight })
    assert.ok(mouth.children.length > 0)
  }
  model.dispose()
})
