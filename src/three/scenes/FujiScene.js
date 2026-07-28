import * as THREE from 'three'

function makeSnowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  const glow = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(.55, 'rgba(248,252,255,.95)')
  glow.addColorStop(1, 'rgba(220,238,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createFujiMountain() {
  const root = new THREE.Group()
  root.name = 'FujiRealm:mountain'
  root.position.set(0, .18, -4.25)

  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(2.82, 2.48, 40, 10),
    new THREE.MeshStandardMaterial({ color: '#526f9d', roughness: .94, flatShading: true })
  )
  mountain.name = 'FujiRealm:volcanic-body'
  mountain.scale.z = .58
  root.add(mountain)

  const segments = 40
  const positions = [0, 1.26, 0]
  const boundary = []
  for (let index = 0; index < segments; index++) {
    const angle = index / segments * Math.PI * 2
    const boundaryY = .35 + Math.sin(angle * 3 + .4) * .10 + Math.sin(angle * 7) * .045
    const radius = 2.82 * (1 - (boundaryY + 1.24) / 2.48)
    boundary.push([Math.cos(angle) * radius, boundaryY, Math.sin(angle) * radius * .58])
    positions.push(...boundary[index])
  }
  const indices = []
  for (let index = 0; index < segments; index++) indices.push(0, index + 1, ((index + 1) % segments) + 1)
  const snowGeometry = new THREE.BufferGeometry()
  snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  snowGeometry.setIndex(indices)
  snowGeometry.computeVertexNormals()
  const snowCap = new THREE.Mesh(
    snowGeometry,
    new THREE.MeshStandardMaterial({ color: '#f7fbff', roughness: .82, side: THREE.DoubleSide })
  )
  snowCap.name = 'FujiRealm:irregular-snow-cap'
  snowCap.position.z = .015
  root.add(snowCap)

  const ridgeMaterial = new THREE.MeshStandardMaterial({ color: '#dce9f4', roughness: .88, side: THREE.DoubleSide })
  for (const [x, y, scale, rotation] of [[-.82, .18, .72, -.12], [-.30, .08, .92, -.04], [.32, .13, .78, .08], [.80, .20, .58, .14]]) {
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(.16 * scale, .78 * scale, 3), ridgeMaterial)
    ridge.name = 'FujiRealm:snow-ridge'
    ridge.position.set(x, y, .78)
    ridge.rotation.z = rotation
    ridge.scale.z = .10
    root.add(ridge)
  }
  return root
}

function createCloudBank() {
  const root = new THREE.Group()
  root.name = 'FujiRealm:cloud-bank'
  const material = new THREE.MeshBasicMaterial({ color: '#dce8ff', transparent: true, opacity: .78, depthWrite: false })
  const clouds = [
    [-3.4, 2.75, -5.4, 1.05], [-2.4, 2.92, -5.5, .78], [-1.5, 2.72, -5.3, .92],
    [1.5, 3.02, -5.5, .88], [2.5, 3.18, -5.6, 1.18], [3.5, 2.86, -5.4, .86],
  ]
  clouds.forEach(([x, y, z, scale], index) => {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(.62, 18, 12), material)
    cloud.name = `FujiRealm:cloud-${index}`
    cloud.position.set(x, y, z)
    cloud.scale.set(1.8 * scale, .55 * scale, .45 * scale)
    root.add(cloud)
  })
  return root
}

function createLakeAndShore() {
  const root = new THREE.Group()
  root.name = 'FujiRealm:lake-and-shore'
  const lake = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 9, 20, 12),
    new THREE.MeshStandardMaterial({ color: '#4e9fe4', emissive: '#164e91', emissiveIntensity: .16, roughness: .24, metalness: .05, transparent: true, opacity: .88 })
  )
  lake.name = 'FujiRealm:lake'
  lake.rotation.x = -Math.PI / 2
  lake.position.set(0, -.99, -1.8)
  root.add(lake)

  const shoreMaterial = new THREE.MeshStandardMaterial({ color: '#f5f9ff', roughness: .92 })
  const treeMaterial = new THREE.MeshStandardMaterial({ color: '#7cad78', roughness: .96 })
  for (let index = 0; index < 15; index++) {
    const x = -5.2 + index * .74
    const shore = new THREE.Mesh(new THREE.BoxGeometry(.82, .10, .42), shoreMaterial)
    shore.name = `FujiRealm:snowy-shore-${index}`
    shore.position.set(x, -.73, -2.65)
    root.add(shore)
    if (index % 2 === 0) {
      const tree = new THREE.Mesh(new THREE.ConeGeometry(.24, .52, 7), treeMaterial)
      tree.name = `FujiRealm:shore-tree-${index}`
      tree.position.set(x, -.44, -2.78)
      root.add(tree)
    }
  }
  Object.defineProperty(root, 'lakeSurface', { value: lake })
  return root
}

function createSnowLayer({ count, size, opacity, speedMin, speedMax, zMin, zMax }, texture, seedOffset) {
  const positions = new Float32Array(count * 3)
  const speeds = new Float32Array(count)
  const phases = new Float32Array(count)
  for (let index = 0; index < count; index++) {
    const hash = value => {
      const result = Math.sin(value * 91.345 + seedOffset * 17.17) * 47453.5453
      return result - Math.floor(result)
    }
    positions[index * 3] = (hash(index * 3 + 1) - .5) * 13
    positions[index * 3 + 1] = hash(index * 3 + 2) * 7 - 1
    positions[index * 3 + 2] = zMin + hash(index * 3 + 3) * (zMax - zMin)
    speeds[index] = speedMin + hash(index * 5 + 4) * (speedMax - speedMin)
    phases[index] = hash(index * 7 + 5) * Math.PI * 2
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ map: texture, color: '#ffffff', size, transparent: true, opacity, alphaTest: .02, depthWrite: false, sizeAttenuation: true })
  )
  Object.defineProperty(points, 'snowRuntime', { value: { speeds, phases } })
  return points
}

export function createFujiRealmScene() {
  const root = new THREE.Group()
  root.name = 'Special:Realm of Mt.Fuji'
  root.userData.sceneType = 'Realm of Mt.Fuji'
  root.userData.referenceImage = '/pixel_cat_3d/img/414.png'

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 9),
    new THREE.MeshBasicMaterial({ color: '#3471df', fog: false, depthWrite: false })
  )
  sky.name = 'FujiRealm:blue-sky'
  sky.position.set(0, 2.3, -6.2)
  root.add(sky, createCloudBank(), createFujiMountain())
  const lakeAndShore = createLakeAndShore()
  root.add(lakeAndShore)

  const snowTexture = makeSnowTexture()
  const snowLayers = [
    createSnowLayer({ count: 420, size: .045, opacity: .82, speedMin: .55, speedMax: .95, zMin: -6, zMax: 2.5 }, snowTexture, 1),
    createSnowLayer({ count: 150, size: .095, opacity: .88, speedMin: .40, speedMax: .72, zMin: -3, zMax: 3.5 }, snowTexture, 2),
    createSnowLayer({ count: 55, size: .19, opacity: .72, speedMin: .28, speedMax: .54, zMin: -.5, zMax: 4.2 }, snowTexture, 3),
  ]
  snowLayers.forEach((layer, index) => {
    layer.name = `FujiRealm:snow-layer-${index}`
    root.add(layer)
  })

  let previousTime = 0
  root.userData.update = time => {
    const delta = Math.min(Math.max(time - previousTime, 0), .05)
    previousTime = time
    snowLayers.forEach((layer, layerIndex) => {
      const position = layer.geometry.attributes.position
      const { speeds, phases } = layer.snowRuntime
      for (let index = 0; index < speeds.length; index++) {
        position.array[index * 3 + 1] -= speeds[index] * delta
        position.array[index * 3] += Math.sin(time * (.65 + layerIndex * .18) + phases[index]) * delta * (.08 + layerIndex * .035)
        if (position.array[index * 3 + 1] < -1.15) {
          position.array[index * 3 + 1] = 6.0
          position.array[index * 3] = ((index * 47 + layerIndex * 19) % 130) / 10 - 6.5
        }
      }
      position.needsUpdate = true
    })
    lakeAndShore.lakeSurface.position.y = -.99 + Math.sin(time * .65) * .018
  }
  return root
}
