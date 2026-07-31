import * as THREE from 'three'
import { createArticulatedFoot, createArticulatedHand } from './createCatPaws.js'

function createFurJointCover(radius, material, name, scale = [1, 1, 1]) {
  const cover = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 20), material)
  cover.scale.set(...scale)
  cover.name = name
  cover.castShadow = true
  return cover
}

function createSkinnedLimb({ name, upperVector, lowerVector, radii, material, jointNames = ['Shoulder', 'Elbow', 'Wrist'], radialSegments = 16 }) {
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
  rootBone.name = `${name}${jointNames[0]}Bone`
  const middleBone = new THREE.Bone()
  middleBone.name = `${name}${jointNames[1]}Bone`
  middleBone.position.copy(upperVector)
  const endBone = new THREE.Bone()
  endBone.name = `${name}${jointNames[2]}Bone`
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
  shoulder.position.set(side * 0.40, 0.62, 0.08)
  shoulder.userData.restPosition = shoulder.position.toArray()
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
  const upperVector = new THREE.Vector3(side * 0.040, -0.225, 0.050)
  const foreVector = new THREE.Vector3(-side * 0.015, -0.175, 0.030)
  const limb = createSkinnedLimb({
    name: shoulder.name,
    upperVector,
    lowerVector: foreVector,
    radii: [0.158, 0.137, 0.116],
    material: fur,
    radialSegments: 20,
  })
  shoulder.add(limb.surface)
  const elbow = limb.middleBone
  const wrist = limb.endBone

  const hand = createArticulatedHand(side, { pawMaterial: pawFur, padMaterial: pad, createHeart, limbName: shoulder.name })
  hand.name = `${shoulder.name}Paw`
  wrist.add(hand)
  shoulder.userData.joints = { elbow, wrist, ...hand.userData.joints }
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
  // The lower SDF belly is the foremost surface at the hip. Put the leg
  // slightly in front of it so the articulated mesh covers the body outline
  // instead of appearing as a detached ball behind a black seam.
  // Start the articulated leg inside the lower torso. The previous .08 root
  // left only the paw visible below the belly, which read as a very short leg.
  // Raising the hip while extending both bones preserves the same ankle/floor
  // contact and exposes a proper upper/lower-leg silhouette.
  hip.position.set(side * 0.18, 0.18, 0.16)
  hip.userData.restPosition = hip.position.toArray()
  const fur = new THREE.MeshToonMaterial({
    color: '#f4c430',
    gradientMap: gradientMap,
  })
  const pawFur = new THREE.MeshToonMaterial({ color: '#f5f1e6', gradientMap: gradientMap })
  const pad = new THREE.MeshStandardMaterial({ color: '#f06f78', roughness: 0.42 })
  const thighVector = new THREE.Vector3(side * 0.008, -0.18, 0.028)
  const hipBlend = createFurJointCover(0.148, fur, `${hip.name}HipBlend`, [1.08, 1.14, 1.08])
  // The torso already supplies the rounded haunch volume. Showing another
  // sphere at the leg root creates the broken, scalloped joint seen in the old
  // neutral model, so retain it as a rig helper but omit it from the surface.
  hipBlend.visible = false
  hip.add(hipBlend)
  const shinVector = new THREE.Vector3(-side * 0.008, -0.14, 0.040)
  const limb = createSkinnedLimb({
    name: hip.name,
    upperVector: thighVector,
    lowerVector: shinVector,
    radii: [0.150, 0.134, 0.114],
    material: fur,
    jointNames: ['Hip', 'Knee', 'Ankle'],
    radialSegments: 14,
  })
  hip.add(limb.surface)
  const knee = limb.middleBone
  const ankle = limb.endBone
  const foot = createArticulatedFoot(side, { pawMaterial: pawFur, padMaterial: pad, createHeart, limbName: hip.name })
  ankle.add(foot)
  hip.userData.joints = { knee, ankle, ...foot.userData.joints }
  hip.userData.attachment = {
    parentId: 'body',
    parentSocket: side < 0 ? 'hip-left' : 'hip-right',
    localStart: hip.position.toArray(),
    localEnd: hip.position.clone().add(thighVector).add(shinVector).toArray(),
    baseRadius: 0.148,
    endRadius: 0.114,
    embedDepth: 0.09,
    contactType: 'embedded',
    gapTolerance: 0.01,
    evidenceRefs: ['pixel_cat_3d/sdf/1.png', 'pixel_cat_3d/sdf/2.png'],
  }
  return hip
}
