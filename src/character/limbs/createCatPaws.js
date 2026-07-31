import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const HAND_DIGIT_KEYS = Object.freeze(['thumb', 'index', 'middle', 'ring', 'little'])
export const FOOT_DIGIT_KEYS = Object.freeze(['toe1', 'toe2', 'toe3', 'toe4', 'toe5'])

function createDigitSurface({ radius, length, material, name, axis = 'y' }) {
  const geometry = new THREE.CapsuleGeometry(radius, length, 7, 14)
  geometry.translate(0, -length * 0.5, 0)
  if (axis === 'z') geometry.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.castShadow = true
  return mesh
}

function createToeSurface({ radius, length, material, name }) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), material)
  // A cat paw reads as one padded mass with five overlapping lobes, not five
  // beads. Flatten each digit vertically and keep most of it buried in the
  // sole; only the soft rounded front edge remains visible.
  mesh.scale.set(1.06, 0.78, 1 + length / Math.max(radius, 0.001) * 0.16)
  mesh.position.z = length * 0.12
  mesh.name = name
  mesh.castShadow = true
  return mesh
}

export function createArticulatedHand(side, { pawMaterial, padMaterial, createHeart, limbName }) {
  const hand = new THREE.Group()
  hand.name = side < 0 ? 'HandLeft' : 'HandRight'
  hand.userData.restScale = [1, 1, 1]
  const prefix = limbName ?? (side < 0 ? 'ArmLeft' : 'ArmRight')

  // Closed and cupped poses hide most of the articulated digit silhouette
  // behind the palm. Keep four shallow seams on the visible side so the paw
  // still reads as five fingers in front view, while the actual finger bones
  // remain responsible for the silhouette in open poses.
  const fingerCreaseMaterial = new THREE.MeshStandardMaterial({
    color: '#c4b8b1',
    roughness: 0.74,
    metalness: 0,
  })
  const fingerCreaseGeometries = []
  for (const x of [-0.069, -0.023, 0.023, 0.069]) {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, -0.060, 0.091),
      new THREE.Vector3(x * 1.04, -0.087, 0.099),
      new THREE.Vector3(x * 1.10, -0.111, 0.084),
    )
    fingerCreaseGeometries.push(new THREE.TubeGeometry(curve, 7, 0.0028, 5, false))
  }
  const mergedFingerCreases = mergeGeometries(fingerCreaseGeometries)
  fingerCreaseGeometries.forEach(geometry => geometry.dispose())
  const palmGeometry = new THREE.SphereGeometry(0.112, 28, 20)
  palmGeometry.scale(1.16, 1.22, 0.78)
  const palmWithCreases = mergeGeometries([palmGeometry, mergedFingerCreases], true)
  palmGeometry.dispose()
  mergedFingerCreases.dispose()
  const palm = new THREE.Mesh(palmWithCreases, [pawMaterial, fingerCreaseMaterial])
  palm.position.y = 0.008
  palm.name = `${hand.name}Palm`
  palm.userData.fingerCreases = 4
  palm.castShadow = true
  palm.renderOrder = 3
  hand.add(palm)

  const layout = [
    { key: 'thumb', x: side * 0.101, y: -0.004, z: 0.018, length: 0.074, radius: 0.028, spread: side * 0.96 },
    { key: 'index', x: side * 0.068, y: -0.055, z: 0.028, length: 0.086, radius: 0.030, spread: side * 0.13 },
    { key: 'middle', x: side * 0.023, y: -0.058, z: 0.031, length: 0.096, radius: 0.032, spread: side * 0.04 },
    { key: 'ring', x: -side * 0.023, y: -0.057, z: 0.029, length: 0.090, radius: 0.030, spread: -side * 0.07 },
    { key: 'little', x: -side * 0.065, y: -0.050, z: 0.023, length: 0.075, radius: 0.027, spread: -side * 0.16 },
  ]
  const joints = {}
  for (const digit of layout) {
    const bone = new THREE.Bone()
    bone.name = `${hand.name}${digit.key[0].toUpperCase()}${digit.key.slice(1)}Bone`
    bone.position.set(digit.x, digit.y, digit.z)
    bone.rotation.y = digit.spread
    bone.userData.restRotation = bone.rotation.toArray().slice(0, 3)
    const proximalLength = digit.length * 0.54
    const distalLength = digit.length * 0.46
    bone.add(createDigitSurface({
      radius: digit.radius,
      length: proximalLength,
      material: pawMaterial,
      name: `${hand.name}${digit.key[0].toUpperCase()}${digit.key.slice(1)}Proximal`,
    }))
    const distal = new THREE.Bone()
    distal.name = `${hand.name}${digit.key[0].toUpperCase()}${digit.key.slice(1)}DistalBone`
    distal.position.y = -proximalLength
    distal.userData.restRotation = [0, 0, 0]
    distal.add(createDigitSurface({
      radius: digit.radius * 0.88,
      length: distalLength,
      material: pawMaterial,
      name: `${hand.name}${digit.key[0].toUpperCase()}${digit.key.slice(1)}Distal`,
    }))
    bone.add(distal)
    const fingerPad = new THREE.Mesh(new THREE.SphereGeometry(digit.radius * 0.45, 10, 8), padMaterial)
    fingerPad.scale.set(0.90, 1.08, 0.34)
    fingerPad.position.set(0, -distalLength * 0.62, 0.030)
    fingerPad.name = `${prefix}FingerPad${layout.indexOf(digit) + 1}`
    fingerPad.visible = false
    distal.add(fingerPad)
    hand.add(bone)
    joints[digit.key] = bone
    joints[`${digit.key}Distal`] = distal
  }

  const mainPad = createHeart(0.058, padMaterial)
  mainPad.scale.set(1.06, 0.94, 0.58)
  mainPad.position.set(0, -0.018, 0.140)
  mainPad.name = `${prefix}Pad`
  // Front paws normally face the camera in the reference sheet. Keep the pad
  // just behind the palm so it appears only when a pose turns the wrist over.
  mainPad.position.z = -0.125
  mainPad.rotation.y = Math.PI
  mainPad.visible = true
  hand.add(mainPad)
  hand.userData.joints = joints
  hand.userData.gesture = 'neutral'
  return hand
}

export function createArticulatedFoot(side, { pawMaterial, padMaterial, createHeart, limbName }) {
  const foot = new THREE.Group()
  foot.name = side < 0 ? 'FootLeft' : 'FootRight'
  foot.userData.restScale = [1, 1, 1]
  // Keep the paw socket close enough to the ankle for the yellow leg and white
  // foot to form one continuous silhouette in the neutral turnaround.
  foot.position.y = -0.08
  const prefix = limbName ?? (side < 0 ? 'LegLeft' : 'LegRight')
  const center = new THREE.Vector3(0, -0.015, 0.095)

  const sole = new THREE.Mesh(new THREE.SphereGeometry(0.150, 28, 20), pawMaterial)
  sole.scale.set(1.12, 1.02, 1.34)
  sole.position.copy(center)
  sole.name = `${foot.name}Sole`
  sole.castShadow = true
  foot.add(sole)

  const offsets = [-0.082, -0.041, 0, 0.041, 0.082]
  const lengths = [0.052, 0.061, 0.068, 0.061, 0.052]
  const joints = {}
  offsets.forEach((offset, index) => {
    const key = FOOT_DIGIT_KEYS[index]
    const edgeScale = index === 0 || index === 4 ? 0.90 : 1
    const bone = new THREE.Bone()
    bone.name = `${foot.name}Toe${index + 1}Bone`
    const edge = Math.abs(index - 2) / 2
    // Only the rounded tips cross the sole silhouette. This reads as five
    // sculpted toe lobes instead of five beads attached in front of the foot.
    bone.position.set(center.x + offset, center.y - 0.035 + edge * 0.003, center.z + 0.142 - edge * 0.005)
    bone.userData.restRotation = [0, 0, 0]
    const toe = createToeSurface({
      radius: 0.055 * edgeScale,
      length: lengths[index],
      material: pawMaterial,
      name: `${prefix}Toe${index + 1}`,
    })
    bone.add(toe)
    foot.add(bone)
    joints[key] = bone

    const toePad = new THREE.Mesh(new THREE.SphereGeometry(0.016 * edgeScale, 12, 8), padMaterial)
    toePad.scale.set(0.92, 1.04, 0.34)
    toePad.position.set(offset, center.y + 0.014, -0.072)
    toePad.name = `${prefix}ToePad${index + 1}`
    foot.add(toePad)
  })

  const creaseMaterial = new THREE.MeshStandardMaterial({
    color: '#c4b8b1',
    roughness: 0.72,
    metalness: 0,
  })
  const creaseGeometries = []
  for (const x of [-0.078, -0.026, 0.026, 0.078]) {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, center.y + 0.018, center.z + 0.246),
      new THREE.Vector3(x * 1.03, center.y, center.z + 0.258),
      new THREE.Vector3(x * 1.08, center.y - 0.020, center.z + 0.238),
    )
    creaseGeometries.push(new THREE.TubeGeometry(curve, 8, 0.0032, 5, false))
  }
  const mergedCreases = mergeGeometries(creaseGeometries)
  creaseGeometries.forEach(geometry => geometry.dispose())
  const creaseMesh = new THREE.Mesh(mergedCreases, creaseMaterial)
  creaseMesh.name = `${prefix}ToeCreases`
  creaseMesh.renderOrder = 3
  foot.add(creaseMesh)

  const solePad = createHeart(0.067, padMaterial)
  solePad.scale.set(1.12, 1.02, 0.72)
  solePad.position.set(center.x, center.y + 0.015, -0.105)
  solePad.name = `${prefix}MainPad`
  foot.add(solePad)
  foot.userData.joints = joints
  return foot
}

export function applyHandGesture(joints, gesture = 'neutral', amount = 1) {
  const clamped = THREE.MathUtils.clamp(Number(amount) || 0, 0, 1)
  const curls = {
    neutral: [0.10, 0.08, 0.07, 0.08, 0.10],
    open: [-0.16, -0.10, -0.08, -0.10, -0.14],
    fist: [1.04, 1.18, 1.24, 1.20, 1.10],
    grip: [0.72, 0.86, 0.92, 0.88, 0.78],
    point: [0.86, -0.10, 1.05, 1.02, 0.96],
    cup: [0.52, 0.42, 0.38, 0.42, 0.50],
    pinch: [0.82, 0.62, 0.92, 0.98, 0.94],
    peace: [0.88, -0.14, -0.12, 1.02, 1.00],
    thumbsUp: [-0.24, 1.10, 1.16, 1.14, 1.06],
  }[gesture] ?? [0.10, 0.08, 0.07, 0.08, 0.10]
  const openSplay = [0.40, 0.22, 0.05, -0.13, -0.31]
  const extension = {
    fist: [.56, .48, .46, .48, .54],
    grip: [.66, .58, .56, .58, .64],
    pinch: [.68, .72, .58, .52, .50],
    open: [1.05, 1.10, 1.12, 1.10, 1.05],
    point: [.94, 1.24, .88, .86, .84],
    peace: [.90, 1.20, 1.22, .86, .84],
    thumbsUp: [1.20, .88, .86, .86, .84],
  }[gesture] ?? [1, 1, 1, 1, 1]
  const sideSign = Math.sign(joints?.thumb?.userData?.restRotation?.[1] || 1)
  HAND_DIGIT_KEYS.forEach((key, index) => {
    const joint = joints?.[key]
    if (!joint) return
    const rest = joint.userData.restRotation ?? [0, 0, 0]
    joint.rotation.set(
      THREE.MathUtils.lerp(rest[0], curls[index], clamped),
      rest[1],
      THREE.MathUtils.lerp(rest[2], (
        ['open', 'point', 'peace', 'thumbsUp'].includes(gesture)
          ? openSplay[index] * sideSign
          : rest[2]
      ), clamped),
    )
    joint.scale.y = THREE.MathUtils.lerp(1, extension[index], clamped)
    const distal = joints?.[`${key}Distal`]
    if (distal) distal.rotation.x = THREE.MathUtils.lerp(0, Math.max(0, curls[index]) * 0.78, clamped)
  })
}
