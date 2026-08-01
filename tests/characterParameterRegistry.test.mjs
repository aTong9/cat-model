import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MORPHOLOGY_DEFINITIONS,
  MORPHOLOGY_PARAMETER_REGISTRY,
  CHARACTER_PARAMETER_REGISTRY,
  TRAIT_PARAMETER_REGISTRY,
  getMorphologyDefaults,
  getMorphologyParameter,
  diffMorphologyParameters,
  normalizeMorphologyParameters,
} from '../src/core/characterParameterRegistry.js'
import { MORPHOLOGY_CONTROLS } from '../src/stores/cat.js'

test('morphology registry is the single source for contracts and editor controls', () => {
  assert.equal(MORPHOLOGY_PARAMETER_REGISTRY.length, 16)
  assert.equal(MORPHOLOGY_CONTROLS, MORPHOLOGY_PARAMETER_REGISTRY)
  assert.deepEqual(Object.keys(MORPHOLOGY_DEFINITIONS), MORPHOLOGY_PARAMETER_REGISTRY.map(item => item.key))
  assert.deepEqual(
    getMorphologyDefaults(),
    Object.fromEntries(MORPHOLOGY_PARAMETER_REGISTRY.map(item => [item.key, item.default])),
  )
})

test('unified registry covers morphology, appearance, equipment, environment, pose and animation', () => {
  assert.equal(CHARACTER_PARAMETER_REGISTRY.length, MORPHOLOGY_PARAMETER_REGISTRY.length + TRAIT_PARAMETER_REGISTRY.length + 2)
  assert.deepEqual([...new Set(CHARACTER_PARAMETER_REGISTRY.map(parameter => parameter.domain))], [
    'morphology', 'appearance', 'equipment', 'environment', 'pose', 'animation',
  ])
  assert.equal(CHARACTER_PARAMETER_REGISTRY.find(parameter => parameter.key === 'special').conflicts.includes('background'), true)
  assert.equal(CHARACTER_PARAMETER_REGISTRY.find(parameter => parameter.key === 'animation').dependencies.includes('pose'), true)
})

test('every morphology parameter has a complete finite numeric contract', () => {
  const keys = new Set()
  for (const parameter of MORPHOLOGY_PARAMETER_REGISTRY) {
    assert.equal(keys.has(parameter.key), false, parameter.key)
    keys.add(parameter.key)
    assert.equal(parameter.domain, 'morphology')
    assert.equal(parameter.type, 'number')
    assert.ok(parameter.label)
    assert.ok(parameter.group)
    assert.ok(Number.isFinite(parameter.min))
    assert.ok(Number.isFinite(parameter.max))
    assert.ok(Number.isFinite(parameter.default))
    assert.ok(Number.isFinite(parameter.step))
    assert.ok(parameter.min < parameter.max)
    assert.ok(parameter.default >= parameter.min && parameter.default <= parameter.max)
    assert.ok(parameter.step > 0)
    assert.ok(parameter.affects.length > 0)
    assert.ok(['transform', 'geometry', 'material', 'uniform'].includes(parameter.update))
    assert.equal(getMorphologyParameter(parameter.key), parameter)
    assert.equal(Object.isFrozen(parameter), true)
    assert.equal(Object.isFrozen(parameter.affects), true)
  }
  assert.equal(getMorphologyParameter('unknown'), null)
})

test('morphology parameter API normalizes and classifies minimal updates', () => {
  const defaults = getMorphologyDefaults()
  const normalized = normalizeMorphologyParameters({ bodyScale: 99, tailCurl: '-0.25', headScale: 'invalid' })
  assert.equal(normalized.bodyScale, 1.25)
  assert.equal(normalized.tailCurl, -0.25)
  assert.equal(normalized.headScale, 1)
  const changes = diffMorphologyParameters(defaults, normalized)
  assert.deepEqual(changes.map(change => [change.key, change.update]), [
    ['bodyScale', 'transform'],
    ['tailCurl', 'geometry'],
  ])
})
