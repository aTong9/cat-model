import * as THREE from 'three'

function makeSkyTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#090522')
  gradient.addColorStop(0.42, '#241044')
  gradient.addColorStop(0.72, '#81104f')
  gradient.addColorStop(1, '#19082d')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  return texture
}

function createSun() {
  const group = new THREE.Group()
  group.name = 'TimeTraveler:segmented-sun'
  const radius = 2.22
  const slices = 14

  for (let index = 0; index < slices; index++) {
    const normalizedY = 0.92 - index * 0.14
    const y = normalizedY * radius
    const halfWidth = Math.sqrt(Math.max(0, radius * radius - y * y))
    const color = new THREE.Color().setHSL(0.15 - index * 0.006, 0.92, 0.68 - index * 0.018)
    const slice = new THREE.Mesh(
      new THREE.BoxGeometry(halfWidth * 2, index < 4 ? 0.22 : 0.13, 0.10),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.96 })
    )
    slice.name = `TimeTraveler:sun-slice-${index}`
    slice.position.y = y
    slice.userData.explodeWithParent = true
    group.add(slice)
  }

  group.position.set(0, 2.12, -5.30)
  return group
}

function createSkyline(layer, color, z, baseY, scale = 1) {
  const group = new THREE.Group()
  group.name = `TimeTraveler:skyline-${layer}`
  const heights = layer === 'rear'
    ? [0.45, 0.72, 0.50, 0.94, 0.62, 0.42, 0.80, 0.54, 0.70, 0.48, 0.86, 0.58, 0.74, 0.46, 0.66, 0.52]
    : [0.55, 0.88, 0.65, 1.48, 0.72, 0.48, 1.28, 0.76, 1.36, 0.56, 1.18, 0.68, 1.52, 0.74]
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0.02 })
  const width = 0.48 * scale
  const startX = -((heights.length - 1) * width) / 2

  heights.forEach((height, index) => {
    const buildingHeight = height * scale
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.04, buildingHeight, 0.34 * scale),
      material
    )
    building.name = `TimeTraveler:${layer}-building-${index}`
    building.position.set(startX + index * width, baseY + buildingHeight / 2, z)
    building.castShadow = true
    group.add(building)

    if ((index + (layer === 'rear' ? 1 : 0)) % 4 === 0) {
      const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.30 * scale, 0.025), material)
      antenna.name = `TimeTraveler:${layer}-antenna-${index}`
      antenna.position.set(building.position.x, baseY + buildingHeight + 0.15 * scale, z)
      group.add(antenna)
    }
  })

  return group
}

function createWorldDome() {
  const group = new THREE.Group()
  group.name = 'TimeTraveler:world-dome'
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(13, 32, 20),
    new THREE.MeshBasicMaterial({ color: '#080419', side: THREE.BackSide, fog: false })
  )
  dome.name = 'TimeTraveler:dark-sky-dome'
  group.add(dome)

  const positions = []
  for (let index = 0; index < 260; index++) {
    const angle = index * 2.399963
    const y = 1 - (index / 259) * 1.85
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    positions.push(Math.cos(angle) * radius * 11, y * 8 + 2.5, Math.sin(angle) * radius * 11)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: '#d9e8ff', size: 0.035, transparent: true, opacity: 0.78, depthWrite: false, fog: false })
  )
  stars.name = 'TimeTraveler:ambient-stars'
  group.add(stars)
  return group
}

function createPortal({ id, label, color, position, rotationY = 0, enabled = false }) {
  const root = new THREE.Group()
  root.name = `Portal:${id}`
  root.position.copy(position)
  root.rotation.y = rotationY
  root.userData.portal = { levelId: id, label, enabled, interaction: 'walk-through' }
  root.userData.collider = { type: 'box', size: [1.15, 2.05, 0.32], isTrigger: true }

  const ringMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.2,
    metalness: 0.48,
    roughness: 0.22,
  })
  const outer = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.075, 10, 44), ringMaterial)
  outer.name = `Portal:${id}:ring`
  outer.position.y = 0.22
  root.add(outer)

  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(0.59, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: enabled ? 0.19 : 0.10, side: THREE.DoubleSide, depthWrite: false })
  )
  inner.name = `Portal:${id}:surface`
  inner.position.set(0, 0.22, -0.015)
  root.add(inner)

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.94, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: '#20162f', emissive: color, emissiveIntensity: 0.18, metalness: 0.42, roughness: 0.38 })
  )
  base.name = `Portal:${id}:base`
  base.position.y = -0.49
  root.add(base)

  const trigger = new THREE.Group()
  trigger.name = `PortalTrigger:${id}`
  trigger.userData.trigger = { type: 'level-exit', levelId: id, enabled, size: [1.15, 2.05, 0.32] }
  root.add(trigger)
  Object.defineProperty(root, 'portalSurface', { value: inner })
  return root
}

function createGrasslands() {
  const root = new THREE.Group()
  root.name = 'WorldPreview:grasslands'
  root.userData.level = { id: 'grasslands-run', gameplay: 'runner', status: 'prototype' }

  const terrain = new THREE.Mesh(
    new THREE.BoxGeometry(7.5, 0.16, 6.2),
    new THREE.MeshStandardMaterial({ color: '#4f963b', roughness: 0.96 })
  )
  terrain.name = 'Grasslands:terrain-collider'
  terrain.position.set(6.3, -1.06, 0)
  terrain.userData.collider = { type: 'box', size: [7.5, 0.16, 6.2], walkable: true }
  root.add(terrain)

  const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: '#704626', roughness: 0.92 })
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#2f762f', roughness: 0.90 })
  for (const [x, z, scale] of [[4.4, -2.1, .75], [5.4, 2.3, .9], [7.2, -2.4, 1.1], [8.4, 2.0, .8]]) {
    const tree = new THREE.Group()
    tree.name = `Grasslands:tree-${x}`
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.08 * scale, .11 * scale, .62 * scale, 8), treeTrunkMaterial)
    trunk.position.y = -.68
    tree.add(trunk)
    const crown = new THREE.Mesh(new THREE.ConeGeometry(.38 * scale, .78 * scale, 9), leafMaterial)
    crown.position.y = -.10
    tree.add(crown)
    tree.position.set(x, 0, z)
    root.add(tree)
  }

  const route = new THREE.Group()
  route.name = 'RunRoute:grasslands-tutorial'
  route.userData.route = { id: 'grasslands-tutorial', loop: false, difficulty: 1, axis: '+x' }
  const platformMaterial = new THREE.MeshStandardMaterial({ color: '#d4bd72', roughness: 0.78 })
  const checkpoints = [
    { x: 3.5, z: 0, y: -.82, width: .8 },
    { x: 4.6, z: -.45, y: -.63, width: .72 },
    { x: 5.75, z: .35, y: -.48, width: .68 },
    { x: 6.85, z: -.30, y: -.67, width: .82 },
    { x: 8.0, z: .10, y: -.53, width: .9 },
  ]
  checkpoints.forEach((point, index) => {
    const platform = new THREE.Mesh(new THREE.BoxGeometry(point.width, .18, .78), platformMaterial)
    platform.name = `RunPlatform:grasslands:${index}`
    platform.position.set(point.x, point.y, point.z)
    platform.userData.collider = { type: 'box', walkable: true, checkpointIndex: index }
    route.add(platform)
    const checkpoint = new THREE.Group()
    checkpoint.name = `Checkpoint:grasslands:${index}`
    checkpoint.position.set(point.x, point.y + .32, point.z)
    checkpoint.userData.checkpoint = { routeId: 'grasslands-tutorial', index, respawn: true }
    route.add(checkpoint)
  })
  root.add(route)
  return root
}

function createOceanWorld() {
  const root = new THREE.Group()
  root.name = 'WorldPreview:ocean'
  root.userData.level = { id: 'ocean-run', gameplay: 'moving-platform-runner', status: 'locked' }
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 7.5, 20, 20),
    new THREE.MeshStandardMaterial({ color: '#197ca7', emissive: '#063b65', emissiveIntensity: .34, roughness: .20, metalness: .08, transparent: true, opacity: .88 })
  )
  water.name = 'Ocean:water-surface'
  water.rotation.x = -Math.PI / 2
  water.position.set(-6.1, -1.0, 0)
  root.add(water)

  const sandMaterial = new THREE.MeshStandardMaterial({ color: '#d8bd72', roughness: .94 })
  const palmMaterial = new THREE.MeshStandardMaterial({ color: '#3f7f3b', roughness: .88 })
  for (const [x, z, radius] of [[-5.0, -1.8, .65], [-7.2, 1.7, .82], [-8.1, -1.5, .48]]) {
    const island = new THREE.Mesh(new THREE.CylinderGeometry(radius * .72, radius, .22, 16), sandMaterial)
    island.name = `Ocean:island-${Math.abs(x)}`
    island.position.set(x, -.91, z)
    root.add(island)
    const palm = new THREE.Mesh(new THREE.ConeGeometry(radius * .34, radius * .72, 7), palmMaterial)
    palm.name = `Ocean:island-plant-${Math.abs(x)}`
    palm.position.set(x, -.42, z)
    root.add(palm)
  }
  Object.defineProperty(root, 'waterSurface', { value: water })
  return root
}

function createStarWorld() {
  const root = new THREE.Group()
  root.name = 'WorldPreview:starfield'
  root.userData.level = { id: 'starfield-run', gameplay: 'low-gravity-runner', status: 'locked' }
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(.82, 24, 18),
    new THREE.MeshStandardMaterial({ color: '#7256bd', emissive: '#271655', emissiveIntensity: .55, roughness: .64 })
  )
  planet.name = 'Starfield:violet-planet'
  planet.position.set(1.7, 2.1, 6.7)
  root.add(planet)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12, .035, 8, 48), new THREE.MeshBasicMaterial({ color: '#7ee9ff' }))
  ring.name = 'Starfield:planet-ring'
  ring.position.copy(planet.position)
  ring.rotation.set(1.12, 0, .28)
  root.add(ring)

  const platformMaterial = new THREE.MeshStandardMaterial({ color: '#3a315b', emissive: '#39266d', emissiveIntensity: .42, metalness: .3, roughness: .48 })
  for (let index = 0; index < 6; index++) {
    const platform = new THREE.Mesh(new THREE.DodecahedronGeometry(.34 + index * .025, 0), platformMaterial)
    platform.name = `Starfield:floating-platform-${index}`
    platform.position.set((index - 2.5) * .72, -.35 + (index % 2) * .42, 4.2 + index * .58)
    platform.userData.collider = { type: 'convex', walkable: true }
    root.add(platform)
  }
  Object.defineProperty(root, 'planetMesh', { value: planet })
  return root
}

export function createTimeTravelerScene() {
  const root = new THREE.Group()
  root.name = 'Special:Time Traveler'
  root.userData.sceneType = 'Time Traveler'
  root.userData.referenceImage = '/pixel_cat_3d/Special/TimeTraveler_9038.png'
  root.userData.world = {
    id: 'time-traveler-hub',
    spawnNode: 'Spawn:time-traveler-hub',
    exits: ['grasslands-run', 'ocean-run', 'starfield-run'],
  }

  root.add(createWorldDome())

  const spawn = new THREE.Group()
  spawn.name = 'Spawn:time-traveler-hub'
  spawn.position.set(0, -0.50, 0.35)
  spawn.userData.spawn = { type: 'player', facing: [0, 0, -1] }
  root.add(spawn)

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 9),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture(), depthWrite: false, fog: false })
  )
  sky.name = 'TimeTraveler:gradient-sky'
  sky.position.set(0, 2.3, -6.2)
  root.add(sky)

  const sun = createSun()
  root.add(sun)
  root.add(createSkyline('rear', '#70114f', -4.25, -0.68, 0.92))
  root.add(createSkyline('front', '#170a2d', -3.55, -0.72, 1.0))

  const horizonGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 0.20),
    new THREE.MeshBasicMaterial({ color: '#49dff1', transparent: true, opacity: 0.82, depthWrite: false })
  )
  horizonGlow.name = 'TimeTraveler:horizon-glow'
  horizonGlow.position.set(0, -0.64, -3.22)
  root.add(horizonGlow)

  const grid = new THREE.GridHelper(12, 24, '#53e7f3', '#5c315f')
  grid.name = 'TimeTraveler:perspective-grid'
  grid.position.set(0, -0.985, -0.8)
  grid.material.transparent = true
  grid.material.opacity = 0.86
  root.add(grid)

  const grasslands = createGrasslands()
  const ocean = createOceanWorld()
  const starfield = createStarWorld()
  root.add(grasslands, ocean, starfield)

  const portals = [
    createPortal({ id: 'grasslands-run', label: '无垠草原', color: '#8bf25d', position: new THREE.Vector3(2.65, -0.45, 0), rotationY: -Math.PI / 2, enabled: true }),
    createPortal({ id: 'ocean-run', label: '广袤海洋', color: '#4eeaff', position: new THREE.Vector3(-2.65, -0.45, 0), rotationY: Math.PI / 2 }),
    createPortal({ id: 'starfield-run', label: '浩瀚星空', color: '#b383ff', position: new THREE.Vector3(0, -0.45, 2.65), rotationY: Math.PI }),
  ]
  root.add(...portals)

  const magentaLight = new THREE.PointLight('#ff3aa8', 12, 8, 2)
  magentaLight.name = 'TimeTraveler:magenta-light'
  magentaLight.position.set(0, 1.3, -2.4)
  root.add(magentaLight)
  const cyanLight = new THREE.PointLight('#4eeaff', 9, 7, 2)
  cyanLight.name = 'TimeTraveler:cyan-light'
  cyanLight.position.set(0, -0.15, 1.5)
  root.add(cyanLight)

  root.userData.update = (time) => {
    const pulse = 0.92 + Math.sin(time * 1.4) * 0.05
    horizonGlow.material.opacity = pulse
    grid.material.opacity = 0.72 + Math.sin(time * 0.8) * 0.10
    sun.scale.setScalar(1 + Math.sin(time * 0.45) * 0.008)
    portals.forEach((portal, index) => {
      const scale = 1 + Math.sin(time * 1.8 + index * 1.7) * 0.025
      portal.children[0].scale.setScalar(scale)
      portal.portalSurface.material.opacity = (portal.userData.portal.enabled ? .17 : .08) + Math.sin(time * 1.2 + index) * .025
    })
    ocean.waterSurface.position.y = -1.0 + Math.sin(time * .75) * .025
    starfield.planetMesh.rotation.y = time * .08
  }

  return root
}
