import { updateCatTail } from '../tail/createCatTail.js'

// Reference turnaround: upright 2.2-head stylized cat, not the former
// horizontally stretched loaf. This is the frozen neutral-body transform.
export const PACK5_BASE_SCALE = Object.freeze([1.18, .88, .92])
export const PACK5_EAR_BASE_SCALE = Object.freeze([.90, .75, .85])
export const PACK5_FLOOR_Y = -.52
export const PACK5_AUTHORED_FOOT_Y = -.29

export function applyMorphology(parts, morphology = {}) {
  const {
    bodyScale = 1, bodyWidth = 1, bodyHeight = 1, bodyDepth = 1,
    headScale = 1, eyeScale = 1, eyeSpacing = 1, mouthScale = 1,
    earScale = 1, earWidth = 1, earHeight = 1,
    pawScale = 1, footScale = 1, legLength = 1, tailLength = 1, tailCurl = 0,
  } = morphology
  if (parts.morphologyRoot) {
    const morphologyHeight = PACK5_BASE_SCALE[1] * bodyHeight
    parts.morphologyRoot.scale.set(
      PACK5_BASE_SCALE[0] * bodyWidth,
      morphologyHeight,
      PACK5_BASE_SCALE[2] * bodyDepth,
    )
    // Preserve the authored paw-contact plane when changing height. Scaling
    // around the origin made the compressed Pack 5 body float above ground.
    parts.morphologyRoot.position.y = PACK5_FLOOR_Y - morphologyHeight * PACK5_AUTHORED_FOOT_Y
  }
  parts.body?.scale.set(bodyScale, 1, bodyScale)
  parts.head?.scale.setScalar(headScale)
  for (const eye of [parts.eyeLeft, parts.eyeRight]) {
    if (!eye) continue
    const rest = eye.userData.restPosition
    if (rest) eye.position.x = rest[0] * eyeSpacing
    eye.scale.setScalar(1.16 * eyeScale)
    eye.userData.baseScale = 1.16 * eyeScale
  }
  for (const eye of [parts.actionEyeLeft, parts.actionEyeRight]) {
    if (!eye) continue
    const rest = eye.userData.restPosition
    if (rest) eye.position.x = rest[0] * eyeSpacing
    eye.userData.baseScale = 1.16 * eyeScale
    eye.scale.setScalar(.001)
  }
  for (const star of [parts.eyeStarLeft, parts.eyeStarRight]) {
    if (!star) continue
    const rest = star.userData.restPosition
    if (rest) star.position.x = rest[0] * eyeSpacing
    star.userData.baseScale = 1.16 * eyeScale
  }
  for (const brow of [parts.browLeft, parts.browRight]) {
    if (!brow) continue
    const rest = brow.userData.restPosition
    if (rest) brow.position.x = rest[0] * eyeSpacing
    brow.userData.baseScale = 1.16 * eyeScale
    brow.scale.set(1.16 * eyeScale, .01, 1.16 * eyeScale)
  }
  for (const eyelid of [parts.eyelidLeft, parts.eyelidRight]) {
    if (!eyelid) continue
    const rest = eyelid.userData.restPosition
    if (rest) eyelid.position.x = rest[0] * eyeSpacing
    eyelid.scale.setScalar(1.16 * eyeScale)
  }
  if (parts.mouth) {
    parts.mouth.userData.morphologyScale = mouthScale
    const baseScale = (parts.mouth.userData.profileScale ?? 1) * 1.12 * mouthScale
    parts.mouth.userData.baseScale = baseScale
    parts.mouth.scale.setScalar(baseScale)
  }
  // The authored shell is intentionally broad for bevel stability. These
  // reference-derived base factors restore the narrower, slightly tall
  // triangular silhouette seen in the supplied front/side turnaround.
  const earScaleX = PACK5_EAR_BASE_SCALE[0] * earScale * earWidth
  const earScaleY = PACK5_EAR_BASE_SCALE[1] * earScale * earHeight
  const earScaleZ = PACK5_EAR_BASE_SCALE[2] * earScale
  parts.earLeft?.scale.set(earScaleX, earScaleY, earScaleZ)
  parts.earRight?.scale.set(earScaleX, earScaleY, earScaleZ)
  parts.legLeft?.scale.set(1, legLength, 1)
  parts.legRight?.scale.set(1, legLength, 1)
  for (const paw of [
    parts.armLeft?.getObjectByName('ArmLeftPaw'),
    parts.armRight?.getObjectByName('ArmRightPaw'),
  ]) {
    if (!paw) continue
    paw.scale.setScalar(pawScale)
    paw.userData.restScale = [pawScale, pawScale, pawScale]
  }
  for (const foot of [
    parts.legLeft?.getObjectByName('FootLeft'),
    parts.legRight?.getObjectByName('FootRight'),
  ]) {
    if (!foot) continue
    foot.scale.setScalar(footScale)
    foot.userData.restScale = [footScale, footScale, footScale]
  }
  if (parts.armLeft) {
    parts.armLeft.position.x = -0.47 * bodyScale
    parts.armLeft.userData.restPosition = parts.armLeft.position.toArray()
  }
  if (parts.armRight) {
    parts.armRight.position.x = 0.47 * bodyScale
    parts.armRight.userData.restPosition = parts.armRight.position.toArray()
  }
  if (parts.tail) {
    parts.tail.position.x = 0.04 * bodyScale
    parts.tail.position.z = -0.31 * bodyScale
  }
  parts.tail?.scale.set(1, tailLength, 1)
  const previousTailCurl = parts.tail?.userData.tailCurl
  if (parts.tail) parts.tail.userData.tailCurl = tailCurl
  if (previousTailCurl !== tailCurl) updateCatTail(parts.tail, 0, 0, 1)
  return {
    bodyScale, bodyWidth, bodyHeight, bodyDepth, headScale, eyeScale, eyeSpacing,
    mouthScale, earScale, earWidth, earHeight, pawScale, footScale, legLength,
    tailLength, tailCurl,
  }
}
