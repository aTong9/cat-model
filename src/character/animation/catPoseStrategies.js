import * as THREE from 'three'
import { applyHandGesture } from '../limbs/createCatPaws.js'
import { applyFaceMotion } from './faceMotion.js'
import { PACK5_SOURCE_DURATIONS } from '../../config/emojiActions.js'

export function createCatPoseStrategies(rig) {
  const strategies = {
    'run': time => updateRun(rig, time),
    'flex': time => updateFlex(rig, time),
    'crouch': time => updateCrouch(rig, time),
    'sit': time => updateSit(rig, time),
    'jump': time => updateJump(rig, time),
    'curious': time => updateCurious(rig, time),
    'stretch': time => updateStretch(rig, time),
    'wave': time => updateWave(rig, time),
  }
  for (const id of EMOJI_POSE_IDS) strategies[id] = time => updateEmojiPose(rig, id, time)
  return strategies
}

export const EMOJI_POSE_IDS = Object.freeze([
  'emoji-abs', 'emoji-jump-rope', 'emoji-dumbbells', 'emoji-pull-up',
  'emoji-bench-press', 'emoji-hula-hoop', 'emoji-boxing', 'emoji-so-cute',
  'emoji-yoga', 'emoji-foodie', 'emoji-backflip', 'emoji-snowboarding',
  'emoji-snow-fight', 'emoji-snowball', 'emoji-so-cold', 'emoji-so-comfy',
])

const PACK5_FACE_SHAPES = Object.freeze({
  'emoji-abs': { mouthWide: -.24, mouthRound: .28, eyeWideLeft: -.18, eyeWideRight: -.18, browLeft: -.72, browRight: -.72 },
  'emoji-jump-rope': { mouthWide: .28, mouthRound: .12, eyeWideLeft: .26, eyeWideRight: .26, browLeft: .34, browRight: .34, blush: .18 },
  'emoji-dumbbells': { mouthWide: -.18, mouthRound: .32, eyeWideLeft: -.25, eyeWideRight: -.25, browLeft: -.82, browRight: -.82 },
  'emoji-pull-up': { mouthWide: -.30, mouthRound: .48, eyeWideLeft: -.34, eyeWideRight: -.34, browLeft: -.92, browRight: -.92 },
  'emoji-bench-press': { mouthWide: -.22, mouthRound: .42, eyeWideLeft: -.30, eyeWideRight: -.30, browLeft: -.84, browRight: -.84 },
  'emoji-hula-hoop': { mouthWide: .36, mouthRound: .04, eyeWideLeft: .18, eyeWideRight: .18, browLeft: .28, browRight: .28, blush: .22 },
  'emoji-boxing': { mouthWide: -.34, mouthRound: .20, eyeWideLeft: -.22, eyeWideRight: -.08, browLeft: -.96, browRight: -.68 },
  'emoji-so-cute': { mouthWide: .48, mouthRound: .04, eyeWideLeft: .48, eyeWideRight: .48, browLeft: .72, browRight: .72, blush: 1, starEyes: .72 },
  'emoji-yoga': { mouthWide: .12, mouthRound: .02, eyeWideLeft: -.42, eyeWideRight: -.42, browLeft: .08, browRight: .08 },
  'emoji-foodie': { mouthWide: .18, mouthRound: .82, eyeWideLeft: .58, eyeWideRight: .58, browLeft: .60, browRight: .60, blush: .32 },
  'emoji-backflip': { mouthWide: -.18, mouthRound: .94, eyeWideLeft: .68, eyeWideRight: .68, browLeft: .82, browRight: .82 },
  'emoji-snowboarding': { mouthWide: .12, mouthRound: .18, eyeWideLeft: .08, eyeWideRight: .08, browLeft: -.18, browRight: .34 },
  'emoji-snow-fight': { mouthWide: .20, mouthRound: .34, eyeWideLeft: -.08, eyeWideRight: .28, browLeft: -.34, browRight: .58 },
  'emoji-snowball': { mouthWide: .16, mouthRound: .34, eyeWideLeft: .42, eyeWideRight: .42, browLeft: .38, browRight: .38, starEyes: .82 },
  'emoji-so-cold': { mouthWide: -.30, mouthRound: .46, eyeWideLeft: -.34, eyeWideRight: -.34, browLeft: -.54, browRight: -.54 },
  'emoji-so-comfy': { mouthWide: .34, mouthRound: .02, eyeWideLeft: -.52, eyeWideRight: -.52, browLeft: .32, browRight: .32 },
})

function setLimb(rig, partId, root = [0, 0, 0], middle = [0, 0, 0], end = [0, 0, 0]) {
  const part = rig.parts[partId === 'arm-left' ? 'armLeft' : partId === 'arm-right' ? 'armRight' : partId === 'leg-left' ? 'legLeft' : 'legRight']
  if (part) part.rotation.set(...root)
  const joints = rig.getJointsFor(part)
  const mid = joints.elbow ?? joints.knee
  const tip = joints.wrist ?? joints.ankle
  if (mid) mid.rotation.set(...middle)
  if (tip) tip.rotation.set(...end)
}

const contactTarget = new THREE.Vector3()
const contactJoint = new THREE.Vector3()
const contactTip = new THREE.Vector3()
const contactA = new THREE.Vector2()
const contactB = new THREE.Vector2()

/**
 * Small planar CCD pass for authored front-facing contacts. Unlike fixed Euler
 * poses, this keeps a wrist on the same bar grip when body proportions change.
 */
function solveArmContact2D(rig, partId, target, iterations = 12) {
  const part = partId === 'arm-left' ? rig.parts.armLeft : rig.parts.armRight
  const joints = rig.getJoints(partId)
  if (!part || !joints.elbow || !joints.wrist) return
  contactTarget.set(...target)
  for (let iteration = 0; iteration < iterations; iteration++) {
    for (const pivot of [joints.elbow, part]) {
      rig.root.updateWorldMatrix(true, true)
      pivot.getWorldPosition(contactJoint)
      joints.wrist.getWorldPosition(contactTip)
      contactA.set(contactTip.x - contactJoint.x, contactTip.y - contactJoint.y)
      contactB.set(contactTarget.x - contactJoint.x, contactTarget.y - contactJoint.y)
      if (contactA.lengthSq() < 1e-8 || contactB.lengthSq() < 1e-8) continue
      contactA.normalize()
      contactB.normalize()
      const cross = contactA.x * contactB.y - contactA.y * contactB.x
      const dot = THREE.MathUtils.clamp(contactA.dot(contactB), -1, 1)
      pivot.rotation.z += Math.atan2(cross, dot)
    }
  }
}

function updateEmojiPose(rig, id, time) {
  const parameters = rig.getActionParameters?.(id) ?? { speed: 1, intensity: 1, rootMotion: 1, propScale: 1 }
  time *= parameters.speed
  const sourceDuration = PACK5_SOURCE_DURATIONS[id] ?? 1.5
  const sourcePhase = (((time % sourceDuration) + sourceDuration) % sourceDuration) / sourceDuration
  const s = Math.sin(sourcePhase * Math.PI * 2)
  const fast = Math.sin(sourcePhase * Math.PI * 4)
  const face = motion => applyFaceMotion(rig.getJoints('face'), {
    actionFace: 1,
    ...PACK5_FACE_SHAPES[id],
    ...motion,
  })
  rig.root.scale.set(1, 1, 1)
  if (rig.parts.head) rig.parts.head.rotation.set(0, 0, 0)
  const arms = (left, right = left) => {
    setLimb(rig, 'arm-left', left[0], left[1], left[2])
    setLimb(rig, 'arm-right', right[0], right[1], right[2])
  }
  const legs = (left, right = left) => {
    setLimb(rig, 'leg-left', left[0], left[1], left[2])
    setLimb(rig, 'leg-right', right[0], right[1], right[2])
  }
  const handGesture = (left, right = left, amount = 1) => {
    applyHandGesture(rig.getJointsFor(rig.parts.armLeft), left, amount)
    applyHandGesture(rig.getJointsFor(rig.parts.armRight), right, amount)
  }
  if (id === 'emoji-abs') {
    const crunch = (1 - Math.cos(sourcePhase * Math.PI * 2)) * .5
    face({ blinkLeft: .42 + crunch*.34, blinkRight: .42 + crunch*.34, gazeY: -.15, jawOpen: .18 + crunch*.24 })
    handGesture('fist')
    const restY = rig.root.userData.restPosition?.[1] ?? 0
    rig.root.position.set(0, restY + .01 + crunch * .06, -.12)
    rig.root.rotation.x = .38 + crunch * .20
    rig.root.rotation.z = -.06
    rig.root.scale.set(1.01, .99 - crunch * .05, 1.01)
    if (rig.parts.head) rig.parts.head.rotation.x = -.06 - crunch * .16
    arms(
      [[-.32,0,-.48],[.62+crunch*.18,0,-.44],[-.16,0,-.08]],
      [[-.32,0,.48],[.62+crunch*.18,0,.44],[-.16,0,.08]],
    )
    rig.parts.armLeft.position.x = -.34
    rig.parts.armRight.position.x = .34
    rig.parts.armLeft.position.y = .54
    rig.parts.armRight.position.y = .54
    rig.parts.armLeft.getObjectByName('ArmLeftPaw')?.scale.setScalar(.50)
    rig.parts.armRight.getObjectByName('ArmRightPaw')?.scale.setScalar(.50)
    legs(
      [[-.38,0,-.12],[.90+crunch*.16,0,0],[-.34,Math.PI,0]],
      [[-.38,0,.12],[.90+crunch*.16,0,0],[-.34,Math.PI,0]],
    )
    rig.parts.legLeft.position.set(-.30, -.04, .22)
    rig.parts.legRight.position.set(.30, -.04, .22)
    rig.parts.legLeft.getObjectByName('FootLeft')?.scale.setScalar(.72)
    rig.parts.legRight.getObjectByName('FootRight')?.scale.setScalar(.72)
  } else if (id === 'emoji-jump-rope') {
    face({ blinkLeft: Math.max(0, fast) ** 8, blinkRight: Math.max(0, fast) ** 8, jawOpen: .22 })
    handGesture('grip')
    const restY = rig.root.userData.restPosition?.[1] ?? 0
    rig.root.position.y = restY + Math.abs(fast) * .065
    rig.root.scale.set(1, 1 + Math.abs(fast) * .035, 1)
    arms([[.05,0,-.48],[.20,0,-.16],[0,0,s*.35]], [[.05,0,.48],[.20,0,.16],[0,0,-s*.35]])
    const leftLift = Math.max(0, fast)
    const rightLift = Math.max(0, -fast)
    legs(
      [[-.10-leftLift*.22,0,-.03],[.20+leftLift*.48,0,0],[-.14-leftLift*.20,0,0]],
      [[-.10-rightLift*.22,0,.03],[.20+rightLift*.48,0,0],[-.14-rightLift*.20,0,0]],
    )
    rig.parts.legLeft.position.y += leftLift * .15
    rig.parts.legRight.position.y += rightLift * .15
  } else if (id === 'emoji-dumbbells') {
    face({ blinkLeft: .55, blinkRight: .55, jawOpen: .38 })
    handGesture('grip')
    const leftCurl = (s + 1) * .5
    const rightCurl = 1 - leftCurl
    arms([[-.48,0,-.42],[.22,0,-.58],[0,0,-.12]], [[-.48,0,.42],[.22,0,.58],[0,0,.12]])
    rig.parts.armLeft.position.z = (rig.parts.armLeft.userData.restPosition?.[2] ?? .12) + .24
    rig.parts.armRight.position.z = (rig.parts.armRight.userData.restPosition?.[2] ?? .12) + .24
    rig.parts.armLeft.getObjectByName('ArmLeftPaw')?.scale.setScalar(.68)
    rig.parts.armRight.getObjectByName('ArmRightPaw')?.scale.setScalar(.68)
    legs([[0,0,-.04],[.08,0,0],[-.05,0,0]], [[0,0,.04],[.08,0,0],[-.05,0,0]])
    rig.root.updateWorldMatrix(true, true)
    const leftTarget = rig.parts.armLeft.getWorldPosition(new THREE.Vector3())
      .add(new THREE.Vector3(.05, THREE.MathUtils.lerp(-.22, .18, leftCurl), .18))
    const rightTarget = rig.parts.armRight.getWorldPosition(new THREE.Vector3())
      .add(new THREE.Vector3(-.05, THREE.MathUtils.lerp(-.22, .18, rightCurl), .18))
    solveArmContact2D(rig, 'arm-left', leftTarget.toArray(), 24)
    solveArmContact2D(rig, 'arm-right', rightTarget.toArray(), 24)
  } else if (id === 'emoji-pull-up') {
    face({ blinkLeft: .72, blinkRight: .72, gazeY: .35, jawOpen: .44 })
    handGesture('grip')
    const pull = (s + 1) * .5
    const restY = rig.root.userData.restPosition?.[1] ?? 0
    rig.root.position.y = restY + .28 + pull * .18
    rig.parts.armLeft.position.z = (rig.parts.armLeft.userData.restPosition?.[2] ?? .12) + .30
    rig.parts.armRight.position.z = (rig.parts.armRight.userData.restPosition?.[2] ?? .12) + .30
    rig.parts.armLeft.getObjectByName('ArmLeftPaw')?.scale.setScalar(.62)
    rig.parts.armRight.getObjectByName('ArmRightPaw')?.scale.setScalar(.62)
    arms(
      [[0,0,-2.34],[0,0,.78-pull*.55],[0,0,-.08]],
      [[0,0,2.34],[0,0,-.78+pull*.55],[0,0,.08]],
    )
    legs(
      [[-.03-pull*.24,0,-.04],[.12+pull*.62,0,0],[-.10-pull*.20,0,0]],
      [[-.03-pull*.24,0,.04],[.12+pull*.62,0,0],[-.10-pull*.20,0,0]],
    )
    rig.root.updateWorldMatrix(true, true)
    const pullBar = rig.actionProps?.props?.['emoji-pull-up']?.getObjectByName('PullUpBar')
    const barCenter = pullBar?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0, .98, .42)
    solveArmContact2D(rig, 'arm-left', [barCenter.x - .36, barCenter.y, barCenter.z + .10], 36)
    solveArmContact2D(rig, 'arm-right', [barCenter.x + .36, barCenter.y, barCenter.z + .10], 36)
  } else if (id === 'emoji-bench-press') {
    face({ blinkLeft: .55, blinkRight: .55, gazeY: .45, jawOpen: .36 })
    handGesture('grip')
    const press = (s + 1) * .5
    const restY = rig.root.userData.restPosition?.[1] ?? 0
    rig.root.position.set(0, restY + .16, -.18)
    // The source is viewed from above, while the editor's default camera is
    // frontal. A readable half-recline preserves the face, chest, wrists and
    // bar in one projection; a full ±90° turn exposes only the crown/underside.
    rig.root.rotation.x = .52
    rig.root.rotation.z = -.10
    const armLeftRest = rig.parts.armLeft.userData.restPosition ?? [-.32, .76, .12]
    const armRightRest = rig.parts.armRight.userData.restPosition ?? [.32, .76, .12]
    rig.parts.armLeft.position.y = armLeftRest[1] - .18
    rig.parts.armRight.position.y = armRightRest[1] - .18
    rig.parts.armLeft.position.z = armLeftRest[2] + .08
    rig.parts.armRight.position.z = armRightRest[2] + .08
    rig.parts.armLeft.getObjectByName('ArmLeftPaw')?.scale.setScalar(.46)
    rig.parts.armRight.getObjectByName('ArmRightPaw')?.scale.setScalar(.46)
    if (rig.parts.head) rig.parts.head.rotation.x = .28
    arms(
      [[-.18,0,-.92],[.12,0,-.78+press*.52],[0,0,-.08]],
      [[-.18,0,.92],[.12,0,.78-press*.52],[0,0,.08]],
    )
    legs(
      [[-.36,0,-.12],[.72,0,0],[-.28,Math.PI,0]],
      [[-.36,0,.12],[.72,0,0],[-.28,Math.PI,0]],
    )
    rig.parts.legLeft.getObjectByName('FootLeft')?.scale.setScalar(.78)
    rig.parts.legRight.getObjectByName('FootRight')?.scale.setScalar(.78)
    rig.parts.legLeft.position.x = -.29
    rig.parts.legRight.position.x = .29
    rig.parts.legLeft.position.y = -.04
    rig.parts.legRight.position.y = -.04
  } else if (id === 'emoji-hula-hoop') {
    const hipOrbitX = Math.cos(sourcePhase * Math.PI * 2)
    const hipOrbitZ = Math.sin(sourcePhase * Math.PI * 2)
    const armLift = (1 - Math.cos(sourcePhase * Math.PI * 2)) * .5
    face({
      blinkLeft: Math.max(0, -fast) ** 10 * .82,
      blinkRight: Math.max(0, -fast) ** 10 * .82,
      gazeX: hipOrbitX * .18,
      jawOpen: .18,
    })
    handGesture('open')
    const rest = rig.root.userData.restPosition ?? [0, 0, 0]
    rig.root.position.set(rest[0] + hipOrbitX * .028, rest[1], rest[2] + hipOrbitZ * .025)
    rig.root.rotation.set(hipOrbitZ * .035, hipOrbitX * .055, hipOrbitX * .075)
    rig.root.scale.set(1.02 + hipOrbitX * .025, .99, 1.02 - hipOrbitX * .02)
    if (rig.parts.head) rig.parts.head.rotation.z = -hipOrbitX * .09
    arms(
      [[-.10-armLift*.34,0,-.70-armLift*.38],[.24+armLift*.18,0,-.20],[0,0,-.10]],
      [[-.10-armLift*.34,0,.70+armLift*.38],[.24+armLift*.18,0,.20],[0,0,.10]],
    )
    legs(
      [[0,0,-.10+hipOrbitX*.06],[.12+Math.max(0,hipOrbitZ)*.08,0,0]],
      [[0,0,.10+hipOrbitX*.06],[.12+Math.max(0,-hipOrbitZ)*.08,0,0]],
    )
  } else if (id === 'emoji-boxing') {
    face({ blinkLeft: .58, blinkRight: .42, gazeX: s * .18, jawOpen: .2 })
    handGesture('fist')
    const punch = Math.max(0, s)
    arms([[-.35-punch*.35,0,-.55],[.4-punch*.3,0,-.35],[0,0,0]], [[-.35-(1-punch)*.35,0,.55],[.4-(1-punch)*.3,0,.35],[0,0,0]])
    legs([[0,0,-.12],[.18,0,0]], [[0,0,.12],[.18,0,0]])
  } else if (id === 'emoji-so-cute') {
    const cuddle = (s + 1) * .5
    face({ gazeY: .18, jawOpen: .08, blush: .72 + cuddle * .28 })
    applyHandGesture(rig.getJointsFor(rig.parts.armLeft), cuddle > .64 ? 'pinch' : 'fist')
    applyHandGesture(rig.getJointsFor(rig.parts.armRight), cuddle < .36 ? 'pinch' : 'fist')
    if (rig.parts.head) rig.parts.head.rotation.set(-.05, 0, -.2+s*.025)
    arms([[-.72,0,-1.02],[.56,0,-.48],[0,0,-1.08]], [[-.72,0,1.02],[.56,0,.48],[0,0,1.08]])
    rig.parts.armLeft.position.z = (rig.parts.armLeft.userData.restPosition?.[2] ?? .12) + .34
    rig.parts.armRight.position.z = (rig.parts.armRight.userData.restPosition?.[2] ?? .12) + .34
    rig.parts.armLeft.getObjectByName('ArmLeftPaw')?.scale.setScalar(.55)
    rig.parts.armRight.getObjectByName('ArmRightPaw')?.scale.setScalar(.55)
    legs([[0,0,-.04],[.08,0,0]], [[0,0,.04],[.08,0,0]])
    rig.root.updateWorldMatrix(true, true)
    const cheekLift = .015 + cuddle * .020
    const leftCheek = rig.root.localToWorld(new THREE.Vector3(-.31, .91 + cheekLift, .48))
    const rightCheek = rig.root.localToWorld(new THREE.Vector3(.31, .91 + cheekLift, .48))
    solveArmContact2D(rig, 'arm-left', leftCheek.toArray())
    solveArmContact2D(rig, 'arm-right', rightCheek.toArray())
  } else if (id === 'emoji-yoga') {
    const calmBlink = .18 + ((s + 1) * .5) * .80
    face({ blinkLeft: calmBlink, blinkRight: calmBlink, gazeY: -.12, jawOpen: .04 })
    handGesture('open')
    const balance = Math.sin(sourcePhase * Math.PI * 2) * .035
    const rest = rig.root.userData.restPosition ?? [0, 0, 0]
    rig.root.position.set(rest[0] + .035 + balance, rest[1] + .025, rest[2])
    rig.root.rotation.z = .075 + balance
    if (rig.parts.head) rig.parts.head.rotation.z = -.10 - balance
    arms(
      [[-.12,0,-1.34+balance],[.10,0,-.12],[0,0,-.06]],
      [[-.12,0,1.34+balance],[.10,0,.12],[0,0,.06]],
    )
    // Pack 5 uses a standing balance: the screen-left paw is lifted sideways,
    // while the other remains the planted support. A large hip Z rotation is
    // necessary because the bind leg points down.
    legs(
      [[-.10,0,-.74],[.48,0,-.14],[-.18,0,0]],
      [[.02,0,.05],[.12,0,0],[-.08,0,0]],
    )
    rig.parts.legLeft.position.y = (rig.parts.legLeft.userData.restPosition?.[1] ?? .08) + .16
    rig.parts.legLeft.getObjectByName('FootLeft')?.scale.setScalar(.55)
    rig.parts.legRight.getObjectByName('FootRight')?.scale.setScalar(.65)
  } else if (id === 'emoji-foodie') {
    const bowlLift = (1 - Math.cos(sourcePhase * Math.PI * 2)) * .5
    face({ gazeY: -.28, jawOpen: .30 + bowlLift * .42 })
    handGesture('cup')
    if (rig.parts.head) rig.parts.head.rotation.x = .02 + bowlLift * .10
    const bowlSpread = .50 + bowlLift * .12
    arms(
      [[-.10-bowlLift*.18,0,-bowlSpread],[.38,0,-.38],[-.10,0,-.08]],
      [[-.10-bowlLift*.18,0,bowlSpread],[.38,0,.38],[-.10,0,.08]],
    )
    rig.parts.armLeft.position.z = (rig.parts.armLeft.userData.restPosition?.[2] ?? .12) + .26
    rig.parts.armRight.position.z = (rig.parts.armRight.userData.restPosition?.[2] ?? .12) + .26
    rig.parts.armLeft.getObjectByName('ArmLeftPaw')?.scale.setScalar(.50)
    rig.parts.armRight.getObjectByName('ArmRightPaw')?.scale.setScalar(.50)
    rig.root.updateWorldMatrix(true, true)
    const foodLeft = rig.root.localToWorld(new THREE.Vector3(-.18, -.18 + bowlLift * .04, .49))
    const foodRight = rig.root.localToWorld(new THREE.Vector3(.18, -.18 + bowlLift * .04, .49))
    solveArmContact2D(rig, 'arm-left', foodLeft.toArray(), 26)
    solveArmContact2D(rig, 'arm-right', foodRight.toArray(), 26)
    legs([[0,0,-.04],[.08,0,0]], [[0,0,.04],[.08,0,0]])
  } else if (id === 'emoji-backflip') {
    face({ gazeY: .35, jawOpen: .68 })
    handGesture('open')
    const phase = ((time % 1.6) + 1.6) % 1.6 / 1.6
    const flightPhase = THREE.MathUtils.clamp((phase - .10) / .62, 0, 1)
    const airborne = Math.sin(flightPhase * Math.PI)
    const crouch = phase < .10 ? Math.sin(phase / .10 * Math.PI) : phase > .72 ? Math.sin(THREE.MathUtils.clamp((phase - .72) / .20, 0, 1) * Math.PI) : 0
    const tuck = Math.sin(flightPhase * Math.PI) ** 2
    const flipAlpha = THREE.MathUtils.clamp((phase - .12) / .54, 0, 1)
    const easedFlip = flipAlpha * flipAlpha * (3 - 2 * flipAlpha)
    const restY = rig.root.userData.restPosition?.[1] ?? 0
    rig.root.position.y = restY - crouch * .09 + airborne * .42
    rig.root.rotation.x = easedFlip * Math.PI * 2
    rig.root.scale.set(1.01 - tuck * .10, 1 - crouch * .12 - tuck * .10, 1 - tuck * .08)
    if (rig.parts.head) rig.parts.head.rotation.x = -.08 - tuck * .16
    const armSpread = .42 + airborne * 1.04
    arms(
      [[-.18,0,-armSpread],[.30+tuck*.18,0,-.16],[-.10,0,-.08]],
      [[-.18,0,armSpread],[.30+tuck*.18,0,.16],[-.10,0,.08]],
    )
    const kneeBend = crouch * .82 + tuck * 1.08
    legs(
      [[-.18-tuck*.28,0,-.08],[.18+kneeBend,0,0],[-.18-tuck*.30,0,0]],
      [[-.18-tuck*.28,0,.08],[.18+kneeBend,0,0],[-.18-tuck*.30,0,0]],
    )
  } else if (id === 'emoji-snowboarding') {
    const launch = THREE.MathUtils.smoothstep(sourcePhase, .16, .30)
    const land = THREE.MathUtils.smoothstep(sourcePhase, .68, .88)
    const flight = Math.sin(THREE.MathUtils.clamp((sourcePhase - .20) / .62, 0, 1) * Math.PI)
    const spinProgress = THREE.MathUtils.smoothstep(sourcePhase, .20, .76)
    face({
      blinkLeft: flight > .55 ? .62 : .18,
      blinkRight: flight > .55 ? .62 : .18,
      gazeX: -.25 + s * .12,
      jawOpen: .14 + flight * .38,
    })
    handGesture('open')
    const restY = rig.root.userData.restPosition?.[1] ?? 0
    rig.root.position.y = restY + flight * .38
    // Advance continuously through the aerial rotation. The old boolean-like
    // launch value snapped straight to 2π and visually looked like an up/down
    // hop even though the sampled export contained a rotation.
    rig.root.rotation.x = spinProgress * Math.PI * 2
    rig.root.rotation.z = -.12 + s * .13
    rig.root.rotation.y = s * .10
    if (rig.parts.head) rig.parts.head.rotation.z = -s * .10
    const tuck = flight * .48
    arms(
      [[-.05,0,-.92+s*.08],[.18+tuck,0,-.12]],
      [[-.05,0,.92+s*.08],[.18+tuck,0,.12]],
    )
    legs(
      [[-.18-tuck*.24,0,-.18],[.52+tuck,0,0],[-.28,0,0]],
      [[-.18-tuck*.24,0,.18],[.52+tuck,0,0],[-.28,0,0]],
    )
  } else if (id === 'emoji-snow-fight') {
    const cover = 1 - THREE.MathUtils.smoothstep(sourcePhase, .20, .34)
    const throwWindup = THREE.MathUtils.smoothstep(sourcePhase, .28, .48) * (1 - THREE.MathUtils.smoothstep(sourcePhase, .58, .70))
    const throwRelease = THREE.MathUtils.smoothstep(sourcePhase, .52, .70)
    face({
      blinkLeft: cover * .92,
      blinkRight: cover * .92,
      gazeX: .28,
      jawOpen: .12 + throwRelease * .42,
    })
    applyHandGesture(rig.getJointsFor(rig.parts.armLeft), cover > .45 ? 'open' : 'cup')
    applyHandGesture(rig.getJointsFor(rig.parts.armRight), throwRelease > .45 ? 'open' : 'cup')
    if (rig.parts.head) rig.parts.head.rotation.set(0, -.12 + throwRelease * .20, cover * .08)
    arms(
      [[-.22,0,-.48-cover*.58],[.34+cover*.28,0,-.18],[0,0,-cover*.28]],
      [[-.18-throwWindup*.28,0,.52+throwWindup*.78-throwRelease*.92],[.42,0,.28],[0,0,throwRelease*.35]],
    )
    legs(
      [[0,0,-.12],[.18+throwWindup*.12,0,0]],
      [[0,0,.12],[.18,0,0]],
    )
  } else if (id === 'emoji-snowball') {
    const growth = THREE.MathUtils.smoothstep(sourcePhase, .05, .82)
    const step = Math.sin(sourcePhase * Math.PI * 4)
    face({
      blinkLeft: .04,
      blinkRight: .04,
      gazeX: .38,
      gazeY: -.08,
      jawOpen: .18 + growth * .34,
      eyeWideLeft: .54,
      eyeWideRight: .54,
      starEyes: .82 + Math.max(0, fast) * .18,
    })
    handGesture('cup')
    const rest = rig.root.userData.restPosition ?? [0, 0, 0]
    rig.root.position.set(rest[0] - .10 + growth * .18, rest[1] + Math.abs(step) * .025, rest[2])
    rig.root.rotation.set(.04, -.12, -.10 - growth * .05)
    if (rig.parts.head) rig.parts.head.rotation.set(.04, -.10, .08)
    arms(
      [[-.30,0,-.78],[.42,0,-.26],[0,0,-.12]],
      [[-.30,0,.78],[.42,0,.26],[0,0,.12]],
    )
    rig.parts.armLeft.position.x += .16
    rig.parts.armRight.position.x -= .16
    rig.parts.armLeft.position.y -= .15
    const leftStep = Math.max(0, step)
    const rightStep = Math.max(0, -step)
    legs(
      [[-.10-leftStep*.20,0,-.08],[.24+leftStep*.34,0,0],[-.12,0,0]],
      [[-.10-rightStep*.20,0,.08],[.24+rightStep*.34,0,0],[-.12,0,0]],
    )
    const snowballProp = rig.actionProps?.props?.['emoji-snowball']
    const snowballScale = .60 + growth * .60
    if (snowballProp) {
      snowballProp.position.set(.30 + growth * .14, .60 - growth * .03, .30)
      snowballProp.children[0]?.scale.setScalar(snowballScale)
    }
    rig.root.updateWorldMatrix(true, true)
    const radius = .38 * snowballScale
    const center = snowballProp?.getWorldPosition(new THREE.Vector3())
      ?? new THREE.Vector3(.30 + growth * .14, .60 - growth * .03, .30)
    const upperContact = center.clone().add(new THREE.Vector3(-radius * .28, radius * .46, 0))
    const lowerContact = center.clone().add(new THREE.Vector3(-radius * .72, radius * .42, 0))
    solveArmContact2D(rig, 'arm-left', upperContact.toArray(), 30)
    solveArmContact2D(rig, 'arm-right', lowerContact.toArray(), 30)
  } else if (id === 'emoji-so-cold') {
    const shiverBlink = .25 + Math.max(0, fast) * .5
    face({ blinkLeft: shiverBlink, blinkRight: shiverBlink, jawOpen: .3 + Math.abs(fast) * .15 })
    handGesture('grip')
    const restX = rig.root.userData.restPosition?.[0] ?? 0
    rig.root.position.x = restX + fast * .012
    if (rig.parts.head) rig.parts.head.rotation.z = fast*.035
    arms([[-.15,0,-.55+fast*.04],[.58,0,-.42],[0,0,0]], [[-.15,0,.55+fast*.04],[.58,0,.42],[0,0,0]])
    legs([[0,0,-.03+fast*.025],[.12,0,0]], [[0,0,.03+fast*.025],[.12,0,0]])
    rig.parts.armLeft.position.x = -.12
    rig.parts.armRight.position.x = .12
    rig.parts.armLeft.position.y = (rig.parts.armLeft.userData.restPosition?.[1] ?? 0) - .30
    rig.parts.armRight.position.y = (rig.parts.armRight.userData.restPosition?.[1] ?? 0) - .30
    rig.parts.armLeft.position.z = (rig.parts.armLeft.userData.restPosition?.[2] ?? .12) + .28
    rig.parts.armRight.position.z = (rig.parts.armRight.userData.restPosition?.[2] ?? .12) + .28
    rig.parts.armLeft.getObjectByName('ArmLeftPaw')?.scale.setScalar(.50)
    rig.parts.armRight.getObjectByName('ArmRightPaw')?.scale.setScalar(.50)
    rig.root.updateWorldMatrix(true, true)
    const coldLeft = rig.root.localToWorld(new THREE.Vector3(.045 + fast * .008, -.34, .48))
    const coldRight = rig.root.localToWorld(new THREE.Vector3(-.045 + fast * .008, -.38, .50))
    solveArmContact2D(rig, 'arm-left', coldLeft.toArray(), 26)
    solveArmContact2D(rig, 'arm-right', coldRight.toArray(), 26)
  } else {
    face({ blinkLeft: .82, blinkRight: .82, gazeY: -.18, jawOpen: .02, blush: .12 })
    handGesture('cup')
    const restY = rig.root.userData.restPosition?.[1] ?? 0
    rig.root.position.y = restY - .10
    rig.root.scale.set(1.04, .91+Math.sin(sourcePhase*Math.PI*2)*.008, 1.03)
    if (rig.parts.head) rig.parts.head.rotation.set(.09, 0, s*.02)
    arms([[-.10,0,-.48],[.52,0,-.34],[-.08,0,-.05]], [[-.10,0,.48],[.52,0,.34],[-.08,0,.05]])
    legs([[-.35,0,-.18],[.82,0,0],[-.4,0,0]], [[-.35,0,.18],[.82,0,0],[-.4,0,0]])
    rig.parts.armLeft.position.z = (rig.parts.armLeft.userData.restPosition?.[2] ?? .12) + .24
    rig.parts.armRight.position.z = (rig.parts.armRight.userData.restPosition?.[2] ?? .12) + .24
    rig.parts.armLeft.position.y = (rig.parts.armLeft.userData.restPosition?.[1] ?? 0) - .20
    rig.parts.armRight.position.y = (rig.parts.armRight.userData.restPosition?.[1] ?? 0) - .20
    rig.parts.armLeft.position.x = -.18
    rig.parts.armRight.position.x = .18
    rig.parts.armLeft.getObjectByName('ArmLeftPaw')?.scale.setScalar(.62)
    rig.parts.armRight.getObjectByName('ArmRightPaw')?.scale.setScalar(.62)
    rig.root.updateWorldMatrix(true, true)
    // Match the source performance: the paws rest on the lower belly, leaving
    // the eyes and muzzle unobstructed while the side cushions cradle the body.
    const comfyLeft = rig.root.localToWorld(new THREE.Vector3(-.22, -.32, .48))
    const comfyRight = rig.root.localToWorld(new THREE.Vector3(.22, -.32, .48))
    solveArmContact2D(rig, 'arm-left', comfyLeft.toArray(), 26)
    solveArmContact2D(rig, 'arm-right', comfyRight.toArray(), 26)
  }
  applyActionParameters(rig, parameters)
  rig.actionProps?.update(id, time, rig, parameters)
  rig.updateTail(time, id === 'emoji-so-cold' ? .025 : .05, id === 'emoji-so-cold' ? 7 : 1.4)
}

function applyActionParameters(rig, parameters) {
  const intensity = parameters.intensity
  const rootMotion = parameters.rootMotion
  const restX = rig.root.userData.restPosition?.[0] ?? 0
  const restY = rig.root.userData.restPosition?.[1] ?? 0
  const restZ = rig.root.userData.restPosition?.[2] ?? 0
  rig.root.position.x = restX + (rig.root.position.x - restX) * rootMotion
  rig.root.position.y = restY + (rig.root.position.y - restY) * rootMotion
  rig.root.position.z = restZ + (rig.root.position.z - restZ) * rootMotion
  rig.root.rotation.x *= rootMotion
  rig.root.rotation.y *= rootMotion
  rig.root.rotation.z *= rootMotion
  rig.root.scale.set(
    1 + (rig.root.scale.x - 1) * intensity,
    1 + (rig.root.scale.y - 1) * intensity,
    1 + (rig.root.scale.z - 1) * intensity,
  )
  for (const part of [rig.parts.head, rig.parts.armLeft, rig.parts.armRight, rig.parts.legLeft, rig.parts.legRight]) {
    if (!part) continue
    part.rotation.x *= intensity
    part.rotation.y *= intensity
    part.rotation.z *= intensity
  }
  for (const partId of ['arm-left', 'arm-right', 'leg-left', 'leg-right']) {
    const joints = rig.getJoints(partId)
    for (const key of ['elbow', 'wrist', 'knee', 'ankle']) {
      const joint = joints[key]
      if (!joint) continue
      joint.rotation.x *= intensity
      joint.rotation.y *= intensity
      joint.rotation.z *= intensity
    }
  }
}

function updateRun(rig, time) {
    const cycle = time * 10 * rig.getRunSpeed()
    const pulse = Math.abs(Math.sin(cycle)) * 0.026
    rig.root.scale.set(1.05 - pulse * 0.25, 1.02 + pulse, 1 - pulse * 0.18)
    if (rig.parts.head) {
      rig.parts.head.rotation.set(-0.055 + Math.cos(cycle * 2) * 0.018, 0, Math.sin(cycle * 0.5) * 0.035)
    }
    applyHandGesture(rig.getJoints('arm-left'), 'neutral')
    applyHandGesture(rig.getJoints('arm-right'), 'neutral')
    for (const [ear, side] of [[rig.parts.earLeft, -1], [rig.parts.earRight, 1]]) {
      if (!ear) continue
      ear.rotation.z = side * 0.055 + Math.cos(cycle * 2 + side * 0.2) * 0.075
      ear.rotation.x = -0.10 + Math.sin(cycle * 2) * 0.055
    }
    ;[[rig.parts.armLeft, -1, 0], [rig.parts.armRight, 1, Math.PI]].forEach(([arm, side, offset]) => {
      if (!arm) return
      const swing = Math.sin(cycle + offset)
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(-swing * 0.30, 0, side * 0.08 + swing * 0.025)
      if (elbow) elbow.rotation.set(0.12 + Math.max(0, swing) * 0.24, 0, side * 0.035)
      if (wrist) wrist.rotation.set(-0.06 - swing * 0.04, 0, 0)
    })
    ;[[rig.parts.legLeft, 0], [rig.parts.legRight, Math.PI]].forEach(([leg, offset]) => {
      if (!leg) return
      const stride = Math.sin(cycle + offset)
      const lift = Math.max(0, -stride)
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(stride * 0.62, 0, 0)
      if (knee) knee.rotation.x = 0.08 + lift * 0.78
      if (ankle) ankle.rotation.x = -0.12 - lift * 0.38 + Math.max(0, stride) * 0.12
    })
    rig.updateTail(time, 0.095, 5.4 * rig.getRunSpeed())
  }

function updateFlex(rig, time) {
    const pulse = (Math.sin(time * 4.2) + 1) * 0.5
    rig.root.scale.set(1.05 + pulse * 0.018, 1.02 - pulse * 0.008, 1 + pulse * 0.018)
    if (rig.parts.head) rig.parts.head.rotation.set(-0.025, 0, Math.sin(time * 1.4) * 0.018)
    applyHandGesture(rig.getJoints('arm-left'), 'fist')
    applyHandGesture(rig.getJoints('arm-right'), 'fist')
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(-0.08, 0, side * (1.28 + pulse * 0.08))
      if (elbow) elbow.rotation.set(0.08, 0, side * (0.18 + pulse * 0.05))
      if (wrist) wrist.rotation.set(-0.08, 0, -side * 0.08)
    })
    ;[rig.parts.legLeft, rig.parts.legRight].forEach((leg) => {
      if (!leg) return
      leg.rotation.set(0, 0, 0)
      const { knee, ankle } = rig.getJointsFor(leg)
      if (knee) knee.rotation.set(0.06, 0, 0)
      if (ankle) ankle.rotation.set(-0.06, 0, 0)
    })
    for (const [ear, side] of [[rig.parts.earLeft, -1], [rig.parts.earRight, 1]]) {
      if (ear) ear.rotation.set(-0.025, 0, side * 0.035)
    }
    rig.updateTail(time, 0.055, 1.7)
  }

function updateCrouch(rig, time) {
    const breathe = Math.sin(time * 2.4) * 0.008
    rig.root.scale.set(1.08, 0.88 + breathe, 1.05)
    if (rig.parts.head) rig.parts.head.rotation.set(0.07, 0, Math.sin(time * 1.2) * 0.012)
    applyHandGesture(rig.getJoints('arm-left'), 'open')
    applyHandGesture(rig.getJoints('arm-right'), 'open')
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(0.16, 0, side * 0.12)
      if (elbow) elbow.rotation.set(0.42, 0, -side * 0.18)
      if (wrist) wrist.rotation.set(-0.18, 0, 0)
    })
    ;[rig.parts.legLeft, rig.parts.legRight].forEach((leg) => {
      if (!leg) return
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(-0.28, 0, 0)
      if (knee) knee.rotation.set(0.72, 0, 0)
      if (ankle) ankle.rotation.set(-0.38, 0, 0)
    })
    rig.updateTail(time, 0.035, 0.8)
  }

function updateSit(rig, time) {
    rig.root.scale.set(1, 1, 1)
    if (rig.parts.head) rig.parts.head.rotation.set(0.055, 0, Math.sin(time * 0.8) * 0.018)
    applyHandGesture(rig.getJoints('arm-left'), 'neutral')
    applyHandGesture(rig.getJoints('arm-right'), 'neutral')
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(0.08, 0, side * 0.10)
      if (elbow) elbow.rotation.set(0.22, 0, -side * 0.05)
      if (wrist) wrist.rotation.set(-0.10, 0, side * 0.04)
    })
    ;[[rig.parts.legLeft, -1], [rig.parts.legRight, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(-0.34, side * 0.05, side * 0.18)
      if (knee) knee.rotation.set(0.82, 0, -side * 0.06)
      if (ankle) ankle.rotation.set(-0.42, 0, side * 0.04)
    })
    rig.updateTail(time, 0.028, 0.65)
  }

function updateJump(rig, time) {
    rig.root.scale.set(1.01, 1.08, 0.98)
    if (rig.parts.head) rig.parts.head.rotation.set(-0.08, 0, 0)
    applyHandGesture(rig.getJoints('arm-left'), 'open')
    applyHandGesture(rig.getJoints('arm-right'), 'open')
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(-0.18, 0, side * 0.82)
      if (elbow) elbow.rotation.set(0.24, 0, side * 0.14)
      if (wrist) wrist.rotation.set(-0.12, 0, 0)
    })
    ;[rig.parts.legLeft, rig.parts.legRight].forEach((leg) => {
      if (!leg) return
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(-0.34, 0, 0)
      if (knee) knee.rotation.set(0.88, 0, 0)
      if (ankle) ankle.rotation.set(-0.44, 0, 0)
    })
    rig.updateTail(time, 0.075, 2.2)
  }

function updateCurious(rig, time) {
    rig.root.scale.set(1, 1, 1)
    const glance = Math.sin(time * 0.9) * 0.035
    if (rig.parts.head) rig.parts.head.rotation.set(-0.03, -0.12 + glance, -0.20)
    applyHandGesture(rig.getJoints('arm-left'), 'neutral')
    applyHandGesture(rig.getJoints('arm-right'), 'point')
    for (const [ear, side] of [[rig.parts.earLeft, -1], [rig.parts.earRight, 1]]) {
      if (ear) ear.rotation.set(side < 0 ? -0.08 : 0.04, 0, side * 0.08)
    }
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      const raised = side > 0
      arm.rotation.set(raised ? -0.18 : 0.04, 0, side * (raised ? 0.58 : 0.08))
      if (elbow) elbow.rotation.set(raised ? 0.48 : 0.10, 0, raised ? -0.16 : 0)
      if (wrist) wrist.rotation.set(raised ? -0.22 : 0, 0, raised ? Math.sin(time * 2.1) * 0.06 : 0)
    })
    ;[[rig.parts.legLeft, -1], [rig.parts.legRight, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(0, 0, side * 0.02)
      if (knee) knee.rotation.set(0.05, 0, 0)
      if (ankle) ankle.rotation.set(-0.04, 0, 0)
    })
    rig.updateTail(time, 0.055, 1.1)
  }

function updateStretch(rig, time) {
    rig.root.scale.set(1, 1, 1)
    const sway = Math.sin(time * 1.1) * 0.025
    if (rig.parts.head) rig.parts.head.rotation.set(0.10, sway, 0)
    applyHandGesture(rig.getJoints('arm-left'), 'open')
    applyHandGesture(rig.getJoints('arm-right'), 'open')
    for (const [ear, side] of [[rig.parts.earLeft, -1], [rig.parts.earRight, 1]]) {
      if (ear) ear.rotation.set(-0.06, 0, side * 0.05)
    }
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(-0.62, side * 0.04, side * 0.34)
      if (elbow) elbow.rotation.set(0.18, 0, -side * 0.05)
      if (wrist) wrist.rotation.set(-0.18, 0, side * 0.04)
    })
    ;[[rig.parts.legLeft, -1], [rig.parts.legRight, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(0.16, 0, side * 0.05)
      if (knee) knee.rotation.set(0.22, 0, 0)
      if (ankle) ankle.rotation.set(-0.16, 0, side * 0.03)
    })
    rig.updateTail(time, 0.04, 0.75)
  }

function updateWave(rig, time) {
    const wave = Math.sin(time * 5.2)
    const breathe = 1 + Math.sin(time * 1.5) * 0.009
    rig.root.scale.set(1.05 * breathe, 1.02 * breathe, breathe)
    if (rig.parts.head) rig.parts.head.rotation.set(0, -0.08, -0.035 + wave * 0.012)
    applyHandGesture(rig.getJoints('arm-left'), 'neutral')
    applyHandGesture(rig.getJoints('arm-right'), 'open')
    const left = rig.parts.armLeft
    if (left) {
      const { elbow, wrist } = rig.getJointsFor(left)
      left.rotation.set(0, 0, -0.08)
      if (elbow) elbow.rotation.set(0, 0, 0)
      if (wrist) wrist.rotation.set(0, 0, 0)
    }
    const right = rig.parts.armRight
    if (right) {
      const { elbow, wrist } = rig.getJointsFor(right)
      right.rotation.set(-0.10, 0, 1.72 + wave * 0.10)
      if (elbow) elbow.rotation.set(0.18, 0, -0.34)
      if (wrist) wrist.rotation.set(-0.06, 0, wave * 0.34)
    }
    for (const leg of [rig.parts.legLeft, rig.parts.legRight]) {
      const { knee, ankle } = rig.getJointsFor(leg)
      if (leg) leg.rotation.set(0, 0, 0)
      if (knee) knee.rotation.set(0, 0, 0)
      if (ankle) ankle.rotation.set(0, 0, 0)
    }
    rig.updateTail(time, 0.048, 1.35)
  }
