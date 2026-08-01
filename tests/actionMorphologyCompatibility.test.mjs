import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import { MORPHOLOGY_PARAMETER_REGISTRY } from '../src/core/characterParameterRegistry.js'
import { POSE_IDS } from '../src/config/poses.js'

test('every base action remains finite at every morphology boundary', () => {
  const assembly = createCatAssembly()
  try {
    for (const parameter of MORPHOLOGY_PARAMETER_REGISTRY) {
      for (const value of [parameter.min, parameter.max]) {
        assembly.apply({ morphology: { ...assembly.traits.morphology, [parameter.key]: value } })
        for (const action of POSE_IDS) {
          assembly.setAnimation(action)
          assembly.update(0.37)
          assembly.root.updateMatrixWorld(true)
          const bounds = new THREE.Box3().setFromObject(assembly.root)
          assert.equal(bounds.isEmpty(), false, `${parameter.key}:${value}:${action}`)
          assert.ok([...bounds.min, ...bounds.max].every(Number.isFinite), `${parameter.key}:${value}:${action}`)
          assert.ok(bounds.getSize(new THREE.Vector3()).length() < 12, `${parameter.key}:${value}:${action}`)
        }
      }
    }
  } finally { assembly.dispose() }
})
