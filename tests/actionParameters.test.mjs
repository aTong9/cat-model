import test from 'node:test'
import assert from 'node:assert/strict'
import { CatModel } from '../src/three/CatModel.js'
import { normalizeActionParameters } from '../src/character/animation/actionParameters.js'

test('action parameter API clamps and stores independent Pack 5 overrides', () => {
  const model = new CatModel()
  try {
    const value = model.setActionParameters('emoji-backflip', {
      speed: 99, intensity: -.5, rootMotion: .4, propScale: 1.25,
    })
    assert.deepEqual(value, { speed: 2.5, intensity: 0, rootMotion: .4, propScale: 1.25 })
    assert.deepEqual(model.getActionParameters('emoji-backflip'), value)
    assert.deepEqual(model.getActionParameters('emoji-yoga'), normalizeActionParameters())
  } finally { model.dispose() }
})

test('root motion and prop scale parameters affect runtime transforms', () => {
  const model = new CatModel()
  try {
    model.setActionParameters('emoji-backflip', { rootMotion: 0, intensity: 1 })
    model.setAnimation('emoji-backflip')
    model.update(.62)
    const motion = model.registry.getPart('motion-root')
    assert.ok(Math.abs(motion.rotation.x) < 1e-9)
    assert.ok(Math.abs(motion.position.y - motion.userData.restPosition[1]) < 1e-9)

    model.setActionParameters('emoji-hula-hoop', { propScale: 1.6 })
    model.setAnimation('emoji-hula-hoop')
    model.update(.2)
    assert.deepEqual(model.actionProps.props['emoji-hula-hoop'].scale.toArray(), [1.6, 1.6, 1.6])
  } finally { model.dispose() }
})
