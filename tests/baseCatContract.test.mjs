import test from 'node:test'
import assert from 'node:assert/strict'
import { MORPHOLOGY_DEFINITIONS } from '../src/core/catTraits.js'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import {
  auditEmbeddedAttachments,
  BASE_CAT_CAMERA_CONTRACT,
  BASE_CAT_PART_IDS,
  BASE_CAT_PERFORMANCE_BUDGET,
  BASE_CAT_SOCKET_IDS,
} from '../src/character/baseCatContract.js'
import { auditCharacterQuality } from '../src/export/qualityAudit.js'
import { QUALITY_BASELINE, validateQualityBaseline } from '../src/export/qualityBaseline.js'

test('base cat freezes four deterministic turnaround cameras', () => {
  assert.deepEqual(Object.keys(BASE_CAT_CAMERA_CONTRACT.views), ['front', 'three-quarter', 'side', 'back'])
  assert.deepEqual(QUALITY_BASELINE.views, Object.keys(BASE_CAT_CAMERA_CONTRACT.views))
  assert.equal(QUALITY_BASELINE.camera.fov, BASE_CAT_CAMERA_CONTRACT.fov)
  assert.equal(validateQualityBaseline().valid, true)
})

test('base cat exposes the complete stable part, joint and socket contract', () => {
  const assembly = createCatAssembly({})
  try {
    assert.deepEqual(assembly.registry.partNames, BASE_CAT_PART_IDS)
    assert.deepEqual(assembly.registry.socketNames, BASE_CAT_SOCKET_IDS)
    for (const partId of ['arm-left', 'arm-right', 'leg-left', 'leg-right']) {
      assert.equal(Object.keys(assembly.registry.getJoints(partId)).length, 2, partId)
    }
  } finally {
    assembly.dispose()
  }
})

test('shoulders, hips and tail root stay embedded at morphology extremes', () => {
  const assembly = createCatAssembly({})
  try {
    const bodyScales = [MORPHOLOGY_DEFINITIONS.bodyScale.min, MORPHOLOGY_DEFINITIONS.bodyScale.max]
    const legLengths = [MORPHOLOGY_DEFINITIONS.legLength.min, MORPHOLOGY_DEFINITIONS.legLength.max]
    const tailLengths = [MORPHOLOGY_DEFINITIONS.tailLength.min, MORPHOLOGY_DEFINITIONS.tailLength.max]
    for (const bodyScale of bodyScales) {
      for (const legLength of legLengths) {
        for (const tailLength of tailLengths) {
          assembly.apply({ morphology: { ...assembly.traits.morphology, bodyScale, legLength, tailLength } })
          const audit = auditEmbeddedAttachments(assembly.registry)
          assert.equal(audit.valid, true, audit.failures.join(', '))
        }
      }
    }
  } finally {
    assembly.dispose()
  }
})

test('front paw pads are hidden while rear-view foot pads are authored and visible', () => {
  const assembly = createCatAssembly({})
  try {
    for (const side of ['Left', 'Right']) {
      assert.equal(assembly.root.getObjectByName(`Arm${side}Pad`).visible, false)
      assert.equal(assembly.root.getObjectByName(`Arm${side}FingerPad1`).visible, false)
      assert.equal(assembly.root.getObjectByName(`Leg${side}MainPad`).visible, true)
      assert.ok(assembly.root.getObjectByName(`Leg${side}MainPad`).position.z < 0)
    }
  } finally {
    assembly.dispose()
  }
})

test('default base cat stays inside the frozen browser and GLB performance budget', () => {
  const assembly = createCatAssembly({})
  try {
    const report = auditCharacterQuality(assembly.root, BASE_CAT_PERFORMANCE_BUDGET)
    assert.equal(report.valid, true, report.errors.join(', '))
    assert.ok(report.meshes <= BASE_CAT_PERFORMANCE_BUDGET.maxMeshes)
  } finally {
    assembly.dispose()
  }
})
