import { updateCatTail } from '../tail/createCatTail.js'

export function applyMorphology(parts, morphology = {}) {
  const { bodyScale = 1, headScale = 1, earScale = 1, legLength = 1, tailLength = 1, tailCurl = 0 } = morphology
  parts.body?.scale.set(bodyScale, 1, bodyScale)
  parts.head?.scale.setScalar(headScale)
  parts.earLeft?.scale.setScalar(earScale)
  parts.earRight?.scale.setScalar(earScale)
  parts.legLeft?.scale.set(1, legLength, 1)
  parts.legRight?.scale.set(1, legLength, 1)
  if (parts.armLeft) parts.armLeft.position.x = -0.32 * bodyScale
  if (parts.armRight) parts.armRight.position.x = 0.32 * bodyScale
  if (parts.tail) {
    parts.tail.position.x = 0.04 * bodyScale
    parts.tail.position.z = -0.31 * bodyScale
  }
  parts.tail?.scale.set(1, tailLength, 1)
  const previousTailCurl = parts.tail?.userData.tailCurl
  if (parts.tail) parts.tail.userData.tailCurl = tailCurl
  if (previousTailCurl !== tailCurl) updateCatTail(parts.tail, 0, 0, 1)
  return { bodyScale, headScale, earScale, legLength, tailLength, tailCurl }
}
