<template>
  <canvas ref="canvasRef" class="cat-canvas" @click="onClick" @touchend.prevent="onTouch"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCatStore, GEAR_LIST } from '../stores/cat.js'
import { createScene } from '../three/SceneSetup.js'
import { CatModel } from '../three/CatModel.js'
import { createGear, preloadGearTextures } from '../three/EquipmentFactory.js'
import * as THREE from 'three'

const store = useCatStore()
const canvasRef = ref(null)

let renderer, scene, camera, controls, envGroup, updateSize
let catModel
let clock
let animId
let specialGroup

// ===== 装备物理系统 =====
const gearEntries = []       // { group, id, restPos, velocity, angularVel }
let raycaster, mouse

function initRaycaster() {
  raycaster = new THREE.Raycaster()
  raycaster.far = 15
  mouse = new THREE.Vector2()
}

function getAllGearMeshes() {
  const meshes = []
  gearEntries.forEach((entry, gi) => {
    entry.group.traverse((child) => {
      if (child.isMesh) {
        child.userData.__gearIndex = gi
        meshes.push(child)
      }
    })
  })
  return meshes
}

onMounted(async () => {
  // 预加载装备贴图
  await preloadGearTextures()

  const canvas = canvasRef.value
  const setup = createScene(canvas)
  renderer = setup.renderer
  scene = setup.scene
  camera = setup.camera
  controls = setup.controls
  envGroup = setup.envGroup
  updateSize = setup.updateSize

  // 暴露 scene 给 GLB 导出
  canvas.__scene = scene

  // 创建猫
  catModel = new CatModel()
  catModel.setFurTrait(store.furStyle, store.furColor)
  catModel.setEyeStyle(store.eyeStyle)
  catModel.setFaceExpression(store.faceExpression)
  catModel.setGear(store.gearType)
  scene.add(catModel.group)
  specialGroup = new THREE.Group()
  scene.add(specialGroup)
  applyBackground(store.background)
  buildSpecialScene(store.special)

  // 初始化 raycaster
  initRaycaster()

  // 创建全部装备并散落在猫周围
  createAllGearItems()

  clock = new THREE.Clock()
  animate()

  // resize observer
  const ro = new ResizeObserver(() => updateSize())
  ro.observe(canvas)
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  catModel?.dispose()
  renderer?.dispose()
  controls?.dispose()
  // 清理装备
  gearEntries.forEach(e => {
    e.group.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose() })
    scene?.remove(e.group)
  })
  gearEntries.length = 0
})

// ===== 散落装备 =====
const GROUND_Y = -0.52
const SCATTER_RADIUS_MIN = 2.2
const SCATTER_RADIUS_MAX = 3.2

function createAllGearItems() {
  gearEntries.forEach(e => scene.remove(e.group))
  gearEntries.length = 0

  GEAR_LIST.forEach((gear, i) => {
    const gearGroup = createGear(gear.id)
    if (!gearGroup) return

    // 散落位置：围绕展台环形分布
    const angle = (i / GEAR_LIST.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
    const radius = SCATTER_RADIUS_MIN + Math.random() * (SCATTER_RADIUS_MAX - SCATTER_RADIUS_MIN)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = GROUND_Y

    gearGroup.position.set(x, y, z)
    gearGroup.rotation.set(
      Math.random() * 0.2 - 0.1,
      Math.random() * Math.PI * 2,
      Math.random() * 0.1 - 0.05
    )
    // 缩放适配
    const s = 0.42 + Math.random() * 0.16
    gearGroup.scale.setScalar(s)

    gearGroup.userData._scatterAngle = angle
    gearGroup.userData._scatterRadius = radius
    gearGroup.userData._gearId = gear.id

    gearGroup.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })

    scene.add(gearGroup)

    gearEntries.push({
      group: gearGroup,
      id: gear.id,
      restPos: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(0, 0, 0),
      angularVel: new THREE.Vector3(0, 0, 0),
    })
  })
}

// ===== 鼠标点击 → Raycaster =====
let lastClickTime = 0

function onClick(e) {
  lastClickTime = performance.now()
  castRay(e.clientX, e.clientY)
}

function onTouch(e) {
  lastClickTime = performance.now()
  const touch = e.changedTouches[0]
  if (touch) castRay(touch.clientX, touch.clientY)
}

function castRay(clientX, clientY) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const meshes = getAllGearMeshes()
  const hits = raycaster.intersectObjects(meshes, false)
  if (hits.length === 0) return

  const gi = hits[0].object.userData.__gearIndex
  if (gi === undefined || gi >= gearEntries.length) return

  const entry = gearEntries[gi]
  applyImpulse(entry)
}

function applyImpulse(entry) {
  // 随机向上 + 水平弹射
  const up = 2.5 + Math.random() * 3.0
  const out = 0.8 + Math.random() * 1.6
  const angle = Math.random() * Math.PI * 2
  entry.velocity.set(
    Math.cos(angle) * out,
    up,
    Math.sin(angle) * out
  )
  entry.angularVel.set(
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 6
  )
}

// ===== 物理更新 =====
const GRAVITY = -9.8
const DAMPING = 0.92
const ANGULAR_DAMPING = 0.88
const BOUNCE = 0.35
const RESTORE_RATE = 0.6  // 静止后缓慢回到原位
const RESTORE_THRESHOLD = 0.15

function updateGearPhysics(dt) {
  const cappedDt = Math.min(dt, 0.1) // 防止大帧间隔
  const now = performance.now()

  gearEntries.forEach(entry => {
    const speed = entry.velocity.length()
    const restarting = speed < RESTORE_THRESHOLD && entry.group.position.y <= GROUND_Y + 0.05

    // 如果速度很小且在地面，缓慢回到原位
    if (restarting && (now - lastClickTime) > 800 && speed < 0.3) {
      entry.velocity.set(0, 0, 0)
      entry.angularVel.set(0, 0, 0)
      entry.group.position.lerp(entry.restPos, RESTORE_RATE * cappedDt * 2)
      entry.group.rotation.set(0, entry.group.rotation.y * 0.95, 0)
      if (entry.group.position.distanceTo(entry.restPos) < 0.02) {
        entry.group.position.copy(entry.restPos)
      }
      return
    }

    // 重力
    entry.velocity.y += GRAVITY * cappedDt

    // 更新位置
    entry.group.position.x += entry.velocity.x * cappedDt
    entry.group.position.y += entry.velocity.y * cappedDt
    entry.group.position.z += entry.velocity.z * cappedDt

    // 地面碰撞
    if (entry.group.position.y <= GROUND_Y) {
      entry.group.position.y = GROUND_Y
      if (entry.velocity.y < 0) {
        entry.velocity.y = Math.abs(entry.velocity.y) * BOUNCE
      }
      // 地面摩擦
      entry.velocity.x *= 0.85
      entry.velocity.z *= 0.85
      if (Math.abs(entry.velocity.y) < 0.1) entry.velocity.y = 0
    }

    // 阻尼
    entry.velocity.multiplyScalar(Math.pow(DAMPING, cappedDt * 10))

    // 旋转
    entry.group.rotation.x += entry.angularVel.x * cappedDt
    entry.group.rotation.y += entry.angularVel.y * cappedDt
    entry.group.rotation.z += entry.angularVel.z * cappedDt
    entry.angularVel.multiplyScalar(Math.pow(ANGULAR_DAMPING, cappedDt * 10))
  })
}

// === 监听 Store 变化 → 更新 3D 模型 ===
watch([() => store.furStyle, () => store.furColor], ([style, color]) => catModel?.setFurTrait(style, color))
watch(() => store.eyeStyle, (v) => catModel?.setEyeStyle(v))
watch(() => store.gearType, (v) => {
  catModel?.setGear(v)
  if (!v) return
  // 点击面板选择装备 → 对应散落装备弹起
  const entry = gearEntries.find(e => e.id === v)
  if (entry) {
    entry.velocity.set(0, 3.5 + Math.random() * 1.5, 0)
    entry.angularVel.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 0)
  }
})
watch(() => store.faceExpression, (v) => catModel?.setFaceExpression(v))
watch(() => store.background, applyBackground)
watch(() => store.special, buildSpecialScene)
watch(() => store.lightIntensity, (value) => {
  scene?.traverse((object) => { if (object.isLight && object.type !== 'HemisphereLight') object.intensity *= value === 1 ? 2.5 : 0.4 })
})

function applyBackground(name) {
  if (!scene) return
  const colors = {
    'Blue Gradient': '#253f88', 'Green Gradient': '#28624a', 'Green To Blue Gradient': '#277b88', 'Orange Gradient': '#9b4d2e',
    'Pink To Orange Gradient': '#b4506e', 'Purple Gradient': '#5f3e9f', 'Red To Pink Gradient': '#9a3e59', 'Yellow To Green Gradient': '#878e31',
  }
  const color = colors[name] || '#11111c'
  scene.background = new THREE.Color(color)
  scene.fog.color.set(color)
}

function buildSpecialScene(type) {
  if (!specialGroup) return
  specialGroup.clear()
  if (!type) return
  const add = (mesh) => { specialGroup.add(mesh); return mesh }
  const pointMat = (color, size = .04) => new THREE.PointsMaterial({ color, size, transparent: true, opacity: .8, depthWrite: false })
  if (type === 'Galactic Voyage') {
    const stars = new Float32Array(420)
    for (let i = 0; i < stars.length; i += 3) { stars[i] = (Math.random() - .5) * 10; stars[i + 1] = Math.random() * 6 - .5; stars[i + 2] = -2 - Math.random() * 4 }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(stars, 3)); add(new THREE.Points(geo, pointMat('#dbeaff', .035)))
    const planet = add(new THREE.Mesh(new THREE.SphereGeometry(.65, 28, 20), new THREE.MeshStandardMaterial({ color: '#e87573', roughness: .7 }))); planet.position.set(-2.3, 3.0, -2.8)
    const ring = add(new THREE.Mesh(new THREE.TorusGeometry(.9, .035, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffcad4' }))); ring.position.copy(planet.position); ring.rotation.x = 1.15
  } else if (type === 'Golden General') {
    for (let i = 0; i < 18; i++) { const coin = add(new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .035, 20), new THREE.MeshStandardMaterial({ color: '#f6cb38', metalness: .7, roughness: .25 }))); coin.rotation.x = Math.PI / 2; coin.position.set((Math.random() - .5) * 6, Math.random() * 5, -2 - Math.random()); coin.userData.fall = .005 + Math.random() * .01 }
  } else if (type === 'Realm of Mt.Fuji') {
    const mountain = add(new THREE.Mesh(new THREE.ConeGeometry(2.3, 2.5, 4), new THREE.MeshStandardMaterial({ color: '#66839d', roughness: .9 }))); mountain.position.set(0, .25, -3.4); mountain.rotation.y = Math.PI / 4
    const snow = add(new THREE.Mesh(new THREE.ConeGeometry(.83, .55, 4), new THREE.MeshStandardMaterial({ color: '#f6fbff', roughness: .8 }))); snow.position.set(0, 1.48, -3.4); snow.rotation.y = Math.PI / 4
  } else if (type === 'Onsen journey') {
    const water = add(new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshStandardMaterial({ color: '#8edbe8', transparent: true, opacity: .65, roughness: .2 }))); water.rotation.x = -Math.PI / 2; water.position.set(0, -.5, -.4)
    for (let i = 0; i < 8; i++) { const steam = add(new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: .25 }))); steam.position.set((Math.random() - .5) * 2, .2 + Math.random(), -1 - Math.random()); steam.userData.steam = .003 + Math.random() * .003 }
  } else if (type === 'Time Traveler') {
    const grid = add(new THREE.GridHelper(9, 16, '#26d6ee', '#23516d')); grid.position.y = -.52
    const portal = add(new THREE.Mesh(new THREE.TorusGeometry(1.25, .06, 10, 48), new THREE.MeshBasicMaterial({ color: '#ff71c8' }))); portal.position.set(0, 1.8, -2.5)
  } else if (type === 'Fitness Guru') {
    const bell = add(new THREE.Mesh(new THREE.SphereGeometry(.28, 20, 16), new THREE.MeshStandardMaterial({ color: '#34323d', roughness: .45, metalness: .6 }))); bell.position.set(-1.2, -.1, -.6)
    const handle = add(new THREE.Mesh(new THREE.TorusGeometry(.18, .055, 8, 18, Math.PI), new THREE.MeshStandardMaterial({ color: '#34323d', metalness: .6 }))); handle.position.set(-1.2, .2, -.6)
  } else if (type === 'Thunderous Might') {
    for (let i = 0; i < 7; i++) { const bolt = add(new THREE.Mesh(new THREE.BoxGeometry(.06, 1.4, .03), new THREE.MeshBasicMaterial({ color: '#b7f6ff' }))); bolt.position.set((Math.random() - .5) * 6, 2.5 + Math.random() * 2, -2); bolt.rotation.z = .35; bolt.userData.bolt = Math.random() * 6 }
  }
}

// === 天气效果 ===
let rainParticles = null
let cloudMeshes = []

function clearWeather() {
  while (envGroup.children.length) envGroup.remove(envGroup.children[0])
  rainParticles = null
  cloudMeshes = []
}

watch(() => store.weather, (w) => {
  clearWeather()
  if (w === 'rain' || w === 'thunder') createRain()
  if (w === 'cloudy' || w === 'thunder' || w === 'rain') createClouds()
})

function createRain() {
  const count = 300
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 8
    positions[i + 1] = Math.random() * 6
    positions[i + 2] = (Math.random() - 0.5) * 8
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color: '#aaccff', size: 0.04, transparent: true, opacity: 0.5,
    depthWrite: false,
  })
  rainParticles = new THREE.Points(geo, mat)
  envGroup.add(rainParticles)
}

function createClouds() {
  for (let i = 0; i < 6; i++) {
    const cloudGeo = new THREE.SphereGeometry(0.5 + Math.random() * 0.6, 16, 12)
    const cloud = new THREE.Mesh(cloudGeo,
      new THREE.MeshStandardMaterial({ color: '#8899aa', roughness: 1, transparent: true, opacity: 0.4, depthWrite: false }))
    cloud.position.set((Math.random() - 0.5) * 8, 4 + Math.random() * 2, (Math.random() - 0.5) * 6)
    cloud.userData.speed = 0.1 + Math.random() * 0.4
    cloud.userData.baseX = cloud.position.x
    envGroup.add(cloud)
    cloudMeshes.push(cloud)
  }
}

function animate() {
  animId = requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.getElapsedTime()

  catModel?.update(t)
  controls.update()
  updateSize()

  // 装备物理
  updateGearPhysics(dt)

  // 雨滴动画
  if (rainParticles) {
    const pos = rainParticles.geometry.attributes.position.array
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] -= 0.06
      if (pos[i + 1] < -0.5) pos[i + 1] = 5.5
    }
    rainParticles.geometry.attributes.position.needsUpdate = true
  }

  // 云动画
  cloudMeshes.forEach(c => {
    c.position.x += c.userData.speed * 0.01
    if (c.position.x > c.userData.baseX + 5) c.position.x = c.userData.baseX - 5
  })
  specialGroup?.children.forEach(item => {
    if (item.userData.fall) { item.position.y -= item.userData.fall; item.rotation.z += .02; if (item.position.y < -.8) item.position.y = 5 }
    if (item.userData.steam) { item.position.y += item.userData.steam; item.material.opacity = .18 + Math.sin(t * 2 + item.position.x) * .08; if (item.position.y > 2.4) item.position.y = .1 }
    if (item.userData.bolt) item.visible = Math.sin(t * 9 + item.userData.bolt) > .7
  })

  // 雷电闪烁
  if (store.weather === 'thunder' && Math.random() < 0.003) {
    scene.background = new THREE.Color('#ffffff')
    setTimeout(() => { scene.background = new THREE.Color('#1a1a2e') }, 80)
  }

  renderer.render(scene, camera)
}
</script>

<style scoped>
.cat-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
