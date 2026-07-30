import * as THREE from 'three'
import { normalizePoseId } from '../../config/poses.js'

export class CatAnimator {
  constructor({ root, registry, parts, updateTail, strategies = {} }) {
    this.root = root
    this.registry = registry
    this.parts = parts
    this.updateTail = updateTail
    this.strategies = new Map(Object.entries(strategies))
    this.mode = 'standing'
    this.runSpeed = 1
  }

  setAnimation(mode = 'standing') {
    this.mode = mode === 'flex' || mode === 'crouch' ? mode : normalizePoseId(mode)
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
    this.root.scale.set(1, 1, 1)
    const { body, head, earLeft, earRight, armLeft, armRight, legLeft, legRight } = this.parts
    if (body) body.position.y = 0
    for (const part of [head, earLeft, earRight, armLeft, armRight, legLeft, legRight]) {
      if (part) part.rotation.set(0, 0, 0)
    }
    for (const partId of ['arm-left', 'arm-right', 'leg-left', 'leg-right']) {
      const joints = this.registry.getJoints(partId)
      for (const joint of Object.values(joints)) joint?.rotation?.set(0, 0, 0)
    }
  }

  _updateStanding(time) {
    const { head, earLeft, earRight, armLeft, armRight, legLeft, legRight } = this.parts
    const breathe = 1 + Math.sin(time * 1.5) * 0.012
    this.root.scale.set(1.05 * breathe, 1.02 * breathe, breathe)
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
    if (head) {
      head.rotation.z = Math.sin(time * 0.8) * 0.020
      head.rotation.x = Math.sin(time * 1.05) * 0.012
      head.rotation.y = Math.sin(time * 0.65) * 0.015
    }
    if (earLeft) {
      earLeft.rotation.z = Math.sin(time * 1.3 + 0.5) * 0.04
      earLeft.rotation.x = Math.sin(time * 1.1) * 0.03
    }
    if (earRight) {
      earRight.rotation.z = Math.sin(time * 1.3 - 0.5) * 0.04
      earRight.rotation.x = Math.sin(time * 1.1 + 0.3) * 0.03
    }
    if (armLeft) {
      armLeft.rotation.set(Math.sin(time * 0.92 + 0.6) * 0.018, 0, -0.08 + Math.sin(time * 1.15) * 0.010)
    }
    if (armRight) {
      armRight.rotation.set(Math.sin(time * 0.92 + 2.1) * 0.018, 0, 0.08 + Math.sin(time * 1.15 + Math.PI) * 0.010)
    }
    if (legLeft) {
      legLeft.rotation.x = Math.sin(time * 1.35 + 0.4) * 0.035
      legLeft.rotation.z = Math.sin(time * 1.05) * 0.025
    }
    if (legRight) {
      legRight.rotation.x = Math.sin(time * 1.35 + 2.2) * 0.035
      legRight.rotation.z = Math.sin(time * 1.05 + Math.PI) * 0.025
    }
    this.updateTail(time, 0.045, 1.25)
  }
}
