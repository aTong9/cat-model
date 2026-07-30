export const OUTPUT_PROFILES = Object.freeze({
  transparent: Object.freeze({ width: 2048, height: 2048, alpha: true }),
  social: Object.freeze({ width: 1080, height: 1080, alpha: false }),
  card: Object.freeze({ width: 1200, height: 675, alpha: false }),
  turnaround: Object.freeze({ views: ['front', 'three-quarter', 'side', 'back'], width: 4096, height: 1024, alpha: true }),
})

export const DEVICE_MATRIX = Object.freeze([
  { id: 'desktop-webgl2', minWidth: 1280, targetFps: 60 },
  { id: 'mobile-webgl2', minWidth: 360, targetFps: 30 },
])

export function auditCharacterQuality(root, { maxTriangles = 250000, maxMaterials = 80, maxMeshes = Infinity } = {}) {
  let triangles = 0
  let meshes = 0
  const materials = new Set()
  let invalidTransforms = 0
  root?.traverse?.(object => {
    if (![...object.position, ...object.scale, ...object.quaternion].every(Number.isFinite)) invalidTransforms++
    const geometry = object.geometry
    if (geometry) {
      meshes++
      triangles += geometry.index ? geometry.index.count / 3 : (geometry.attributes.position?.count ?? 0) / 3
    }
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) materials.add(material)
  })
  const errors = []
  if (invalidTransforms) errors.push(`invalid-transforms:${invalidTransforms}`)
  if (triangles > maxTriangles) errors.push(`triangle-budget:${Math.ceil(triangles)}`)
  if (materials.size > maxMaterials) errors.push(`material-budget:${materials.size}`)
  if (meshes > maxMeshes) errors.push(`mesh-budget:${meshes}`)
  return Object.freeze({ valid: errors.length === 0, errors, triangles: Math.ceil(triangles), materials: materials.size, meshes })
}
