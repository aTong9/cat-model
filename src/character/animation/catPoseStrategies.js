export function createCatPoseStrategies(model) {
  return {
    'run': time => updateRun.call(model, time),
    'flex': time => updateFlex.call(model, time),
    'crouch': time => updateCrouch.call(model, time),
    'sit-splay': time => updateSplaySit.call(model, time),
    'jump': time => updateJump.call(model, time),
    'lie-down': time => updateLieDown.call(model, time),
    'sleep': time => updateSleep.call(model, time),
    'wave': time => updateWave.call(model, time),
  }
}

function updateRun(time) {
    const cycle = time * 10 * this.animator.runSpeed
    const pulse = Math.abs(Math.sin(cycle)) * 0.026
    this.root.scale.set(1.05 - pulse * 0.25, 1.02 + pulse, 1 - pulse * 0.18)
    if (this._headGroup) {
      this._headGroup.rotation.set(-0.055 + Math.cos(cycle * 2) * 0.018, 0, Math.sin(cycle * 0.5) * 0.035)
    }
    for (const [ear, side] of [[this._earLGroup, -1], [this._earRGroup, 1]]) {
      if (!ear) continue
      ear.rotation.z = side * 0.055 + Math.cos(cycle * 2 + side * 0.2) * 0.075
      ear.rotation.x = -0.10 + Math.sin(cycle * 2) * 0.055
    }
    ;[[this._armLGroup, -1, 0], [this._armRGroup, 1, Math.PI]].forEach(([arm, side, offset]) => {
      if (!arm) return
      const swing = Math.sin(cycle + offset)
      const { elbow, wrist } = this._getJoints(arm)
      arm.rotation.set(-swing * 0.30, 0, side * 0.08 + swing * 0.025)
      if (elbow) elbow.rotation.set(0.12 + Math.max(0, swing) * 0.24, 0, side * 0.035)
      if (wrist) wrist.rotation.set(-0.06 - swing * 0.04, 0, 0)
    })
    ;[[this._footLGroup, 0], [this._footRGroup, Math.PI]].forEach(([leg, offset]) => {
      if (!leg) return
      const stride = Math.sin(cycle + offset)
      const lift = Math.max(0, -stride)
      const { knee, ankle } = this._getJoints(leg)
      leg.rotation.set(stride * 0.62, 0, 0)
      if (knee) knee.rotation.x = 0.08 + lift * 0.78
      if (ankle) ankle.rotation.x = -0.12 - lift * 0.38 + Math.max(0, stride) * 0.12
    })
    this._updateTailSurface(time, 0.095, 5.4 * this.animator.runSpeed)
  }

function updateFlex(time) {
    const pulse = (Math.sin(time * 4.2) + 1) * 0.5
    this.root.scale.set(1.05 + pulse * 0.018, 1.02 - pulse * 0.008, 1 + pulse * 0.018)
    if (this._headGroup) this._headGroup.rotation.set(-0.025, 0, Math.sin(time * 1.4) * 0.018)
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = this._getJoints(arm)
      arm.rotation.set(-0.08, 0, side * (1.28 + pulse * 0.08))
      if (elbow) elbow.rotation.set(0.08, 0, side * (0.18 + pulse * 0.05))
      if (wrist) wrist.rotation.set(-0.08, 0, -side * 0.08)
    })
    ;[this._footLGroup, this._footRGroup].forEach((leg) => {
      if (!leg) return
      leg.rotation.set(0, 0, 0)
      const { knee, ankle } = this._getJoints(leg)
      if (knee) knee.rotation.set(0.06, 0, 0)
      if (ankle) ankle.rotation.set(-0.06, 0, 0)
    })
    for (const [ear, side] of [[this._earLGroup, -1], [this._earRGroup, 1]]) {
      if (ear) ear.rotation.set(-0.025, 0, side * 0.035)
    }
    this._updateTailSurface(time, 0.055, 1.7)
  }

function updateCrouch(time) {
    const breathe = Math.sin(time * 2.4) * 0.008
    this.root.scale.set(1.08, 0.88 + breathe, 1.05)
    if (this._headGroup) this._headGroup.rotation.set(0.07, 0, Math.sin(time * 1.2) * 0.012)
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = this._getJoints(arm)
      arm.rotation.set(0.16, 0, side * 0.12)
      if (elbow) elbow.rotation.set(0.42, 0, -side * 0.18)
      if (wrist) wrist.rotation.set(-0.18, 0, 0)
    })
    ;[this._footLGroup, this._footRGroup].forEach((leg) => {
      if (!leg) return
      const { knee, ankle } = this._getJoints(leg)
      leg.rotation.set(-0.28, 0, 0)
      if (knee) knee.rotation.set(0.72, 0, 0)
      if (ankle) ankle.rotation.set(-0.38, 0, 0)
    })
    this._updateTailSurface(time, 0.035, 0.8)
  }

function updateSplaySit(time) {
    const breathe = Math.sin(time * 1.8) * 0.008
    this.root.scale.set(1.08, 0.84 + breathe, 1.06)
    if (this._bodyGroup) this._bodyGroup.position.y = -0.10
    if (this._headGroup) this._headGroup.rotation.set(0.055, 0, Math.sin(time * 0.8) * 0.018)
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = this._getJoints(arm)
      arm.rotation.set(0.10, 0, side * 0.12)
      if (elbow) elbow.rotation.set(0.28, 0, -side * 0.06)
      if (wrist) wrist.rotation.set(-0.10, 0, side * 0.04)
    })
    ;[[this._footLGroup, -1], [this._footRGroup, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = this._getJoints(leg)
      leg.rotation.set(-0.48, side * 0.16, side * 0.72)
      if (knee) knee.rotation.set(1.02, 0, -side * 0.18)
      if (ankle) ankle.rotation.set(-0.56, 0, side * 0.14)
    })
    this._updateTailSurface(time, 0.028, 0.65)
  }

function updateJump(time) {
    this.root.scale.set(1.01, 1.08, 0.98)
    if (this._headGroup) this._headGroup.rotation.set(-0.08, 0, 0)
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = this._getJoints(arm)
      arm.rotation.set(-0.18, 0, side * 0.82)
      if (elbow) elbow.rotation.set(0.24, 0, side * 0.14)
      if (wrist) wrist.rotation.set(-0.12, 0, 0)
    })
    ;[this._footLGroup, this._footRGroup].forEach((leg) => {
      if (!leg) return
      const { knee, ankle } = this._getJoints(leg)
      leg.rotation.set(-0.34, 0, 0)
      if (knee) knee.rotation.set(0.88, 0, 0)
      if (ankle) ankle.rotation.set(-0.44, 0, 0)
    })
    this._updateTailSurface(time, 0.075, 2.2)
  }

function updateLieDown(time) {
    const breathe = Math.sin(time * 1.35) * 0.007
    this.root.scale.set(1.10, 0.64 + breathe, 1.16)
    if (this._bodyGroup) this._bodyGroup.position.y = -0.22
    if (this._headGroup) this._headGroup.rotation.set(0.12, 0, Math.sin(time * 0.65) * 0.012)
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = this._getJoints(arm)
      arm.rotation.set(0.68, side * 0.08, side * 0.17)
      if (elbow) elbow.rotation.set(0.72, 0, -side * 0.12)
      if (wrist) wrist.rotation.set(-0.34, 0, side * 0.06)
    })
    ;[[this._footLGroup, -1], [this._footRGroup, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = this._getJoints(leg)
      leg.rotation.set(-0.92, side * 0.08, side * 0.20)
      if (knee) knee.rotation.set(1.16, 0, -side * 0.10)
      if (ankle) ankle.rotation.set(-0.54, 0, side * 0.08)
    })
    this._updateTailSurface(time, 0.022, 0.55)
  }

function updateSleep(time) {
    const breathe = Math.sin(time * 0.82) * 0.014
    this.root.scale.set(1.13 + breathe * 0.25, 0.60 + breathe, 1.18)
    if (this._bodyGroup) this._bodyGroup.position.y = -0.25
    if (this._headGroup) this._headGroup.rotation.set(0.16, 0.16, -0.18 + Math.sin(time * 0.42) * 0.008)
    for (const [ear, side] of [[this._earLGroup, -1], [this._earRGroup, 1]]) {
      if (ear) ear.rotation.set(-0.12, 0, side * 0.11)
    }
    ;[[this._armLGroup, -1], [this._armRGroup, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = this._getJoints(arm)
      arm.rotation.set(0.76, side * 0.10, side * 0.25)
      if (elbow) elbow.rotation.set(0.94, 0, -side * 0.18)
      if (wrist) wrist.rotation.set(-0.42, 0, side * 0.10)
    })
    ;[[this._footLGroup, -1], [this._footRGroup, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = this._getJoints(leg)
      leg.rotation.set(-1.02, side * 0.12, side * 0.32)
      if (knee) knee.rotation.set(1.28, 0, -side * 0.16)
      if (ankle) ankle.rotation.set(-0.64, 0, side * 0.12)
    })
    this._updateTailSurface(time, 0.012, 0.32)
  }

function updateWave(time) {
    const wave = Math.sin(time * 5.2)
    const breathe = 1 + Math.sin(time * 1.5) * 0.009
    this.root.scale.set(1.05 * breathe, 1.02 * breathe, breathe)
    if (this._headGroup) this._headGroup.rotation.set(0, -0.08, -0.035 + wave * 0.012)
    const left = this._armLGroup
    if (left) {
      const { elbow, wrist } = this._getJoints(left)
      left.rotation.set(0, 0, -0.08)
      if (elbow) elbow.rotation.set(0, 0, 0)
      if (wrist) wrist.rotation.set(0, 0, 0)
    }
    const right = this._armRGroup
    if (right) {
      const { elbow, wrist } = this._getJoints(right)
      right.rotation.set(-0.10, 0, 1.72 + wave * 0.10)
      if (elbow) elbow.rotation.set(0.18, 0, -0.34)
      if (wrist) wrist.rotation.set(-0.06, 0, wave * 0.34)
    }
    for (const leg of [this._footLGroup, this._footRGroup]) {
      const { knee, ankle } = this._getJoints(leg)
      if (leg) leg.rotation.set(0, 0, 0)
      if (knee) knee.rotation.set(0, 0, 0)
      if (ankle) ankle.rotation.set(0, 0, 0)
    }
    this._updateTailSurface(time, 0.048, 1.35)
  }

