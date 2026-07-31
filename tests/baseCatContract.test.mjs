import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { MORPHOLOGY_DEFINITIONS } from '../src/core/catTraits.js'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import {
  auditEmbeddedAttachments,
  BASE_CAT_CONTRACT_VERSION,
  BASE_CAT_COORDINATE_CONTRACT,
  BASE_CAT_JOINT_IDS,
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
    assert.equal(assembly.characterManifest.contractVersion, BASE_CAT_CONTRACT_VERSION)
    assert.deepEqual(assembly.characterManifest.coordinates, BASE_CAT_COORDINATE_CONTRACT)
    assert.deepEqual(Object.keys(assembly.characterManifest.parts), BASE_CAT_PART_IDS)
    assert.deepEqual(Object.keys(assembly.characterManifest.sockets), BASE_CAT_SOCKET_IDS)
    assert.deepEqual(
      Object.fromEntries(Object.entries(assembly.characterManifest.joints).map(([partId, joints]) => [partId, Object.keys(joints)])),
      BASE_CAT_JOINT_IDS,
    )
    assert.equal(assembly.root.userData.characterContract, assembly.characterManifest)
    for (const partId of ['arm-left', 'arm-right']) {
      assert.deepEqual(Object.keys(assembly.registry.getJoints(partId)), [
        'elbow', 'wrist',
        'thumb', 'thumbDistal', 'index', 'indexDistal', 'middle', 'middleDistal',
        'ring', 'ringDistal', 'little', 'littleDistal',
      ])
    }
    for (const partId of ['leg-left', 'leg-right']) {
      assert.deepEqual(Object.keys(assembly.registry.getJoints(partId)), ['knee', 'ankle', 'toe1', 'toe2', 'toe3', 'toe4', 'toe5'])
    }
  } finally {
    assembly.dispose()
  }
})

test('default facial landmarks, shoulders and planted legs keep the frozen base proportions', () => {
  const assembly = createCatAssembly({})
  try {
    assembly.model.setAnimation('standing')
    assembly.model.update(0)
    assembly.root.updateMatrixWorld(true)

    const bodyBounds = new THREE.Box3().setFromObject(assembly.registry.getPart('body'))
    const bodyHeight = bodyBounds.max.y - bodyBounds.min.y
    const worldY = object => object.getWorldPosition(new THREE.Vector3()).y
    const mouthY = worldY(assembly.root.getObjectByName('FaceMouth'))
    const shoulderY = [
      worldY(assembly.registry.getPart('arm-left')),
      worldY(assembly.registry.getPart('arm-right')),
    ]
    const legBounds = [
      new THREE.Box3().setFromObject(assembly.registry.getPart('leg-left')),
      new THREE.Box3().setFromObject(assembly.registry.getPart('leg-right')),
    ]

    assert.ok((mouthY - bodyBounds.min.y) / bodyHeight > 0.65, 'face must stay on the upper head, never the waist')
    assert.ok(shoulderY.every(y => (y - bodyBounds.min.y) / bodyHeight > 0.55), 'arms must remain shoulder-mounted')
    assert.ok(legBounds.every(box => box.max.y - box.min.y > bodyHeight * 0.35), 'legs must retain a readable upper/lower-leg length')
    assert.ok(Math.abs(legBounds[0].min.y - legBounds[1].min.y) < 0.01, 'both planted feet must share one floor plane')
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

test('front paw pads stay behind the palm while rear-view foot pads are authored and visible', () => {
  const assembly = createCatAssembly({})
  try {
    for (const side of ['Left', 'Right']) {
      const palmPad = assembly.root.getObjectByName(`Arm${side}Pad`)
      assert.equal(palmPad.visible, true)
      assert.ok(palmPad.position.z < 0)
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
