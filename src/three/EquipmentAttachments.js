export const EQUIPMENT_ATTACHMENTS = Object.freeze({
  'Baseball Cap': { socket: 'head-top', position: [0, -0.015, -0.015], rotation: [-0.16, 0, 0], scale: 0.82 },
  'Gold Round Glasses': { socket: 'face-eyes', position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.94 },
  'Hot Coffee': { socket: 'head-top', position: [0, 0.18, 0.02], rotation: [0, -0.12, 0], scale: 0.92 },
  'Investment Book': { socket: 'head-top', position: [0, 0.20, 0.01], rotation: [0.02, 0, 0], scale: 0.88 },
  'Ramen': { socket: 'head-top', position: [0, 0.20, 0.01], rotation: [0, -0.08, 0], scale: 0.74 },
  'Camera': { socket: 'chest-front', position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.15 },
  'Hiking Backpack': { socket: 'back', position: [0, 0, 0], rotation: [0, Math.PI, 0], scale: 1.12 },
  'Good Luck Gold Bar': { socket: 'paw-left', position: [0, 0, 0], rotation: [0.04, -0.28, -0.12], scale: 1.06 },
  'Sake': { socket: 'head-top', position: [0, 0.19, 0.02], rotation: [0, -0.16, 0], scale: 1.02 },
  'Wealth Gold Bar': { socket: 'paw-left', position: [0, 0, 0], rotation: [0.04, -0.28, -0.12], scale: 1.06 },
})

export function getEquipmentAttachment(type) {
  const profile = EQUIPMENT_ATTACHMENTS[type]
  return profile ? { ...profile, position: [...profile.position], rotation: [...profile.rotation] } : null
}

export function applyEquipmentAttachment(object, type) {
  const profile = EQUIPMENT_ATTACHMENTS[type]
  if (!object || !profile) return false
  object.position.set(...profile.position)
  object.rotation.set(...profile.rotation)
  object.scale.setScalar(profile.scale)
  object.userData.attachment = {
    ...(object.userData.attachment || {}),
    socket: profile.socket,
    position: [...profile.position],
    rotation: [...profile.rotation],
    scale: profile.scale,
  }
  return true
}
