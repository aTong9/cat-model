import * as THREE from 'three'
import { EQUIPMENT_EFFECT_RECIPES } from './EquipmentEffects.js'

const safeId = value => String(value).replace(/[^a-z0-9]+/gi, '') || 'Equipment'

export const EQUIPMENT_MOTION_RECIPES = Object.freeze({
  Camera: Object.freeze({ clip: 'ShutterFlash', duration: 1.2, lift: .025, tilt: -.14, yaw: .08, pulse: 1.10 }),
  'Baseball Cap': Object.freeze({ clip: 'CapTrick', duration: 1.6, lift: .16, tilt: .34, yaw: Math.PI, pulse: 1.04 }),
  'Gold Round Glasses': Object.freeze({ clip: 'GoldenGlint', duration: 1.4, lift: .035, tilt: .08, yaw: .20, pulse: 1.16 }),
  'Hiking Backpack': Object.freeze({ clip: 'AdventureBounce', duration: 1.5, lift: .09, tilt: .16, yaw: .10, pulse: 1.05 }),
  'Good Luck Gold Bar': Object.freeze({ clip: 'FortuneBurst', duration: 1.3, lift: .14, tilt: .22, yaw: .48, pulse: 1.18 }),
  'Wealth Gold Bar': Object.freeze({ clip: 'WealthBurst', duration: 1.3, lift: .16, tilt: -.22, yaw: -.48, pulse: 1.20 }),
  'Hot Coffee': Object.freeze({ clip: 'CoffeeSteam', duration: 1.8, lift: .055, tilt: .10, yaw: .12, pulse: 1.05 }),
  'Investment Book': Object.freeze({ clip: 'PageFlip', duration: 1.5, lift: .06, tilt: .28, yaw: .34, pulse: 1.06 }),
  Ramen: Object.freeze({ clip: 'NoodleSteam', duration: 1.8, lift: .07, tilt: .08, yaw: .38, pulse: 1.06 }),
  Sake: Object.freeze({ clip: 'CeremonyPour', duration: 1.7, lift: .06, tilt: .42, yaw: -.18, pulse: 1.04 }),
})

export function installEquipmentAnimationRig(root, equipmentId) {
  if (root.equipmentAnimationRig) return root.equipmentAnimationRig
  const prefix = `Equipment${safeId(equipmentId)}`
  const visualChildren = [...root.children]
  const rootBone = new THREE.Bone()
  const motionBone = new THREE.Bone()
  const accentBone = new THREE.Bone()
  rootBone.name = `${prefix}RootBone`
  motionBone.name = `${prefix}MotionBone`
  accentBone.name = `${prefix}AccentBone`
  rootBone.add(motionBone)
  motionBone.add(accentBone, ...visualChildren)
  root.add(rootBone)

  const markerGeometry = new THREE.BoxGeometry(.002, .002, .002)
  const vertexCount = markerGeometry.attributes.position.count
  markerGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(vertexCount * 4).fill(0), 4))
  const weights = []
  for (let index = 0; index < vertexCount; index++) weights.push(1, 0, 0, 0)
  markerGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4))
  const marker = new THREE.SkinnedMesh(markerGeometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
  marker.name = `${prefix}SkinMarker`
  marker.frustumCulled = false
  marker.add(rootBone)
  marker.bind(new THREE.Skeleton([rootBone, motionBone, accentBone]))
  root.add(marker)

  root.userData.animationRig = {
    schemaVersion: 1,
    bones: [rootBone.name, motionBone.name, accentBone.name],
    defaultClip: EQUIPMENT_MOTION_RECIPES[equipmentId]?.clip ?? 'Signature',
  }
  const runtime = { rootBone, motionBone, accentBone, marker }
  Object.defineProperty(root, 'equipmentAnimationRig', { value: runtime, configurable: true })
  return runtime
}

function quaternionValues(eulers) {
  return eulers.flatMap(rotation => new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)).toArray())
}

export function createEquipmentAnimationClips(root, equipmentId = root.userData.gearType) {
  const rig = installEquipmentAnimationRig(root, equipmentId)
  const motion = rig.motionBone.name
  const effectKind = EQUIPMENT_EFFECT_RECIPES[equipmentId]?.kind ?? 'pulse'
  const signatureTilt = effectKind === 'spin' ? .35 : effectKind === 'coins' ? .18 : effectKind === 'flash' ? -.16 : .10
  const semantic = EQUIPMENT_MOTION_RECIPES[equipmentId] ?? { clip: 'Signature', duration: 1.8, lift: .07, tilt: signatureTilt, yaw: .18, pulse: 1.07 }
  const clips = [
    new THREE.AnimationClip('Hover', 2, [
      new THREE.VectorKeyframeTrack(`${motion}.position`, [0, .5, 1, 1.5, 2], [0,0,0, 0,.055,0, 0,0,0, 0,.055,0, 0,0,0]),
      new THREE.QuaternionKeyframeTrack(`${motion}.quaternion`, [0, 1, 2], quaternionValues([[0,0,-.06], [0,0,.06], [0,0,-.06]])),
    ]),
    new THREE.AnimationClip('Spin', 1.5, [
      new THREE.QuaternionKeyframeTrack(`${motion}.quaternion`, [0, .375, .75, 1.125, 1.5], quaternionValues([[0,0,0], [0,Math.PI/2,0], [0,Math.PI,0], [0,Math.PI*1.5,0], [0,Math.PI*2,0]])),
    ]),
    new THREE.AnimationClip('Pulse', 1.2, [
      new THREE.VectorKeyframeTrack(`${motion}.scale`, [0, .3, .6, .9, 1.2], [1,1,1, 1.12,1.12,1.12, 1,1,1, .94,.94,.94, 1,1,1]),
    ]),
    new THREE.AnimationClip(semantic.clip, semantic.duration, [
      new THREE.VectorKeyframeTrack(`${motion}.position`, [0, .25, .5, .75, 1].map(value => value * semantic.duration), [0,0,0, 0,semantic.lift,0, 0,0,0, 0,semantic.lift,0, 0,0,0]),
      new THREE.QuaternionKeyframeTrack(`${motion}.quaternion`, [0, .25, .5, .75, 1].map(value => value * semantic.duration), quaternionValues([[0,0,-semantic.tilt], [0,semantic.yaw,semantic.tilt], [0,0,-semantic.tilt], [0,-semantic.yaw,semantic.tilt], [0,0,-semantic.tilt]])),
      new THREE.VectorKeyframeTrack(`${motion}.scale`, [0, .25, .5, .75, 1].map(value => value * semantic.duration), [1,1,1, semantic.pulse,semantic.pulse,semantic.pulse, 1,1,1, semantic.pulse,semantic.pulse,semantic.pulse, 1,1,1]),
    ]),
  ]
  clips.forEach(clip => clip.optimize())
  return clips
}

export function captureEquipmentTransform(root) {
  const bone = root?.equipmentAnimationRig?.motionBone
  return bone ? { position: bone.position.toArray(), rotation: bone.rotation.toArray().slice(0, 3), scale: bone.scale.toArray() } : null
}

export function applyEquipmentTransform(root, transform) {
  const bone = root?.equipmentAnimationRig?.motionBone
  if (!bone || !transform) return false
  if (transform.position) bone.position.fromArray(transform.position)
  if (transform.rotation) bone.rotation.fromArray([...transform.rotation, bone.rotation.order])
  if (transform.scale) bone.scale.fromArray(transform.scale)
  return true
}

export function createEquipmentAnimationDocument({ id = 'CustomEquipmentAction', duration = 1.5, loop = true } = {}) {
  return { schemaVersion: 1, id, duration, loop, keyframes: [] }
}

export function upsertEquipmentKeyframe(document, time, transform) {
  const normalized = THREE.MathUtils.clamp(Number(time) || 0, 0, Math.max(.1, Number(document.duration) || 1.5))
  const keyframes = document.keyframes.filter(frame => Math.abs(frame.time - normalized) > .0001)
  keyframes.push({ time: normalized, transform: structuredClone(transform) })
  keyframes.sort((a, b) => a.time - b.time)
  return { ...document, keyframes }
}

export function equipmentDocumentToClip(document, root) {
  const bone = root?.equipmentAnimationRig?.motionBone
  if (!bone || !document?.keyframes?.length) return null
  const frames = [...document.keyframes].sort((a, b) => a.time - b.time)
  const times = frames.map(frame => frame.time)
  const positions = frames.flatMap(frame => frame.transform.position)
  const scales = frames.flatMap(frame => frame.transform.scale)
  const rotations = quaternionValues(frames.map(frame => frame.transform.rotation))
  return new THREE.AnimationClip(document.id, document.duration, [
    new THREE.VectorKeyframeTrack(`${bone.name}.position`, times, positions),
    new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, rotations),
    new THREE.VectorKeyframeTrack(`${bone.name}.scale`, times, scales),
  ]).optimize()
}
