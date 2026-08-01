import test from 'node:test'
import assert from 'node:assert/strict'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import {
  constrainFeetToFloor,
  constrainHeadLookAt,
  constrainTwoHandGrip,
} from '../src/character/animation/characterConstraints.js'
import { adaptActionParametersToMorphology } from '../src/character/animation/actionParameters.js'

test('shared constraints keep feet grounded and head look finite', () => {
  const assembly = createCatAssembly({ morphology: { legLength: 1.25 } })
  try {
    assembly.registry.getPart('motion-root').position.y += 0.2
    const grounding = constrainFeetToFloor(assembly.root, assembly.registry)
    assert.equal(grounding.applied, true)
    assert.ok(Number.isFinite(grounding.offsetY))
    const look = constrainHeadLookAt(assembly.registry, [10, 3, 10])
    assert.equal(look.applied, true)
    assert.ok(Math.abs(look.yaw) <= Math.PI / 3)
    assert.ok(Math.abs(look.pitch) <= Math.PI / 4)
  } finally { assembly.dispose() }
})

test('two-hand grip and morphology motion scaling use semantic contracts', () => {
  const assembly = createCatAssembly()
  try {
    const result = constrainTwoHandGrip(assembly.registry, [-0.3, 1, 0.5], [0.3, 1, 0.5])
    assert.equal(result.every(item => item.applied), true)
    const compact = adaptActionParametersToMorphology({}, { legLength: 0.8, bodyScale: 0.8, headScale: 1.25 })
    const tall = adaptActionParametersToMorphology({}, { legLength: 1.25, bodyScale: 1.25, headScale: 0.8 })
    assert.ok(compact.morphologyScale.reach > tall.morphologyScale.reach)
    assert.ok(compact.morphologyScale.balance < tall.morphologyScale.balance)
  } finally { assembly.dispose() }
})
