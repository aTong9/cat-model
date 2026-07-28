import * as THREE from 'three'
import { normalizePoseId } from '../config/poses.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createGear, TEXTURE_GEAR_TYPES } from './EquipmentFactory.js'
import { applyEquipmentAttachment } from './EquipmentAttachments.js'
import { createSdfCatBody } from './SdfCatBody.js'
import { getFurTrait } from '../config/traits.js'
import { getEyeAppearanceProfile, getFurAppearanceProfile } from './AppearanceProfiles.js'
import { getFaceAppearanceProfile } from './FaceProfiles.js'

// ===== Toon 渐变贴图（参考 Meow-Generator MeshToonMaterial） =====
let _sharedToonMap = null
function getToonGradientMap() {
  if (_sharedToonMap) return _sharedToonMap
  const size = 128
  const stops = [
    [0, new THREE.Color('#261e14')],
    [0.28, new THREE.Color('#4a3a24')],
    [0.5, new THREE.Color('#9e7a48')],
    [0.72, new THREE.Color('#dcc498')],
    [1, new THREE.Color('#fef9f0')],
  ]
  const data = new Uint8Array(size * 4)
  for (let index = 0; index < size; index++) {
    const position = index / (size - 1)
    let upper = 1
    while (upper < stops.length - 1 && position > stops[upper][0]) upper++
    const [fromPosition, fromColor] = stops[upper - 1]
    const [toPosition, toColor] = stops[upper]
    const color = fromColor.clone().lerp(toColor, (position - fromPosition) / (toPosition - fromPosition))
    data[index * 4] = Math.round(color.r * 255)
    data[index * 4 + 1] = Math.round(color.g * 255)
    data[index * 4 + 2] = Math.round(color.b * 255)
    data[index * 4 + 3] = 255
  }
  _sharedToonMap = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat)
  _sharedToonMap.needsUpdate = true
  _sharedToonMap.minFilter = THREE.LinearFilter
  _sharedToonMap.magFilter = THREE.NearestFilter
  _sharedToonMap.generateMipmaps = false
  return _sharedToonMap
}

// ===== 材质工厂 =====
function furMat(hex) {
  return new THREE.MeshToonMaterial({
    color: new THREE.Color(hex),
    gradientMap: getToonGradientMap(),
    vertexColors: true,
  })
}

const WHITE_FUR = new THREE.Color('#f5f1e6')
const DARK_FUR = new THREE.Color('#29272f')

function cellNoise(x, y, z, seed = 0) {
  const qx = Math.floor(x * 13)
  const qy = Math.floor(y * 11)
  const qz = Math.floor(z * 9)
  const value = Math.sin(qx * 127.1 + qy * 311.7 + qz * 74.7 + seed * 19.19) * 43758.5453
  return value - Math.floor(value)
}

function layeredNoise(x, y, z, seed = 0) {
  return cellNoise(x, y, z, seed) * 0.58 + cellNoise(x * 2.1, y * 2.1, z * 2.1, seed + 11) * 0.42
}

function applyFurVertexColors(geometry, style, customColor) {
  const trait = getFurAppearanceProfile(style, customColor)
  const base = new THREE.Color(trait.base)
  const accent = new THREE.Color(trait.accent)
  const positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3)
  const color = new THREE.Color()

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const ax = Math.abs(x)
    const front = z > 0.08
    const muzzle = front && y > 0.64 && y < 1.04 && ax < 0.27
    const chestWidth = 0.13 + Math.max(0, 0.72 - y) * 0.25
    const chest = front && y > -0.38 && y < 0.74 && ax < chestWidth
    const paws = front && y < -0.30 && ax > 0.065
    const whiteMask = muzzle || chest || paws

    color.copy(base)
    if (trait.pattern === 'tuxedo') {
      const blazeWidth = 0.045 + Math.max(0, 1.25 - y) * 0.050
      if (whiteMask || (front && y > 0.74 && ax < blazeWidth)) color.copy(WHITE_FUR)
    } else if (trait.pattern === 'calico') {
      color.copy(WHITE_FUR)
      const headPatch = front && y > 0.70
      if (!whiteMask && headPatch && x < -0.035) color.copy(accent)
      else if (!whiteMask && headPatch && x > 0.035) color.copy(DARK_FUR)
      else if (!whiteMask) {
        const patch = layeredNoise(x * 1.15, y, z, 3)
        if (patch > 0.61) color.copy(patch > 0.78 ? DARK_FUR : accent)
      }
    } else if (trait.pattern === 'leopard') {
      if (whiteMask) color.copy(WHITE_FUR)
      else {
        const spot = layeredNoise(x * 1.65, y * 1.55, z * 1.4, 7)
        if (spot > 0.63) color.copy(accent)
      }
    } else if (trait.pattern === 'lightning-tabby') {
      if (whiteMask) color.copy(WHITE_FUR)
      const foreheadBolt = front && y > 0.84 && ax < 0.19 && Math.abs(x - Math.sin(y * 30) * 0.055) < 0.040
      const cheekStripe = front && y > 0.54 && y < 0.86 && ax > 0.22 && Math.sin(y * 48 + ax * 20) > 0.30
      if ((foreheadBolt || cheekStripe) && !whiteMask) color.copy(accent)
    } else if (whiteMask) {
      color.copy(WHITE_FUR)
    }

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.attributes.color.needsUpdate = true
}
function innerEarMat() {
  return new THREE.MeshStandardMaterial({
    color: '#e85a50',
    roughness: 0.42,
    metalness: 0.02,
  })
}
function eyeWhite() {
  return new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.22 })
}
function pupil() {
  return new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.08 })
}
function noseMat() {
  return new THREE.MeshStandardMaterial({ color: '#e8917a', roughness: 0.38 })
}

function createHeartNose(size, material = noseMat()) {
  const shape = new THREE.Shape()
  shape.moveTo(0, -size * 0.72)
  shape.bezierCurveTo(-size * 0.18, -size * 0.48, -size, size * 0.02, -size * 0.48, size * 0.52)
  shape.bezierCurveTo(-size * 0.18, size * 0.78, 0, size * 0.52, 0, size * 0.30)
  shape.bezierCurveTo(0, size * 0.52, size * 0.18, size * 0.78, size * 0.48, size * 0.52)
  shape.bezierCurveTo(size, size * 0.02, size * 0.18, -size * 0.48, 0, -size * 0.72)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: size * 0.34,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: size * 0.12,
    bevelThickness: size * 0.10,
  })
  geometry.center()
  return new THREE.Mesh(geometry, material)
}
function mouthCavityMat() {
  return new THREE.MeshStandardMaterial({ color: '#381212', roughness: 0.50 })
}
function tongueMat() {
  return new THREE.MeshStandardMaterial({ color: '#f07070', roughness: 0.32 })
}
function metal(hex) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.22, metalness: 0.88 })
}

// ===== 描边效果（参考 Meow-Generator makeOutline） =====
function createOutlineGeometry(sourceGeo, thickness = 0.020) {
  const posSrc = sourceGeo.attributes.position.array
  const nrmSrc = sourceGeo.attributes.normal.array
  const idxSrc = sourceGeo.index ? sourceGeo.index.array : null

  const posOut = new Float32Array(posSrc.length)
  const nrmOut = new Float32Array(nrmSrc.length)

  for (let i = 0; i < posSrc.length; i += 3) {
    posOut[i]     = posSrc[i]     + nrmSrc[i]     * thickness
    posOut[i + 1] = posSrc[i + 1] + nrmSrc[i + 1] * thickness
    posOut[i + 2] = posSrc[i + 2] + nrmSrc[i + 2] * thickness
    nrmOut[i]     = -nrmSrc[i]
    nrmOut[i + 1] = -nrmSrc[i + 1]
    nrmOut[i + 2] = -nrmSrc[i + 2]
  }

  const outlineGeo = new THREE.BufferGeometry()
  outlineGeo.setAttribute('position', new THREE.Float32BufferAttribute(posOut, 3))
  outlineGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nrmOut, 3))
  if (idxSrc) outlineGeo.setIndex(Array.from(idxSrc))
  return outlineGeo
}

// ===== 内耳贴花（参考 Meow-Generator makeInnerEarDecal） =====
function createInnerEarDecal(headRadius, earSide) {
  const shape = new THREE.Shape()
  shape.moveTo(-headRadius * 0.20, -headRadius * 0.20)
  shape.lineTo(headRadius * 0.20, -headRadius * 0.20)
  shape.lineTo(0, headRadius * 0.34)
  shape.closePath()
  const innerGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.005, bevelSegments: 2 })
  innerGeo.center()
  const innerMesh = new THREE.Mesh(innerGeo, innerEarMat())
  // Local to the head: recessed onto the front face of the outer ear, not floating above it.
  innerMesh.position.set(earSide * headRadius * 0.76, headRadius * 0.91, headRadius * 0.15)
  innerMesh.scale.set(0.82, 1.08, 1)
  innerMesh.rotation.z = -earSide * 0.16
  innerMesh.castShadow = true
  innerMesh.name = earSide < 0 ? 'InnerEarLeft' : 'InnerEarRight'
  return innerMesh
}

function createArticulatedEar(headRadius, side) {
  const root = new THREE.Group()
  root.name = side < 0 ? 'EarLeft' : 'EarRight'
  root.position.set(side * headRadius * 0.67, headRadius * 0.61, -headRadius * 0.12)

  const outerShape = new THREE.Shape()
  outerShape.moveTo(-headRadius * 0.25, -headRadius * 0.13)
  outerShape.bezierCurveTo(-headRadius * 0.20, headRadius * 0.08, -headRadius * 0.10, headRadius * 0.54, 0, headRadius * 0.62)
  outerShape.bezierCurveTo(headRadius * 0.10, headRadius * 0.54, headRadius * 0.20, headRadius * 0.08, headRadius * 0.25, -headRadius * 0.13)
  outerShape.quadraticCurveTo(0, -headRadius * 0.22, -headRadius * 0.25, -headRadius * 0.13)
  const outerGeo = new THREE.ExtrudeGeometry(outerShape, {
    depth: headRadius * 0.20, bevelEnabled: true, bevelSegments: 4,
    bevelSize: headRadius * 0.055, bevelThickness: headRadius * 0.045,
  })
  outerGeo.center()
  const outer = new THREE.Mesh(outerGeo, new THREE.MeshToonMaterial({
    color: '#f4c430', gradientMap: getToonGradientMap(),
  }))
  outer.name = side < 0 ? 'EarLeftOuter' : 'EarRightOuter'
  outer.position.y = headRadius * 0.22
  outer.rotation.z = -side * 0.13
  outer.castShadow = true
  root.add(outer)

  const inner = createInnerEarDecal(headRadius * 0.72, side)
  inner.position.set(0, headRadius * 0.23, headRadius * 0.135)
  inner.rotation.z = -side * 0.13
  inner.scale.set(0.68, 0.78, 1)
  outer.add(inner)
  root.scale.set(1.24, 1.24, 1.12)
  return root
}

function createFurJointCover(radius, material, name, scale = [1, 1, 1]) {
  const cover = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 20), material)
  cover.scale.set(...scale)
  cover.name = name
  cover.castShadow = true
  return cover
}

function createSkinnedLimb({ name, upperVector, lowerVector, radii, material, radialSegments = 16 }) {
  const ringCount = 19
  const centers = [new THREE.Vector3(), upperVector.clone(), upperVector.clone().add(lowerVector)]
  const centerCurve = new THREE.CatmullRomCurve3(centers, false, 'catmullrom', 0.5)
  const positions = []
  const normals = []
  const skinIndices = []
  const skinWeights = []
  const indices = []

  for (let ring = 0; ring < ringCount; ring++) {
    const u = ring / (ringCount - 1)
    const segment = u < 0.5 ? 0 : 1
    const localT = segment === 0 ? u * 2 : (u - 0.5) * 2
    const center = centerCurve.getPoint(u)
    const tangent = centerCurve.getTangent(u)
    const axis = Math.abs(tangent.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)
    const normalA = new THREE.Vector3().crossVectors(tangent, axis).normalize()
    const normalB = new THREE.Vector3().crossVectors(tangent, normalA).normalize()
    const radius = THREE.MathUtils.lerp(radii[segment], radii[segment + 1], localT)
    const bonePosition = u * 2
    const firstBone = Math.min(1, Math.floor(bonePosition))
    const secondBone = Math.min(2, firstBone + 1)
    const secondWeight = bonePosition - firstBone

    for (let side = 0; side < radialSegments; side++) {
      const angle = side / radialSegments * Math.PI * 2
      const radial = normalA.clone().multiplyScalar(Math.cos(angle)).addScaledVector(normalB, Math.sin(angle))
      const vertex = center.clone().addScaledVector(radial, radius)
      positions.push(vertex.x, vertex.y, vertex.z)
      normals.push(radial.x, radial.y, radial.z)
      skinIndices.push(firstBone, secondBone, 0, 0)
      skinWeights.push(1 - secondWeight, secondWeight, 0, 0)
    }
  }

  for (let ring = 0; ring < ringCount - 1; ring++) {
    for (let side = 0; side < radialSegments; side++) {
      const nextSide = (side + 1) % radialSegments
      const a = ring * radialSegments + side
      const b = ring * radialSegments + nextSide
      const c = (ring + 1) * radialSegments + nextSide
      const d = (ring + 1) * radialSegments + side
      indices.push(a, b, d, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()

  const rootBone = new THREE.Bone()
  rootBone.name = `${name}ShoulderBone`
  const middleBone = new THREE.Bone()
  middleBone.name = `${name}ElbowBone`
  middleBone.position.copy(upperVector)
  const endBone = new THREE.Bone()
  endBone.name = `${name}WristBone`
  endBone.position.copy(lowerVector)
  rootBone.add(middleBone)
  middleBone.add(endBone)

  const surface = new THREE.SkinnedMesh(geometry, material)
  surface.name = `${name}ContinuousSurface`
  surface.castShadow = true
  surface.add(rootBone)
  surface.bind(new THREE.Skeleton([rootBone, middleBone, endBone]))
  return { surface, rootBone, middleBone, endBone }
}

function createRaisedArm(side) {
  const shoulder = new THREE.Group()
  shoulder.name = side < 0 ? 'ArmLeft' : 'ArmRight'
  shoulder.position.set(side * 0.34, 0.64, 0.10)
  const fur = new THREE.MeshToonMaterial({
    color: '#f4c430',
    gradientMap: getToonGradientMap(),
  })
  const pawFur = new THREE.MeshToonMaterial({ color: '#f5f1e6', gradientMap: getToonGradientMap() })
  const pad = new THREE.MeshStandardMaterial({ color: '#f06f78', roughness: 0.42 })
  // The reference arm is a single tapered silhouette. Its bind pose points
  // downward so idle never needs the old 180° elbow fold that pinched the mesh.
  const upperVector = new THREE.Vector3(side * 0.045, -0.27, 0.055)
  const foreVector = new THREE.Vector3(-side * 0.018, -0.22, 0.035)
  const limb = createSkinnedLimb({
    name: shoulder.name,
    upperVector,
    lowerVector: foreVector,
    radii: [0.150, 0.124, 0.102],
    material: fur,
    radialSegments: 20,
  })
  shoulder.add(limb.surface)
  const elbow = limb.middleBone
  const wrist = limb.endBone

  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 16), pawFur)
  palm.scale.set(0.98, 1.16, 0.90)
  palm.name = `${shoulder.name}Paw`
  palm.castShadow = true
  wrist.add(palm)

  // Five individually modelled digits: four upper fingers and one lower thumb.
  const digits = [
    { x: -0.068, y: 0.052, s: 0.92 },
    { x: -0.036, y: 0.098, s: 1.00 },
    { x: 0, y: 0.128, s: 1.04 },
    { x: 0.036, y: 0.098, s: 1.00 },
    { x: 0.068, y: 0.052, s: 0.92 },
  ]
  digits.forEach((finger, index) => {
    const digit = new THREE.Mesh(new THREE.SphereGeometry(0.050 * finger.s, 16, 12), pawFur)
    digit.scale.set(0.88, 1.10, 0.82)
    digit.position.set(finger.x, finger.y, 0.018)
    digit.name = `${shoulder.name}Digit${index + 1}`
    digit.castShadow = true
    wrist.add(digit)

    const fingerPad = new THREE.Mesh(new THREE.SphereGeometry(0.019 * finger.s, 12, 8), pad)
    fingerPad.scale.set(0.90, 1.08, 0.34)
    fingerPad.position.set(digit.position.x, digit.position.y - 0.004, 0.118)
    fingerPad.name = `${shoulder.name}FingerPad${index + 1}`
    wrist.add(fingerPad)
  })

  const pawPad = createHeartNose(0.058, pad)
  pawPad.scale.set(1.06, 0.94, 0.58)
  pawPad.position.set(0, -0.018, 0.140)
  pawPad.name = `${shoulder.name}Pad`
  wrist.add(pawPad)
  shoulder.userData.joints = { elbow, wrist }
  return shoulder
}

function createFoot(side) {
  const hip = new THREE.Group()
  hip.name = side < 0 ? 'LegLeft' : 'LegRight'
  hip.position.set(side * 0.18, -0.10, 0.02)
  const fur = new THREE.MeshToonMaterial({
    color: '#f4c430',
    gradientMap: getToonGradientMap(),
  })
  const pawFur = new THREE.MeshToonMaterial({ color: '#f5f1e6', gradientMap: getToonGradientMap() })
  const pad = new THREE.MeshStandardMaterial({ color: '#f06f78', roughness: 0.42 })
  const thighVector = new THREE.Vector3(side * 0.01, -0.22, 0.045)
  hip.add(createFurJointCover(0.148, fur, `${hip.name}HipBlend`, [1.08, 1.14, 1.08]))
  const shinVector = new THREE.Vector3(-side * 0.01, -0.17, 0.075)
  const limb = createSkinnedLimb({
    name: hip.name,
    upperVector: thighVector,
    lowerVector: shinVector,
    radii: [0.122, 0.098, 0.080],
    material: fur,
    radialSegments: 14,
  })
  hip.add(limb.surface)
  const knee = limb.middleBone
  const ankle = limb.endBone
  const center = new THREE.Vector3(0, -0.025, 0.105)

  const sole = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), pawFur)
  sole.scale.set(1.18, 0.74, 1.34)
  sole.position.copy(center)
  sole.name = `${hip.name}Sole`
  sole.castShadow = true
  ankle.add(sole)

  const toeOffsets = [-0.086, -0.043, 0, 0.043, 0.086]
  toeOffsets.forEach((offset, index) => {
    const edgeScale = index === 0 || index === 4 ? 0.88 : 1
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.041 * edgeScale, 14, 10), pawFur)
    toe.scale.set(0.92, 1.02, 1.02)
    toe.position.set(
      center.x + offset,
      center.y + 0.020,
      center.z + 0.135,
    )
    toe.name = `${hip.name}Toe${index + 1}`
    toe.castShadow = true
    ankle.add(toe)

    const toePad = new THREE.Mesh(new THREE.SphereGeometry(0.016 * edgeScale, 10, 8), pad)
    toePad.scale.set(0.92, 1.04, 0.34)
    toePad.position.set(toe.position.x, toe.position.y, toe.position.z + 0.039)
    toePad.name = `${hip.name}ToePad${index + 1}`
    ankle.add(toePad)
  })

  const solePad = createHeartNose(0.067, pad)
  solePad.scale.set(1.12, 1.02, 0.72)
  solePad.position.set(center.x, center.y - 0.040, center.z + 0.225)
  solePad.name = `${hip.name}MainPad`
  ankle.add(solePad)
  hip.userData.joints = { knee, ankle }
  return hip
}

function createJointedTail() {
  const root = new THREE.Group()
  root.name = 'TailRoot'
  root.position.set(0.04, -0.10, -0.38)
  const fur = new THREE.MeshToonMaterial({
    color: '#f5f1e6',
    gradientMap: getToonGradientMap(),
  })
  const basePoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.16, 0.00, -0.05),
    new THREE.Vector3(-0.31, 0.06, -0.05),
    new THREE.Vector3(-0.44, 0.17, -0.01),
    new THREE.Vector3(-0.53, 0.31, 0.06),
    new THREE.Vector3(-0.56, 0.46, 0.14),
    new THREE.Vector3(-0.53, 0.59, 0.21),
  ]
  const mesh = new THREE.Mesh(createTaperedTailGeometry(basePoints), fur)
  mesh.name = 'TailSurface'
  mesh.castShadow = true
  root.add(mesh)
  root.userData.basePoints = basePoints
  root.userData.surface = mesh
  return root
}

function createTaperedTailGeometry(points) {
  const tubularSegments = 48
  const radialSegments = 12
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, 0.078, radialSegments, false)
  const positions = geometry.attributes.position
  const center = new THREE.Vector3()
  const vertex = new THREE.Vector3()
  for (let row = 0; row <= tubularSegments; row++) {
    curve.getPointAt(row / tubularSegments, center)
    const taper = THREE.MathUtils.lerp(1, 0.34, Math.pow(row / tubularSegments, 0.82))
    for (let column = 0; column <= radialSegments; column++) {
      const index = row * (radialSegments + 1) + column
      vertex.fromBufferAttribute(positions, index)
      vertex.sub(center).multiplyScalar(taper).add(center)
      positions.setXYZ(index, vertex.x, vertex.y, vertex.z)
    }
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

export class CatModel {
  constructor() {
    this.root = new THREE.Group()
    this._furMaterials = []
    this._furColor = '#f4c430'
    this._furStyle = 'Golden'
    this._eyeStyle = 'Original'
    this._faceExpression = 'Excited'
    this._gearType = null
    this._eyelids = []
    this._animationMode = 'standing'
    this._runSpeed = 1

    // 子组引用
    this._headGroup = null
    this._bodyGroup = null
    this._eyeGroupL = null
    this._eyeGroupR = null
    this._mouthGroup = null
    this._gearRoot = null
    this._vrHeadset = null

    // 动画状态
    this._earLGroup = null
    this._earRGroup = null
    this._armLGroup = null
    this._armRGroup = null
    this._footLGroup = null
    this._footRGroup = null
    this._tailGroup = null

    this._buildBody()
  }

  // ========== Public API ==========

  get group() { return this.root }

  setFurTrait(style, hex) {
    this._furStyle = style || 'Custom'
    this._furColor = hex
    if (this._bodyGeoRef) applyFurVertexColors(this._bodyGeoRef, this._furStyle, this._furColor)
    this._furMaterials.forEach(m => m.color.set('#ffffff'))
    this._eyelids.forEach(lid => lid.material.color.set(hex))
    const trait = style === 'Custom' ? { color: hex } : getFurTrait(style)
    this.root.traverse(part => {
      if (!part.isMesh || !part.material?.color) return
      if (/Arm(Left|Right)(Upper|Fore|Socket|ElbowBlend|WristCover|ContinuousSurface)|Leg(Left|Right)(Upper|Lower|HipBlend|KneeBlend|AnkleCover|ContinuousSurface)|Tail(Segment|Blend|Surface)|Ear(Left|Right)Outer/.test(part.name)) part.material.color.set(trait.color)
      if (/Paw$|Digit\d|Leg(Left|Right)Sole|Toe\d/.test(part.name)) part.material.color.set('#f5f1e6')
    })
  }

  setFurColor(hex) { this.setFurTrait('Custom', hex) }

  setEyeStyle(style) {
    this._eyeStyle = style
    this._rebuildEyes()
    this._rebuildVRHeadset()
  }

  setFaceExpression(expr) {
    this._faceExpression = expr
    this._rebuildMouth()
  }

  setGear(type) {
    this._gearType = type
    this._rebuildGear()
  }

  setAnimation(mode = 'standing') {
    this._animationMode = mode === 'flex' || mode === 'crouch' ? mode : normalizePoseId(mode)
  }

  setRunSpeed(speed = 1) {
    this._runSpeed = THREE.MathUtils.clamp(Number(speed) || 1, 0.25, 2.5)
  }

  _updateTailSurface(time, intensity = 0.06, speed = 1) {
    const tail = this._tailGroup
    const surface = tail?.userData.surface
    const basePoints = tail?.userData.basePoints
    if (!surface || !basePoints) return
    const points = basePoints.map((point, index) => {
      const weight = index / Math.max(1, basePoints.length - 1)
      return point.clone().add(new THREE.Vector3(
        Math.sin(time * speed - index * 0.34) * intensity * weight,
        Math.cos(time * speed * 0.72 - index * 0.26) * intensity * 0.28 * weight,
        Math.sin(time * speed * 0.86 - index * 0.42) * intensity * 1.25 * weight,
      ))
    })
    const nextGeometry = createTaperedTailGeometry(points)
    surface.geometry.dispose()
    surface.geometry = nextGeometry
  }

  _updateRun(time) {
    const cycle = time * 10 * this._runSpeed
    const pulse = Math.abs(Math.sin(cycle)) * 0.026
    this.root.scale.set(1.05 - pulse * 0.25, 1.02 + pulse, 1 - pulse * 0.18)
    if (this._headGroup) {
      this._headGroup.rotation.set(-0.055 + Math.cos(cycle * 2) * 0.018, 0, Math.sin(cycle * 0.5) * 0.035)
    }
    for (const [ear, side] of [[this._earLGroup, -1], [this._earRGroup, 1]]) {
      if (!ear) continue
      ear.rotation.z = side * 0.055 + Math.cos(cycle * 2 + side * 0.2) * 0.075
      ear.rotation.x = -0.10 + Math.sin(cycle * 2) * 0.055
    }
    ;[[this._armLGroup, -1, 0], [this._armRGroup, 1, Math.PI]].forEach(([arm, side, offset]) => {
      if (!arm) return
      const swing = Math.sin(cycle + offset)
      const { elbow, wrist } = arm.userData.joints || {}
      arm.rotation.set(-swing * 0.30, 0, side * 0.08 + swing * 0.025)
      if (elbow) elbow.rotation.set(0.12 + Math.max(0, swing) * 0.24, 0, side * 0.035)
      if (wrist) wrist.rotation.set(-0.06 - swing * 0.04, 0, 0)
    })
    ;[[this._footLGroup, 0], [this._footRGroup, Math.PI]].forEach(([leg, offset]) => {
      if (!leg) return
      const stride = Math.sin(cycle + offset)
      const lift = Math.max(0, -stride)
      const { knee, ankle } = leg.userData.joints || {}
      leg.rotation.set(stride * 0.62, 0, 0)
      if (knee) knee.rotation.x = 0.08 + lift * 0.78
      if (ankle) ankle.rotation.x = -0.12 - lift * 0.38 + Math.max(0, stride) * 0.12
    })
    this._updateTailSurface(time, 0.095, 5.4 * this._runSpeed)
  }

  _updateFlex(time) {
    const pulse = (Math.sin(time * 4.2) + 1) * 0.5
    this.root.scale.set(1.05 + pulse * 0.018, 1.02 - pulse * 0.008, 1 + pulse * 0.018)
    if (this._headGroup) this._headGroup.rotation.set(-0.025, 0, Math.sin(time * 1.4) * 0.018)
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = arm.userData.joints || {}
      arm.rotation.set(-0.08, 0, side * (1.28 + pulse * 0.08))
      if (elbow) elbow.rotation.set(0.08, 0, side * (0.18 + pulse * 0.05))
      if (wrist) wrist.rotation.set(-0.08, 0, -side * 0.08)
    })
    ;[this._footLGroup, this._footRGroup].forEach((leg) => {
      if (!leg) return
      leg.rotation.set(0, 0, 0)
      const { knee, ankle } = leg.userData.joints || {}
      if (knee) knee.rotation.set(0.06, 0, 0)
      if (ankle) ankle.rotation.set(-0.06, 0, 0)
    })
    for (const [ear, side] of [[this._earLGroup, -1], [this._earRGroup, 1]]) {
      if (ear) ear.rotation.set(-0.025, 0, side * 0.035)
    }
    this._updateTailSurface(time, 0.055, 1.7)
  }

  _updateCrouch(time) {
    const breathe = Math.sin(time * 2.4) * 0.008
    this.root.scale.set(1.08, 0.88 + breathe, 1.05)
    if (this._headGroup) this._headGroup.rotation.set(0.07, 0, Math.sin(time * 1.2) * 0.012)
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = arm.userData.joints || {}
      arm.rotation.set(0.16, 0, side * 0.12)
      if (elbow) elbow.rotation.set(0.42, 0, -side * 0.18)
      if (wrist) wrist.rotation.set(-0.18, 0, 0)
    })
    ;[this._footLGroup, this._footRGroup].forEach((leg) => {
      if (!leg) return
      const { knee, ankle } = leg.userData.joints || {}
      leg.rotation.set(-0.28, 0, 0)
      if (knee) knee.rotation.set(0.72, 0, 0)
      if (ankle) ankle.rotation.set(-0.38, 0, 0)
    })
    this._updateTailSurface(time, 0.035, 0.8)
  }

  _updateSplaySit(time) {
    const breathe = Math.sin(time * 1.8) * 0.008
    this.root.scale.set(1.08, 0.84 + breathe, 1.06)
    if (this._bodyGroup) this._bodyGroup.position.y = -0.10
    if (this._headGroup) this._headGroup.rotation.set(0.055, 0, Math.sin(time * 0.8) * 0.018)
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = arm.userData.joints || {}
      arm.rotation.set(0.10, 0, side * 0.12)
      if (elbow) elbow.rotation.set(0.28, 0, -side * 0.06)
      if (wrist) wrist.rotation.set(-0.10, 0, side * 0.04)
    })
    ;[[this._footLGroup, -1], [this._footRGroup, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = leg.userData.joints || {}
      leg.rotation.set(-0.48, side * 0.16, side * 0.72)
      if (knee) knee.rotation.set(1.02, 0, -side * 0.18)
      if (ankle) ankle.rotation.set(-0.56, 0, side * 0.14)
    })
    this._updateTailSurface(time, 0.028, 0.65)
  }

  _updateJump(time) {
    this.root.scale.set(1.01, 1.08, 0.98)
    if (this._headGroup) this._headGroup.rotation.set(-0.08, 0, 0)
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = arm.userData.joints || {}
      arm.rotation.set(-0.18, 0, side * 0.82)
      if (elbow) elbow.rotation.set(0.24, 0, side * 0.14)
      if (wrist) wrist.rotation.set(-0.12, 0, 0)
    })
    ;[this._footLGroup, this._footRGroup].forEach((leg) => {
      if (!leg) return
      const { knee, ankle } = leg.userData.joints || {}
      leg.rotation.set(-0.34, 0, 0)
      if (knee) knee.rotation.set(0.88, 0, 0)
      if (ankle) ankle.rotation.set(-0.44, 0, 0)
    })
    this._updateTailSurface(time, 0.075, 2.2)
  }

  _updateLieDown(time) {
    const breathe = Math.sin(time * 1.35) * 0.007
    this.root.scale.set(1.10, 0.64 + breathe, 1.16)
    if (this._bodyGroup) this._bodyGroup.position.y = -0.22
    if (this._headGroup) this._headGroup.rotation.set(0.12, 0, Math.sin(time * 0.65) * 0.012)
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = arm.userData.joints || {}
      arm.rotation.set(0.68, side * 0.08, side * 0.17)
      if (elbow) elbow.rotation.set(0.72, 0, -side * 0.12)
      if (wrist) wrist.rotation.set(-0.34, 0, side * 0.06)
    })
    ;[[this._footLGroup, -1], [this._footRGroup, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = leg.userData.joints || {}
      leg.rotation.set(-0.92, side * 0.08, side * 0.20)
      if (knee) knee.rotation.set(1.16, 0, -side * 0.10)
      if (ankle) ankle.rotation.set(-0.54, 0, side * 0.08)
    })
    this._updateTailSurface(time, 0.022, 0.55)
  }

  _updateSleep(time) {
    const breathe = Math.sin(time * 0.82) * 0.014
    this.root.scale.set(1.13 + breathe * 0.25, 0.60 + breathe, 1.18)
    if (this._bodyGroup) this._bodyGroup.position.y = -0.25
    if (this._headGroup) this._headGroup.rotation.set(0.16, 0.16, -0.18 + Math.sin(time * 0.42) * 0.008)
    for (const [ear, side] of [[this._earLGroup, -1], [this._earRGroup, 1]]) {
      if (ear) ear.rotation.set(-0.12, 0, side * 0.11)
    }
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = arm.userData.joints || {}
      arm.rotation.set(0.76, side * 0.10, side * 0.25)
      if (elbow) elbow.rotation.set(0.94, 0, -side * 0.18)
      if (wrist) wrist.rotation.set(-0.42, 0, side * 0.10)
    })
    ;[[this._footLGroup, -1], [this._footRGroup, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = leg.userData.joints || {}
      leg.rotation.set(-1.02, side * 0.12, side * 0.32)
      if (knee) knee.rotation.set(1.28, 0, -side * 0.16)
      if (ankle) ankle.rotation.set(-0.64, 0, side * 0.12)
    })
    this._updateTailSurface(time, 0.012, 0.32)
  }

  _updateWave(time) {
    const wave = Math.sin(time * 5.2)
    const breathe = 1 + Math.sin(time * 1.5) * 0.009
    this.root.scale.set(1.05 * breathe, 1.02 * breathe, breathe)
    if (this._headGroup) this._headGroup.rotation.set(0, -0.08, -0.035 + wave * 0.012)
    const left = this._armLGroup
    if (left) {
      const { elbow, wrist } = left.userData.joints || {}
      left.rotation.set(0, 0, -0.08)
      if (elbow) elbow.rotation.set(0, 0, 0)
      if (wrist) wrist.rotation.set(0, 0, 0)
    }
    const right = this._armRGroup
    if (right) {
      const { elbow, wrist } = right.userData.joints || {}
      right.rotation.set(-0.10, 0, 1.72 + wave * 0.10)
      if (elbow) elbow.rotation.set(0.18, 0, -0.34)
      if (wrist) wrist.rotation.set(-0.06, 0, wave * 0.34)
    }
    for (const leg of [this._footLGroup, this._footRGroup]) {
      const { knee, ankle } = leg?.userData.joints || {}
      if (leg) leg.rotation.set(0, 0, 0)
      if (knee) knee.rotation.set(0, 0, 0)
      if (ankle) ankle.rotation.set(0, 0, 0)
    }
    this._updateTailSurface(time, 0.048, 1.35)
  }

  update(time) {
    if (this._bodyGroup) this._bodyGroup.position.y = 0
    if (this._earLGroup) this._earLGroup.rotation.set(0, 0, 0)
    if (this._earRGroup) this._earRGroup.rotation.set(0, 0, 0)
    if (this._animationMode === 'run') {
      this._updateRun(time)
      return
    }
    if (this._animationMode === 'flex') {
      this._updateFlex(time)
      return
    }
    if (this._animationMode === 'crouch') {
      this._updateCrouch(time)
      return
    }
    if (this._animationMode === 'jump') {
      this._updateJump(time)
      return
    }
    if (this._animationMode === 'sit-splay') {
      this._updateSplaySit(time)
      return
    }
    if (this._animationMode === 'lie-down') {
      this._updateLieDown(time)
      return
    }
    if (this._animationMode === 'sleep') {
      this._updateSleep(time)
      return
    }
    if (this._animationMode === 'wave') {
      this._updateWave(time)
      return
    }
    // 呼吸动画 + Meow-Generator 风格 idle
    const breathe = 1 + Math.sin(time * 1.5) * 0.012
    this.root.scale.set(1.05 * breathe, 1.02 * breathe, breathe)
    for (const arm of [this._armLGroup, this._armRGroup]) {
      const { elbow, wrist } = arm?.userData.joints || {}
      if (elbow) elbow.rotation.set(0, 0, 0)
      if (wrist) wrist.rotation.set(0, 0, 0)
    }
    for (const leg of [this._footLGroup, this._footRGroup]) {
      const { knee, ankle } = leg?.userData.joints || {}
      if (knee) knee.rotation.set(0, 0, 0)
      if (ankle) ankle.rotation.set(0, 0, 0)
    }

    if (this._headGroup) {
      // 头部轻微独立晃动
      this._headGroup.rotation.z = Math.sin(time * 0.8) * 0.020
      this._headGroup.rotation.x = Math.sin(time * 1.05) * 0.012
      this._headGroup.rotation.y = Math.sin(time * 0.65) * 0.015
    }

    // 耳朵独立微动
    if (this._earLGroup) {
      this._earLGroup.rotation.z = Math.sin(time * 1.3 + 0.5) * 0.04
      this._earLGroup.rotation.x = Math.sin(time * 1.1) * 0.03
    }
    if (this._earRGroup) {
      this._earRGroup.rotation.z = Math.sin(time * 1.3 - 0.5) * 0.04
      this._earRGroup.rotation.x = Math.sin(time * 1.1 + 0.3) * 0.03
    }

    // Shoulder roots stay embedded in the torso while the hands flare outward.
    if (this._armLGroup) {
      this._armLGroup.rotation.y = 0
      this._armLGroup.rotation.z = -0.08 + Math.sin(time * 1.15) * 0.010
      this._armLGroup.rotation.x = Math.sin(time * 0.92 + 0.6) * 0.018
    }
    if (this._armRGroup) {
      this._armRGroup.rotation.y = 0
      this._armRGroup.rotation.z = 0.08 + Math.sin(time * 1.15 + Math.PI) * 0.010
      this._armRGroup.rotation.x = Math.sin(time * 0.92 + 2.1) * 0.018
    }
    if (this._footLGroup) {
      this._footLGroup.rotation.x = Math.sin(time * 1.35 + 0.4) * 0.035
      this._footLGroup.rotation.z = Math.sin(time * 1.05) * 0.025
    }
    if (this._footRGroup) {
      this._footRGroup.rotation.x = Math.sin(time * 1.35 + 2.2) * 0.035
      this._footRGroup.rotation.z = Math.sin(time * 1.05 + Math.PI) * 0.025
    }

    this._updateTailSurface(time, 0.045, 1.25)
  }

  dispose() {
    this.root.traverse(child => {
      if (child.geometry && child.geometry !== this._bodyGeoRef) {
        child.geometry.dispose()
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          if (child.material.map) child.material.map.dispose()
          child.material.dispose()
        }
      }
    })
  }

  // ========== Private: 构建身体 ==========

  _buildBody() {
    // -- SDF 主体（loaf 面包猫） --
    const { mesh: sdfBody, headCenter, headRadius } = createSdfCatBody(this._furColor, {
      headSize: 1.0,
      chubbiness: 1.0,
    })

    // 替换 SDF 默认材质为 ToonMaterial
    if (sdfBody.material) sdfBody.material.dispose()
    sdfBody.material = furMat(this._furColor)
    sdfBody.material.color.set('#ffffff')
    this._furMaterials.push(sdfBody.material)
    this._bodyGeoRef = sdfBody.geometry
    applyFurVertexColors(sdfBody.geometry, this._furStyle, this._furColor)

    // 描边
    const outlineGeo = createOutlineGeometry(sdfBody.geometry, 0.018)
    const outlineMat = new THREE.MeshBasicMaterial({
      color: '#1a1518',
      side: THREE.BackSide,
      depthTest: true,
      depthWrite: false,
    })
    const outline = new THREE.Mesh(outlineGeo, outlineMat)
    outline.renderOrder = 1
    outline.name = 'SdfCatOutline'

    // 身体组（身体 + 描边）
    const bodyGroup = new THREE.Group()
    bodyGroup.add(sdfBody)
    bodyGroup.add(outline)

    // The reference character has a small, hand-sewn X low on the white belly.
    const stitchMat = new THREE.MeshBasicMaterial({ color: '#241d20' })
    for (const angle of [-0.72, 0.72]) {
      const stitch = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.10, 4, 8), stitchMat)
      stitch.position.set(0, -0.08, 0.495)
      stitch.rotation.z = angle
      stitch.name = 'BellyStitch'
      bodyGroup.add(stitch)
    }
    this.root.add(bodyGroup)
    this._bodyGroup = bodyGroup

    // Arms are separate, thick 3D assemblies so they stay visible and animation-ready.
    this._armLGroup = createRaisedArm(-1)
    this._armRGroup = createRaisedArm(1)
    this.root.add(this._armLGroup, this._armRGroup)

    // Match the reference stance: one planted foot and one lifted sole, both with five toes.
    this._footLGroup = createFoot(-1)
    this._footRGroup = createFoot(1)
    this.root.add(this._footLGroup, this._footRGroup)

    this._tailGroup = createJointedTail()
    this.root.add(this._tailGroup)

    // -- 头部组（面特征容器） --
    const headGroup = new THREE.Group()
    headGroup.position.copy(headCenter)
    this.root.add(headGroup)
    this._headGroup = headGroup

    // -- 内耳贴花（粉红耳内） --
    this._earLGroup = createArticulatedEar(headRadius, -1)
    this._earLGroup.position.add(headCenter)
    this.root.add(this._earLGroup)

    this._earRGroup = createArticulatedEar(headRadius, 1)
    this._earRGroup.position.add(headCenter)
    this.root.add(this._earRGroup)

    // -- 鼻子 --
    const n = createHeartNose(headRadius * 0.105)
    // Keep the default heart nose proud of the rounded muzzle, like the pixel references.
    n.position.set(0, -headRadius * 0.22, headRadius * 1.22)
    n.castShadow = true
    headGroup.add(n)

    // -- 嘴巴组 --
    this._mouthGroup = new THREE.Group()
    this._mouthGroup.name = 'FaceMouth'
    // Keep the expression root on the muzzle surface. Small line/tube expressions were
    // previously buried inside the deeper SDF head while only the large Excited mouth escaped.
    this._mouthGroup.position.set(0, -headRadius * 0.50, headRadius * 1.18)
    this._mouthGroup.scale.setScalar(1.32)
    headGroup.add(this._mouthGroup)
    this._rebuildMouth()

    // -- 胡须 --
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 3; i++) {
        const startY = -headRadius * (0.28 + i * 0.12)
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * headRadius * 0.28, startY, headRadius * 0.82),
          new THREE.Vector3(s * headRadius * 0.52, startY + (1 - i) * 0.015, headRadius * 0.85),
          new THREE.Vector3(s * headRadius * (0.82 + i * 0.08), startY + (1 - i) * 0.035, headRadius * 0.78),
        ])
        const wGeo = new THREE.TubeGeometry(curve, 12, 0.006, 5, false)
        const w = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({ color: '#27232b', roughness: 0.62 }))
        w.castShadow = true
        headGroup.add(w)
      }
    }

    // -- 眼睛占位 --
    this._eyeGroupL = new THREE.Group()
    this._eyeGroupL.position.set(-headRadius * 0.43, headRadius * 0.10, headRadius * 0.84)
    headGroup.add(this._eyeGroupL)

    this._eyeGroupR = new THREE.Group()
    this._eyeGroupR.position.set(headRadius * 0.43, headRadius * 0.10, headRadius * 0.84)
    headGroup.add(this._eyeGroupR)

    // -- VR 头显根 --
    this._vrHeadset = new THREE.Group()
    this._vrHeadset.position.set(0, headRadius * 0.08, headRadius * 0.44)
    headGroup.add(this._vrHeadset)

    // -- 装备根 --
    this._gearRoot = new THREE.Group()
    this.root.add(this._gearRoot)

    // 初始构建
    this._rebuildEyes()
    this._rebuildVRHeadset()
  }

  // ========== Private: 嘴巴 ==========

  _rebuildMouth() {
    if (!this._mouthGroup) return
    while (this._mouthGroup.children.length) this._mouthGroup.remove(this._mouthGroup.children[0])

    const expr = this._faceExpression
    const g = this._mouthGroup
    const profile = getFaceAppearanceProfile(expr)
    g.scale.setScalar(1.32 * profile.scale)
    g.userData.faceExpression = expr
    g.userData.faceFamily = profile.family
    g.userData.faceBounds = { width: profile.mouthWidth, height: profile.mouthHeight }
    g.userData.hasTongue = profile.hasTongue
    g.userData.hasFangs = profile.hasFangs

    if (expr === 'Excited') {
      const cavity = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 22, 16, 0, Math.PI * 2, 0, Math.PI),
        mouthCavityMat()
      )
      cavity.scale.set(1.18, 1.02, 0.72)
      cavity.rotation.x = Math.PI
      cavity.position.set(0, -0.025, -0.060)
      g.add(cavity)

      const tongue = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        tongueMat()
      )
      tongue.scale.set(1.25, 0.82, 0.8)
      tongue.position.set(0, -0.080, -0.015)
      g.add(tongue)

      for (const sx of [-1, 1]) {
        const fang = new THREE.Mesh(
          new THREE.ConeGeometry(0.014, 0.05, 8),
          new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 })
        )
        fang.position.set(sx * 0.065, 0.03, -0.040)
        fang.rotation.z = sx * 0.15
        g.add(fang)
      }
    } else if (expr === 'Smile') {
      const smileMat = new THREE.MeshStandardMaterial({ color: '#381212', roughness: 0.5 })
      // A short philtrum and two asymmetric cubic arcs read more naturally than a sharp V.
      const philtrum = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.046, 0.025),
        new THREE.Vector3(0, 0.025, 0.031),
        new THREE.Vector3(0, 0.010, 0.031),
      ])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(philtrum, 8, 0.0065, 6, false), smileMat))
      for (const side of [-1, 1]) {
        const curve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(0, 0.010, 0.030),
          new THREE.Vector3(side * 0.018, -0.030, 0.036),
          new THREE.Vector3(side * 0.060, -0.031, 0.031),
          new THREE.Vector3(side * 0.084, 0.008, 0.022),
        )
        const cheek = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.084, 0.008, 0.022),
          new THREE.Vector3(side * 0.090, 0.018, 0.018),
        ])
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.007, 7, false), smileMat))
        g.add(new THREE.Mesh(new THREE.TubeGeometry(cheek, 4, 0.006, 6, false), smileMat))
      }
    } else if (expr === 'Whistling') {
      const o = new THREE.Mesh(
        new THREE.CylinderGeometry(0.030, 0.030, 0.018, 20, 1, false),
        mouthCavityMat()
      )
      o.rotation.x = Math.PI / 2
      o.position.set(0, -0.015, 0.02)
      g.add(o)
      const lip = new THREE.Mesh(
        new THREE.TorusGeometry(0.035, 0.008, 8, 20),
        new THREE.MeshStandardMaterial({ color: '#e8917a', roughness: 0.4 })
      )
      lip.position.set(0, -0.015, 0.02)
      g.add(lip)
      const noteMat = new THREE.MeshBasicMaterial({ color: '#17151b' })
      const stem = new THREE.Mesh(new RoundedBoxGeometry(0.015, 0.105, 0.015, 2, 0.006), noteMat)
      stem.position.set(0.115, -0.055, 0.035); stem.rotation.z = -0.10; g.add(stem)
      const flag = new THREE.Mesh(new RoundedBoxGeometry(0.070, 0.018, 0.015, 2, 0.007), noteMat)
      flag.position.set(0.085, -0.005, 0.035); flag.rotation.z = -0.25; g.add(flag)
      const noteHead = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 8), noteMat)
      noteHead.scale.x = 1.35; noteHead.position.set(0.100, -0.105, 0.04); g.add(noteHead)
    } else if (expr === 'Wow') {
      const o = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.063, 0.055, 8, 20),
        mouthCavityMat()
      )
      o.scale.set(0.92, 1.05, 0.48)
      o.position.set(0, -0.040, 0.028)
      g.add(o)
      const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.048, 18, 12), tongueMat())
      tongue.scale.set(1.04, 0.55, 0.42)
      tongue.position.set(0, -0.091, 0.063)
      g.add(tongue)
      const lowerLip = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.043, -0.112, 0.066),
        new THREE.Vector3(0, -0.122, 0.072),
        new THREE.Vector3(0.043, -0.112, 0.066),
      ])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(lowerLip, 12, 0.006, 6, false), tongueMat()))
    } else if (expr === 'Yum') {
      const smileMat = new THREE.MeshStandardMaterial({ color: '#381212', roughness: 0.5 })
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.065, 0, 0.02), new THREE.Vector3(0, -0.022, 0.025), new THREE.Vector3(0.065, 0, 0.02),
      ])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.008, 6, false), smileMat))
      // Side-licking tongue: broad at the mouth, rounded at the tip, and visibly creased.
      const tongueShape = new THREE.Shape()
      tongueShape.moveTo(-0.010, 0.020)
      tongueShape.bezierCurveTo(0.020, 0.012, 0.055, 0.002, 0.077, -0.020)
      tongueShape.bezierCurveTo(0.095, -0.040, 0.088, -0.068, 0.064, -0.073)
      tongueShape.bezierCurveTo(0.032, -0.078, 0.006, -0.050, -0.010, -0.025)
      tongueShape.closePath()
      const tongueGeo = new THREE.ExtrudeGeometry(tongueShape, {
        depth: 0.018, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.006, bevelThickness: 0.005,
      })
      const tongue = new THREE.Mesh(tongueGeo, tongueMat())
      tongue.position.set(0.025, -0.006, 0.060)
      g.add(tongue)
      const crease = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.072, -0.030, 0.088),
        new THREE.Vector3(0.078, -0.047, 0.090),
        new THREE.Vector3(0.066, -0.060, 0.088),
      ])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(crease, 8, 0.003, 5, false), smileMat))
    }
  }

  // ========== Private: 眼睛 ==========

  _rebuildEyes() {
    const clear = (g) => { while (g.children.length) g.remove(g.children[0]) }
    clear(this._eyeGroupL)
    clear(this._eyeGroupR)
    this._eyelids = []

    // 头部半径参考（约 0.3）
    const eyeR = 0.118
    const irR = 0.084
    const hlR = 0.026
    const profile = getEyeAppearanceProfile(this._eyeStyle)

    const build = (group, side) => {
      switch (this._eyeStyle) {
        case 'Original': {
          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(eyeR * 0.82, eyeR * 0.09, 10, 28),
            new THREE.MeshStandardMaterial({ color: profile.accent, roughness: profile.roughness, metalness: profile.metalness })
          )
          rim.position.z = 0.078; group.add(rim)
          const p = new THREE.Mesh(new THREE.SphereGeometry(irR, 18, 14), pupil())
          p.scale.set(1, 1.08, 0.72); p.position.z = 0.082; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(-0.025, 0.036, 0.145); group.add(h)
          const h2 = new THREE.Mesh(new THREE.SphereGeometry(hlR * 0.42, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h2.position.set(0.035, -0.025, 0.142); group.add(h2)
          break
        }
        case 'Relaxed': {
          const w = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.94, 20, 16), eyeWhite())
          w.scale.z = 0.72; group.add(w)
          for (let line = -1; line <= 1; line++) {
            const bar = new THREE.Mesh(
              new RoundedBoxGeometry(eyeR * 1.25, 0.010, 0.016, 2, 0.005),
            new THREE.MeshBasicMaterial({ color: profile.primary })
            )
            bar.position.set(0, line * 0.025, 0.100)
            group.add(bar)
          }
          break
        }
        case 'Alert': {
          const rim = new THREE.Mesh(new THREE.TorusGeometry(eyeR * 0.88, eyeR * 0.10, 10, 28),
            new THREE.MeshStandardMaterial({ color: profile.accent, roughness: 0.32 }))
          rim.position.z = 0.076; group.add(rim)
          const iris = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.82, 20, 16),
            new THREE.MeshStandardMaterial({ color: profile.primary, roughness: profile.roughness, metalness: profile.metalness }))
          iris.scale.set(0.88, 1.06, 0.68); iris.position.z = 0.080; group.add(iris)
          const p = new THREE.Mesh(new THREE.CapsuleGeometry(irR * 0.16, irR * 1.18, 6, 10), pupil())
          p.position.z = 0.142; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR * 1.1, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.035, 0.043, 0.157); group.add(h)
          break
        }
        case 'Blue Ring': {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(eyeR * 0.76, eyeR * 0.13, 12, 28),
            new THREE.MeshStandardMaterial({ color: profile.accent, roughness: profile.roughness, metalness: profile.metalness,
              emissive: profile.emissive, emissiveIntensity: profile.emissiveIntensity }))
          ring.position.z = 0.086; group.add(ring)
          const p = new THREE.Mesh(new THREE.SphereGeometry(irR * 0.90, 18, 14), pupil())
          p.scale.z = 0.68; p.position.z = 0.088; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.032, 0.040, 0.150); group.add(h)
          break
        }
        case 'Sunglasses': {
          const lens = new THREE.Mesh(new RoundedBoxGeometry(eyeR * 2.05, eyeR * 1.18, 0.055, 4, 0.025),
            new THREE.MeshStandardMaterial({ color: profile.primary, roughness: profile.roughness, metalness: profile.metalness }))
          lens.position.z = 0.080; group.add(lens)
          for (const [x, y, scale] of [[-0.035, 0.025, 1], [0.025, -0.018, 0.62]]) {
            const refl = new THREE.Mesh(new RoundedBoxGeometry(0.036 * scale, 0.055 * scale, 0.008, 2, 0.004),
              new THREE.MeshBasicMaterial({ color: '#ffffff' }))
            refl.position.set(x, y, 0.112); refl.rotation.z = -0.55; group.add(refl)
          }
          if (side < 0) {
            const bridge = new THREE.Mesh(new RoundedBoxGeometry(eyeR * 0.72, 0.032, 0.035, 2, 0.012),
              new THREE.MeshStandardMaterial({ color: '#09090d', roughness: 0.15, metalness: 0.4 }))
            bridge.position.set(eyeR * 1.35, 0.005, 0.091); group.add(bridge)
          }
          break
        }
        case 'VR': {
          // VR 头显由 _rebuildVRHeadset 单独绘制
          break
        }
        case 'Big Black': {
          const be = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 1.22, 22, 18),
            new THREE.MeshStandardMaterial({ color: profile.primary, roughness: profile.roughness, metalness: profile.metalness }))
          be.scale.set(1, 1.15, 0.7); group.add(be)
          for (const [x, y, s] of [[0.022, 0.035, 0.022], [-0.018, 0.048, 0.010]]) {
            const h = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6),
              new THREE.MeshBasicMaterial({ color: '#ffffff' }))
            h.position.set(x, y, 0.058); group.add(h)
          }
          break
        }
      }
    }
    build(this._eyeGroupL, -1)
    build(this._eyeGroupR, 1)
  }

  // ========== Private: VR 头显 ==========

  _rebuildVRHeadset() {
    if (!this._vrHeadset) return
    while (this._vrHeadset.children.length) this._vrHeadset.remove(this._vrHeadset.children[0])

    if (this._eyeStyle !== 'VR') {
      this._vrHeadset.visible = false
      return
    }
    this._vrHeadset.visible = true

    const g = this._vrHeadset
    const profile = getEyeAppearanceProfile('VR')

    // 深黑玻璃曲面
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: profile.primary,
      roughness: profile.roughness,
      metalness: profile.metalness,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.5,
    })

    const frameShell = new THREE.Mesh(
      new RoundedBoxGeometry(0.90, 0.38, 0.20, 5, 0.10),
      metal(profile.accent)
    )
    frameShell.position.set(0, 0, 0.18)
    frameShell.castShadow = true
    g.add(frameShell)

    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.32, 0.20, 5, 0.09), visorMat)
    visor.position.set(0, 0, 0.205)
    visor.castShadow = true
    g.add(visor)

    // 银色铝框
    const frameMat = metal(profile.accent)

    // 头带
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.50, 0.022, 8, 48),
      new THREE.MeshStandardMaterial({ color: '#c8cdd5', roughness: 0.35, metalness: 0.6 })
    )
    strap.rotation.x = Math.PI / 2
    strap.position.set(0, 0, -0.08)
    strap.scale.set(1, 1.08, 1)
    g.add(strap)

    // 玻璃反光条
    const reflMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })
    const refl1 = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.018), reflMat)
    refl1.position.set(-0.08, 0.045, 0.315)
    refl1.rotation.y = -0.08
    g.add(refl1)
    const refl2 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.018), reflMat)
    refl2.position.set(0.07, 0.045, 0.315)
    refl2.rotation.y = 0.06
    g.add(refl2)

    // 侧边扬声器
    const sidePod = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.035, 0.10, 6, 10),
      frameMat
    )
    sidePod.position.set(0.50, 0, 0.05)
    sidePod.rotation.z = Math.PI / 2
    g.add(sidePod)
    const sidePodL = sidePod.clone()
    sidePodL.position.set(-0.50, 0, 0.05)
    g.add(sidePodL)
  }

  // ========== Private: 装备 ==========

  _rebuildGear() {
    while (this._gearRoot.children.length) this._gearRoot.remove(this._gearRoot.children[0])
    if (!this._gearType) return

    if (TEXTURE_GEAR_TYPES.has(this._gearType)) {
      const gear = createGear(this._gearType)
      if (gear) {
        applyEquipmentAttachment(gear, this._gearType)
        this._gearRoot.add(gear)
      }
    }
  }
}
