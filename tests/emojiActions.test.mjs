import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { CatModel } from '../src/three/CatModel.js'
import { EMOJI_ACTIONS, PACK5_SOURCE_DURATIONS } from '../src/config/emojiActions.js'
import { MORPHOLOGY_PRESETS } from '../src/stores/cat.js'

test('Pack 5 exposes all 16 stable, unique actions', () => {
  assert.equal(EMOJI_ACTIONS.length, 16)
  assert.equal(new Set(EMOJI_ACTIONS.map(item => item.id)).size, 16)
  assert.ok(EMOJI_ACTIONS.every(item => item.preview.endsWith(item.file)))
  assert.ok(EMOJI_ACTIONS.every(item => item.duration === PACK5_SOURCE_DURATIONS[item.id]))
})

test('every Pack 5 action is registered and keeps finite character bounds', () => {
  const model = new CatModel()
  try {
    for (const action of EMOJI_ACTIONS) {
      assert.equal(model.animator.hasStrategy(action.id), true, action.id)
      model.setAnimation(action.id)
      model.update(action.duration * .37)
      model.root.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(model.root)
      assert.equal(box.isEmpty(), false, action.id)
      assert.ok([...box.min, ...box.max].every(Number.isFinite), action.id)
      assert.equal(model.animator.mode, action.id)
    }
  } finally { model.dispose() }
})

test('all Pack 5 actions remain finite across every public body preset', () => {
  const model = new CatModel()
  try {
    for (const preset of MORPHOLOGY_PRESETS) {
      model.setMorphology(preset.values)
      for (const action of EMOJI_ACTIONS) {
        model.setAnimation(action.id)
        for (const phase of [.12, .48, .82]) {
          model.update(action.duration * phase)
          model.root.updateMatrixWorld(true)
          const box = new THREE.Box3().setFromObject(model.root)
          const size = box.getSize(new THREE.Vector3())
          assert.equal(box.isEmpty(), false, `${preset.id}/${action.id}/${phase}`)
          assert.ok([...box.min, ...box.max, ...size].every(Number.isFinite), `${preset.id}/${action.id}/${phase}`)
          assert.ok(size.length() < 12, `${preset.id}/${action.id}/${phase} runaway bounds`)
        }
      }
    }
  } finally { model.dispose() }
})

test('all Pack 5 exports include root, limb translation and facial performance tracks', () => {
  const model = new CatModel()
  try {
    const clips = model.createExportAnimationClips({
      fps: 6,
      include: EMOJI_ACTIONS.map(action => ({
        id: action.id,
        name: action.id,
        duration: action.duration,
        loop: true,
      })),
    })
    assert.equal(clips.length, EMOJI_ACTIONS.length)
    for (const clip of clips) {
      const names = new Set(clip.tracks.map(track => track.name))
      assert.ok(names.has('CharacterMotion.position'), `${clip.name}/root position`)
      assert.ok(names.has('CharacterMotion.quaternion'), `${clip.name}/root rotation`)
      assert.ok(names.has('ArmLeft.position'), `${clip.name}/arm position`)
      assert.ok(names.has('LegLeft.position'), `${clip.name}/leg position`)
      assert.ok(names.has('FaceActionEyeLeft.scale'), `${clip.name}/face action`)
    }
  } finally { model.dispose() }
})
