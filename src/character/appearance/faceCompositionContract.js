export const METADATA_EYE_STYLES = Object.freeze([
  'Original', 'Relaxed', 'Alert', 'Blue Ring', 'Sunglasses', 'VR',
])

export const METADATA_FACE_EXPRESSIONS = Object.freeze([
  'Excited', 'Smile', 'Whistling', 'Wow', 'Yum',
])

export const FACE_EQUIPMENT_POLICIES = Object.freeze({
  Sunglasses: Object.freeze({
    'Gold Round Glasses': Object.freeze({ strategy: 'eyes-win', equipmentVisible: false }),
  }),
  VR: Object.freeze({
    'Gold Round Glasses': Object.freeze({ strategy: 'eyes-win', equipmentVisible: false }),
    'Baseball Cap': Object.freeze({ strategy: 'offset-equipment', equipmentVisible: true, offset: Object.freeze([0, 0.08, -0.04]) }),
  }),
})

export function resolveFaceEquipmentPolicy(eyes, gear) {
  return FACE_EQUIPMENT_POLICIES[eyes]?.[gear]
    ?? Object.freeze({ strategy: 'compose', equipmentVisible: true, offset: Object.freeze([0, 0, 0]) })
}
