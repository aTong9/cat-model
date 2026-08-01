import * as THREE from 'three'

export const FACE_MOTION_DEFAULT = Object.freeze({
  blinkLeft: 0,
  blinkRight: 0,
  gazeX: 0,
  gazeY: 0,
  jawOpen: 0,
  mouthWide: 0,
  mouthRound: 0,
  eyeWideLeft: 0,
  eyeWideRight: 0,
  browLeft: 0,
  browRight: 0,
  blush: 0,
  starEyes: 0,
  actionFace: 0,
})

const clamp01 = value => THREE.MathUtils.clamp(Number(value) || 0, 0, 1)

export function applyFaceMotion(joints = {}, motion = {}) {
  const state = { ...FACE_MOTION_DEFAULT, ...motion }
  const blinkLeft = clamp01(state.blinkLeft)
  const blinkRight = clamp01(state.blinkRight)
  const gazeX = THREE.MathUtils.clamp(Number(state.gazeX) || 0, -1, 1)
  const gazeY = THREE.MathUtils.clamp(Number(state.gazeY) || 0, -1, 1)
  const jawOpen = clamp01(state.jawOpen)
  const mouthWide = THREE.MathUtils.clamp(Number(state.mouthWide) || 0, -1, 1)
  const mouthRound = clamp01(state.mouthRound)
  const eyeWideLeft = THREE.MathUtils.clamp(Number(state.eyeWideLeft) || 0, -1, 1)
  const eyeWideRight = THREE.MathUtils.clamp(Number(state.eyeWideRight) || 0, -1, 1)
  const browLeft = THREE.MathUtils.clamp(Number(state.browLeft) || 0, -1, 1)
  const browRight = THREE.MathUtils.clamp(Number(state.browRight) || 0, -1, 1)
  const blush = clamp01(state.blush)
  const starEyes = clamp01(state.starEyes)
  const actionFace = clamp01(state.actionFace)

  joints.eyeLeft?.rotation.set(-gazeY * .16, gazeX * .20, 0)
  joints.eyeRight?.rotation.set(-gazeY * .16, gazeX * .20, 0)
  for (const [eye, wide] of [[joints.actionEyeLeft, eyeWideLeft], [joints.actionEyeRight, eyeWideRight]]) {
    if (!eye) continue
    eye.rotation.set(-gazeY * .16, gazeX * .20, 0)
    const base = eye.userData.baseScale ?? 1
    const reveal = actionFace >= .5
      ? (starEyes >= .5 ? .001 : Math.max(.001, 1 - starEyes))
      : .001
    eye.scale.set(
      base * reveal * (1 - Math.max(0, wide) * .08),
      base * reveal * (1 + wide * .28),
      base * reveal,
    )
  }
  for (const [star, direction] of [[joints.eyeStarLeft, -1], [joints.eyeStarRight, 1]]) {
    if (!star) continue
    star.rotation.set(-gazeY * .08, gazeX * .10, direction * starEyes * .10)
    const pulse = Math.max(.001, starEyes) * 1.25 * (star.userData.baseScale ?? 1)
    star.scale.setScalar(pulse)
  }
  for (const [eye, wide] of [[joints.eyeLeft, eyeWideLeft], [joints.eyeRight, eyeWideRight]]) {
    if (!eye) continue
    const base = eye.userData.baseScale ?? 1
    const reveal = actionFace >= .5 ? .001 : 1
    eye.scale.set(
      base * reveal * (1 - Math.max(0, wide) * .08),
      base * reveal * (1 + wide * .28),
      base * reveal,
    )
  }
  joints.eyelidLeft?.rotation.set(THREE.MathUtils.lerp(Math.PI / 2, 0, blinkLeft), 0, 0)
  joints.eyelidRight?.rotation.set(THREE.MathUtils.lerp(Math.PI / 2, 0, blinkRight), 0, 0)
  joints.jaw?.rotation.set(jawOpen * .28, 0, 0)
  joints.browLeft?.rotation.set(0, 0, browLeft * .42)
  joints.browRight?.rotation.set(0, 0, -browRight * .42)
  for (const [brow, expression] of [[joints.browLeft, browLeft], [joints.browRight, browRight]]) {
    if (!brow) continue
    const base = brow.userData.baseScale ?? 1
    brow.position.y = brow.userData.restPosition[1] + Math.max(0, expression) * .035
    brow.scale.set(base, Math.max(.01, Math.abs(expression)) * base, base)
  }
  for (const cheek of [joints.cheekLeft, joints.cheekRight]) {
    if (!cheek) continue
    const pulse = Math.max(.01, blush)
    cheek.scale.set(pulse, pulse, pulse)
  }
  if (joints.jaw) {
    const base = joints.jaw.userData.baseScale ?? joints.jaw.scale.x ?? 1
    joints.jaw.scale.set(
      base * (1 + mouthWide * .28 - mouthRound * .10),
      base * (1 + mouthRound * .42 - mouthWide * .08),
      base,
    )
  }

  return {
    blinkLeft, blinkRight, gazeX, gazeY, jawOpen, mouthWide, mouthRound,
    eyeWideLeft, eyeWideRight, browLeft, browRight, blush, starEyes, actionFace,
  }
}

export function resetFaceMotion(joints = {}) {
  return applyFaceMotion(joints, FACE_MOTION_DEFAULT)
}
