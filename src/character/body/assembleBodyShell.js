import * as THREE from 'three'

export function assembleBodyShell(bodyMesh, outline) {
  const group = new THREE.Group()
  group.name = 'BodyShell'
  group.add(bodyMesh, outline)
  const stitchMaterial = new THREE.MeshBasicMaterial({ color: '#241d20' })
  for (const angle of [-0.72, 0.72]) {
    const stitch = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.10, 4, 8), stitchMaterial)
    stitch.position.set(0, -0.08, 0.495)
    stitch.rotation.z = angle
    stitch.name = 'BellyStitch'
    group.add(stitch)
  }
  return group
}
