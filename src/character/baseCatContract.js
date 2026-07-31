import * as THREE from 'three'

export const BASE_CAT_PART_IDS = Object.freeze([
  'body', 'arm-left', 'arm-right', 'leg-left', 'leg-right', 'tail',
  'head', 'face', 'ear-left', 'ear-right', 'gear-root', 'motion-root',
])

export const BASE_CAT_SOCKET_IDS = Object.freeze([
  'head-top', 'face-eyes', 'face-mouth', 'chest-front', 'back', 'paw-left',
  'shoulder-left', 'shoulder-right', 'hip-left', 'hip-right', 'tail-base',
])

export const BASE_CAT_CAMERA_CONTRACT = Object.freeze({
  target: Object.freeze([0, 0.72, 0]),
  fov: 38,
  views: Object.freeze({
    front: Object.freeze([0, 0.45, 4.6]),
    'three-quarter': Object.freeze([3.25, 0.7, 3.25]),
    side: Object.freeze([4.6, 0.45, 0]),
    back: Object.freeze([0, 0.45, -4.6]),
  }),
})

export const BASE_CAT_PERFORMANCE_BUDGET = Object.freeze({
  maxTriangles: 250000,
  maxMaterials: 80,
  maxMeshes: 160,
})

export function auditEmbeddedAttachments(registry, partIds = [
  'arm-left', 'arm-right', 'leg-left', 'leg-right', 'tail',
]) {
  const body = registry.getPart('body')
  body.updateWorldMatrix(true, true)
  const bodyBounds = new THREE.Box3().setFromObject(body)
  const failures = []
  const results = partIds.map(partId => {
    const part = registry.getPart(partId)
    const attachment = part?.userData?.attachment
    const point = part?.getWorldPosition(new THREE.Vector3())
    const distance = point ? bodyBounds.distanceToPoint(point) : Infinity
    const tolerance = (attachment?.embedDepth ?? 0) + (attachment?.gapTolerance ?? 0)
    const valid = attachment?.contactType === 'embedded' && distance <= tolerance
    if (!valid) failures.push(`${partId}:${Number.isFinite(distance) ? distance.toFixed(4) : 'missing'}`)
    return Object.freeze({ partId, distance, tolerance, valid })
  })
  return Object.freeze({ valid: failures.length === 0, failures, results })
}
