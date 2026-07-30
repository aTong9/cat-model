import * as THREE from 'three'

const BASE_POINTS = Object.freeze([
  [0, 0, 0], [0.015, 0.12, -0.08], [0.025, 0.27, -0.14],
  [0.020, 0.42, -0.17], [0.010, 0.56, -0.16], [0, 0.68, -0.12],
])

export function createTaperedTailGeometry(points) {
  const tubularSegments = 48
  const radialSegments = 12
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, 0.085, radialSegments, false)
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
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function createCatTail(gradientMap) {
  const root = new THREE.Group()
  root.name = 'TailRoot'
  // Begin inside the rear body volume; the first curve segment then exits the
  // body instead of exposing TubeGeometry's open root ring.
  root.position.set(0.04, -0.08, -0.31)
  const material = new THREE.MeshToonMaterial({ color: '#f4c430', gradientMap })
  const tipMaterial = new THREE.MeshToonMaterial({ color: '#f5f1e6', gradientMap })
  const basePoints = BASE_POINTS.map(point => new THREE.Vector3(...point))
  const rootBlend = new THREE.Mesh(new THREE.SphereGeometry(0.086, 24, 18), material)
  rootBlend.scale.set(1.02, 1.12, 1.02)
  rootBlend.position.set(0, 0.018, -0.012)
  rootBlend.name = 'TailRootBlend'
  rootBlend.castShadow = true
  const surface = new THREE.Mesh(createTaperedTailGeometry(basePoints), material)
  surface.name = 'TailSurface'
  surface.castShadow = true
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.060, 20, 14), tipMaterial)
  tip.scale.set(0.92, 1.45, 0.92)
  tip.position.copy(basePoints.at(-1))
  tip.name = 'TailTip'
  tip.castShadow = true
  root.add(rootBlend, surface, tip)
  root.userData.basePoints = basePoints
  root.userData.surface = surface
  root.userData.tip = tip
  root.userData.tailCurl = 0
  root.userData.attachment = {
    parentId: 'body',
    parentSocket: 'tail-base',
    localStart: root.position.toArray(),
    localEnd: root.position.clone().add(basePoints.at(-1)).toArray(),
    baseRadius: 0.086,
    endRadius: 0.027,
    embedDepth: 0.075,
    contactType: 'embedded',
    gapTolerance: 0.01,
    evidenceRefs: ['pixel_cat_3d/sdf/1.png'],
    inferredHiddenRegion: true,
  }
  return root
}

export function updateCatTail(root, time, intensity = 0.06, speed = 1) {
  const surface = root?.userData.surface
  const basePoints = root?.userData.basePoints
  if (!surface || !basePoints) return false
  const tailCurl = Number(root.userData.tailCurl) || 0
  const points = basePoints.map((point, index) => {
    const weight = index / Math.max(1, basePoints.length - 1)
    return point.clone().add(new THREE.Vector3(
      Math.sin(time * speed - index * 0.34) * intensity * weight + tailCurl * weight * weight * 0.34,
      Math.cos(time * speed * 0.72 - index * 0.26) * intensity * 0.28 * weight + Math.abs(tailCurl) * weight * weight * 0.16,
      Math.sin(time * speed * 0.86 - index * 0.42) * intensity * 1.25 * weight,
    ))
  })
  const previousGeometry = surface.geometry
  surface.geometry = createTaperedTailGeometry(points)
  root.userData.tip?.position.copy(points.at(-1))
  previousGeometry.dispose()
  return true
}
