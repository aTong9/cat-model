import * as THREE from 'three'

export const CHARACTER_CONSTRAINT_VERSION = 1

export function constrainFeetToFloor(root, registry, floorY = -0.52) {
  root.updateWorldMatrix(true, true)
  const feet = ['leg-left', 'leg-right'].map(id => registry.getPart(id)).filter(Boolean)
  if (!feet.length) return Object.freeze({ applied: false, offsetY: 0 })
  const currentFloor = Math.min(...feet.map(foot => new THREE.Box3().setFromObject(foot).min.y))
  const offsetY = floorY - currentFloor
  const motionRoot = registry.getPart('motion-root')
  if (motionRoot && Number.isFinite(offsetY)) motionRoot.position.y += offsetY
  return Object.freeze({ applied: Boolean(motionRoot), offsetY })
}

export function constrainHeadLookAt(registry, target, { yawLimit = Math.PI / 3, pitchLimit = Math.PI / 4 } = {}) {
  const head = registry.getPart('head')
  if (!head || !Array.isArray(target)) return Object.freeze({ applied: false })
  head.updateWorldMatrix(true, false)
  const position = head.getWorldPosition(new THREE.Vector3())
  const direction = new THREE.Vector3(...target).sub(position).normalize()
  const yaw = THREE.MathUtils.clamp(Math.atan2(direction.x, direction.z), -yawLimit, yawLimit)
  const pitch = THREE.MathUtils.clamp(-Math.asin(direction.y), -pitchLimit, pitchLimit)
  head.rotation.set(pitch, yaw, head.rotation.z)
  return Object.freeze({ applied: true, pitch, yaw })
}

export function constrainTwoHandGrip(registry, leftTarget, rightTarget) {
  const results = []
  for (const [partId, target] of [['arm-left', leftTarget], ['arm-right', rightTarget]]) {
    const wrist = registry.getJoints(partId).wrist
    if (!wrist || !Array.isArray(target)) {
      results.push({ partId, applied: false })
      continue
    }
    wrist.parent?.updateWorldMatrix(true, false)
    const localTarget = wrist.parent.worldToLocal(new THREE.Vector3(...target))
    const direction = localTarget.sub(wrist.parent.position).normalize()
    wrist.rotation.z = THREE.MathUtils.clamp(Math.atan2(direction.y, direction.x), -Math.PI, Math.PI)
    results.push({ partId, applied: true })
  }
  return Object.freeze(results.map(Object.freeze))
}

