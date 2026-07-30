<template>
  <canvas ref="canvasRef" class="cat-canvas" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp" @click="onClick"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCatStore, GEAR_LIST } from '../stores/cat.js'
import { createCatAssembly } from '../core/createCatAssembly.js'
import { createScene } from '../three/SceneSetup.js'
import { createGear, preloadGearTextures } from '../three/EquipmentFactory.js'
import { createLatestLoadGuard, loadDetailedSpecialScene, loadReferenceSpecialScene } from '../three/SpecialSceneLoader.js'
import { createWeatherController } from '../three/WeatherController.js'
import { createCharacterInputController } from '../three/CharacterInputController.js'
import { createPreviewEnvironmentController } from '../three/PreviewEnvironmentController.js'
import { createRenderLifecycleController } from '../three/RenderLifecycleController.js'
import { createRenderQualityController } from '../three/RenderQualityController.js'
import { createEquipmentScatterController } from '../three/EquipmentScatterController.js'
import * as THREE from 'three'
import { getNextPoseId } from '../config/poses.js'

const store = useCatStore()
const canvasRef = ref(null)

let renderer, scene, camera, controls, envGroup, updateSize, weatherController, inputController, environmentController
let lifecycleController
let qualityController
let equipmentScatterController
let catAssembly
let catModel
let clock
let animId
let specialGroup
const specialSceneLoadGuard = createLatestLoadGuard()
const moveDirection = new THREE.Vector3()
const previousCatPosition = new THREE.Vector3()
let activePortalId = null
let verticalVelocity = 0
let grounded = true
let cameraTransition = null
let componentDisposed = false
const catRaycaster = new THREE.Raycaster()
const catPointer = new THREE.Vector2()

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

onMounted(async () => {
  componentDisposed = false
  const canvas = canvasRef.value
  if (!canvas) return
  // 预加载装备贴图
  await preloadGearTextures()
  if (componentDisposed) return

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
  qualityController = createRenderQualityController({ renderer, capabilities: {
    width: window.innerWidth,
    deviceMemory: navigator.deviceMemory,
    devicePixelRatio: window.devicePixelRatio,
  } })
  qualityController.setMode(store.qualityMode)

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
    morphology: store.morphology,
  }, { animation: store.actionMode })
  catModel = catAssembly.model
  canvas.__character = catAssembly.root
  canvas.__catAssembly = catAssembly
  canvas.__beginCharacterCapture = beginCharacterCapture
  scene.add(catAssembly.root)
  specialGroup = new THREE.Group()
  scene.add(specialGroup)
  applyBackground(store.background)
  requestSpecialScene(store.special)

  equipmentScatterController = createEquipmentScatterController({
    scene,
    camera,
    canvas,
    gearIds: GEAR_LIST.map(gear => gear.id),
    createGear,
    setControlsEnabled: enabled => { if (controls) controls.enabled = enabled },
    dropTarget: catModel.group,
    onEquip: id => { store.gearType = id },
  })
  equipmentScatterController.createAll()
  equipmentScatterController.setEquippedId(store.gearType)

  clock = new THREE.Clock()
  window.addEventListener('cat:set-camera-view', onCameraView)
  window.addEventListener('cat:virtual-input', onVirtualInput)
  lifecycleController = createRenderLifecycleController({
    canvas,
    documentTarget: document,
    ResizeObserverClass: ResizeObserver,
    onResize: () => {
      qualityController?.updateCapabilities({ width: window.innerWidth, devicePixelRatio: window.devicePixelRatio })
      updateSize()
    },
    onPause: stopAnimation,
    onResume: startAnimation,
    onContextRestored: () => { renderer.resetState?.(); clock.getDelta() },
  })
  lifecycleController.attach()
})

onUnmounted(() => {
  componentDisposed = true
  specialSceneLoadGuard.invalidate()
  lifecycleController?.dispose()
  stopAnimation()
  window.removeEventListener('cat:set-camera-view', onCameraView)
  window.removeEventListener('cat:virtual-input', onVirtualInput)
  inputController?.dispose()
  catAssembly?.dispose()
  renderer?.dispose()
  controls?.dispose()
  weatherController?.dispose()
  equipmentScatterController?.dispose()
  disposeObject3DResources(specialGroup)
  specialGroup?.removeFromParent()
  specialGroup = null
})

function beginCharacterCapture({ transparent = false } = {}) {
  if (!renderer || !scene || !camera) return () => {}
  stopAnimation()
  const previous = { background: scene.background, fog: scene.fog, clearAlpha: renderer.getClearAlpha() }
  const hidden = [envGroup, specialGroup, scene.getObjectByName('PreviewGround'), scene.getObjectByName('PreviewPodium'), ...(equipmentScatterController?.entries?.map(entry => entry.group) ?? [])]
    .filter(Boolean).map(object => [object, object.visible])
  if (transparent) {
    hidden.forEach(([object]) => { object.visible = false })
    scene.background = null
    scene.fog = null
    renderer.setClearAlpha(0)
  }
  renderer.render(scene, camera)
  return () => {
    hidden.forEach(([object, visible]) => { object.visible = visible })
    scene.background = previous.background
    scene.fog = previous.fog
    renderer.setClearAlpha(previous.clearAlpha)
    startAnimation()
  }
}

function onClick(e) {
  if (equipmentScatterController?.consumeSuppressedClick()) return
  if (equipmentScatterController?.cast(e.clientX, e.clientY)) return
  cyclePoseWhenCatHit(e.clientX, e.clientY)
}

function onPointerDown(e) {
  if (equipmentScatterController?.startDrag(e.clientX, e.clientY)) e.currentTarget.setPointerCapture?.(e.pointerId)
}
function onPointerMove(e) { equipmentScatterController?.moveDrag(e.clientX, e.clientY) }
function onPointerUp(e) {
  if (equipmentScatterController?.endDrag(e.clientX, e.clientY)) e.currentTarget.releasePointerCapture?.(e.pointerId)
}

function cyclePoseWhenCatHit(clientX, clientY) {
  const canvas = canvasRef.value
  const rect = canvas?.getBoundingClientRect()
  if (!rect?.width || !rect?.height || !camera || !catModel) return false
  catPointer.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  )
  catRaycaster.setFromCamera(catPointer, camera)
  const hit = catRaycaster.intersectObject(catModel.group, true).some(({ object }) => object.isMesh)
  if (!hit) return false
  store.actionMode = getNextPoseId(store.actionMode)
  return true
}

// === 监听 Store 变化 → 更新 3D 模型 ===
watch([() => store.furStyle, () => store.furColor], ([fur, furColor]) => catAssembly?.apply({ fur, furColor }))
watch(() => store.eyeStyle, (eyes) => catAssembly?.apply({ eyes }))
watch(() => store.gearType, (v) => {
  catAssembly?.apply({ gear: v })
  equipmentScatterController?.setEquippedId(v)
})
watch(() => store.faceExpression, (face) => catAssembly?.apply({ face }))
watch(() => store.tokenId, (tokenId) => catAssembly?.apply({ tokenId }))
watch(() => ({ ...store.morphology }), morphology => catAssembly?.apply({ morphology }), { deep: true })
watch(() => store.actionMode, (v) => {
  if (!inputController?.isMoving) catModel?.setAnimation(v)
})
watch(() => store.background, (background) => {
  catAssembly?.apply({ background })
  applyBackground(background)
})
watch(() => store.special, (special) => {
  catAssembly?.apply({ special })
  requestSpecialScene(special)
})
watch(() => store.lightIntensity, (value) => {
  environmentController?.setLightIntensity(value)
})
watch(() => store.qualityMode, (value) => {
  qualityController?.setMode(value)
  updateSize?.()
})

function applyBackground(name) {
  environmentController?.setBackground(name)
}

function disposeObject3DResources(root) {
  root?.traverse(object => {
    object.geometry?.dispose?.()
    if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.())
    else object.material?.dispose?.()
  })
}

function requestSpecialScene(type) {
  void buildSpecialScene(type).catch((error) => {
    if (specialGroup) console.error(`无法加载特殊场景：${type}`, error)
  })
}

async function buildSpecialScene(type) {
  const loadVersion = specialSceneLoadGuard.begin()
  if (!specialGroup) return
  disposeObject3DResources(specialGroup)
  specialGroup.clear()
  applyBackground(store.background)
  if (!type) return
  const reference = await loadReferenceSpecialScene(type)
  if (!specialSceneLoadGuard.isCurrent(loadVersion) || !specialGroup) {
    disposeObject3DResources(reference.group)
    return
  }
  if (reference.group) {
    scene.background = new THREE.Color(reference.background)
    scene.fog.color.copy(scene.background)
    specialGroup.add(reference.group)
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
    const createSceneGroup = await loadDetailedSpecialScene(type)
    if (!specialSceneLoadGuard.isCurrent(loadVersion) || !specialGroup) return
    scene.background = new THREE.Color('#3471df')
    scene.fog.color.set('#8db7ee')
    add(createSceneGroup())
  } else if (type === 'Onsen journey') {
    const water = add(new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshStandardMaterial({ color: '#8edbe8', transparent: true, opacity: .65, roughness: .2 }))); water.rotation.x = -Math.PI / 2; water.position.set(0, -.5, -.4)
    for (let i = 0; i < 8; i++) { const steam = add(new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: .25 }))); steam.position.set((Math.random() - .5) * 2, .2 + Math.random(), -1 - Math.random()); steam.userData.steam = .003 + Math.random() * .003 }
  } else if (type === 'Time Traveler') {
    const createSceneGroup = await loadDetailedSpecialScene(type)
    if (!specialSceneLoadGuard.isCurrent(loadVersion) || !specialGroup) return
    scene.background = new THREE.Color('#090522')
    scene.fog.color.set('#19082d')
    add(createSceneGroup())
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
  if (qualityController && !qualityController.shouldRender(performance.now())) return
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
  equipmentScatterController?.update(dt)
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
