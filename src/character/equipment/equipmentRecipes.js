import { GEAR_TRAITS } from '../../config/traits.js'
import { EQUIPMENT_ATTACHMENTS } from '../../three/EquipmentAttachments.js'
import { GEAR_MODEL_SPECS } from '../../three/EquipmentFactory.js'

const HTML_PROTOTYPES = Object.freeze({
  Camera: '/equipment/Camera.html',
  'Gold Round Glasses': '/equipment/GoldRoundGlasses.html',
  'Hiking Backpack': '/equipment/HikingBackpack.html',
  Ramen: '/equipment/Ramen.html',
  Sake: '/equipment/sake-test.html',
})

export const EQUIPMENT_RECIPES = Object.freeze(Object.fromEntries(GEAR_TRAITS.map(({ id }) => {
  const model = GEAR_MODEL_SPECS[id]
  const attachment = EQUIPMENT_ATTACHMENTS[id]
  return [id, Object.freeze({
    schemaVersion: 1,
    id,
    attachment: Object.freeze({
      socket: attachment.socket,
      handedness: attachment.socket.startsWith('paw-') ? 'left' : 'none',
      position: Object.freeze([...attachment.position]),
      rotation: Object.freeze([...attachment.rotation]),
      scale: attachment.scale,
    }),
    collider: Object.freeze(structuredClone(model.collider)),
    evidence: Object.freeze([
      Object.freeze({ path: model.reference, role: 'front-style-evidence' }),
      ...(HTML_PROTOTYPES[id]
        ? [Object.freeze({ path: HTML_PROTOTYPES[id], role: 'procedural-geometry-prototype' })]
        : []),
    ]),
    fallback: Object.freeze({ missingTexture: 'procedural-material', missingPrototype: 'factory-geometry' }),
  })]
})))

export function getEquipmentRecipe(type) {
  return EQUIPMENT_RECIPES[type] ?? null
}
