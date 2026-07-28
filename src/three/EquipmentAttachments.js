export const EQUIPMENT_ATTACHMENTS = Object.freeze({
  'Baseball Cap': { socket: 'head-top', position: [0, 1.285, -0.015], rotation: [-0.16, 0, 0], scale: 0.82 },
  'Gold Round Glasses': { socket: 'face-eyes', position: [0, 0.955, 0.395], rotation: [0, 0, 0], scale: 0.94 },
  'Hot Coffee': { socket: 'head-top', position: [0.18, 1.405, 0.015], rotation: [-0.06, 0, -0.08], scale: 1.05 },
  'Investment Book': { socket: 'head-top', position: [0, 1.315, 0.015], rotation: [-0.10, -0.12, -0.06], scale: 1.05 },
  'Ramen': { socket: 'head-top', position: [0, 1.325, 0.015], rotation: [-0.04, 0, 0], scale: 0.82 },
  'Camera': { socket: 'chest-front', position: [0, 0.57, 0.405], rotation: [0, 0, 0], scale: 0.115 },
  'Hiking Backpack': { socket: 'back', position: [0, 0.47, -0.37], rotation: [0, Math.PI, 0], scale: 0.92 },
  'Good Luck Gold Bar': { socket: 'paw-left', position: [-0.48, 0.18, 0.30], rotation: [0.04, -0.28, -0.12], scale: 1.06 },
  'Sake': { socket: 'paw-left', position: [-0.47, 0.17, 0.31], rotation: [0.08, -0.25, 0.04], scale: 1.28 },
  'Wealth Gold Bar': { socket: 'paw-left', position: [-0.48, 0.18, 0.30], rotation: [0.04, -0.28, -0.12], scale: 1.06 },
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
