import { updateCatTail } from '../tail/createCatTail.js'

export function applyMorphology(parts, morphology = {}) {
  const { bodyScale = 1, headScale = 1, earScale = 1, legLength = 1, tailLength = 1, tailCurl = 0 } = morphology
  parts.body?.scale.set(bodyScale, 1, bodyScale)
  parts.head?.scale.setScalar(headScale)
  parts.earLeft?.scale.setScalar(earScale)
  parts.earRight?.scale.setScalar(earScale)
  parts.legLeft?.scale.set(1, legLength, 1)
  parts.legRight?.scale.set(1, legLength, 1)
  parts.tail?.scale.set(1, tailLength, 1)
  if (parts.tail) parts.tail.userData.tailCurl = tailCurl
  updateCatTail(parts.tail, 0, 0, 1)
  return { bodyScale, headScale, earScale, legLength, tailLength, tailCurl }
}
