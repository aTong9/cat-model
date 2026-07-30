import * as THREE from 'three'
import { createEquipmentEffect } from '../character/equipment/EquipmentEffects.js'

const GROUND_Y = -0.52
const GRAVITY = -9.8
const DAMPING = 0.92
const ANGULAR_DAMPING = 0.88
const BOUNCE = 0.35

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

  function disposeEntry(entry) {
    entry.group.traverse(object => {
      object.geometry?.dispose?.()
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.())
      else object.material?.dispose?.()
    })
    scene.remove(entry.group)
  }

  function createAll() {
    entries.forEach(disposeEntry)
    entries.length = 0
    const layoutRandom = createSeededRandom(seed)

    gearIds.forEach((id, index) => {
      const group = createGear(id)
      if (!group) return
      const angle = (index / gearIds.length) * Math.PI * 2 + (layoutRandom() - 0.5) * 0.4
      const radius = 2.2 + layoutRandom()
      const position = new THREE.Vector3(Math.cos(angle) * radius, GROUND_Y, Math.sin(angle) * radius)
      group.position.copy(position)
      group.rotation.set(layoutRandom() * 0.2 - 0.1, layoutRandom() * Math.PI * 2, layoutRandom() * 0.1 - 0.05)
      group.scale.setScalar(0.68 + layoutRandom() * 0.16)
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
      entries.push({
        group,
        id,
        restPos: position,
        velocity: new THREE.Vector3(),
        angularVel: new THREE.Vector3(),
        effect: null,
      })
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
    draggedEntry.group.position.y = GROUND_Y
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

  function update(deltaSeconds) {
    const dt = Math.min(deltaSeconds, 0.1)
    entries.forEach(entry => {
      if (entry === draggedEntry) return
      if (entry.effect?.update(dt)) { entry.effect.dispose(); entry.effect = null }
      const speed = entry.velocity.length()
      const resting = speed < 0.15 && entry.group.position.y <= GROUND_Y + 0.05
      if (resting) {
        entry.velocity.set(0, 0, 0)
        entry.angularVel.set(0, 0, 0)
        return
      }
      entry.velocity.y += GRAVITY * dt
      entry.group.position.addScaledVector(entry.velocity, dt)
      if (entry.group.position.y <= GROUND_Y) {
        entry.group.position.y = GROUND_Y
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

  return Object.freeze({ createAll, cast, kickById, startDrag, moveDrag, endDrag, setEquippedId, consumeSuppressedClick, triggerEffect, update, dispose, entries })
}
