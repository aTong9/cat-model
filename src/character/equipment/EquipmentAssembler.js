import { createGear, TEXTURE_GEAR_TYPES } from '../../three/EquipmentFactory.js'
import { applyEquipmentAttachment } from '../../three/EquipmentAttachments.js'

export function disposeEquipment(root) {
  if (!root) return
  const geometries = new Set()
  const materials = new Set()
  const textures = new Set()
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry)
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue
      materials.add(material)
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
    }
  })
  root.removeFromParent()
  for (const geometry of geometries) geometry.dispose()
  for (const texture of textures) texture.dispose()
  for (const material of materials) material.dispose()
}

export class EquipmentAssembler {
  constructor(registry, options = {}) {
    this.registry = registry
    this.createGear = options.createGear ?? createGear
    this.supportedTypes = options.supportedTypes ?? TEXTURE_GEAR_TYPES
    this.current = null
    this.type = null
  }

  set(type) {
    if (type === this.type && this.current) return this.current
    this.clear()
    this.type = type || null
    if (!type) return null
    if (!this.supportedTypes.has(type)) return null
    const gear = this.createGear(type)
    if (!gear || !applyEquipmentAttachment(gear, type)) return null
    const socketName = gear.userData.attachment.socket
    const socket = this.registry.getSocket(socketName)
    if (!socket) {
      disposeEquipment(gear)
      throw new Error(`Missing equipment socket: ${socketName}`)
    }
    socket.add(gear)
    this.current = gear
    return gear
  }

  clear() {
    disposeEquipment(this.current)
    this.current = null
    this.type = null
  }

  dispose() { this.clear() }
}
