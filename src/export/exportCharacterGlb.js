import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { disposeObject3DResources } from '../character/resources/disposeObject3DResources.js'

function toSerializable(value, seen = new WeakSet()) {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'function' || value?.isObject3D || value?.isMaterial || value?.isTexture || value?.isBufferGeometry) return undefined
  if (ArrayBuffer.isView(value)) return Array.from(value)
  if (Array.isArray(value)) return value.map(item => toSerializable(item, seen)).filter(item => item !== undefined)
  if (typeof value !== 'object' || seen.has(value)) return undefined
  seen.add(value)
  const output = {}
  for (const [key, child] of Object.entries(value)) {
    const serialized = toSerializable(child, seen)
    if (serialized !== undefined) output[key] = serialized
  }
  seen.delete(value)
  return output
}

export function auditCharacterRoot(root) {
  const errors = []
  const warnings = []
  let meshes = 0
  let triangles = 0
  let materials = 0
  let textures = 0
  const materialSet = new Set()
  const textureSet = new Set()

  if (!root?.isObject3D) errors.push('missing-character-root')
  if (root?.isScene) errors.push('scene-root-is-not-exportable-character')
  root?.traverse(object => {
    if (object.isCamera || object.isLight) errors.push(`environment-node:${object.name || object.type}`)
    if (!object.isMesh) return
    meshes++
    const geometry = object.geometry
    if (!geometry?.attributes?.position) errors.push(`mesh-without-position:${object.name || object.uuid}`)
    else triangles += geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of meshMaterials) {
      if (!material || materialSet.has(material)) continue
      materialSet.add(material)
      materials++
      if (material.isShaderMaterial) errors.push(`unsupported-shader-material:${material.name || material.type}`)
      else if (material.isMeshToonMaterial) warnings.push(`toon-material-will-be-converted:${material.name || material.uuid}`)
      for (const value of Object.values(material)) {
        if (value?.isTexture && !textureSet.has(value)) { textureSet.add(value); textures++ }
      }
    }
  })
  if (!meshes) errors.push('character-has-no-meshes')
  if (!root?.userData?.catTraits) errors.push('missing-cat-traits-extras')

  return {
    valid: errors.length === 0,
    errors,
    warnings: [...new Set(warnings)],
    stats: { meshes, triangles: Math.round(triangles), materials, textures },
  }
}

function withSerializableUserData(root, callback) {
  const snapshots = []
  root.traverse(object => {
    snapshots.push([object, object.userData])
    object.userData = toSerializable(object.userData) ?? {}
  })
  return Promise.resolve()
    .then(callback)
    .finally(() => { for (const [object, userData] of snapshots) object.userData = userData })
}

export function createPbrExportMaterial(material) {
  if (!material?.isMeshToonMaterial) return material
  const converted = new THREE.MeshStandardMaterial({
    name: `${material.name || 'ToonMaterial'}:PBR`,
    color: material.color?.clone() ?? new THREE.Color('#ffffff'),
    map: material.map ?? null,
    normalMap: material.normalMap ?? null,
    bumpMap: material.bumpMap ?? null,
    bumpScale: material.bumpScale,
    displacementMap: material.displacementMap ?? null,
    displacementScale: material.displacementScale,
    displacementBias: material.displacementBias,
    alphaMap: material.alphaMap ?? null,
    aoMap: material.aoMap ?? null,
    aoMapIntensity: material.aoMapIntensity,
    emissive: material.emissive?.clone() ?? new THREE.Color('#000000'),
    emissiveMap: material.emissiveMap ?? null,
    emissiveIntensity: material.emissiveIntensity,
    metalness: 0,
    roughness: 0.82,
    vertexColors: material.vertexColors,
    transparent: material.transparent,
    opacity: material.opacity,
    alphaTest: material.alphaTest,
    side: material.side,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
  })
  converted.userData = { ...toSerializable(material.userData), sourceMaterial: 'MeshToonMaterial', exportProfile: 'blender-pbr-v1' }
  return converted
}

function prepareExportClone(root) {
  const convertedMaterials = new Set()
  const materialMap = new Map()
  const clone = cloneSkeleton(root)
  clone.traverse(object => {
    if (!object.isMesh) return
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material]
    const exportMaterials = sourceMaterials.map(material => {
      if (!material?.isMeshToonMaterial) return material
      if (!materialMap.has(material)) {
        const converted = createPbrExportMaterial(material)
        materialMap.set(material, converted)
        convertedMaterials.add(converted)
      }
      return materialMap.get(material)
    })
    object.material = Array.isArray(object.material) ? exportMaterials : exportMaterials[0]
  })
  return {
    root: clone,
    report: { profile: 'blender-pbr-v1', convertedToPbr: convertedMaterials.size },
    dispose: () => { for (const material of convertedMaterials) material.dispose() },
  }
}

function inspectRoundTrip(gltf, expectedTraits, expectedAnimations = []) {
  let meshes = 0
  let materials = 0
  const materialSet = new Set()
  gltf.scene.traverse(object => {
    if (!object.isMesh) return
    meshes++
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (material) materialSet.add(material)
    }
  })
  materials = materialSet.size
  const traits = gltf.scene.getObjectByName('LibertyCat')?.userData?.catTraits ?? gltf.scene.userData?.catTraits
  const character = gltf.scene.getObjectByName('LibertyCat') ?? gltf.scene
  const socketNames = character.userData?.socketNames ?? []
  let equipmentAttachment = null
  character.traverse(object => { if (!equipmentAttachment && object.userData?.attachment?.socket) equipmentAttachment = object.userData.attachment })
  const errors = []
  if (!meshes) errors.push('roundtrip-has-no-meshes')
  if (!traits) errors.push('roundtrip-missing-cat-traits')
  else if (String(traits.tokenId) !== String(expectedTraits?.tokenId)) errors.push('roundtrip-token-mismatch')
  else if (traits.schemaVersion !== expectedTraits?.schemaVersion || traits.generatorVersion !== expectedTraits?.generatorVersion) errors.push('roundtrip-version-mismatch')
  else if (traits.seed !== expectedTraits?.seed) errors.push('roundtrip-seed-mismatch')
  else if (JSON.stringify(traits.morphology) !== JSON.stringify(expectedTraits?.morphology)) errors.push('roundtrip-morphology-mismatch')
  else if (JSON.stringify(traits.identity) !== JSON.stringify(expectedTraits?.identity)) errors.push('roundtrip-identity-mismatch')
  if (!Array.isArray(socketNames) || !socketNames.length) errors.push('roundtrip-missing-socket-metadata')
  if (expectedTraits?.gear && !equipmentAttachment) errors.push('roundtrip-missing-equipment-attachment')
  if (equipmentAttachment && !socketNames.includes(equipmentAttachment.socket)) errors.push('roundtrip-invalid-equipment-socket')
  const animationNames = gltf.animations.map(clip => clip.name)
  const animationTracks = Object.fromEntries(gltf.animations.map(clip => [clip.name, clip.tracks.map(track => track.name)]))
  for (const name of expectedAnimations) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, name)
    if (!clip) errors.push(`roundtrip-missing-animation:${name}`)
    else if (!clip.tracks.length || !(clip.duration > 0)) errors.push(`roundtrip-invalid-animation:${name}`)
  }
  const compatibility = {
    blender: { valid: expectedAnimations.every(name => animationNames.includes(name)), profile: 'glTF 2.0 actions' },
    unity: { valid: expectedAnimations.every(name => animationNames.includes(name)), profile: 'Generic rig clips' },
    unreal: { valid: expectedAnimations.every(name => animationNames.includes(name)), profile: 'skeletal/node animation sequences' },
  }
  return { valid: errors.length === 0, errors, animationNames, animationTracks, compatibility, schemaVersion: traits?.schemaVersion, generatorVersion: traits?.generatorVersion, seed: traits?.seed, morphology: traits?.morphology ?? null, identity: traits?.identity ?? null, socketNames, equipmentAttachment, stats: { meshes, materials, animations: gltf.animations.length } }
}

function disposeGltf(gltf) {
  disposeObject3DResources(gltf.scene, { detach: false })
}

export async function exportCharacterGlb(root, options = {}) {
  const progress = (stage, percent) => options.onProgress?.({ stage, percent })
  progress('audit', 8)
  const audit = auditCharacterRoot(root)
  if (!audit.valid) throw new Error(`角色导出检查失败：${audit.errors.join(', ')}`)
  root.updateMatrixWorld(true)
  progress('pbr', 24)
  const exportClone = await withSerializableUserData(root, () => prepareExportClone(root))
  const exportAudit = auditCharacterRoot(exportClone.root)
  if (!exportAudit.valid) {
    exportClone.dispose()
    throw new Error(`PBR 导出副本检查失败：${exportAudit.errors.join(', ')}`)
  }
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js')
  progress('encode', 42)
  let arrayBuffer
  try {
    arrayBuffer = await new GLTFExporter().parseAsync(exportClone.root, { binary: true, onlyVisible: true, trs: false, animations: options.animations ?? [] })
  } finally {
    exportClone.dispose()
  }
  if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength === 0) throw new Error('GLB 导出结果为空')

  progress('verify', 76)
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, '')
  const roundTrip = inspectRoundTrip(gltf, root.userData.catTraits, (options.animations ?? []).map(clip => clip.name))
  disposeGltf(gltf)
  if (!roundTrip.valid) throw new Error(`GLB 回读检查失败：${roundTrip.errors.join(', ')}`)
  progress('complete', 100)
  return { arrayBuffer, report: { audit, exportAudit, materialProfile: exportClone.report, roundTrip, bytes: arrayBuffer.byteLength } }
}

export function summarizeExportReport(report) {
  const stats = report?.audit?.stats ?? {}
  const megabytes = Number(report?.bytes || 0) / 1024 / 1024
  return `${stats.meshes || 0} 个网格 · ${stats.triangles || 0} 个三角面 · ${megabytes.toFixed(2)} MB`
}

export function downloadGlb(arrayBuffer, filename) {
  const url = URL.createObjectURL(new Blob([arrayBuffer], { type: 'model/gltf-binary' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
