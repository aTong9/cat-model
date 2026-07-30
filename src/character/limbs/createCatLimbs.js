import * as THREE from 'three'

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

export function createRaisedArm(side, { gradientMap, createHeart }) {
  const shoulder = new THREE.Group()
  shoulder.name = side < 0 ? 'ArmLeft' : 'ArmRight'
  shoulder.position.set(side * 0.32, 0.64, 0.12)
  const fur = new THREE.MeshToonMaterial({
    color: '#f4c430',
    gradientMap: gradientMap,
  })
  const pawFur = new THREE.MeshToonMaterial({ color: '#f5f1e6', gradientMap: gradientMap })
  const pad = new THREE.MeshStandardMaterial({ color: '#f06f78', roughness: 0.42 })
  // Sink a soft shoulder cap into the chest. The body and limbs are separate
  // meshes, so the cap hides the body-outline seam and keeps the joint reading
  // as one continuous silhouette while the arm pivots.
  const shoulderBlend = createFurJointCover(
    0.168,
    fur,
    `${shoulder.name}ShoulderBlend`,
    [1.08, 1.16, 0.96],
  )
  shoulderBlend.position.set(-side * 0.028, -0.012, -0.018)
  shoulder.add(shoulderBlend)
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

  // Three shallow knuckles match the neutral mitten-like reference hand.
  const digits = [
    { x: -0.045, y: 0.070, s: 0.94 },
    { x: 0, y: 0.096, s: 1.00 },
    { x: 0.045, y: 0.070, s: 0.94 },
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
    fingerPad.visible = false
    wrist.add(fingerPad)
  })

  const pawPad = createHeart(0.058, pad)
  pawPad.scale.set(1.06, 0.94, 0.58)
  pawPad.position.set(0, -0.018, 0.140)
  pawPad.name = `${shoulder.name}Pad`
  pawPad.visible = false
  wrist.add(pawPad)
  shoulder.userData.joints = { elbow, wrist }
  shoulder.userData.attachment = {
    parentId: 'body',
    parentSocket: side < 0 ? 'shoulder-left' : 'shoulder-right',
    localStart: shoulder.position.toArray(),
    localEnd: shoulder.position.clone().add(upperVector).add(foreVector).toArray(),
    baseRadius: 0.168,
    endRadius: 0.102,
    embedDepth: 0.105,
    contactType: 'embedded',
    gapTolerance: 0.01,
    evidenceRefs: ['pixel_cat_3d/sdf/1.png', 'pixel_cat_3d/sdf/2.png'],
  }
  return shoulder
}

export function createFoot(side, { gradientMap, createHeart }) {
  const hip = new THREE.Group()
  hip.name = side < 0 ? 'LegLeft' : 'LegRight'
  hip.position.set(side * 0.18, -0.10, 0.02)
  const fur = new THREE.MeshToonMaterial({
    color: '#f4c430',
    gradientMap: gradientMap,
  })
  const pawFur = new THREE.MeshToonMaterial({ color: '#f5f1e6', gradientMap: gradientMap })
  const pad = new THREE.MeshStandardMaterial({ color: '#f06f78', roughness: 0.42 })
  const thighVector = new THREE.Vector3(side * 0.01, -0.20, 0.035)
  hip.add(createFurJointCover(0.148, fur, `${hip.name}HipBlend`, [1.08, 1.14, 1.08]))
  const shinVector = new THREE.Vector3(-side * 0.01, -0.15, 0.060)
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
    toePad.position.set(toe.position.x, toe.position.y, -0.075)
    toePad.name = `${hip.name}ToePad${index + 1}`
    ankle.add(toePad)
  })

  const solePad = createHeart(0.067, pad)
  solePad.scale.set(1.12, 1.02, 0.72)
  solePad.position.set(center.x, center.y + 0.015, -0.105)
  solePad.name = `${hip.name}MainPad`
  ankle.add(solePad)
  hip.userData.joints = { knee, ankle }
  return hip
}
