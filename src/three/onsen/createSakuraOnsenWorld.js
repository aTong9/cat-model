import * as THREE from 'three'
import { normalizeSakuraOnsenConfig, SAKURA_ONSEN_QUALITY } from './SakuraOnsenConfig.js'

const FOOT_OFFSET = .52
const TAU = Math.PI * 2
const POOL_CENTER = Object.freeze({ x: 0, z: -10.5 })

function randomFactory(seed = 3001) { let state = seed >>> 0; return () => ((state = Math.imul(state, 1664525) + 1013904223 >>> 0) / 4294967296) }
function mat(color, options = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: 0, ...options }) }
function mesh(geometry, material, name, x = 0, y = 0, z = 0) { const value = new THREE.Mesh(geometry, material); value.name = name; value.position.set(x, y, z); return value }
function setInstance(target, index, position, scale = 1, rotation = 0) { const helper = new THREE.Object3D(); helper.position.copy(position); helper.rotation.y = rotation; helper.scale.setScalar(scale); helper.updateMatrix(); target.setMatrixAt(index, helper.matrix) }

function createTerrain(config) {
  const root = new THREE.Group(); root.name = 'terrain'
  const plaza = mesh(new THREE.CylinderGeometry(config.playableRadius + 7, config.playableRadius + 8, .28, 48), mat('#f1b28d', { roughness: .92, flatShading: true }), 'stonePlaza', 0, -.66, 0)
  plaza.receiveShadow = true; root.add(plaza)
  const paths = new THREE.Group(); paths.name = 'stonePaths'
  const pathMaterial = mat('#ffd2ad', { roughness: .95, flatShading: true })
  for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; const stone = mesh(new THREE.BoxGeometry(2.6, .10, 2.1), pathMaterial, `pathStone-${i}`, POOL_CENTER.x + Math.cos(a) * 12.2, -.48, POOL_CENTER.z + Math.sin(a) * 12.2); stone.rotation.y = -a + Math.PI / 2; stone.receiveShadow = true; paths.add(stone) }
  root.add(paths)
  const decks = new THREE.Group(); decks.name = 'woodenDecks'
  const deckMat = mat('#d8792b', { roughness: .72 })
  for (let i = 0; i < 9; i++) decks.add(mesh(new THREE.BoxGeometry(3.6, .16, 1.05), deckMat, `deckPlank-${i}`, -14.4 + i * 3.6, -.43, 15))
  root.add(decks)
  const bridge = new THREE.Group(); bridge.name = 'bridges'
  for (let i = 0; i < 8; i++) { const plank = mesh(new THREE.BoxGeometry(1.05, .12, 2.5), deckMat, `bridgePlank-${i}`, 13.2, -.40 + Math.sin(i / 7 * Math.PI) * .32, -10.5 + i * 1.05); plank.rotation.z = Math.sin(i / 7 * Math.PI) * .03; bridge.add(plank) }
  root.add(bridge)
  const walkable = new THREE.Object3D(); walkable.name = 'walkableSurfaces'; root.add(walkable)
  return root
}

function createOnsen(config, profile, rng, exclusions) {
  const root = new THREE.Group(); root.name = 'onsen'
  const pool = mesh(new THREE.CylinderGeometry(config.onsenRadius + 1.05, config.onsenRadius + 1.35, .65, 48), mat('#f47c31', { roughness: .86, flatShading: true }), 'poolBody', POOL_CENTER.x, -.72, POOL_CENTER.z); root.add(pool)
  const waterMaterial = new THREE.MeshPhysicalMaterial({ color: '#83c8f7', emissive: '#f4a6bd', emissiveIntensity: .18, roughness: .16, metalness: .04, transparent: true, opacity: .88, transmission: .08, clearcoat: .4 })
  const water = mesh(new THREE.CircleGeometry(config.onsenRadius, 64), waterMaterial, 'waterSurface', POOL_CENTER.x, -.38, POOL_CENTER.z); water.rotation.x = -Math.PI / 2; root.add(water)
  const reflection = mesh(new THREE.CircleGeometry(config.onsenRadius * .88, 48), new THREE.MeshBasicMaterial({ color: '#f9c2d1', transparent: true, opacity: .17, depthWrite: false }), 'simplifiedReflection', POOL_CENTER.x, -.365, POOL_CENTER.z); reflection.rotation.x = -Math.PI / 2; reflection.scale.set(1, .48, 1); root.add(reflection)
  const rockCount = 38
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.52, 1), mat('#f47b22', { roughness: .82, flatShading: true }), rockCount); rocks.name = 'poolRocks'
  for (let i = 0; i < rockCount; i++) { const a = i / rockCount * TAU; setInstance(rocks, i, new THREE.Vector3(POOL_CENTER.x + Math.cos(a) * (config.onsenRadius + .92), -.20, POOL_CENTER.z + Math.sin(a) * (config.onsenRadius + .92)), .72 + i % 4 * .13, a) }
  rocks.instanceMatrix.needsUpdate = true; root.add(rocks)
  const ripples = new THREE.Group(); ripples.name = 'waterRipples'
  for (let i = 0; i < 10; i++) { const ring = mesh(new THREE.TorusGeometry(.25 + i % 3 * .14, .025, 5, 24), new THREE.MeshBasicMaterial({ color: '#fff5f7', transparent: true, opacity: .48 }), `ripple-${i}`, POOL_CENTER.x + (rng() - .5) * 10, -.34, POOL_CENTER.z + (rng() - .5) * 8); ring.rotation.x = Math.PI / 2; ring.userData.phase = i * .7; ripples.add(ring) }
  root.add(ripples)
  const floating = new THREE.Group(); floating.name = 'floatingPetals'
  for (let i = 0; i < 34; i++) { const petal = mesh(new THREE.CircleGeometry(.07, 5), new THREE.MeshBasicMaterial({ color: i % 3 ? '#ff9fc3' : '#fff1f6', side: THREE.DoubleSide }), `waterPetal-${i}`, POOL_CENTER.x + (rng() - .5) * 13, -.32, POOL_CENTER.z + (rng() - .5) * 12); petal.rotation.x = -Math.PI / 2; floating.add(petal) }
  root.add(floating)
  const steam = createSteamPoints(Math.floor(profile.steam * config.steamDensity), config, rng); root.add(steam)
  exclusions.push({ x: POOL_CENTER.x, z: POOL_CENTER.z, radius: config.onsenRadius + .3, type: 'deepWater' })
  return { root, water, ripples, steam }
}

function createSteamPoints(count, config, rng) {
  const positions = new Float32Array(count * 3), speeds = new Float32Array(count), phases = new Float32Array(count)
  for (let i = 0; i < count; i++) { const a = rng() * TAU, r = Math.sqrt(rng()) * (config.onsenRadius - 1); positions[i * 3] = POOL_CENTER.x + Math.cos(a) * r; positions[i * 3 + 1] = -.15 + rng() * 2.8; positions[i * 3 + 2] = POOL_CENTER.z + Math.sin(a) * r; speeds[i] = .18 + rng() * .24; phases[i] = rng() * TAU }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#fff7fa', size: .65, transparent: true, opacity: .23, depthWrite: false, sizeAttenuation: true })); points.name = 'steam'; Object.defineProperty(points, 'runtime', { value: { speeds, phases } }); return points
}

function createPavilion(colliders) {
  const root = new THREE.Group(); root.name = 'pavilion'; root.position.set(0, 0, 2)
  const beamMat = new THREE.MeshBasicMaterial({ color: '#f28a19' }), roofMat = new THREE.MeshBasicMaterial({ color: '#ff8b13', side: THREE.DoubleSide }), goldMat = mat('#ffc52b', { roughness: .55, emissive: '#8f4d00', emissiveIntensity: .16 })
  const floor = mesh(new THREE.BoxGeometry(30, .24, 7.5), mat('#d46c28'), 'floor', 0, -.34, 0); root.add(floor)
  for (const x of [-13, 13]) for (const z of [-3, 3]) { const pillar = mesh(new THREE.CylinderGeometry(.34, .38, 6.5, 8), goldMat, 'pillar', x, 2.8, z); root.add(pillar); colliders.push({ x, z: 2 + z, radius: .72, type: 'pillar' }) }
  for (const z of [-3, 3]) root.add(mesh(new THREE.BoxGeometry(27, .38, .38), goldMat, 'beams', 0, 4.75, z))
  const roof = mesh(new THREE.ConeGeometry(19, 4.2, 4, 3), roofMat, 'roof', 0, 5.85, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = .52; root.add(roof)
  for (let i = -7; i <= 7; i++) root.add(mesh(new THREE.BoxGeometry(.24, .22, 9), beamMat, 'roofRafter', i * 1.7, 4.95 + Math.abs(i) * .05, 0))
  return root
}

function createEntrance() {
  const root = new THREE.Group(); root.name = 'entrance'; root.position.set(0, 0, -23)
  const building = new THREE.Group(); building.name = 'entranceBuilding'
  const buildingMat = mat('#f08a24', { roughness: .72 })
  building.add(mesh(new THREE.BoxGeometry(.55, 5.4, .65), buildingMat, 'entrancePost', -4.5, 2.15, 0))
  building.add(mesh(new THREE.BoxGeometry(.55, 5.4, .65), buildingMat, 'entrancePost', 4.5, 2.15, 0))
  building.add(mesh(new THREE.BoxGeometry(10, .65, .75), buildingMat, 'entranceBeam', 0, 4.65, 0))
  root.add(building)
  const curtainMat = new THREE.MeshStandardMaterial({ color: '#fff8f6', roughness: .88, side: THREE.DoubleSide })
  for (const x of [-3, 0, 3]) { const panel = mesh(new THREE.BoxGeometry(2.82, 3.5, .08), curtainMat, 'noren', x, 1.55, -1); root.add(panel) }
  const symbol = new THREE.Group(); symbol.name = 'onsenSymbol'; symbol.position.set(0, 1.7, -1.08)
  const orange = new THREE.MeshBasicMaterial({ color: '#f06419' })
  const bowl = mesh(new THREE.TorusGeometry(1.15, .11, 8, 30, Math.PI), orange, 'symbolBowl'); bowl.rotation.z = Math.PI; symbol.add(bowl)
  for (const x of [-.48, 0, .48]) { const steam = mesh(new THREE.TorusGeometry(.32, .09, 6, 18, Math.PI), orange, 'symbolSteam', x, .62, 0); steam.rotation.z = Math.PI / 2; symbol.add(steam) }
  root.add(symbol); return root
}

function createVegetation(config, profile, rng, colliders) {
  const root = new THREE.Group(); root.name = 'vegetation'
  const count = profile.trees, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.32, .55, 5, 7), mat('#6c3029', { roughness: .9, flatShading: true }), count)
  trunk.name = 'sakuraTrees'
  const blossomCount = profile.blossoms, blossoms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.72, 1), new THREE.MeshBasicMaterial({ color: '#f79bc2' }), blossomCount); blossoms.name = 'sakuraBlossoms'
  const trees = []
  for (let i = 0; i < count; i++) { const a = i / count * TAU + (rng() - .5) * .16, radius = 23 + rng() * 13, x = Math.cos(a) * radius, z = Math.sin(a) * radius; trees.push({ x, z }); setInstance(trunk, i, new THREE.Vector3(x, 1.85, z), .72 + rng() * .55, rng() * TAU); if (i % 2 === 0 && radius < config.playableRadius - 1) colliders.push({ x, z, radius: .75, type: 'tree' }) }
  for (let i = 0; i < blossomCount; i++) { const tree = trees[i % trees.length], angle = rng() * TAU, radius = rng() * 2.1; const colorScale = .58 + rng() * .65; setInstance(blossoms, i, new THREE.Vector3(tree.x + Math.cos(angle) * radius, 4 + rng() * 2.3, tree.z + Math.sin(angle) * radius), colorScale, rng() * TAU) }
  trunk.instanceMatrix.needsUpdate = blossoms.instanceMatrix.needsUpdate = true; root.add(trunk, blossoms)
  const heroTrees = new THREE.Group(); heroTrees.name = 'heroSakuraTrees'
  for (const side of [-1, 1]) {
    const hero = new THREE.Group(); hero.name = side < 0 ? 'sakuraTreeWestHero' : 'sakuraTreeEastHero'; hero.position.set(side * 14.5, 0, -5)
    const heroTrunk = mesh(new THREE.CylinderGeometry(.75, 1.05, 7.5, 9), mat('#6b3029', { roughness: .92, flatShading: true }), 'heroTrunk', 0, 3, 0); heroTrunk.rotation.z = side * -.14; hero.add(heroTrunk)
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, blossom = mesh(new THREE.IcosahedronGeometry(1.3 + i % 3 * .18, 1), new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? '#fff0f5' : i % 3 === 0 ? '#ffb4cf' : '#f58fb8' }), 'heroBlossom', Math.cos(a) * (2.4 + i % 2), 6.2 + Math.sin(a * 2) * 1.5, Math.sin(a) * 1.8); hero.add(blossom) }
    heroTrees.add(hero); colliders.push({ x: side * 14.5, z: -5, radius: 1.35, type: 'heroTree' })
  }
  root.add(heroTrees)
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(.12, .62, 4), mat('#75a94e', { flatShading: true }), 80); grass.name = 'grass'
  for (let i = 0; i < 80; i++) { const a = rng() * TAU, radius = 18 + rng() * 20; setInstance(grass, i, new THREE.Vector3(Math.cos(a) * radius, -.23, Math.sin(a) * radius), .6 + rng() * .8, a) }
  grass.instanceMatrix.needsUpdate = true; root.add(grass)
  const shrubs = new THREE.Group(); shrubs.name = 'shrubs'; root.add(shrubs)
  return root
}

function createDecorations(colliders) {
  const root = new THREE.Group(); root.name = 'decorations'
  const rocks = new THREE.Group(); rocks.name = 'rocks'
  for (let i = 0; i < 14; i++) { const x = -23 - i % 4 * 2.2, z = -12 + Math.floor(i / 4) * 3.2; const rock = mesh(new THREE.DodecahedronGeometry(.8 + i % 3 * .2, 1), mat('#ed7627', { flatShading: true }), `westRock-${i}`, x, -.05, z); rock.scale.y = .7; rocks.add(rock); if (i % 3 === 0) colliders.push({ x, z, radius: .8, type: 'rock' }) }
  root.add(rocks)
  const lanterns = new THREE.Group(); lanterns.name = 'stoneLanterns'
  for (const [x, z] of [[17, -2], [17, 7], [-17, 7]]) { const lamp = new THREE.Group(); lamp.position.set(x, 0, z); lamp.add(mesh(new THREE.BoxGeometry(.5, 2.2, .5), mat('#d8b9a0'), 'lanternPost', 0, .55, 0)); lamp.add(mesh(new THREE.BoxGeometry(1.25, .75, 1.25), mat('#ffe7ad', { emissive: '#ffb53d', emissiveIntensity: .35 }), 'lanternGlow', 0, 1.55, 0)); lanterns.add(lamp); colliders.push({ x, z, radius: .65, type: 'lantern' }) }
  root.add(lanterns)
  const fences = new THREE.Group(); fences.name = 'fences'
  for (let i = 0; i < 14; i++) { const post = mesh(new THREE.CylinderGeometry(.12, .14, 1.8, 6), mat('#8a4b2b'), 'fencePost', -27, .25, -19 + i * 2.8); fences.add(post) }
  fences.add(mesh(new THREE.BoxGeometry(.18, .18, 38), mat('#8a4b2b'), 'fenceRail', -27, .75, 0)); root.add(fences)
  const bridge = new THREE.Object3D(); bridge.name = 'bridge'; root.add(bridge)
  return root
}

function createDistantWorld(config) {
  const root = new THREE.Group(); root.name = 'distantWorld'
  const sky = mesh(new THREE.SphereGeometry(config.worldSize * .72, 18, 10), new THREE.MeshBasicMaterial({ color: '#ffc957', side: THREE.BackSide, fog: false, depthWrite: false }), 'sky'); root.add(sky)
  const fuji = new THREE.Group(); fuji.name = 'mountFuji'; fuji.position.set(0, 5, -47)
  const body = mesh(new THREE.ConeGeometry(12, 16, 8, 3), mat('#70aef0', { flatShading: true }), 'fujiBody'); body.scale.z = .64; const cap = mesh(new THREE.ConeGeometry(5.2, 7, 8, 1), mat('#f8fbff', { flatShading: true }), 'fujiSnow', 0, 5.6, 0); cap.scale.z = .64; fuji.add(body, cap); root.add(fuji)
  const hills = new THREE.Group(); hills.name = 'distantHills'; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const hill = mesh(new THREE.SphereGeometry(6, 8, 4), mat('#8fc16d', { flatShading: true }), 'hill', Math.cos(a) * 43, 0, Math.sin(a) * 43); hill.scale.y = .28; hills.add(hill) } root.add(hills)
  const clouds = new THREE.Group(); clouds.name = 'clouds'; const cloudMat = new THREE.MeshBasicMaterial({ color: '#fff2ef', transparent: true, opacity: .88, depthWrite: false }); for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, cloud = mesh(new THREE.SphereGeometry(1.8 + i % 3 * .45, 10, 6), cloudMat, 'cloud', Math.cos(a) * (28 + i % 4 * 3), 8 + i % 5 * 1.4, Math.sin(a) * (28 + i % 4 * 3)); cloud.scale.y = .55; clouds.add(cloud) } root.add(clouds)
  return { root, clouds }
}

function createPetalEffects(config, profile, rng) {
  const root = new THREE.Group(); root.name = 'effects'
  const count = Math.min(config.petalCount, profile.petals), positions = new Float32Array(count * 3), phases = new Float32Array(count), speeds = new Float32Array(count)
  for (let i = 0; i < count; i++) { positions[i * 3] = (rng() - .5) * 80; positions[i * 3 + 1] = rng() * 18; positions[i * 3 + 2] = (rng() - .5) * 80; phases[i] = rng() * TAU; speeds[i] = .35 + rng() * .55 }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const petals = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#ff8eb8', size: .13, transparent: true, opacity: .9, depthWrite: false })); petals.name = 'fallingPetals'; Object.defineProperty(petals, 'runtime', { value: { phases, speeds } }); root.add(petals)
  const steamParticles = new THREE.Object3D(); steamParticles.name = 'steamParticles'; root.add(steamParticles)
  const waterRipples = new THREE.Object3D(); waterRipples.name = 'waterRipples'; root.add(waterRipples)
  const atmosphere = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial()); atmosphere.name = 'atmosphericParticles'; root.add(atmosphere)
  return { root, petals }
}

export function createSakuraOnsenWorld(overrides = {}) {
  const config = normalizeSakuraOnsenConfig(overrides), profile = SAKURA_ONSEN_QUALITY[config.quality], rng = randomFactory(), colliders = [], exclusions = []
  const world = new THREE.Group(); world.name = 'sakuraOnsenWorld'; world.userData.sceneType = 'Onsen journey'; world.userData.targetTokenId = '3001'; world.userData.config = config
  const terrain = createTerrain(config), onsen = createOnsen(config, profile, rng, exclusions), pavilion = createPavilion(colliders), entrance = createEntrance(), vegetation = createVegetation(config, profile, rng, colliders), decorations = createDecorations(colliders), distant = createDistantWorld(config), effects = createPetalEffects(config, profile, rng)
  const navigation = new THREE.Group(); navigation.name = 'navigation'; const walkable = new THREE.Object3D(); walkable.name = 'walkableAreas'; walkable.userData.radius = config.playableRadius; navigation.add(walkable)
  const waterAreas = new THREE.Object3D(); waterAreas.name = 'waterExclusionAreas'; waterAreas.userData.areas = exclusions; navigation.add(waterAreas)
  const debug = new THREE.Group(); debug.name = 'colliders'; debug.visible = config.debug.showColliders; const debugMat = new THREE.MeshBasicMaterial({ color: '#ff306d', wireframe: true }); [...colliders, ...exclusions].forEach(c => { const item = mesh(new THREE.CylinderGeometry(c.radius, c.radius, 1, 12), debugMat, c.type, c.x, .25, c.z); debug.add(item) }); navigation.add(debug)
  const boundary = mesh(new THREE.TorusGeometry(config.playableRadius, .08, 4, 96), debugMat, 'worldBoundaries', 0, -.35, 0); boundary.rotation.x = Math.PI / 2; boundary.visible = config.debug.showWalkableAreas; navigation.add(boundary)
  world.add(terrain, onsen.root, pavilion, entrance, vegetation, decorations, distant.root, effects.root, navigation); world.visible = config.enabled
  let previousTime = 0, characterState = null, disposed = false
  function sampleSurfaceHeight() { return -.52 }
  function sampleCharacterGroundY() { return 0 }
  function resolveMovement(current, proposed) {
    const next = proposed.clone(); let collided = false
    const distance = Math.hypot(next.x, next.z), max = config.playableRadius - .7; if (distance > max) { next.x *= max / distance; next.z *= max / distance; collided = true }
    if (config.collisionEnabled) for (const item of [...exclusions, ...colliders]) { let dx = next.x - item.x, dz = next.z - item.z, d = Math.hypot(dx, dz), min = item.radius + .42; if (d < min) { if (d < .001) { dx = current.x - item.x; dz = current.z - item.z; d = Math.hypot(dx, dz) || 1; if (Math.abs(dx) + Math.abs(dz) < .001) dx = 1 } next.x = item.x + dx / d * min; next.z = item.z + dz / d * min; collided = true } }
    next.y = 0; return { position: next, collided }
  }
  function update(time) {
    if (disposed) return; const dt = Math.min(Math.max(time - previousTime, 0), .05); previousTime = time
    const petalPosition = effects.petals.geometry.attributes.position, petalRuntime = effects.petals.runtime
    for (let i = 0; i < petalRuntime.speeds.length; i++) { petalPosition.array[i * 3 + 1] -= petalRuntime.speeds[i] * dt; petalPosition.array[i * 3] += Math.sin(time + petalRuntime.phases[i]) * dt * .28; if (petalPosition.array[i * 3 + 1] < -.4) petalPosition.array[i * 3 + 1] = 17.5 } petalPosition.needsUpdate = true
    const steamPosition = onsen.steam.geometry.attributes.position
    for (let i = 0; i < onsen.steam.runtime.speeds.length; i++) { steamPosition.array[i * 3 + 1] += onsen.steam.runtime.speeds[i] * dt; steamPosition.array[i * 3] += Math.sin(time * .6 + onsen.steam.runtime.phases[i]) * dt * .08; if (steamPosition.array[i * 3 + 1] > 3) steamPosition.array[i * 3 + 1] = -.1 } steamPosition.needsUpdate = true
    onsen.ripples.children.forEach((ring, i) => { const scale = .8 + (Math.sin(time * 1.25 + ring.userData.phase) + 1) * .38; ring.scale.setScalar(scale) })
    onsen.water.material.emissiveIntensity = .13 + Math.sin(time * .7) * .04; distant.clouds.rotation.y = time * .002
  }
  function dispose() { if (disposed) return; disposed = true; world.traverse(object => { object.geometry?.dispose?.(); if (Array.isArray(object.material)) object.material.forEach(value => value.dispose?.()); else object.material?.dispose?.() }); world.removeFromParent() }
  const modules = Object.freeze({ terrain, onsen: onsen.root, pavilion, entrance, vegetation, decorations, distantWorld: distant.root, effects: effects.root, navigation })
  const runtime = Object.freeze({ config, world, modules, colliders, exclusions, sampleSurfaceHeight, sampleCharacterGroundY, resolveMovement, setCharacterState(value) { characterState = value }, update, setEnabled(value) { world.visible = Boolean(value) }, setModuleVisible(name, value) { if (modules[name]) modules[name].visible = Boolean(value) }, setDebugColliders(value) { debug.visible = Boolean(value) }, dispose })
  Object.defineProperty(world, 'environmentRuntime', { value: runtime }); Object.defineProperty(world, 'winterWorld', { value: runtime })
  world.userData.update = time => runtime.update(time, characterState)
  return runtime
}
