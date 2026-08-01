import * as THREE from 'three'
import { createEquipmentEffect } from '../character/equipment/EquipmentEffects.js'
import { createEquipmentAnimationClips } from '../character/equipment/equipmentAnimation.js'

const GROUND_Y = -0.52
const GRAVITY = -9.8
const DAMPING = 0.92
const ANGULAR_DAMPING = 0.88
const BOUNCE = 0.35
const CAT_CLEARANCE = 0.9
const SCATTER_SCALES = Object.freeze({ Camera: 0.40, 'Hiking Backpack': 1.08, 'Baseball Cap': 1.12 })

function hashSeed(seed) {
  let hash = 2166136261
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function createSeededRandom(seed = 'liberty-cats-equipment-v1') {
  let state = hashSeed(seed)
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function createEquipmentScatterController({
  scene,
  camera,
  canvas,
  gearIds,
  createGear,
  setControlsEnabled = () => {},
  dropTarget = null,
  onEquip = () => {},
  onSelect = () => {},
  seed = 'liberty-cats-equipment-v1',
  now = () => performance.now(),
}) {
  const entries = []
  const raycaster = new THREE.Raycaster()
  raycaster.far = 15
  const pointer = new THREE.Vector2()
  const impulseRandom = createSeededRandom(`${seed}:impulses`)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y)
  const dragPoint = new THREE.Vector3()
  const dragOffset = new THREE.Vector3()
  let draggedEntry = null
  let pointerDownAt = null
  let suppressClick = false
  let selectedEntry = null

  function disposeEntry(entry) {
    entry.mixer?.stopAllAction()
    entry.mixer?.uncacheRoot(entry.group)
    entry.group.traverse(object => {
      object.geometry?.dispose?.()
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.())
      else object.material?.dispose?.()
    })
    scene.remove(entry.group)
  }

  function createAll() {
    selectedEntry = null
    entries.forEach(disposeEntry)
    entries.length = 0
    const layoutRandom = createSeededRandom(seed)

    gearIds.forEach((id, index) => {
      const group = createGear(id)
      if (!group) return
      const angle = (index / gearIds.length) * Math.PI * 2 + (layoutRandom() - 0.5) * 0.4
      const radius = 1.45 + layoutRandom() * 0.75
      const position = new THREE.Vector3(Math.cos(angle) * radius, GROUND_Y, Math.sin(angle) * radius)
      group.position.copy(position)
      group.rotation.set(layoutRandom() * 0.2 - 0.1, layoutRandom() * Math.PI * 2, layoutRandom() * 0.1 - 0.05)
      group.scale.setScalar((SCATTER_SCALES[id] ?? 1.22) * (0.94 + layoutRandom() * 0.12))
      group.userData._scatterAngle = angle
      group.userData._scatterRadius = radius
      group.userData._gearId = id
      group.traverse(object => {
        if (!object.isMesh) return
        object.castShadow = true
        object.receiveShadow = true
        object.userData.__scatterEntryIndex = entries.length
      })
      scene.add(group)
      group.updateMatrixWorld(true)
      const bounds = new THREE.Box3().setFromObject(group)
      const groundOffset = Number.isFinite(bounds.min.y) ? GROUND_Y - bounds.min.y : 0
      group.position.y += groundOffset
      position.y = group.position.y
      entries.push({
        group,
        id,
        groundY: group.position.y,
        restPos: position,
        velocity: new THREE.Vector3(),
        angularVel: new THREE.Vector3(),
        effect: null,
        animations: createEquipmentAnimationClips(group, id),
        mixer: new THREE.AnimationMixer(group),
      })
      const entry = entries.at(-1)
      entry.mixer.clipAction(THREE.AnimationClip.findByName(entry.animations, group.userData.animationRig.defaultClip)).play()
    })
  }

  function applyImpulse(entry, verticalOnly = false) {
    if (!entry) return false
    const angle = impulseRandom() * Math.PI * 2
    const outwardSpeed = verticalOnly ? 0 : 0.8 + impulseRandom() * 1.6
    entry.velocity.set(Math.cos(angle) * outwardSpeed, 2.5 + impulseRandom() * 3, Math.sin(angle) * outwardSpeed)
    entry.angularVel.set((impulseRandom() - 0.5) * 8, (impulseRandom() - 0.5) * 8, (impulseRandom() - 0.5) * 6)
    return true
  }

  function kickById(id) {
    return applyImpulse(entries.find(entry => entry.id === id), true)
  }

  function cast(clientX, clientY) {
    const rect = canvas?.getBoundingClientRect?.()
    if (!rect?.width || !rect?.height) return false
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    const meshes = []
    entries.forEach(entry => entry.group.traverse(object => { if (object.isMesh) meshes.push(object) }))
    const hit = raycaster.intersectObjects(meshes, false)[0]
    const entry = entries[hit?.object.userData.__scatterEntryIndex]
    if (!entry) return false
    selectEntry(entry)
    triggerEffect(entry)
    return true
  }

  function updatePointer(clientX, clientY) {
    const rect = canvas?.getBoundingClientRect?.()
    if (!rect?.width || !rect?.height) return false
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    return true
  }

  function pick(clientX, clientY) {
    if (!updatePointer(clientX, clientY)) return null
    const meshes = []
    entries.forEach(entry => entry.group.traverse(object => { if (object.isMesh) meshes.push(object) }))
    const hit = raycaster.intersectObjects(meshes, false)[0]
    return entries[hit?.object.userData.__scatterEntryIndex] ?? null
  }

  function startDrag(clientX, clientY) {
    const entry = pick(clientX, clientY)
    if (!entry || !raycaster.ray.intersectPlane(groundPlane, dragPoint)) return false
    draggedEntry = entry
    selectEntry(entry)
    pointerDownAt = { x: clientX, y: clientY }
    dragOffset.copy(entry.group.position).sub(dragPoint)
    entry.velocity.set(0, 0, 0)
    entry.angularVel.set(0, 0, 0)
    setControlsEnabled(false)
    canvas.style.cursor = 'grabbing'
    return true
  }

  function moveDrag(clientX, clientY) {
    if (!draggedEntry || !updatePointer(clientX, clientY) || !raycaster.ray.intersectPlane(groundPlane, dragPoint)) return false
    draggedEntry.group.position.copy(dragPoint).add(dragOffset)
    draggedEntry.group.position.y = draggedEntry.groundY
    if (dropTarget) {
      const catPosition = dropTarget.getWorldPosition(new THREE.Vector3())
      const dx = draggedEntry.group.position.x - catPosition.x
      const dz = draggedEntry.group.position.z - catPosition.z
      const distance = Math.hypot(dx, dz)
      if (distance < CAT_CLEARANCE) {
        const safeDistance = Math.max(distance, 0.0001)
        draggedEntry.group.position.x = catPosition.x + dx / safeDistance * CAT_CLEARANCE
        draggedEntry.group.position.z = catPosition.z + dz / safeDistance * CAT_CLEARANCE
      }
    }
    if (pointerDownAt && Math.hypot(clientX - pointerDownAt.x, clientY - pointerDownAt.y) > 5) suppressClick = true
    return true
  }

  function endDrag(clientX, clientY) {
    if (!draggedEntry) return false
    const entry = draggedEntry
    let equipped = false
    if (dropTarget && Number.isFinite(clientX) && Number.isFinite(clientY) && updatePointer(clientX, clientY)) {
      equipped = raycaster.intersectObject(dropTarget, true).some(hit => hit.object.isMesh)
    }
    draggedEntry = null
    pointerDownAt = null
    setControlsEnabled(true)
    canvas.style.cursor = ''
    if (equipped) {
      entry.group.visible = false
      onEquip(entry.id)
    }
    return true
  }

  function setEquippedId(id) {
    entries.forEach(entry => { entry.group.visible = entry.id !== id })
  }

  function consumeSuppressedClick() {
    const value = suppressClick
    suppressClick = false
    return value
  }

  function triggerEffect(entry) {
    entry.effect?.dispose()
    entry.effect = createEquipmentEffect(entry.id)
    if (!entry.effect) return false
    entry.group.userData.effect = entry.effect.recipe.kind
    entry.group.add(entry.effect.root)
    return true
  }

  function selectEntry(entry) {
    selectedEntry = entry ?? null
    onSelect(selectedEntry)
    return selectedEntry
  }

  function getSelectedEntry() { return selectedEntry }

  function playAnimation(name = 'Semantic') {
    if (!selectedEntry) return false
    const resolvedName = name === 'Semantic' ? selectedEntry.group.userData.animationRig.defaultClip : name
    const clip = THREE.AnimationClip.findByName(selectedEntry.animations, resolvedName)
    if (!clip) return false
    selectedEntry.mixer.stopAllAction()
    selectedEntry.mixer.clipAction(clip).reset().play()
    return true
  }

  function update(deltaSeconds) {
    const dt = Math.min(deltaSeconds, 0.1)
    entries.forEach(entry => {
      entry.mixer.update(dt)
      if (entry === draggedEntry) return
      if (entry.effect?.update(dt)) { entry.effect.dispose(); entry.effect = null }
      const speed = entry.velocity.length()
      const resting = speed < 0.15 && entry.group.position.y <= entry.groundY + 0.05
      if (resting) {
        entry.velocity.set(0, 0, 0)
        entry.angularVel.set(0, 0, 0)
        return
      }
      entry.velocity.y += GRAVITY * dt
      entry.group.position.addScaledVector(entry.velocity, dt)
      if (entry.group.position.y <= entry.groundY) {
        entry.group.position.y = entry.groundY
        if (entry.velocity.y < 0) entry.velocity.y = Math.abs(entry.velocity.y) * BOUNCE
        entry.velocity.x *= 0.85
        entry.velocity.z *= 0.85
        if (Math.abs(entry.velocity.y) < 0.1) entry.velocity.y = 0
      }
      entry.velocity.multiplyScalar(Math.pow(DAMPING, dt * 10))
      entry.group.rotation.x += entry.angularVel.x * dt
      entry.group.rotation.y += entry.angularVel.y * dt
      entry.group.rotation.z += entry.angularVel.z * dt
      entry.angularVel.multiplyScalar(Math.pow(ANGULAR_DAMPING, dt * 10))
    })
  }

  function dispose() {
    endDrag()
    entries.forEach(disposeEntry)
    entries.length = 0
  }

  return Object.freeze({ createAll, cast, kickById, startDrag, moveDrag, endDrag, setEquippedId, consumeSuppressedClick, triggerEffect, selectEntry, getSelectedEntry, playAnimation, update, dispose, entries })
}
