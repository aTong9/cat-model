import * as THREE from 'three'

function createInnerEarDecal(headRadius, side) {
  const shape = new THREE.Shape()
  shape.moveTo(-headRadius * 0.20, -headRadius * 0.20)
  shape.lineTo(headRadius * 0.20, -headRadius * 0.20)
  shape.lineTo(0, headRadius * 0.34)
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
  root.position.set(side * headRadius * 0.67, headRadius * 0.61, -headRadius * 0.12)

  const shape = new THREE.Shape()
  shape.moveTo(-headRadius * 0.25, -headRadius * 0.13)
  shape.bezierCurveTo(-headRadius * 0.20, headRadius * 0.08, -headRadius * 0.10, headRadius * 0.54, 0, headRadius * 0.62)
  shape.bezierCurveTo(headRadius * 0.10, headRadius * 0.54, headRadius * 0.20, headRadius * 0.08, headRadius * 0.25, -headRadius * 0.13)
  shape.quadraticCurveTo(0, -headRadius * 0.22, -headRadius * 0.25, -headRadius * 0.13)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: headRadius * 0.20, bevelEnabled: true, bevelSegments: 4,
    bevelSize: headRadius * 0.055, bevelThickness: headRadius * 0.045,
  })
  geometry.center()
  const outer = new THREE.Mesh(geometry, new THREE.MeshToonMaterial({ color: '#f4c430', gradientMap }))
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
