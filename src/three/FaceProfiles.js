const profiles = {
  Excited: { family: 'open-fangs', scale: 1.08, mouthWidth: 0.248, mouthHeight: 0.214, hasTongue: true, hasFangs: true },
  Smile: { family: 'curved-smile', scale: 1.10, mouthWidth: 0.184, mouthHeight: 0.058, hasTongue: false, hasFangs: false },
  Whistling: { family: 'pursed-note', scale: 1.06, mouthWidth: 0.086, mouthHeight: 0.086, hasTongue: false, hasFangs: false },
  Wow: { family: 'vertical-open', scale: 1.04, mouthWidth: 0.126, mouthHeight: 0.181, hasTongue: true, hasFangs: false },
  Yum: { family: 'side-lick', scale: 1.08, mouthWidth: 0.180, mouthHeight: 0.102, hasTongue: true, hasFangs: false },
}

export const FACE_APPEARANCE_PROFILES = Object.freeze(profiles)

export function getFaceAppearanceProfile(expression) {
  return { ...(profiles[expression] || profiles.Excited) }
}
