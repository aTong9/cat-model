import * as THREE from 'three'

function createInnerEarDecal(headRadius, side) {
  const shape = new THREE.Shape()
  shape.moveTo(-headRadius * 0.20, -headRadius * 0.19)
  shape.quadraticCurveTo(-headRadius * 0.18, headRadius * 0.15, 0, headRadius * 0.36)
  shape.quadraticCurveTo(headRadius * 0.18, headRadius * 0.15, headRadius * 0.20, -headRadius * 0.19)
  shape.quadraticCurveTo(0, -headRadius * 0.10, -headRadius * 0.20, -headRadius * 0.19)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012, bevelEnabled: true, bevelSize: 0.008,
    bevelThickness: 0.005, bevelSegments: 2,
  })
  geometry.center()
  const material = new THREE.MeshStandardMaterial({ color: '#e85a50', roughness: 0.42, metalness: 0.02 })
  const inner = new THREE.Mesh(geometry, material)
  inner.name = side < 0 ? 'InnerEarLeft' : 'InnerEarRight'
  inner.castShadow = true
  return inner
}

export function createCatEar(headRadius, side, gradientMap) {
  const root = new THREE.Group()
  root.name = side < 0 ? 'EarLeft' : 'EarRight'
  // Sit outside and slightly in front of the SDF head silhouette. Keeping the
  // ear entirely inside the head volume made it disappear in the front view.
  // CatModel adds headCenter after the factory returns. The ear shell is much
  // shorter than the SDF head radius, so its root must sit above the center:
  // the lower bevel then intersects the skull while the tip clears its crown.
  // Place the root far enough out to preserve the two separate ear peaks, but
  // low enough for the rounded base to overlap the skull. The previous 2.52Y
  // offset left a visible strip of air between the ear and the SDF head after
  // the Pack 5 vertical morphology compression.
  // The base overlaps the skull instead of hovering above it. 1.16 keeps the
  // lower blend buried in the rounded head after the global Pack 5 Y scale,
  // while the separately raised shell still clears the crown.
  root.position.set(side * headRadius * 0.78, headRadius * 0.58, headRadius * 0.10)
  const outerMaterial = new THREE.MeshToonMaterial({ color: '#f4c430', gradientMap })

  const rootBlend = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.26, 24, 16), outerMaterial)
  rootBlend.name = side < 0 ? 'EarLeftRootBlend' : 'EarRightRootBlend'
  rootBlend.scale.set(1.18, 0.62, 1.08)
  rootBlend.position.set(-side * headRadius * 0.065, -headRadius * 0.42, -headRadius * 0.08)
  rootBlend.castShadow = true
  rootBlend.visible = true
  root.add(rootBlend)

  const shape = new THREE.Shape()
  shape.moveTo(-headRadius * 0.30, -headRadius * 0.30)
  shape.bezierCurveTo(-headRadius * 0.27, headRadius * 0.02, -headRadius * 0.09, headRadius * 0.38, 0, headRadius * 0.46)
  shape.bezierCurveTo(headRadius * 0.09, headRadius * 0.38, headRadius * 0.27, headRadius * 0.02, headRadius * 0.30, -headRadius * 0.30)
  shape.quadraticCurveTo(0, -headRadius * 0.39, -headRadius * 0.30, -headRadius * 0.30)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: headRadius * 0.42, bevelEnabled: true, bevelSegments: 8,
    bevelSize: headRadius * 0.078, bevelThickness: headRadius * 0.070,
  })
  geometry.center()
  // Taper the rear cross-section so the ear reads as a triangular wedge in
  // profile instead of an equal-depth extruded card.
  geometry.computeBoundingBox()
  const positions = geometry.getAttribute('position')
  const minZ = geometry.boundingBox.min.z
  const depth = Math.max(0.001, geometry.boundingBox.max.z - minZ)
  const centerZ = (geometry.boundingBox.min.z + geometry.boundingBox.max.z) * .5
  const minY = geometry.boundingBox.min.y
  const height = Math.max(.001, geometry.boundingBox.max.y - minY)
  for (let index = 0; index < positions.count; index++) {
    const frontWeight = (positions.getZ(index) - minZ) / depth
    const sectionScale = THREE.MathUtils.lerp(0.56, 1, frontWeight)
    positions.setXY(index, positions.getX(index) * sectionScale, positions.getY(index) * sectionScale)
    const heightWeight = THREE.MathUtils.clamp((positions.getY(index) - minY) / height, 0, 1)
    const verticalDepth = THREE.MathUtils.lerp(1, .16, heightWeight)
    positions.setZ(index, centerZ + (positions.getZ(index) - centerZ) * verticalDepth)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  const outer = new THREE.Mesh(geometry, outerMaterial)
  outer.name = side < 0 ? 'EarLeftOuter' : 'EarRightOuter'
  // Keep the pointed shell high while the separate rounded blend stays buried
  // in the head; moving the whole assembly down would otherwise blunt the ear.
  // Keep the ear shell behind the eye/muzzle plane. The former forward offset
  // made the ears visibly cross the eyes in three-quarter and side views.
  outer.position.set(0, headRadius * 0.40, headRadius * 0.42)
  outer.scale.y = 1.80
  outer.rotation.z = -side * 0.08
  outer.rotation.y = side * 0.16
  outer.castShadow = true
  root.add(outer)

  const inner = createInnerEarDecal(headRadius * 0.72, side)
  inner.position.set(0, headRadius * 0.15, headRadius * 0.165)
  inner.rotation.z = -side * 0.08
  inner.scale.set(0.72, 0.68, 1)
  outer.add(inner)
  return root
}
