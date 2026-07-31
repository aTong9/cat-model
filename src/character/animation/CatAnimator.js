import * as THREE from 'three'
import { normalizePoseId } from '../../config/poses.js'
import { resetFaceMotion } from './faceMotion.js'
import { normalizeActionParameters } from './actionParameters.js'

export class CatAnimator {
  constructor({ root, registry, parts, updateTail, actionProps, strategies = {} }) {
    this.root = root
    this.registry = registry
    this.parts = parts
    this.updateTail = updateTail
    this.actionProps = actionProps
    this.strategies = new Map(Object.entries(strategies))
    this.mode = 'standing'
    this.runSpeed = 1
    this.actionParameters = new Map()
  }

  setAnimation(mode = 'standing') {
    this.mode = this.strategies.has(mode) || mode === 'flex' || mode === 'crouch' ? mode : normalizePoseId(mode)
  }

  setRunSpeed(speed = 1) {
    this.runSpeed = THREE.MathUtils.clamp(Number(speed) || 1, 0.25, 2.5)
  }

  registerStrategy(mode, strategy) {
    if (!mode || typeof strategy !== 'function') throw new Error(`Invalid animation strategy: ${mode}`)
    this.strategies.set(mode, strategy)
    return this
  }

  hasStrategy(mode) {
    return this.strategies.has(mode)
  }

  setActionParameters(actionId, parameters = {}) {
    const normalized = normalizeActionParameters(parameters)
    this.actionParameters.set(actionId, normalized)
    return normalized
  }

  getActionParameters(actionId = this.mode) {
    return this.actionParameters.get(actionId) ?? normalizeActionParameters()
  }

  update(time) {
    this.resetPose()
    const strategy = this.strategies.get(this.mode)
    if (strategy) {
      strategy(time)
      return
    }
    this._updateStanding(time)
  }

  resetPose() {
    this.actionProps?.clear()
    this.root.position.set(...(this.root.userData.restPosition ?? [0, 0, 0]))
    this.root.rotation.set(...(this.root.userData.restRotation ?? [0, 0, 0]))
    this.root.scale.set(1, 1, 1)
    const { body, head, earLeft, earRight, armLeft, armRight, legLeft, legRight } = this.parts
    if (body) body.position.y = 0
    for (const part of [head, earLeft, earRight, armLeft, armRight, legLeft, legRight]) {
      if (!part) continue
      part.rotation.set(0, 0, 0)
      if (part.userData.restPosition) part.position.set(...part.userData.restPosition)
    }
    for (const partId of ['arm-left', 'arm-right', 'leg-left', 'leg-right']) {
      const joints = this.registry.getJoints(partId)
      for (const joint of Object.values(joints)) {
        const rest = joint?.userData?.restRotation
        joint?.rotation?.set(...(rest ?? [0, 0, 0]))
      }
    }
    for (const part of [armLeft, armRight]) {
      const paw = part?.getObjectByName(part === armLeft ? 'ArmLeftPaw' : 'ArmRightPaw')
      if (paw?.userData.restScale) paw.scale.set(...paw.userData.restScale)
    }
    for (const part of [legLeft, legRight]) {
      const foot = part?.getObjectByName(part === legLeft ? 'FootLeft' : 'FootRight')
      if (foot?.userData.restScale) foot.scale.set(...foot.userData.restScale)
    }
    resetFaceMotion(this.registry.getJoints('face'))
  }

  _updateStanding() {
    const { armLeft, armRight } = this.parts
    // Neutral is a frozen modelling/reference pose. It deliberately contains
    // no breathing, sway, ear twitch, leg lift or tail cycle, so turnaround
    // comparison and later authored actions all start from identical anatomy.
    this.root.scale.set(1, 1, 1)
    for (const partId of ['arm-left', 'arm-right']) {
      const { elbow, wrist } = this.registry.getJoints(partId)
      if (elbow) elbow.rotation.set(0, 0, 0)
      if (wrist) wrist.rotation.set(0, 0, 0)
    }
    for (const partId of ['leg-left', 'leg-right']) {
      const { knee, ankle } = this.registry.getJoints(partId)
      if (knee) knee.rotation.set(0, 0, 0)
      if (ankle) ankle.rotation.set(0, 0, 0)
    }
    armLeft?.rotation.set(0, 0, -0.035)
    armRight?.rotation.set(0, 0, 0.035)
    this.updateTail(0, 0, 1)
  }
}
