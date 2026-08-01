import * as THREE from 'three'
import { GYM_QUALITY_PROFILES, normalizeGymWorld9066Config } from './GymWorld9066Config.js'

const FOOT_Y = -.52
function material(color, options = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .58, metalness: 0, ...options }) }
function mesh(geometry, mat, name, x = 0, y = 0, z = 0) { const value = new THREE.Mesh(geometry, mat); value.name = name; value.position.set(x, y, z); return value }
function addBoxCollider(colliders, name, x, z, halfX, halfZ) { colliders.push({ type: 'box', name, x, z, halfX, halfZ }) }
function setInstance(target, index, x, y, z, sx = 1, sy = sx, sz = sx) { const helper = new THREE.Object3D(); helper.position.set(x, y, z); helper.scale.set(sx, sy, sz); helper.updateMatrix(); target.setMatrixAt(index, helper.matrix) }

function createArchitecture(config) {
  const root = new THREE.Group(); root.name = 'architecture'; const { roomWidth: w, roomDepth: d, roomHeight: h, colors } = config
  const floor = mesh(new THREE.BoxGeometry(w, .35, d), material('#f6c37c', { roughness: .82 }), 'floor', 0, -.69, 0); floor.receiveShadow = true; root.add(floor)
  const ceiling = mesh(new THREE.BoxGeometry(w, .45, d), new THREE.MeshBasicMaterial({ color: '#ed6c00' }), 'ceiling', 0, h - .25, 0); root.add(ceiling)
  const northWall = mesh(new THREE.BoxGeometry(w, h, .45), material(colors.primaryOrange), 'wallNorth', 0, h / 2 - .5, -d / 2); root.add(northWall)
  const southWall = new THREE.Group(); southWall.name = 'walls'; southWall.add(mesh(new THREE.BoxGeometry(14, h, .45), material('#e97109'), 'wallSouthLeft', -14, h / 2 - .5, d / 2)); southWall.add(mesh(new THREE.BoxGeometry(14, h, .45), material('#e97109'), 'wallSouthRight', 14, h / 2 - .5, d / 2)); root.add(southWall)
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffd9a1', roughness: .12, metalness: .02, transparent: true, opacity: .22, transmission: config.glassReflectionEnabled ? .25 : 0, depthWrite: false, side: THREE.DoubleSide })
  for (const [name, x] of [['glassLeft', -w / 2], ['glassRight', w / 2]]) { const glass = mesh(new THREE.PlaneGeometry(d, h - 1), glassMat, name, x, h / 2 - .4, 0); glass.rotation.y = Math.PI / 2; root.add(glass); const frames = new THREE.Group(); frames.name = `${name}Frames`; for (let i = -2; i <= 2; i++) frames.add(mesh(new THREE.BoxGeometry(.18, h - 1, .18), material(colors.goldenYellow), 'glassFrame', x, h / 2 - .4, i * d / 5)); frames.add(mesh(new THREE.BoxGeometry(.18, .18, d), material(colors.goldenYellow), 'glassRail', x, 3.7, 0)); root.add(frames) }
  const entrance = new THREE.Group(); entrance.name = 'entrance'; entrance.position.set(0, 0, d / 2 - .25); entrance.add(mesh(new THREE.BoxGeometry(8, 7, .2), new THREE.MeshPhysicalMaterial({ color: '#ffdb9a', transparent: true, opacity: .32, transmission: .3 }), 'entranceGlass', 0, 3, 0)); root.add(entrance)
  const strips = new THREE.Group(); strips.name = 'lightStrips'; const stripMat = new THREE.MeshBasicMaterial({ color: '#ffd343' }); strips.add(mesh(new THREE.BoxGeometry(w - 1, .12, .12), stripMat, 'northStrip', 0, h - .75, -d / 2 + .35)); strips.add(mesh(new THREE.BoxGeometry(w - 1, .12, .12), stripMat, 'southStrip', 0, h - .75, d / 2 - .35)); strips.add(mesh(new THREE.BoxGeometry(.12, .12, d - 1), stripMat, 'westStrip', -w / 2 + .35, h - .75, 0)); strips.add(mesh(new THREE.BoxGeometry(.12, .12, d - 1), stripMat, 'eastStrip', w / 2 - .35, h - .75, 0)); root.add(strips)
  return root
}

function createCardioZone(config, profile, colliders) {
  const root = new THREE.Group(); root.name = 'cardioZone'; const count = Math.min(config.treadmillCount, profile.treadmillCount), x = -config.roomWidth / 2 + 4.2
  const bases = new THREE.InstancedMesh(new THREE.BoxGeometry(3.2, .34, 5), material('#f5a900'), count); bases.name = 'treadmills'
  const belts = new THREE.InstancedMesh(new THREE.BoxGeometry(2.5, .10, 3.7), material('#fff5e7'), count); belts.name = 'treadmillBelts'
  const consoles = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, 1.1, .35), material('#ffbd20', { emissive: '#7d4200', emissiveIntensity: .16 }), count); consoles.name = 'treadmillConsoles'
  for (let i = 0; i < count; i++) { const z = -10 + i * 5; setInstance(bases, i, x, -.35, z); setInstance(belts, i, x, -.14, z + .25); setInstance(consoles, i, x, 1.25, z - 2); addBoxCollider(colliders, `treadmill-${i}`, x, z, 1.9, 2.8) }
  bases.instanceMatrix.needsUpdate = belts.instanceMatrix.needsUpdate = consoles.instanceMatrix.needsUpdate = true; root.add(bases, belts, consoles)
  const bag = new THREE.Group(); bag.name = 'punchingBag'; bag.position.set(-10.8, 3.5, -11)
  const chainMat = material('#ffe6b0', { metalness: .25 }); for (const xOffset of [-.34, .34]) { const chain = mesh(new THREE.CylinderGeometry(.035, .035, 2.6, 6), chainMat, 'bagChain', xOffset, 2.2, 0); chain.rotation.z = xOffset * .18; bag.add(chain) }
  bag.add(mesh(new THREE.CapsuleGeometry(1.15, 3.5, 8, 16), material('#f29a00'), 'bagBody', 0, -.2, 0)); bag.userData.homeRotation = 0; root.add(bag); addBoxCollider(colliders, 'punchingBag', -10.8, -11, 1.5, 1.5)
  return { root, bag }
}

function dumbbell(name, x, y, z, scale = 1) { const root = new THREE.Group(); root.name = name; root.position.set(x, y, z); root.scale.setScalar(scale); const bar = mesh(new THREE.CylinderGeometry(.09, .09, 1.05, 8), material('#ffd04a'), 'handle'); bar.rotation.z = Math.PI / 2; root.add(bar); for (const side of [-1, 1]) { const plate = mesh(new THREE.CylinderGeometry(.32, .32, .26, 12), material('#df6512'), 'weight', side * .57, 0, 0); plate.rotation.z = Math.PI / 2; root.add(plate) } return root }

function createStrengthZone(config, colliders) {
  const root = new THREE.Group(); root.name = 'strengthZone'; const east = config.roomWidth / 2 - 5
  const rack = new THREE.Group(); rack.name = 'dumbbellRack'; rack.position.set(6, 0, -13); rack.add(mesh(new THREE.BoxGeometry(10, .32, 1.4), material('#e56c12'), 'rackBase', 0, .2, 0)); for (let i = 0; i < 8; i++) rack.add(dumbbell(`dumbbell-${i}`, -4.2 + i * 1.2, .75, 0, .65 + i % 3 * .1)); root.add(rack); addBoxCollider(colliders, 'dumbbellRack', 6, -13, 5.2, 1.1)
  const shelf = new THREE.Group(); shelf.name = 'kettlebellShelf'; shelf.position.set(-4, 0, -13); for (let i = 0; i < 5; i++) { const bell = new THREE.Group(); bell.name = `kettlebell-${i}`; bell.position.set(i * 1.35, .45, 0); bell.add(mesh(new THREE.SphereGeometry(.42 + i * .04, 12, 8), material(i % 2 ? '#ffbd20' : '#f07b10'), 'bellBody')); const handle = mesh(new THREE.TorusGeometry(.31, .09, 8, 16, Math.PI), material('#ffc938'), 'bellHandle', 0, .42, 0); bell.add(handle); shelf.add(bell) } root.add(shelf)
  const bench = new THREE.Group(); bench.name = 'weightBench'; bench.position.set(east - 1, 0, 3); bench.add(mesh(new THREE.BoxGeometry(5.2, .42, 1.7), material('#ffc22d'), 'benchPad', 0, .55, 0)); for (const xPos of [-1.8, 1.8]) bench.add(mesh(new THREE.BoxGeometry(.28, 1.4, .28), material('#d76514'), 'benchLeg', xPos, 0, 0)); root.add(bench); addBoxCollider(colliders, 'weightBench', east - 1, 3, 3, 1.3)
  const barbells = new THREE.Group(); barbells.name = 'barbells'; const bar = mesh(new THREE.CylinderGeometry(.10, .10, 6.5, 10), material('#ffd45b'), 'barbell', east - 1, 2.2, 3); bar.rotation.z = Math.PI / 2; barbells.add(bar); root.add(barbells)
  const plates = new THREE.Group(); plates.name = 'weightPlates'; for (let i = 0; i < 7; i++) { const plate = mesh(new THREE.CylinderGeometry(.72 - i * .04, .72 - i * .04, .25, 16), material(i % 2 ? '#f58010' : '#ffb51e'), `plate-${i}`, east + 1 + i * .28, .2, 8); plate.rotation.z = Math.PI / 2; plates.add(plate) } root.add(plates); addBoxCollider(colliders, 'weightPlates', east + 2, 8, 2.2, 1)
  const ladder = new THREE.Group(); ladder.name = 'wallLadder'; ladder.position.set(east + 1.8, 0, -11); for (const xPos of [-1.2, 1.2]) ladder.add(mesh(new THREE.BoxGeometry(.18, 6.5, .25), material('#ffca31'), 'ladderPost', xPos, 2.7, 0)); for (let i = 0; i < 8; i++) ladder.add(mesh(new THREE.BoxGeometry(2.6, .16, .25), material('#ffc02c'), 'ladderRung', 0, .5 + i * .75, 0)); root.add(ladder); addBoxCollider(colliders, 'wallLadder', east + 1.8, -11, 1.7, .7)
  return root
}

function createCentralZone(colliders) {
  const root = new THREE.Group(); root.name = 'centralZone'
  const trainingMat = mesh(new THREE.BoxGeometry(7, .08, 10), material('#ffbd20', { roughness: .8 }), 'trainingMat', 0, -.47, 3); root.add(trainingMat)
  const ropeCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-5, -.38, 9), new THREE.Vector3(-2, -.30, 8), new THREE.Vector3(1, -.38, 9), new THREE.Vector3(4, -.32, 8.5)]); const rope = mesh(new THREE.TubeGeometry(ropeCurve, 22, .08, 6), material('#df6314'), 'trainingRope'); root.add(rope)
  const balls = new THREE.Group(); balls.name = 'catEarGymBalls'
  for (let i = 0; i < 2; i++) { const ball = new THREE.Group(); ball.position.set(7 + i * 3, .25, 10); ball.add(mesh(new THREE.SphereGeometry(1.15, 18, 12), material(i ? '#f79000' : '#ffc526'), 'gymBall')); for (const side of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(.32, .75, 4), material(i ? '#f79000' : '#ffc526'), 'catEar', side * .48, 1.05, 0); ear.rotation.z = side * -.18; ball.add(ear) } balls.add(ball); addBoxCollider(colliders, `gymBall-${i}`, 7 + i * 3, 10, 1.35, 1.35) }
  root.add(balls); return root
}

function createCloud(name, x, y, z, scale, cloudMaterial) { const root = new THREE.Group(); root.name = name; root.position.set(x, y, z); root.scale.setScalar(scale); for (let i = 0; i < 7; i++) root.add(mesh(new THREE.SphereGeometry(.75 + i % 3 * .2, 12, 8), cloudMaterial, 'cloudPuff', (i - 3) * .55, Math.sin(i * 1.7) * .25, i % 2 * .18)); const string = mesh(new THREE.CylinderGeometry(.012, .012, 4.5, 4), new THREE.MeshBasicMaterial({ color: '#fff0c9' }), 'cloudString', 0, 2.8, 0); root.add(string); return root }

function createDecorations(config, profile, colliders) {
  const root = new THREE.Group(); root.name = 'decorations'; const clouds = new THREE.Group(); clouds.name = 'hangingClouds'; const cloudMat = material('#fff8ee', { roughness: .88 })
  for (let i = 0; i < Math.min(config.cloudCount, profile.cloudCount); i++) clouds.add(createCloud(`cloud-${i}`, -14 + i % 5 * 7, 7.8 + i % 3 * .7, -10 + Math.floor(i / 5) * 13, .72 + i % 4 * .12, cloudMat)); root.add(clouds)
  const plants = new THREE.Group(); plants.name = 'plants'; for (const [x, z] of [[18, 12], [-18, 12]]) { const plant = new THREE.Group(); plant.position.set(x, 0, z); plant.add(mesh(new THREE.CylinderGeometry(.65, .45, 1.1, 10), material('#fff0d1'), 'pot', 0, 0, 0)); for (let i = 0; i < 5; i++) { const leaf = mesh(new THREE.ConeGeometry(.25, 1.4, 5), material('#c46f28'), 'leaf', (i - 2) * .22, 1.0, 0); leaf.rotation.z = (i - 2) * .22; plant.add(leaf) } plants.add(plant); addBoxCollider(colliders, 'plant', x, z, 1, 1) } root.add(plants)
  const clock = new THREE.Group(); clock.name = 'clock'; clock.position.set(13, 7.7, -16.72); clock.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, .22, 24), material('#ffbd20'), 'clockFace')); clock.rotation.x = Math.PI / 2; root.add(clock)
  const icons = new THREE.Group(); icons.name = 'wallIcons'; const kettlebell = mesh(new THREE.TorusGeometry(1.2, .3, 10, 24, Math.PI), new THREE.MeshBasicMaterial({ color: '#ffca22' }), 'kettlebellIcon', -10, 7, -16.7); icons.add(kettlebell); root.add(icons)
  return { root, clouds }
}

function createDisplay(config, colliders) {
  const root = new THREE.Group(); root.name = 'display'; root.position.set(0, 4.4, -16.72)
  const frame = mesh(new THREE.BoxGeometry(11.8, 6.6, .38), material('#ffbd20'), 'mainScreen'); root.add(frame)
  const screenMaterial = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, colorA: { value: new THREE.Color('#ff9d00') }, colorB: { value: new THREE.Color('#ff2e20') } }, vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'uniform float uTime;uniform vec3 colorA;uniform vec3 colorB;varying vec2 vUv;void main(){float wave=.5+.5*sin(vUv.x*8.0+uTime*.8);float ring=smoothstep(.04,0.0,abs(length(vUv-vec2(.5))-.26));vec3 c=mix(colorA,colorB,vUv.x+.12*wave);c+=ring*vec3(1.0,.72,.18);gl_FragColor=vec4(c,1.0);}', toneMapped: false })
  const content = mesh(new THREE.PlaneGeometry(11.2, 6), screenMaterial, 'screenContent', 0, 0, .22); root.add(content); addBoxCollider(colliders, 'displayConsole', 0, -15.9, 6.2, .8)
  const screenLight = new THREE.PointLight('#ff5b22', .7, 9, 2); screenLight.name = 'screenLight'; screenLight.position.set(0, -1, 3); root.add(screenLight)
  return { root, screenMaterial }
}

function createLighting(config, profile) {
  const root = new THREE.Group(); root.name = 'lighting'; const ambient = new THREE.HemisphereLight('#fff1c5', '#b54412', 1.1); ambient.name = 'ambientLight'; root.add(ambient)
  const key = new THREE.DirectionalLight('#fff0c0', 1.6); key.name = 'keyLight'; key.position.set(-8, 10, 8); key.castShadow = profile.shadows && config.shadowsEnabled; root.add(key)
  const lights = new THREE.Group(); lights.name = 'ceilingLights'; const fixture = new THREE.InstancedMesh(new THREE.CylinderGeometry(.28, .28, .08, 12), new THREE.MeshBasicMaterial({ color: '#fff2b2' }), profile.ceilingLights)
  for (let i = 0; i < profile.ceilingLights; i++) setInstance(fixture, i, -15 + i % 6 * 6, config.roomHeight - .53, -11 + Math.floor(i / 6) * 8); fixture.instanceMatrix.needsUpdate = true; lights.add(fixture); root.add(lights)
  return root
}

function pushOutOfBox(current, next, box, radius = .42) {
  const minX = box.x - box.halfX - radius, maxX = box.x + box.halfX + radius, minZ = box.z - box.halfZ - radius, maxZ = box.z + box.halfZ + radius
  if (next.x <= minX || next.x >= maxX || next.z <= minZ || next.z >= maxZ) return false
  const distances = [{ axis: 'x', value: minX, d: Math.abs(next.x - minX) }, { axis: 'x', value: maxX, d: Math.abs(maxX - next.x) }, { axis: 'z', value: minZ, d: Math.abs(next.z - minZ) }, { axis: 'z', value: maxZ, d: Math.abs(maxZ - next.z) }].sort((a, b) => a.d - b.d)
  const chosen = distances[0]; next[chosen.axis] = chosen.value
  return true
}

export function createGymWorld9066(overrides = {}) {
  const config = normalizeGymWorld9066Config(overrides), profile = GYM_QUALITY_PROFILES[config.quality], colliders = []
  const world = new THREE.Group(); world.name = 'gymWorld9066'; world.userData.targetTokenId = '9066'; world.userData.config = config
  const architecture = createArchitecture(config), cardio = createCardioZone(config, profile, colliders), strength = createStrengthZone(config, colliders), central = createCentralZone(colliders), decorations = createDecorations(config, profile, colliders), display = createDisplay(config, colliders), lighting = createLighting(config, profile)
  const navigation = new THREE.Group(); navigation.name = 'navigation'; const walkable = new THREE.Object3D(); walkable.name = 'walkableArea'; navigation.add(walkable); const spawn = new THREE.Object3D(); spawn.name = 'spawnPoint'; navigation.add(spawn)
  const roomBounds = new THREE.Object3D(); roomBounds.name = 'roomBounds'; roomBounds.userData = { width: config.roomWidth, depth: config.roomDepth }; navigation.add(roomBounds)
  const debug = new THREE.Group(); debug.name = 'colliders'; debug.visible = config.debug.showColliders; const debugMat = new THREE.MeshBasicMaterial({ color: '#15e0ff', wireframe: true }); colliders.forEach(c => debug.add(mesh(new THREE.BoxGeometry(c.halfX * 2, 1, c.halfZ * 2), debugMat, c.name, c.x, 0, c.z))); navigation.add(debug)
  world.add(architecture, cardio.root, strength, central, decorations.root, display.root, lighting, navigation); world.visible = config.enabled
  let previousTime = 0, lastScreenUpdate = -1, disposed = false, characterState = null
  function sampleSurfaceHeight() { return FOOT_Y }
  function sampleCharacterGroundY() { return 0 }
  function resolveMovement(current, proposed) { const next = proposed.clone(), halfW = config.roomWidth / 2 - .75, halfD = config.roomDepth / 2 - .75; let collided = false; const beforeX = next.x, beforeZ = next.z; next.x = THREE.MathUtils.clamp(next.x, -halfW, halfW); next.z = THREE.MathUtils.clamp(next.z, -halfD, halfD); collided ||= next.x !== beforeX || next.z !== beforeZ; if (config.collisionEnabled) colliders.forEach(box => { collided = pushOutOfBox(current, next, box) || collided }); next.y = 0; return { position: next, collided } }
  function update(time) { if (disposed) return; const dt = Math.min(Math.max(time - previousTime, 0), .05); previousTime = time; if (config.displayAnimationEnabled && time - lastScreenUpdate > 1 / profile.screenFps) { display.screenMaterial.uniforms.uTime.value = time; lastScreenUpdate = time } if (config.cloudAnimationEnabled) decorations.clouds.children.forEach((cloud, i) => { cloud.position.y += Math.sin(time * .45 + i) * dt * .035; cloud.rotation.z = Math.sin(time * .25 + i) * .012 }); cardio.bag.rotation.z = Math.sin(time * .55) * .018 }
  function dispose() { if (disposed) return; disposed = true; world.traverse(object => { object.geometry?.dispose?.(); if (Array.isArray(object.material)) object.material.forEach(value => value.dispose?.()); else object.material?.dispose?.() }); world.removeFromParent() }
  const modules = Object.freeze({ architecture, cardioZone: cardio.root, strengthZone: strength, centralZone: central, decorations: decorations.root, display: display.root, lighting, navigation })
  const runtime = Object.freeze({ config, world, modules, colliders, sampleSurfaceHeight, sampleCharacterGroundY, resolveMovement, setCharacterState(value) { characterState = value }, update, setEnabled(value) { world.visible = Boolean(value) }, setModuleVisible(name, value) { if (modules[name]) modules[name].visible = Boolean(value) }, setDebugColliders(value) { debug.visible = Boolean(value) }, dispose })
  Object.defineProperty(world, 'environmentRuntime', { value: runtime }); world.userData.update = time => runtime.update(time, characterState); return runtime
}
