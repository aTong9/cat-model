import { createCatAssembly } from '../../core/createCatAssembly.js'
import * as THREE from 'three'
import { animationDocumentToClip } from '../animation/animationDocument.js'

export const CHARACTER_RUNTIME_VERSION = 1
export const CHARACTER_LOCOMOTION_STATES = Object.freeze(['idle', 'walk', 'run', 'jump', 'fall', 'land'])
export const DEFAULT_RUNTIME_PROFILE = Object.freeze({
  collider: Object.freeze({ type: 'capsule', radius: 0.38, halfHeight: 0.62, offset: Object.freeze([0, 0.62, 0]) }),
  groundProbe: Object.freeze({ type: 'ray', origin: Object.freeze([0, 0.08, 0]), distance: 0.16 }),
  interactionVolume: Object.freeze({ type: 'sphere', radius: 0.8, offset: Object.freeze([0, 0.72, 0]) }),
  movement: Object.freeze({ walkSpeed: 1.1, runSpeed: 2.4, jumpVelocity: 3.4, gravity: 9.81 }),
  lods: Object.freeze([
    Object.freeze({ id: 'LOD0', maxDistance: 8, detail: 1 }),
    Object.freeze({ id: 'LOD1', maxDistance: 20, detail: 0.6 }),
    Object.freeze({ id: 'LOD2', maxDistance: Infinity, detail: 0.3 }),
  ]),
})

const animationForState = Object.freeze({
  idle: 'standing',
  walk: 'run',
  run: 'run',
  jump: 'jump',
  fall: 'jump',
  land: 'standing',
})

export class CharacterRuntime {
  constructor(config = {}, options = {}) {
    this.assembly = createCatAssembly(config, options)
    this.root = this.assembly.root
    this.profile = DEFAULT_RUNTIME_PROFILE
    this.state = 'idle'
    this.velocity = { x: 0, y: 0, z: 0 }
    this.grounded = true
    this.elapsed = 0
    this.mixer = new THREE.AnimationMixer(this.root)
    this.documentAction = null
    this.root.userData.runtime = {
      version: CHARACTER_RUNTIME_VERSION,
      collider: structuredClone(this.profile.collider),
      groundProbe: structuredClone(this.profile.groundProbe),
      interactionVolume: structuredClone(this.profile.interactionVolume),
      lods: structuredClone(this.profile.lods),
    }
  }

  setState(next) {
    const normalized = CHARACTER_LOCOMOTION_STATES.includes(next) ? next : 'idle'
    if (this.state === normalized) return this.state
    this.state = normalized
    this.documentAction?.stop()
    this.documentAction = null
    this.assembly.setAnimation(animationForState[normalized])
    return this.state
  }

  applyInput(frame = {}, delta = 0) {
    const dt = Math.max(0, Math.min(0.1, Number(delta) || 0))
    const magnitude = Math.min(1, Math.hypot(Number(frame.x) || 0, Number(frame.z) || 0))
    const speed = frame.sprinting ? this.profile.movement.runSpeed : this.profile.movement.walkSpeed
    this.velocity.x = (Number(frame.x) || 0) * speed
    this.velocity.z = (Number(frame.z) || 0) * speed
    if (frame.jump && this.grounded) {
      this.velocity.y = this.profile.movement.jumpVelocity
      this.grounded = false
      this.setState('jump')
    }
    if (!this.grounded) {
      this.velocity.y -= this.profile.movement.gravity * dt
      if (this.velocity.y < 0) this.setState('fall')
    } else if (magnitude > 0) this.setState(frame.sprinting ? 'run' : 'walk')
    else this.setState('idle')
    return Object.freeze({ state: this.state, velocity: Object.freeze({ ...this.velocity }) })
  }

  setGrounded(grounded) {
    const wasGrounded = this.grounded
    this.grounded = Boolean(grounded)
    if (!wasGrounded && this.grounded) {
      this.velocity.y = 0
      this.setState('land')
    }
  }

  getLod(distance) {
    const value = Math.max(0, Number(distance) || 0)
    return this.profile.lods.find(lod => value <= lod.maxDistance) ?? this.profile.lods.at(-1)
  }

  playAnimationDocument(document) {
    this.documentAction?.stop()
    const clip = animationDocumentToClip(document, this.assembly.registry)
    this.documentAction = this.mixer.clipAction(clip)
    this.documentAction.setLoop(document.loop ? THREE.LoopRepeat : THREE.LoopOnce, document.loop ? Infinity : 1)
    this.documentAction.clampWhenFinished = !document.loop
    this.documentAction.play()
    return clip
  }

  apply(config) { return this.assembly.apply(config) }
  update(time) {
    const next = Number(time) || 0
    const delta = Math.max(0, next - this.elapsed)
    this.elapsed = next
    if (this.documentAction) this.mixer.update(delta)
    else this.assembly.update(this.elapsed)
  }
  dispose() {
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.root)
    this.assembly.dispose()
  }
}

export function createCharacterRuntime(config, options) {
  return new CharacterRuntime(config, options)
}
