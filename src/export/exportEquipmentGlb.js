import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { createEquipmentAnimationClips } from '../character/equipment/equipmentAnimation.js'
import { disposeObject3DResources } from '../character/resources/disposeObject3DResources.js'

export async function exportEquipmentGlb(root, options = {}) {
  if (!root?.isObject3D || !root.userData?.gearType) throw new Error('请先选择一个地面装备')
  const animations = options.animations ?? createEquipmentAnimationClips(root)
  const clone = cloneSkeleton(root)
  clone.position.set(0, 0, 0)
  clone.rotation.set(0, 0, 0)
  clone.scale.set(1, 1, 1)
  clone.updateMatrixWorld(true)
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js')
  const arrayBuffer = await new GLTFExporter().parseAsync(clone, {
    binary: true,
    onlyVisible: true,
    trs: true,
    animations,
  })
  disposeObject3DResources(clone, { detach: false })

  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, '')
  let skinnedMeshes = 0
  let bones = 0
  gltf.scene.traverse(object => {
    if (object.isSkinnedMesh) skinnedMeshes++
    if (object.isBone) bones++
  })
  const animationNames = gltf.animations.map(clip => clip.name)
  const expected = animations.map(clip => clip.name)
  disposeObject3DResources(gltf.scene, { detach: false })
  if (!skinnedMeshes || bones < 3 || expected.some(name => !animationNames.includes(name))) {
    throw new Error('装备 GLB 回读检查失败：骨骼或动画缺失')
  }
  return {
    arrayBuffer,
    report: { gearType: root.userData.gearType, skinnedMeshes, bones, animationNames, bytes: arrayBuffer.byteLength },
  }
}

export function downloadEquipmentGlb(arrayBuffer, equipmentId) {
  const slug = String(equipmentId).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const url = URL.createObjectURL(new Blob([arrayBuffer], { type: 'model/gltf-binary' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `liberty-equipment-${slug}.glb`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
