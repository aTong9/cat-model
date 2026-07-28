<template>
  <section class="crossy-game" @pointerdown="onPointerDown" @pointerup="onPointerUp">
    <canvas ref="canvasRef" class="crossy-canvas"></canvas>
    <div class="crossy-hud">
      <strong>LIBERTY CROSSING</strong>
      <span>距离 {{ score }}</span>
      <span class="seed">SEED {{ seed }}</span>
    </div>
    <div class="crossy-help">WASD / 方向键 · 点击前进 · 滑动转向</div>
    <div class="crossy-pad" aria-label="移动控制">
      <button @click.stop="move('forward')">▲</button>
      <button @click.stop="move('left')">◀</button>
      <button @click.stop="move('backward')">▼</button>
      <button @click.stop="move('right')">▶</button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import { useCatStore } from '../../stores/cat.js'
import { createCatAssembly } from '../../core/createCatAssembly.js'
import { createGear } from '../../three/EquipmentFactory.js'
import { GridHopController } from './GridHopController.js'
import { createLaneWindow } from './laneGenerator.js'

const store = useCatStore()
const canvasRef = ref(null)
const score = ref(0)
const seed = computed(() => Number(store.seed) >>> 0 || Number(store.tokenId) || 1)

const GRID = 1.05
const COLUMNS = 7
const LANE_COUNT = 22
const GEAR_IDS = ['Hot Coffee', 'Ramen', 'Sake', 'Investment Book', 'Wealth Gold Bar']
let renderer, scene, camera, character, controller, frameId, clock, resizeObserver
let worldGroup
let pointerStart = null

function buildWorld() {
  worldGroup = new THREE.Group()
  worldGroup.name = 'CrossyWorld'
  const lanes = createLaneWindow(seed.value, 0, LANE_COUNT, COLUMNS)
  const roadMaterial = new THREE.MeshStandardMaterial({ color: '#343844', roughness: 0.9 })
  const fastRoadMaterial = new THREE.MeshStandardMaterial({ color: '#252936', roughness: 0.88 })
  const safeMaterial = new THREE.MeshStandardMaterial({ color: '#6f9e58', roughness: 1 })
  const lineMaterial = new THREE.MeshBasicMaterial({ color: '#f2d95c' })
  lanes.forEach(lane => {
    const surface = new THREE.Mesh(
      new THREE.BoxGeometry(COLUMNS * GRID, 0.12, GRID),
      lane.type === 'safe' ? safeMaterial : lane.type === 'fast-road' ? fastRoadMaterial : roadMaterial,
    )
    surface.position.set(0, -0.11, lane.index * GRID)
    surface.receiveShadow = true
    worldGroup.add(surface)
    if (lane.type !== 'safe') {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(COLUMNS * GRID, 0.014, 0.035), lineMaterial)
      stripe.position.set(0, -0.04, lane.index * GRID)
      worldGroup.add(stripe)
    }
    lane.blocked.forEach((column, obstacleIndex) => {
      const gear = createGear(GEAR_IDS[(lane.index + obstacleIndex) % GEAR_IDS.length])
      if (!gear) return
      gear.position.set(column * GRID, 0, lane.index * GRID)
      gear.scale.setScalar(0.55)
      gear.rotation.y = lane.direction > 0 ? Math.PI / 2 : -Math.PI / 2
      gear.userData.crossyObstacle = true
      worldGroup.add(gear)
    })
  })
  scene.add(worldGroup)
  return lanes
}

function move(direction) {
  controller?.enqueue(direction)
}

function onKeyDown(event) {
  if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return
  const mapping = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' }
  if (!mapping[event.code] || event.repeat) return
  event.preventDefault()
  move(mapping[event.code])
}

function onPointerDown(event) {
  pointerStart = { x: event.clientX, y: event.clientY }
}

function onPointerUp(event) {
  if (!pointerStart || event.target.closest?.('button')) return
  const dx = event.clientX - pointerStart.x
  const dy = event.clientY - pointerStart.y
  pointerStart = null
  if (Math.hypot(dx, dy) < 24) return move('forward')
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left')
  else move(dy > 0 ? 'backward' : 'forward')
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas || !renderer || !camera) return
  const width = Math.max(1, canvas.clientWidth)
  const height = Math.max(1, canvas.clientHeight)
  const aspect = width / height
  const size = 8
  camera.left = -size * aspect / 2
  camera.right = size * aspect / 2
  camera.top = size / 2
  camera.bottom = -size / 2
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
}

onMounted(() => {
  const canvas = canvasRef.value
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#9bd9eb')
  scene.fog = new THREE.Fog('#9bd9eb', 10, 27)
  camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 60)
  camera.position.set(6.5, 8.5, -7.5)
  scene.add(new THREE.HemisphereLight('#dff7ff', '#54703b', 2.2))
  const sun = new THREE.DirectionalLight('#fff2ce', 2.5)
  sun.position.set(-5, 10, -5); sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  scene.add(sun)

  const lanes = buildWorld()
  const blocked = new Set(lanes.flatMap(lane => lane.blocked.map(x => `${x}:${lane.index}`)))
  controller = new GridHopController({ columns: COLUMNS, isBlocked: (x, z) => blocked.has(`${x}:${z}`) })
  character = createCatAssembly({
    tokenId: store.tokenId, fur: store.furStyle, furColor: store.furColor,
    eyes: store.eyeStyle, face: store.faceExpression, gear: store.gearType,
    background: store.background, special: store.special,
  })
  character.root.scale.setScalar(0.72)
  character.root.position.y = 0.02
  scene.add(character.root)

  clock = new THREE.Clock()
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  window.addEventListener('keydown', onKeyDown, { passive: false })
  const target = new THREE.Vector3()
  const animate = () => {
    frameId = requestAnimationFrame(animate)
    const dt = Math.min(clock.getDelta(), 0.05)
    const elapsed = clock.getElapsedTime()
    const pose = controller.update(dt)
    character.root.position.set(pose.x * GRID, pose.y + 0.02, pose.z * GRID)
    character.root.rotation.y = pose.yaw
    character.setAnimation(controller.active ? 'jump' : 'idle')
    character.update(elapsed)
    score.value = controller.maxForward
    target.set(character.root.position.x, 0, character.root.position.z + 3.4)
    camera.position.x += (target.x + 6.5 - camera.position.x) * (1 - Math.exp(-4 * dt))
    camera.position.z += (target.z - 7.5 - camera.position.z) * (1 - Math.exp(-4 * dt))
    camera.lookAt(target)
    resize()
    renderer.render(scene, camera)
  }
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(frameId)
  window.removeEventListener('keydown', onKeyDown)
  resizeObserver?.disconnect()
  character?.dispose()
  worldGroup?.traverse(object => {
    object.geometry?.dispose?.()
    if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.())
    else object.material?.dispose?.()
  })
  renderer?.dispose()
})
</script>

<style scoped>
.crossy-game,.crossy-canvas{position:absolute;inset:0;width:100%;height:100%}.crossy-game{overflow:hidden;touch-action:none}.crossy-canvas{display:block}
.crossy-hud{position:fixed;z-index:120;left:18px;top:76px;display:flex;flex-direction:column;gap:4px;padding:12px 15px;border:1px solid rgba(255,255,255,.22);border-radius:13px;background:rgba(22,28,35,.72);backdrop-filter:blur(12px)}
.crossy-hud strong{color:#f5d33d;font-size:.76rem;letter-spacing:.12em}.crossy-hud span{font-size:.82rem}.crossy-hud .seed{color:#aeb8c5;font-size:.61rem}
.crossy-help{position:fixed;z-index:120;left:50%;bottom:20px;transform:translateX(-50%);padding:8px 12px;border-radius:9px;background:rgba(20,24,30,.68);font-size:.68rem;color:#e8edf2;white-space:nowrap}
.crossy-pad{position:fixed;z-index:130;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(3,46px);grid-template-rows:repeat(2,46px);gap:5px}.crossy-pad button{border:1px solid rgba(255,255,255,.25);border-radius:12px;background:rgba(25,30,38,.76);color:#fff;font-size:1rem}.crossy-pad button:first-child{grid-column:2}.crossy-pad button:nth-child(2){grid-column:1}.crossy-pad button:nth-child(3){grid-column:2}.crossy-pad button:nth-child(4){grid-column:3}
@media(min-width:800px){.crossy-pad{display:none}}@media(max-width:799px){.crossy-help{display:none}.crossy-hud{top:66px;left:10px}}
</style>
