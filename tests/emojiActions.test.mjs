import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { CatModel } from '../src/three/CatModel.js'
import { EMOJI_ACTIONS } from '../src/config/emojiActions.js'

test('Pack 5 exposes all 16 stable, unique actions', () => {
  assert.equal(EMOJI_ACTIONS.length, 16)
  assert.equal(new Set(EMOJI_ACTIONS.map(item => item.id)).size, 16)
  assert.ok(EMOJI_ACTIONS.every(item => item.preview.endsWith(item.file)))
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
