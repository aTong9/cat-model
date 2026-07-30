export function disposeObject3DResources(root, options = {}) {
  if (!root?.traverse) return { geometries: 0, materials: 0, textures: 0 }
  const excludedGeometries = new Set(options.excludeGeometries ?? [])
  const geometries = new Set()
  const materials = new Set()
  const textures = new Set()
  root.traverse(object => {
    if (object.geometry && !excludedGeometries.has(object.geometry)) geometries.add(object.geometry)
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue
      materials.add(material)
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
    }
  })
  if (options.detach !== false) root.removeFromParent?.()
  for (const geometry of geometries) geometry.dispose()
  for (const texture of textures) texture.dispose()
  for (const material of materials) material.dispose()
  return { geometries: geometries.size, materials: materials.size, textures: textures.size }
}
