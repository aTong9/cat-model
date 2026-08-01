import * as THREE from 'three'
import { normalizeWinterWorldConfig, WINTER_QUALITY_PROFILES } from './WinterWorldConfig.js'

const CAT_FOOT_OFFSET = .52
const TAU = Math.PI * 2

function rngFactory(seed = 414) {
  let state = seed >>> 0
  return () => ((state = Math.imul(1664525, state) + 1013904223 >>> 0) / 4294967296)
}

function terrainSurface(x, z, config) {
  const distance = Math.hypot(x, z)
  const outer = THREE.MathUtils.smoothstep(distance, 11, config.playableRadius)
  const broad = Math.sin(x * .105) * .24 + Math.cos(z * .088) * .22 + Math.sin((x + z) * .055) * .18
  const southDrift = THREE.MathUtils.smoothstep(z, 8, 34) * (Math.sin(x * .18) * .16 + .12)
  const eastLake = THREE.MathUtils.smoothstep(11 - Math.hypot(x - 19, z + 1), 0, 7) * -.20
  return -.52 + outer * broad * config.terrainHeight * .48 + southDrift + eastLake
}

function colorTerrain(geometry) {
  const position = geometry.attributes.position
  const colors = []
  const palette = ['#eef8ff', '#dceeff', '#c9e5fb', '#f8fcff']
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i)
    const band = Math.abs(Math.floor(x * .22) + Math.floor(z * .18)) % palette.length
    const color = new THREE.Color(palette[band])
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
}

function createTerrain(config) {
  const root = new THREE.Group(); root.name = 'terrain'
  const geometry = new THREE.PlaneGeometry(config.worldSize, config.worldSize, 40, 40)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) position.setY(i, terrainSurface(position.getX(i), position.getZ(i), config))
  colorTerrain(geometry); geometry.computeVertexNormals()
  const snow = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0, flatShading: true }))
  snow.name = 'snowField'; snow.receiveShadow = true; root.add(snow)

  const lake = new THREE.Mesh(new THREE.CylinderGeometry(10.8, 11.3, .12, 32), new THREE.MeshPhysicalMaterial({ color: '#55b4e8', emissive: '#155aa1', emissiveIntensity: .1, roughness: .18, metalness: .05, transparent: true, opacity: .8, transmission: .08 }))
  lake.name = 'iceLake'; lake.position.set(19, -.66, -1); lake.receiveShadow = true; root.add(lake)
  const cracks = new THREE.Group(); cracks.name = 'iceCracks'; cracks.position.set(19, -.585, -1)
  const crackMaterial = new THREE.LineBasicMaterial({ color: '#dff8ff', transparent: true, opacity: .72 })
  for (let ray = 0; ray < 9; ray++) {
    const points = [new THREE.Vector3(0, 0, 0)]
    const angle = ray / 9 * TAU
    for (let step = 1; step < 6; step++) points.push(new THREE.Vector3(Math.cos(angle) * step * 1.35 + Math.sin(step * 7 + ray) * .28, 0, Math.sin(angle) * step * 1.1))
    cracks.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), crackMaterial))
  }
  root.add(cracks)

  const banks = new THREE.Group(); banks.name = 'snowBanks'
  const bankMat = new THREE.MeshStandardMaterial({ color: '#f7fbff', roughness: .96, flatShading: true })
  for (let i = 0; i < 18; i++) {
    const bank = new THREE.Mesh(new THREE.DodecahedronGeometry(.9 + i % 3 * .22, 0), bankMat)
    const a = i / 18 * TAU; bank.position.set(Math.cos(a) * (27 + i % 4), -.18, Math.sin(a) * (27 + i % 5)); bank.scale.y = .35; banks.add(bank)
  }
  root.add(banks)
  root.visible = config.showTerrain
  lake.visible = cracks.visible = config.showIceLake
  return { root, lake }
}

function setInstance(matrixMesh, index, x, y, z, scale, rotation = 0) {
  const helper = new THREE.Object3D(); helper.position.set(x, y, z); helper.rotation.y = rotation; helper.scale.setScalar(scale); helper.updateMatrix(); matrixMesh.setMatrixAt(index, helper.matrix)
}

function createPines(config, profile, rng, colliders) {
  const root = new THREE.Group(); root.name = 'pineTrees'
  const count = Math.floor(profile.trees * config.treeDensity)
  const trunk = new THREE.InstancedMesh(new THREE.BoxGeometry(.28, 1.25, .28), new THREE.MeshStandardMaterial({ color: '#704f46', roughness: 1 }), count)
  const foliage = new THREE.InstancedMesh(new THREE.ConeGeometry(1.1, 2.5, 6, 2), new THREE.MeshStandardMaterial({ color: '#397d77', roughness: .95, flatShading: true }), count)
  const snow = new THREE.InstancedMesh(new THREE.ConeGeometry(.82, 1.55, 6, 1), new THREE.MeshStandardMaterial({ color: '#eaf7ff', roughness: .9, flatShading: true }), count)
  trunk.name = 'pineTrunks'; foliage.name = 'pineFoliage'; snow.name = 'pineSnowCaps'
  for (let i = 0; i < count; i++) {
    const westBias = i < count * .62
    const a = westBias ? Math.PI * (.50 + rng()) : rng() * TAU
    const radius = 17 + rng() * 23
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius
    const base = terrainSurface(x, z, config), scale = .65 + rng() * .8
    setInstance(trunk, i, x, base + .6 * scale, z, scale, rng() * TAU)
    setInstance(foliage, i, x, base + 1.75 * scale, z, scale, rng() * TAU)
    setInstance(snow, i, x, base + 2.15 * scale, z, scale, rng() * TAU)
    if (radius < config.playableRadius - 1 && i % 3 === 0) colliders.push({ x, z, radius: .55 * scale, type: 'tree' })
  }
  for (const mesh of [trunk, foliage, snow]) { mesh.castShadow = config.shadowEnabled; mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true }
  root.add(trunk, foliage, snow); root.visible = config.showForest
  return root
}

function createInstancedDecor(config, profile, rng, colliders) {
  const root = new THREE.Group(); root.name = 'nearEnvironment'
  const rockCount = profile.rocks
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.65, 0), new THREE.MeshStandardMaterial({ color: '#6f91ad', roughness: .9, flatShading: true }), rockCount)
  rocks.name = 'snowRocks'
  for (let i = 0; i < rockCount; i++) {
    const a = rng() * TAU, radius = 12 + rng() * 29, x = Math.cos(a) * radius, z = Math.sin(a) * radius, scale = .45 + rng() * 1.1
    setInstance(rocks, i, x, terrainSurface(x, z, config) + .18, z, scale, rng() * TAU)
    if (radius < config.playableRadius - 1 && i % 2 === 0) colliders.push({ x, z, radius: .42 * scale, type: 'rock' })
  }
  const crystalCount = profile.crystals
  const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.62, 0), new THREE.MeshStandardMaterial({ color: '#a9efff', emissive: '#3abbe8', emissiveIntensity: .45, roughness: .22, transparent: true, opacity: .86 }), crystalCount)
  crystals.name = 'iceCrystals'
  for (let i = 0; i < crystalCount; i++) {
    const a = -.65 + rng() * 1.3, radius = 12 + rng() * 23, x = 19 + Math.cos(a) * radius * .45, z = -1 + Math.sin(a) * radius
    setInstance(crystals, i, x, terrainSurface(x, z, config) + .42, z, .35 + rng() * .72, rng() * TAU)
    if (Math.hypot(x, z) < config.playableRadius - 1 && i % 3 === 0) colliders.push({ x, z, radius: .38, type: 'crystal' })
  }
  rocks.instanceMatrix.needsUpdate = crystals.instanceMatrix.needsUpdate = true
  rocks.castShadow = crystals.castShadow = config.shadowEnabled; root.add(rocks, crystals); root.visible = config.showDecorations
  return root
}

function makeMountain(name, x, z, scale, color, snowColor = '#eff8ff') {
  const root = new THREE.Group(); root.name = name; root.position.set(x, 0, z); root.rotation.y = Math.atan2(x, z)
  for (let i = 0; i < 4; i++) {
    const s = scale * (1 - i * .12)
    const body = new THREE.Mesh(new THREE.ConeGeometry(5.2 * s, 12.5 * s, 7, 3), new THREE.MeshStandardMaterial({ color, roughness: .96, flatShading: true }))
    body.position.set((i - 1.5) * 5.4 * scale, 4.4 * s, (i % 2) * 2.2); body.scale.z = .72; root.add(body)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.45 * s, 4.3 * s, 7, 1), new THREE.MeshStandardMaterial({ color: snowColor, roughness: .9, flatShading: true }))
    cap.position.set(body.position.x, 9.15 * s, body.position.z); cap.scale.z = .72; root.add(cap)
  }
  return root
}

function createSolidPixelRidge(profile, depth, material) {
  const shape = new THREE.Shape()
  profile.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y))
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: false, curveSegments: 1 })
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, material)
}

function createNorthReferenceVista(config) {
  const vista = new THREE.Group(); vista.name = 'northReferenceVista'

  // 出生点正面保持 414 原图的“冰湖—树林—宽阔富士山—横云”构图，
  // 所有元素仍是可绕行观察的实体，而不是背景板。
  const mountain = new THREE.Group(); mountain.name = 'mountainNorth'; mountain.position.set(0, 0, -47)
  const body = createSolidPixelRidge([
    [-25, -2], [-21, 0], [-17, 2], [-13, 5], [-9, 8], [-5, 12], [-2, 15],
    [1, 15.4], [4, 13.5], [8, 10], [12, 7], [17, 4], [22, 1], [26, -2],
  ], 8, new THREE.MeshBasicMaterial({ color: '#28549a', fog: false }))
  body.name = 'northMainFujiBody'
  const cap = createSolidPixelRidge([
    [-18, 1.8], [-14, 4.3], [-10, 7.2], [-6, 11], [-2, 15], [1, 15.4], [4, 13.5],
    [8, 10], [12, 7], [16, 4.7], [12, 5.4], [9, 7], [7, 6.1], [5, 9.2], [3.7, 7.1],
    [2.2, 10], [.5, 7.3], [-1.2, 9.4], [-3.2, 6.2], [-5.4, 8], [-7.4, 4.5],
    [-10, 6], [-12.5, 3], [-15, 4],
  ], .36, new THREE.MeshBasicMaterial({ color: '#f7fbff', fog: false }))
  cap.name = 'northMainFujiSnowCap'; cap.position.z = 8.06
  const ridgeMaterial = new THREE.MeshBasicMaterial({ color: '#a9bdd5' })
  const ridges = new THREE.Group(); ridges.name = 'northMainFujiRidges'; ridges.position.z = 8.45
  ;[
    [-8.2, 7.2, 7.2, -.69], [-5.7, 8.7, 5.4, -.83], [-3.7, 10.5, 3.8, -.95],
    [5.1, 10.2, 4.1, .86], [7.3, 8.5, 5.3, .72], [10.2, 6.4, 6.4, .59],
  ].forEach(([x, y, length, rotation]) => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(.27, length, .16), ridgeMaterial)
    stripe.position.set(x, y, 0); stripe.rotation.z = rotation; ridges.add(stripe)
  })
  mountain.add(body, cap, ridges); mountain.scale.setScalar(.66); vista.add(mountain)

  const lake = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 13, .08, 24),
    new THREE.MeshBasicMaterial({ color: '#174f9d', transparent: true, opacity: .9, fog: false })
  )
  lake.name = 'northVistaIceLake'; lake.position.set(0, -.54, -17); lake.scale.set(1.7, 1, .48); vista.add(lake)

  const iceCracks = new THREE.Group(); iceCracks.name = 'northVistaIceCracks'
  const iceCrackMaterial = new THREE.LineBasicMaterial({ color: '#9bb7d7', transparent: true, opacity: .82 })
  ;[
    [[0, -5], [-1.2, -8], [-4.5, -11], [-8.5, -14]],
    [[0, -5], [1.5, -8], [5, -10.5], [10, -13.5]],
    [[-1, -7], [-6, -8.5], [-11, -10]],
    [[1.2, -7.2], [6.5, -8.7], [12, -10.2]],
  ].forEach(path => {
    const points = path.map(([x, z]) => new THREE.Vector3(x, terrainSurface(x, z, config) + .025, z))
    iceCracks.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), iceCrackMaterial))
  })
  vista.add(iceCracks)

  const treeCount = 20
  const trunks = new THREE.InstancedMesh(new THREE.BoxGeometry(.22, .72, .22), new THREE.MeshStandardMaterial({ color: '#6b5144', roughness: 1 }), treeCount)
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(.72, 1.65, 6), new THREE.MeshStandardMaterial({ color: '#4d8b72', roughness: .96, flatShading: true }), treeCount)
  trunks.name = 'northVistaTreeTrunks'; crowns.name = 'northVistaTreeLine'
  for (let i = 0; i < treeCount; i++) {
    const x = -15 + i * 1.58, z = -26 + Math.sin(i * 2.1) * .6, scale = .72 + (i % 4) * .13
    setInstance(trunks, i, x, -.18, z, scale)
    setInstance(crowns, i, x, .72 * scale, z, scale)
  }
  trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true; vista.add(trunks, crowns)

  const cloudMaterial = new THREE.MeshBasicMaterial({ color: '#aec9f3', transparent: true, opacity: .88, depthWrite: false, fog: false })
  const clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, .75, 1.15), cloudMaterial, 12); clouds.name = 'northVistaCloudBank'
  for (let i = 0; i < 12; i++) {
    const x = i < 6 ? -17 + i * 2.35 : 5 + (i - 6) * 2.35
    const helper = new THREE.Object3D(); helper.position.set(x, 17.5 + Math.sin(i) * .55, -37); helper.scale.set(1 + (i % 3) * .28, .8 + (i % 2) * .25, 1); helper.updateMatrix(); clouds.setMatrixAt(i, helper.matrix)
  }
  clouds.instanceMatrix.needsUpdate = true; vista.add(clouds)
  return vista
}

function createMiddleAndFar(config) {
  const middle = new THREE.Group(); middle.name = 'middleEnvironment'
  const river = new THREE.Mesh(new THREE.BoxGeometry(4, .06, 45), new THREE.MeshStandardMaterial({ color: '#61b6dc', emissive: '#164f85', emissiveIntensity: .12, roughness: .3, transparent: true, opacity: .82 }))
  river.name = 'frozenRiver'; river.position.set(-26, -.45, -4); river.rotation.y = -.18; middle.add(river)
  const hills = new THREE.Group(); hills.name = 'hills'
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const hill = new THREE.Mesh(new THREE.SphereGeometry(4 + i % 3, 8, 4), new THREE.MeshStandardMaterial({ color: i % 2 ? '#c9e3f5' : '#dfedf8', roughness: 1, flatShading: true })); hill.position.set(Math.cos(a) * 38, -.5, Math.sin(a) * 38); hill.scale.y = .32; hills.add(hill) }
  middle.add(hills, createNorthReferenceVista(config))
  const far = new THREE.Group(); far.name = 'farEnvironment'
  far.add(
    makeMountain('mountainNorthBackdrop', 0, -config.mountainDistance - 10, .82, '#6f96ba'),
    makeMountain('mountainSouth', 0, config.mountainDistance, .72, '#80a7c5'),
    makeMountain('mountainEast', config.mountainDistance, 0, .86, '#6897bd'),
    makeMountain('mountainWest', -config.mountainDistance, 0, .92, '#628aaa'),
  )
  far.visible = config.showMountains
  return { middle, far }
}

function createSkyAndClouds(config, profile, rng) {
  const root = new THREE.Group(); root.name = 'atmosphere'
  const skyGeometry = new THREE.SphereGeometry(config.worldSize * .72, 18, 10)
  const skyPosition = skyGeometry.attributes.position, skyColors = []
  const top = new THREE.Color('#1f54d7'), horizon = new THREE.Color('#4d82df')
  for (let i = 0; i < skyPosition.count; i++) { const t = THREE.MathUtils.clamp((skyPosition.getY(i) / (config.worldSize * .72) + .15) / 1.15, 0, 1); const c = horizon.clone().lerp(top, t); skyColors.push(c.r, c.g, c.b) }
  skyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3))
  const sky = new THREE.Mesh(skyGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); sky.name = 'sky'; root.add(sky)

  const cloudCount = profile.cloudBlocks
  const clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, .75, 1.4), new THREE.MeshBasicMaterial({ color: '#e9f4ff', transparent: true, opacity: .72, depthWrite: false, fog: true }), cloudCount)
  clouds.name = 'clouds'
  for (let i = 0; i < cloudCount; i++) { const a = rng() * TAU, r = 20 + rng() * 37, y = 9 + rng() * 15; const helper = new THREE.Object3D(); helper.position.set(Math.cos(a) * r, y, Math.sin(a) * r); helper.rotation.y = -a; helper.scale.set(.7 + rng() * 2.1, .6 + rng() * .8, .7 + rng() * 1.4); helper.updateMatrix(); clouds.setMatrixAt(i, helper.matrix) }
  clouds.instanceMatrix.needsUpdate = true; root.add(clouds)
  return { root, clouds }
}

function createSnowLayer(count, size, speed, radius, rng, name) {
  const positions = new Float32Array(count * 3), velocities = new Float32Array(count)
  for (let i = 0; i < count; i++) { positions[i * 3] = (rng() - .5) * radius * 2; positions[i * 3 + 1] = rng() * 30; positions[i * 3 + 2] = (rng() - .5) * radius * 2; velocities[i] = speed * (.65 + rng() * .7) }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#ffffff', size, transparent: true, opacity: .8, depthWrite: false, sizeAttenuation: true }))
  points.name = name; Object.defineProperty(points, 'velocities', { value: velocities }); return points
}

function createWeather(config, profile, rng) {
  const root = new THREE.Group(); root.name = 'weather'
  const layers = profile.snow.map((base, i) => createSnowLayer(Math.floor(base * config.snowDensity), [.055, .11, .22][i], [.75, 1.15, 1.65][i] * config.snowSpeed, [55, 38, 22][i], rng, ['snowfallFar', 'snowfallMiddle', 'snowfallNear'][i]))
  root.add(...layers)
  const wind = createSnowLayer(Math.floor(profile.snow[1] * .3), .08, .28, 35, rng, 'windParticles'); root.add(wind)
  return { root, layers, wind }
}

function createFootprints(config) {
  const root = new THREE.Group(); root.name = 'effects'
  const material = new THREE.MeshBasicMaterial({ color: '#7cb6da', transparent: true, opacity: .28, depthWrite: false })
  const marks = Array.from({ length: 32 }, (_, i) => { const mark = new THREE.Mesh(new THREE.BoxGeometry(.14, .012, .23), material); mark.name = `footprint-${i}`; mark.visible = false; root.add(mark); return mark })
  return { root, marks, cursor: 0, last: new THREE.Vector3(1000, 0, 1000), stepSide: 1 }
}

export function createWinterWorld(overrides = {}) {
  const config = normalizeWinterWorldConfig(overrides)
  const profile = WINTER_QUALITY_PROFILES[config.quality]
  const rng = rngFactory(414); const colliders = []
  const world = new THREE.Group(); world.name = 'world'; world.userData.sceneType = 'Realm of Mt.Fuji'; world.userData.referenceImage = '/pixel_cat_3d/img/414.png'; world.userData.config = config
  const terrain = createTerrain(config); const near = createInstancedDecor(config, profile, rng, colliders); near.add(createPines(config, profile, rng, colliders))
  const { middle, far } = createMiddleAndFar(config); const atmosphere = createSkyAndClouds(config, profile, rng); const weather = createWeather(config, profile, rng); atmosphere.root.add(weather.root)
  const navigation = new THREE.Group(); navigation.name = 'navigation'
  const walkable = new THREE.Object3D(); walkable.name = 'walkableArea'; walkable.userData.radius = config.playableRadius; navigation.add(walkable)
  const debug = new THREE.Group(); debug.name = 'colliders'; debug.visible = config.debugColliders
  const debugMat = new THREE.MeshBasicMaterial({ color: '#ff3b66', wireframe: true })
  colliders.forEach(c => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(c.radius, c.radius, 1, 8), debugMat); mesh.position.set(c.x, terrainSurface(c.x, c.z, config) + .5, c.z); debug.add(mesh) })
  const boundary = new THREE.Mesh(new THREE.TorusGeometry(config.playableRadius, .08, 4, 96), debugMat); boundary.name = 'boundaries'; boundary.rotation.x = Math.PI / 2; boundary.position.y = -.38; debug.add(boundary); navigation.add(debug)
  const spawn = new THREE.Object3D(); spawn.name = 'spawnPoint'; spawn.position.set(0, 0, 0); navigation.add(spawn)
  const footprints = createFootprints(config)
  world.add(terrain.root, near, middle, far, atmosphere.root, navigation, footprints.root)
  world.visible = config.enabled

  let previousTime = 0, lastCharacter = null, disposed = false
  function sampleSurfaceHeight(x, z) { return terrainSurface(x, z, config) }
  function sampleCharacterGroundY(x, z) { return sampleSurfaceHeight(x, z) + CAT_FOOT_OFFSET }
  function resolveMovement(current, proposed) {
    const next = proposed.clone(); let collided = false
    const distance = Math.hypot(next.x, next.z); const maxRadius = config.playableRadius - .65
    if (distance > maxRadius) { next.x *= maxRadius / distance; next.z *= maxRadius / distance; collided = true }
    if (config.collisionEnabled) for (const collider of colliders) {
      let dx = next.x - collider.x, dz = next.z - collider.z, d = Math.hypot(dx, dz)
      const min = collider.radius + .42
      if (d < min) {
        if (d < .0001) { dx = current.x - collider.x; dz = current.z - collider.z; d = Math.hypot(dx, dz) }
        if (d < .0001) { dx = 1; dz = 0; d = 1 }
        next.x = collider.x + dx / d * min; next.z = collider.z + dz / d * min; collided = true
      }
    }
    next.y = sampleCharacterGroundY(next.x, next.z)
    return { position: next, collided }
  }
  function addFootprint(position, yaw = 0) {
    if (!config.footprintEnabled || footprints.last.distanceToSquared(position) < .16) return
    const mark = footprints.marks[footprints.cursor++ % footprints.marks.length]; footprints.stepSide *= -1
    mark.visible = true; mark.position.set(position.x + Math.cos(yaw) * .12 * footprints.stepSide, sampleSurfaceHeight(position.x, position.z) + .015, position.z - Math.sin(yaw) * .12 * footprints.stepSide); mark.rotation.y = yaw; mark.material.opacity = .28
    footprints.last.copy(position)
  }
  function update(time, characterState = lastCharacter) {
    if (disposed) return
    const delta = Math.min(Math.max(time - previousTime, 0), .05); previousTime = time
    weather.layers.forEach((layer, layerIndex) => { const p = layer.geometry.attributes.position; for (let i = 0; i < layer.velocities.length; i++) { p.array[i * 3 + 1] -= layer.velocities[i] * delta; p.array[i * 3] += config.windStrength * delta * (1 + layerIndex * .45); if (p.array[i * 3 + 1] < -1) p.array[i * 3 + 1] = 29 } p.needsUpdate = true })
    const wp = weather.wind.geometry.attributes.position; for (let i = 0; i < weather.wind.velocities.length; i++) { wp.array[i * 3] += (1.5 + config.windStrength * 2) * delta; wp.array[i * 3 + 1] -= .12 * delta; if (wp.array[i * 3] > 36) wp.array[i * 3] = -36 } wp.needsUpdate = true
    atmosphere.clouds.rotation.y = time * .0025
    terrain.lake.material.emissiveIntensity = .08 + Math.sin(time * .7) * .025
    footprints.marks.forEach(mark => { if (mark.visible) { mark.material.opacity = Math.max(.08, mark.material.opacity - delta * .006) } })
    if (characterState?.moving) addFootprint(characterState.position, characterState.yaw)
  }
  function setCharacterState(state) { lastCharacter = state }
  function dispose() { if (disposed) return; disposed = true; world.traverse(object => { object.geometry?.dispose?.(); if (Array.isArray(object.material)) object.material.forEach(m => m.dispose?.()); else object.material?.dispose?.() }); world.removeFromParent() }
  const modules = Object.freeze({ terrain: terrain.root, nearEnvironment: near, middleEnvironment: middle, farEnvironment: far, atmosphere: atmosphere.root, navigation, effects: footprints.root })
  const runtime = Object.freeze({
    config,
    world,
    modules,
    colliders,
    sampleSurfaceHeight,
    sampleCharacterGroundY,
    resolveMovement,
    setCharacterState,
    update,
    setDebugColliders(value) { debug.visible = Boolean(value) },
    setEnabled(value) { world.visible = Boolean(value) },
    setModuleVisible(name, value) { if (modules[name]) modules[name].visible = Boolean(value) },
    getStats() { return { colliders: colliders.length, snowParticles: weather.layers.reduce((sum, layer) => sum + layer.geometry.attributes.position.count, 0), quality: config.quality } },
    dispose,
  })
  Object.defineProperty(world, 'winterWorld', { value: runtime })
  world.userData.update = time => runtime.update(time)
  return runtime
}
