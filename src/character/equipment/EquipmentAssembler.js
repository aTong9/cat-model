import { createGear, TEXTURE_GEAR_TYPES } from '../../three/EquipmentFactory.js'
import { applyEquipmentAttachment } from '../../three/EquipmentAttachments.js'
import { disposeObject3DResources } from '../resources/disposeObject3DResources.js'
import { getEquipmentRecipe } from './equipmentRecipes.js'

export function disposeEquipment(root) {
  return disposeObject3DResources(root)
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
    gear.userData.equipmentRecipe = getEquipmentRecipe(type)
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
