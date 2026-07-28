<template>
  <canvas ref="canvasRef" class="cat-canvas" @click="onClick" @touchend.prevent="onTouch"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCatStore, GEAR_LIST } from '../stores/cat.js'
import { createCatAssembly } from '../core/createCatAssembly.js'
import { createScene } from '../three/SceneSetup.js'
import { createGear, preloadGearTextures } from '../three/EquipmentFactory.js'
import { createTimeTravelerScene } from '../three/scenes/TimeTravelerScene.js'
import { createFujiRealmScene } from '../three/scenes/FujiScene.js'
import { createReferenceSpecialScene } from '../three/scenes/ReferenceSpecialScenes.js'
import { createWeatherController } from '../three/WeatherController.js'
import { createCharacterInputController } from '../three/CharacterInputController.js'
import { createPreviewEnvironmentController } from '../three/PreviewEnvironmentController.js'
import { createRenderLifecycleController } from '../three/RenderLifecycleController.js'
import * as THREE from 'three'

const store = useCatStore()
const canvasRef = ref(null)

let renderer, scene, camera, controls, envGroup, updateSize, weatherController, inputController, environmentController
let lifecycleController
let catAssembly
let catModel
let clock
let animId
let specialGroup
const moveDirection = new THREE.Vector3()
const previousCatPosition = new THREE.Vector3()
let activePortalId = null
let verticalVelocity = 0
let grounded = true
let cameraTransition = null

const CAMERA_VIEWS = Object.freeze({
  front: new THREE.Vector3(0, 0.45, 4.6),
  'three-quarter': new THREE.Vector3(3.25, 0.7, 3.25),
  side: new THREE.Vector3(4.6, 0.45, 0),
  back: new THREE.Vector3(0, 0.45, -4.6),
})

function onCameraView(event) {
  if (!camera || !controls || !catModel) return
  const offset = CAMERA_VIEWS[event.detail?.view]
  if (!offset) return
  const characterPosition = catModel.group.getWorldPosition(new THREE.Vector3())
  const target = characterPosition.clone().add(new THREE.Vector3(0, 0.72, 0))
  cameraTransition = {
    position: target.clone().add(offset),
    target,
  }
}

function onVirtualInput(event) {
  const detail = event.detail || {}
  if (detail.direction) inputController?.setVirtualDirection(detail.direction.x, detail.direction.z)
  if (detail.action) inputController?.setVirtualAction(detail.action, detail.active)
}

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
  weatherController = createWeatherController({ scene, root: envGroup })
  weatherController.setWeather(store.weather)
  inputController = createCharacterInputController(window)
  inputController.attach()
  environmentController = createPreviewEnvironmentController(scene)
  environmentController.setLightIntensity(store.lightIntensity)

  // 暴露 scene 给旧导出入口；角色级导出使用 __character。
  canvas.__scene = scene

  catAssembly = createCatAssembly({
    tokenId: store.tokenId,
    fur: store.furStyle,
    furColor: store.furColor,
    eyes: store.eyeStyle,
    face: store.faceExpression,
    gear: store.gearType,
    background: store.background,
    special: store.special,
  }, { animation: store.actionMode })
  catModel = catAssembly.model
  canvas.__character = catAssembly.root
  canvas.__catAssembly = catAssembly
  scene.add(catAssembly.root)
  specialGroup = new THREE.Group()
  scene.add(specialGroup)
  applyBackground(store.background)
  buildSpecialScene(store.special)

  // 初始化 raycaster
  initRaycaster()

  // 创建全部装备并散落在猫周围
  createAllGearItems()

  clock = new THREE.Clock()
  window.addEventListener('cat:set-camera-view', onCameraView)
  window.addEventListener('cat:virtual-input', onVirtualInput)
  lifecycleController = createRenderLifecycleController({
    canvas,
    documentTarget: document,
    ResizeObserverClass: ResizeObserver,
    onResize: () => updateSize(),
    onPause: stopAnimation,
    onResume: startAnimation,
    onContextRestored: () => { renderer.resetState?.(); clock.getDelta() },
  })
  lifecycleController.attach()
})

onUnmounted(() => {
  lifecycleController?.dispose()
  stopAnimation()
  window.removeEventListener('cat:set-camera-view', onCameraView)
  window.removeEventListener('cat:virtual-input', onVirtualInput)
  inputController?.dispose()
  catAssembly?.dispose()
  renderer?.dispose()
  controls?.dispose()
  weatherController?.dispose()
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
watch([() => store.furStyle, () => store.furColor], ([fur, furColor]) => catAssembly?.apply({ fur, furColor }))
watch(() => store.eyeStyle, (eyes) => catAssembly?.apply({ eyes }))
watch(() => store.gearType, (v) => {
  catAssembly?.apply({ gear: v })
  if (!v) return
  // 点击面板选择装备 → 对应散落装备弹起
  const entry = gearEntries.find(e => e.id === v)
  if (entry) {
    entry.velocity.set(0, 3.5 + Math.random() * 1.5, 0)
    entry.angularVel.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 0)
  }
})
watch(() => store.faceExpression, (face) => catAssembly?.apply({ face }))
watch(() => store.tokenId, (tokenId) => catAssembly?.apply({ tokenId }))
watch(() => store.actionMode, (v) => {
  if (!inputController?.isMoving) catModel?.setAnimation(v)
})
watch(() => store.background, (background) => {
  catAssembly?.apply({ background })
  applyBackground(background)
})
watch(() => store.special, (special) => {
  catAssembly?.apply({ special })
  buildSpecialScene(special)
})
watch(() => store.lightIntensity, (value) => {
  environmentController?.setLightIntensity(value)
})

function applyBackground(name) {
  environmentController?.setBackground(name)
}

function buildSpecialScene(type) {
  if (!specialGroup) return
  specialGroup.traverse(object => {
    object.geometry?.dispose?.()
    if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.())
    else object.material?.dispose?.()
  })
  specialGroup.clear()
  applyBackground(store.background)
  if (!type) return
  const referenceScene = createReferenceSpecialScene(type)
  if (referenceScene) {
    const referenceBackgrounds = {
      'Thunderous Might': '#737b82',
      'Galactic Voyage': '#17183e',
      'Onsen journey': '#545873',
      'Fitness Guru': '#81958d',
    }
    scene.background = new THREE.Color(referenceBackgrounds[type])
    scene.fog.color.copy(scene.background)
    specialGroup.add(referenceScene)
    return
  }
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
    scene.background = new THREE.Color('#3471df')
    scene.fog.color.set('#8db7ee')
    add(createFujiRealmScene())
  } else if (type === 'Onsen journey') {
    const water = add(new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshStandardMaterial({ color: '#8edbe8', transparent: true, opacity: .65, roughness: .2 }))); water.rotation.x = -Math.PI / 2; water.position.set(0, -.5, -.4)
    for (let i = 0; i < 8; i++) { const steam = add(new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: .25 }))); steam.position.set((Math.random() - .5) * 2, .2 + Math.random(), -1 - Math.random()); steam.userData.steam = .003 + Math.random() * .003 }
  } else if (type === 'Time Traveler') {
    scene.background = new THREE.Color('#090522')
    scene.fog.color.set('#19082d')
    add(createTimeTravelerScene())
  } else if (type === 'Fitness Guru') {
    const bell = add(new THREE.Mesh(new THREE.SphereGeometry(.28, 20, 16), new THREE.MeshStandardMaterial({ color: '#34323d', roughness: .45, metalness: .6 }))); bell.position.set(-1.2, -.1, -.6)
    const handle = add(new THREE.Mesh(new THREE.TorusGeometry(.18, .055, 8, 18, Math.PI), new THREE.MeshStandardMaterial({ color: '#34323d', metalness: .6 }))); handle.position.set(-1.2, .2, -.6)
  } else if (type === 'Thunderous Might') {
    for (let i = 0; i < 7; i++) { const bolt = add(new THREE.Mesh(new THREE.BoxGeometry(.06, 1.4, .03), new THREE.MeshBasicMaterial({ color: '#b7f6ff' }))); bolt.position.set((Math.random() - .5) * 6, 2.5 + Math.random() * 2, -2); bolt.rotation.z = .35; bolt.userData.bolt = Math.random() * 6 }
  }
}

// === 天气效果 ===
watch(() => store.weather, (w) => {
  weatherController?.setWeather(w)
})

function emitPortalEntry(portal) {
  const detail = { ...portal.userData.portal, character: catModel?.group }
  canvasRef.value?.dispatchEvent(new CustomEvent('cat-enter-level', { detail }))
  window.dispatchEvent(new CustomEvent('cat:enter-level', { detail }))
}

function checkPortalEntry() {
  let entered = null
  const catPosition = catModel.group.getWorldPosition(new THREE.Vector3())
  specialGroup?.traverse((object) => {
    if (entered || !object.userData.portal?.enabled) return
    const portalPosition = object.getWorldPosition(new THREE.Vector3())
    if (Math.hypot(catPosition.x - portalPosition.x, catPosition.z - portalPosition.z) < 0.62) entered = object
  })
  const nextId = entered?.userData.portal.levelId || null
  if (entered && nextId !== activePortalId) emitPortalEntry(entered)
  activePortalId = nextId
}

function updateCharacterMovement(dt) {
  if (!catModel) return
  const input = inputController?.consumeFrame() || { x: 0, z: 0, sprinting: false, sneaking: false, jump: false }
  moveDirection.set(input.x, 0, input.z)
  const moving = moveDirection.lengthSq() > 0
  const sprinting = input.sprinting
  const sneaking = input.sneaking
  const movement = catModel.group.userData.movement

  if (input.jump && grounded) {
    verticalVelocity = movement.jumpVelocity
    grounded = false
  }
  if (!grounded) {
    verticalVelocity -= 9.8 * dt
    catModel.group.position.y += verticalVelocity * dt
    if (catModel.group.position.y <= 0) {
      catModel.group.position.y = 0
      verticalVelocity = 0
      grounded = true
    }
  }

  if (!grounded) catModel.setAnimation('jump')
  else if (sneaking) catModel.setAnimation('crouch')
  else if (moving) {
    catModel.setRunSpeed(sprinting ? 1.35 : 0.68)
    catModel.setAnimation('run')
  } else catModel.setAnimation(store.actionMode)
  if (!moving) return

  moveDirection.normalize()
  previousCatPosition.copy(catModel.group.position)
  const speed = sneaking ? movement.sneakSpeed : sprinting ? movement.runSpeed : movement.walkSpeed
  catModel.group.position.addScaledVector(moveDirection, speed * dt)
  catModel.group.position.x = THREE.MathUtils.clamp(catModel.group.position.x, -4.6, 4.6)
  catModel.group.position.z = THREE.MathUtils.clamp(catModel.group.position.z, -4.6, 4.6)
  const targetYaw = Math.atan2(moveDirection.x, moveDirection.z)
  catModel.group.rotation.y = THREE.MathUtils.lerp(catModel.group.rotation.y, targetYaw, 1 - Math.exp(-12 * dt))

  const displacement = catModel.group.position.clone().sub(previousCatPosition)
  displacement.y = 0
  camera.position.add(displacement)
  controls.target.add(displacement)
  checkPortalEntry()
}

function animate() {
  animId = requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.getElapsedTime()

  updateCharacterMovement(dt)
  catModel?.update(t)
  if (cameraTransition) {
    const blend = 1 - Math.exp(-8 * dt)
    camera.position.lerp(cameraTransition.position, blend)
    controls.target.lerp(cameraTransition.target, blend)
    if (camera.position.distanceTo(cameraTransition.position) < 0.012 && controls.target.distanceTo(cameraTransition.target) < 0.012) {
      camera.position.copy(cameraTransition.position)
      controls.target.copy(cameraTransition.target)
      cameraTransition = null
    }
  }
  controls.update()
  updateSize()

  // 装备物理
  updateGearPhysics(dt)
  weatherController?.update(dt)

  // 雨滴动画

  // 云动画
  specialGroup?.children.forEach(item => {
    item.userData.update?.(t)
    if (item.userData.fall) { item.position.y -= item.userData.fall; item.rotation.z += .02; if (item.position.y < -.8) item.position.y = 5 }
    if (item.userData.steam) { item.position.y += item.userData.steam; item.material.opacity = .18 + Math.sin(t * 2 + item.position.x) * .08; if (item.position.y > 2.4) item.position.y = .1 }
    if (item.userData.bolt) item.visible = Math.sin(t * 9 + item.userData.bolt) > .7
  })

  // 雷电闪烁

  renderer.render(scene, camera)
}

function startAnimation() {
  if (animId != null || !clock) return
  clock.getDelta()
  animate()
}

function stopAnimation() {
  if (animId != null) cancelAnimationFrame(animId)
  animId = null
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
