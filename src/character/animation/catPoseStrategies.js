export function createCatPoseStrategies(rig) {
  return {
    'run': time => updateRun(rig, time),
    'flex': time => updateFlex(rig, time),
    'crouch': time => updateCrouch(rig, time),
    'sit': time => updateSit(rig, time),
    'jump': time => updateJump(rig, time),
    'curious': time => updateCurious(rig, time),
    'stretch': time => updateStretch(rig, time),
    'wave': time => updateWave(rig, time),
  }
}

function updateRun(rig, time) {
    const cycle = time * 10 * rig.getRunSpeed()
    const pulse = Math.abs(Math.sin(cycle)) * 0.026
    rig.root.scale.set(1.05 - pulse * 0.25, 1.02 + pulse, 1 - pulse * 0.18)
    if (rig.parts.head) {
      rig.parts.head.rotation.set(-0.055 + Math.cos(cycle * 2) * 0.018, 0, Math.sin(cycle * 0.5) * 0.035)
    }
    for (const [ear, side] of [[rig.parts.earLeft, -1], [rig.parts.earRight, 1]]) {
      if (!ear) continue
      ear.rotation.z = side * 0.055 + Math.cos(cycle * 2 + side * 0.2) * 0.075
      ear.rotation.x = -0.10 + Math.sin(cycle * 2) * 0.055
    }
    ;[[rig.parts.armLeft, -1, 0], [rig.parts.armRight, 1, Math.PI]].forEach(([arm, side, offset]) => {
      if (!arm) return
      const swing = Math.sin(cycle + offset)
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(-swing * 0.30, 0, side * 0.08 + swing * 0.025)
      if (elbow) elbow.rotation.set(0.12 + Math.max(0, swing) * 0.24, 0, side * 0.035)
      if (wrist) wrist.rotation.set(-0.06 - swing * 0.04, 0, 0)
    })
    ;[[rig.parts.legLeft, 0], [rig.parts.legRight, Math.PI]].forEach(([leg, offset]) => {
      if (!leg) return
      const stride = Math.sin(cycle + offset)
      const lift = Math.max(0, -stride)
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(stride * 0.62, 0, 0)
      if (knee) knee.rotation.x = 0.08 + lift * 0.78
      if (ankle) ankle.rotation.x = -0.12 - lift * 0.38 + Math.max(0, stride) * 0.12
    })
    rig.updateTail(time, 0.095, 5.4 * rig.getRunSpeed())
  }

function updateFlex(rig, time) {
    const pulse = (Math.sin(time * 4.2) + 1) * 0.5
    rig.root.scale.set(1.05 + pulse * 0.018, 1.02 - pulse * 0.008, 1 + pulse * 0.018)
    if (rig.parts.head) rig.parts.head.rotation.set(-0.025, 0, Math.sin(time * 1.4) * 0.018)
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(-0.08, 0, side * (1.28 + pulse * 0.08))
      if (elbow) elbow.rotation.set(0.08, 0, side * (0.18 + pulse * 0.05))
      if (wrist) wrist.rotation.set(-0.08, 0, -side * 0.08)
    })
    ;[rig.parts.legLeft, rig.parts.legRight].forEach((leg) => {
      if (!leg) return
      leg.rotation.set(0, 0, 0)
      const { knee, ankle } = rig.getJointsFor(leg)
      if (knee) knee.rotation.set(0.06, 0, 0)
      if (ankle) ankle.rotation.set(-0.06, 0, 0)
    })
    for (const [ear, side] of [[rig.parts.earLeft, -1], [rig.parts.earRight, 1]]) {
      if (ear) ear.rotation.set(-0.025, 0, side * 0.035)
    }
    rig.updateTail(time, 0.055, 1.7)
  }

function updateCrouch(rig, time) {
    const breathe = Math.sin(time * 2.4) * 0.008
    rig.root.scale.set(1.08, 0.88 + breathe, 1.05)
    if (rig.parts.head) rig.parts.head.rotation.set(0.07, 0, Math.sin(time * 1.2) * 0.012)
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(0.16, 0, side * 0.12)
      if (elbow) elbow.rotation.set(0.42, 0, -side * 0.18)
      if (wrist) wrist.rotation.set(-0.18, 0, 0)
    })
    ;[rig.parts.legLeft, rig.parts.legRight].forEach((leg) => {
      if (!leg) return
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(-0.28, 0, 0)
      if (knee) knee.rotation.set(0.72, 0, 0)
      if (ankle) ankle.rotation.set(-0.38, 0, 0)
    })
    rig.updateTail(time, 0.035, 0.8)
  }

function updateSit(rig, time) {
    rig.root.scale.set(1, 1, 1)
    if (rig.parts.head) rig.parts.head.rotation.set(0.055, 0, Math.sin(time * 0.8) * 0.018)
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(0.08, 0, side * 0.10)
      if (elbow) elbow.rotation.set(0.22, 0, -side * 0.05)
      if (wrist) wrist.rotation.set(-0.10, 0, side * 0.04)
    })
    ;[[rig.parts.legLeft, -1], [rig.parts.legRight, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(-0.34, side * 0.05, side * 0.18)
      if (knee) knee.rotation.set(0.82, 0, -side * 0.06)
      if (ankle) ankle.rotation.set(-0.42, 0, side * 0.04)
    })
    rig.updateTail(time, 0.028, 0.65)
  }

function updateJump(rig, time) {
    rig.root.scale.set(1.01, 1.08, 0.98)
    if (rig.parts.head) rig.parts.head.rotation.set(-0.08, 0, 0)
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(-0.18, 0, side * 0.82)
      if (elbow) elbow.rotation.set(0.24, 0, side * 0.14)
      if (wrist) wrist.rotation.set(-0.12, 0, 0)
    })
    ;[rig.parts.legLeft, rig.parts.legRight].forEach((leg) => {
      if (!leg) return
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(-0.34, 0, 0)
      if (knee) knee.rotation.set(0.88, 0, 0)
      if (ankle) ankle.rotation.set(-0.44, 0, 0)
    })
    rig.updateTail(time, 0.075, 2.2)
  }

function updateCurious(rig, time) {
    rig.root.scale.set(1, 1, 1)
    const glance = Math.sin(time * 0.9) * 0.035
    if (rig.parts.head) rig.parts.head.rotation.set(-0.03, -0.12 + glance, -0.20)
    for (const [ear, side] of [[rig.parts.earLeft, -1], [rig.parts.earRight, 1]]) {
      if (ear) ear.rotation.set(side < 0 ? -0.08 : 0.04, 0, side * 0.08)
    }
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      const raised = side > 0
      arm.rotation.set(raised ? -0.18 : 0.04, 0, side * (raised ? 0.58 : 0.08))
      if (elbow) elbow.rotation.set(raised ? 0.48 : 0.10, 0, raised ? -0.16 : 0)
      if (wrist) wrist.rotation.set(raised ? -0.22 : 0, 0, raised ? Math.sin(time * 2.1) * 0.06 : 0)
    })
    ;[[rig.parts.legLeft, -1], [rig.parts.legRight, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(0, 0, side * 0.02)
      if (knee) knee.rotation.set(0.05, 0, 0)
      if (ankle) ankle.rotation.set(-0.04, 0, 0)
    })
    rig.updateTail(time, 0.055, 1.1)
  }

function updateStretch(rig, time) {
    rig.root.scale.set(1, 1, 1)
    const sway = Math.sin(time * 1.1) * 0.025
    if (rig.parts.head) rig.parts.head.rotation.set(0.10, sway, 0)
    for (const [ear, side] of [[rig.parts.earLeft, -1], [rig.parts.earRight, 1]]) {
      if (ear) ear.rotation.set(-0.06, 0, side * 0.05)
    }
    ;[[rig.parts.armLeft, -1], [rig.parts.armRight, 1]].forEach(([arm, side]) => {
      if (!arm) return
      const { elbow, wrist } = rig.getJointsFor(arm)
      arm.rotation.set(-0.62, side * 0.04, side * 0.34)
      if (elbow) elbow.rotation.set(0.18, 0, -side * 0.05)
      if (wrist) wrist.rotation.set(-0.18, 0, side * 0.04)
    })
    ;[[rig.parts.legLeft, -1], [rig.parts.legRight, 1]].forEach(([leg, side]) => {
      if (!leg) return
      const { knee, ankle } = rig.getJointsFor(leg)
      leg.rotation.set(0.16, 0, side * 0.05)
      if (knee) knee.rotation.set(0.22, 0, 0)
      if (ankle) ankle.rotation.set(-0.16, 0, side * 0.03)
    })
    rig.updateTail(time, 0.04, 0.75)
  }

function updateWave(rig, time) {
    const wave = Math.sin(time * 5.2)
    const breathe = 1 + Math.sin(time * 1.5) * 0.009
    rig.root.scale.set(1.05 * breathe, 1.02 * breathe, breathe)
    if (rig.parts.head) rig.parts.head.rotation.set(0, -0.08, -0.035 + wave * 0.012)
    const left = rig.parts.armLeft
    if (left) {
      const { elbow, wrist } = rig.getJointsFor(left)
      left.rotation.set(0, 0, -0.08)
      if (elbow) elbow.rotation.set(0, 0, 0)
      if (wrist) wrist.rotation.set(0, 0, 0)
    }
    const right = rig.parts.armRight
    if (right) {
      const { elbow, wrist } = rig.getJointsFor(right)
      right.rotation.set(-0.10, 0, 1.72 + wave * 0.10)
      if (elbow) elbow.rotation.set(0.18, 0, -0.34)
      if (wrist) wrist.rotation.set(-0.06, 0, wave * 0.34)
    }
    for (const leg of [rig.parts.legLeft, rig.parts.legRight]) {
      const { knee, ankle } = rig.getJointsFor(leg)
      if (leg) leg.rotation.set(0, 0, 0)
      if (knee) knee.rotation.set(0, 0, 0)
      if (ankle) ankle.rotation.set(0, 0, 0)
    }
    rig.updateTail(time, 0.048, 1.35)
  }
