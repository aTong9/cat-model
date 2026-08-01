const furProfiles = {
  Black: { pattern: 'solid', base: '#53515b', accent: '#29272f', roughness: 0.78 },
  'Blue Lightning Tabby': { pattern: 'lightning-tabby', base: '#59647f', accent: '#75dff2', roughness: 0.70 },
  Calico: { pattern: 'calico', base: '#f5f1e8', accent: '#f0aa52', roughness: 0.82 },
  Golden: { pattern: 'solid', base: '#f4dc7a', accent: '#d5ae35', roughness: 0.72 },
  Gray: { pattern: 'solid', base: '#9999a2', accent: '#696973', roughness: 0.80 },
  'Leopard Patterned': { pattern: 'leopard', base: '#efc66f', accent: '#705a34', roughness: 0.76 },
  Orange: { pattern: 'solid', base: '#f5cda4', accent: '#d98242', roughness: 0.80 },
  Tuxedo: { pattern: 'tuxedo', base: '#62635f', accent: '#2b2c2a', roughness: 0.84 },
}

const eyeProfiles = {
  Original: { family: 'button', primary: '#111111', accent: '#d9a900', roughness: 0.28, metalness: 0.18 },
  Relaxed: { family: 'closed-lines', primary: '#17151b', accent: '#ffffff', roughness: 0.70, metalness: 0 },
  Alert: { family: 'cat-iris', primary: '#e5aa20', accent: '#17130b', roughness: 0.25, metalness: 0.08 },
  'Blue Ring': { family: 'luminous-ring', primary: '#111111', accent: '#42dcec', roughness: 0.18, metalness: 0.12, emissive: '#0b6170', emissiveIntensity: 0.45 },
  Sunglasses: { family: 'glasses', primary: '#09090d', accent: '#ffffff', roughness: 0.12, metalness: 0.42 },
  VR: { family: 'visor', primary: '#080b10', accent: '#d8dce2', roughness: 0.035, metalness: 0.42, emissive: '#00ddea', emissiveIntensity: 1.6 },
  'Big Black': { family: 'oversized', primary: '#0a0a0a', accent: '#ffffff', roughness: 0.12, metalness: 0.05 },
}

export const FUR_APPEARANCE_PROFILES = Object.freeze(furProfiles)
export const EYE_APPEARANCE_PROFILES = Object.freeze(eyeProfiles)

export function getFurAppearanceProfile(style, customColor) {
  if (style === 'Custom') {
    return { pattern: 'solid', base: customColor || '#f4dc7a', accent: customColor || '#f4dc7a', roughness: 0.78 }
  }
  return { ...(furProfiles[style] || furProfiles.Golden) }
}

export function getEyeAppearanceProfile(style) {
  return { ...(eyeProfiles[style] || eyeProfiles.Original) }
}
