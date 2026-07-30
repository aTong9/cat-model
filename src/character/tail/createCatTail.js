import * as THREE from 'three'

const BASE_POINTS = Object.freeze([
  [0, 0, 0], [-0.16, 0, -0.05], [-0.31, 0.06, -0.05],
  [-0.44, 0.17, -0.01], [-0.53, 0.31, 0.06], [-0.56, 0.46, 0.14], [-0.53, 0.59, 0.21],
])

export function createTaperedTailGeometry(points) {
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
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function createCatTail(gradientMap) {
  const root = new THREE.Group()
  root.name = 'TailRoot'
  root.position.set(0.04, -0.10, -0.38)
  const material = new THREE.MeshToonMaterial({ color: '#f5f1e6', gradientMap })
  const basePoints = BASE_POINTS.map(point => new THREE.Vector3(...point))
  const surface = new THREE.Mesh(createTaperedTailGeometry(basePoints), material)
  surface.name = 'TailSurface'
  surface.castShadow = true
  root.add(surface)
  root.userData.basePoints = basePoints
  root.userData.surface = surface
  root.userData.tailCurl = 0
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
  previousGeometry.dispose()
  return true
}
