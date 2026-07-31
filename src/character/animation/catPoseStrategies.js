export function createCatPoseStrategies(rig) {
  const strategies = {
    'run': time => updateRun(rig, time),
    'flex': time => updateFlex(rig, time),
    'crouch': time => updateCrouch(rig, time),
    'sit': time => updateSit(rig, time),
    'jump': time => updateJump(rig, time),
    'curious': time => updateCurious(rig, time),
    'stretch': time => updateStretch(rig, time),
    'wave': time => updateWave(rig, time),
  }
  for (const id of EMOJI_POSE_IDS) strategies[id] = time => updateEmojiPose(rig, id, time)
  return strategies
}

export const EMOJI_POSE_IDS = Object.freeze([
  'emoji-abs', 'emoji-jump-rope', 'emoji-dumbbells', 'emoji-pull-up',
  'emoji-bench-press', 'emoji-hula-hoop', 'emoji-boxing', 'emoji-so-cute',
  'emoji-yoga', 'emoji-foodie', 'emoji-backflip', 'emoji-snowboarding',
  'emoji-snow-fight', 'emoji-snowball', 'emoji-so-cold', 'emoji-so-comfy',
])

function setLimb(rig, partId, root = [0, 0, 0], middle = [0, 0, 0], end = [0, 0, 0]) {
  const part = rig.parts[partId === 'arm-left' ? 'armLeft' : partId === 'arm-right' ? 'armRight' : partId === 'leg-left' ? 'legLeft' : 'legRight']
  if (part) part.rotation.set(...root)
  const joints = rig.getJointsFor(part)
  const mid = joints.elbow ?? joints.knee
  const tip = joints.wrist ?? joints.ankle
  if (mid) mid.rotation.set(...middle)
  if (tip) tip.rotation.set(...end)
}

function updateEmojiPose(rig, id, time) {
  const s = Math.sin(time * 4.2)
  const fast = Math.sin(time * 8.4)
  rig.root.scale.set(1, 1, 1)
  if (rig.parts.head) rig.parts.head.rotation.set(0, 0, 0)
  const arms = (left, right = left) => {
    setLimb(rig, 'arm-left', left[0], left[1], left[2])
    setLimb(rig, 'arm-right', right[0], right[1], right[2])
  }
  const legs = (left, right = left) => {
    setLimb(rig, 'leg-left', left[0], left[1], left[2])
    setLimb(rig, 'leg-right', right[0], right[1], right[2])
  }
  if (id === 'emoji-abs') {
    rig.root.scale.set(1.03, .96 + Math.abs(s) * .04, 1.02)
    arms([[-.15,0,-.85],[.35,0,-.45],[-.1,0,0]], [[-.15,0,.85],[.35,0,.45],[-.1,0,0]])
    legs([[-.2,0,-.08],[.55,0,0],[-.25,0,0]], [[-.2,0,.08],[.55,0,0],[-.25,0,0]])
  } else if (id === 'emoji-jump-rope') {
    rig.root.scale.set(1, 1 + Math.abs(fast) * .035, 1)
    arms([[.05,0,-.28],[.16,0,-.12],[0,0,s*.35]], [[.05,0,.28],[.16,0,.12],[0,0,-s*.35]])
    legs([[-.12,0,0],[.25,0,0],[-.16,0,0]])
  } else if (id === 'emoji-dumbbells') {
    arms([[0,0,-.5],[.18,0,-.75-s*.18],[0,0,-.1]], [[0,0,.5],[.18,0,.75+s*.18],[0,0,.1]])
    legs([[0,0,-.04],[.08,0,0],[-.05,0,0]], [[0,0,.04],[.08,0,0],[-.05,0,0]])
  } else if (id === 'emoji-pull-up') {
    arms([[-.2,0,-1.5],[.15,0,-.25],[0,0,0]], [[-.2,0,1.5],[.15,0,.25],[0,0,0]])
    legs([[-.35,0,-.08],[.72+Math.abs(s)*.15,0,0],[-.35,0,0]], [[-.35,0,.08],[.72+Math.abs(s)*.15,0,0],[-.35,0,0]])
  } else if (id === 'emoji-bench-press') {
    if (rig.parts.head) rig.parts.head.rotation.x = .18
    arms([[-.45,0,-.75],[.1,0,-.55+s*.25],[0,0,0]], [[-.45,0,.75],[.1,0,.55-s*.25],[0,0,0]])
    legs([[-.2,0,-.1],[.45,0,0],[-.2,0,0]], [[-.2,0,.1],[.45,0,0],[-.2,0,0]])
  } else if (id === 'emoji-hula-hoop') {
    rig.root.scale.set(1.02+s*.025, .99, 1.02-s*.02)
    if (rig.parts.head) rig.parts.head.rotation.z = -s*.07
    arms([[0,0,-.7],[.2,0,-.2],[0,0,0]], [[0,0,.7],[.2,0,.2],[0,0,0]])
    legs([[0,0,-.08+s*.08],[.1,0,0]], [[0,0,.08+s*.08],[.1,0,0]])
  } else if (id === 'emoji-boxing') {
    const punch = Math.max(0, s)
    arms([[-.35-punch*.35,0,-.55],[.4-punch*.3,0,-.35],[0,0,0]], [[-.35-(1-punch)*.35,0,.55],[.4-(1-punch)*.3,0,.35],[0,0,0]])
    legs([[0,0,-.12],[.18,0,0]], [[0,0,.12],[.18,0,0]])
  } else if (id === 'emoji-so-cute') {
    if (rig.parts.head) rig.parts.head.rotation.set(-.05, 0, -.2+s*.025)
    arms([[-.2,0,-1.05],[.5,0,-.5],[0,0,-.15]], [[-.2,0,1.05],[.5,0,.5],[0,0,.15]])
    legs([[0,0,-.04],[.08,0,0]], [[0,0,.04],[.08,0,0]])
  } else if (id === 'emoji-yoga') {
    if (rig.parts.head) rig.parts.head.rotation.z = s*.025
    arms([[-.15,0,-1.42],[.12,0,-.15]], [[-.15,0,1.42],[.12,0,.15]])
    legs([[0,0,-.04],[.05,0,0]], [[-.45,0,.55],[1.0,0,.22],[-.45,0,0]])
  } else if (id === 'emoji-foodie') {
    if (rig.parts.head) rig.parts.head.rotation.x = .06+s*.035
    arms([[0,0,-.12],[.15,0,-.1]], [[-.25,0,.75],[.55,0,.45],[-.15,0,.1]])
    legs([[0,0,-.04],[.08,0,0]], [[0,0,.04],[.08,0,0]])
  } else if (id === 'emoji-backflip') {
    const tuck = (s + 1) * .5
    rig.root.scale.set(1.02-tuck*.05, .98+tuck*.08, 1)
    if (rig.parts.head) rig.parts.head.rotation.x = -.25+s*.18
    arms([[-.25,0,-.75],[.45,0,-.25]], [[-.25,0,.75],[.45,0,.25]])
    legs([[-.45,0,-.12],[.85+tuck*.2,0,0],[-.4,0,0]], [[-.45,0,.12],[.85+tuck*.2,0,0],[-.4,0,0]])
  } else if (id === 'emoji-snowboarding') {
    if (rig.parts.head) rig.parts.head.rotation.z = -s*.08
    arms([[0,0,-.75+s*.08],[.15,0,-.1]], [[0,0,.75+s*.08],[.15,0,.1]])
    legs([[-.25,0,-.16],[.62,0,0],[-.32,0,0]], [[-.25,0,.16],[.62,0,0],[-.32,0,0]])
  } else if (id === 'emoji-snow-fight') {
    if (rig.parts.head) rig.parts.head.rotation.y = -.12
    arms([[0,0,-.35],[.25,0,-.2]], [[-.35,0,.65+s*.55],[.35,0,.25],[0,0,s*.15]])
    legs([[0,0,-.1],[.15,0,0]], [[0,0,.1],[.15,0,0]])
  } else if (id === 'emoji-snowball') {
    if (rig.parts.head) rig.parts.head.rotation.x = .08
    arms([[-.25,0,-.65],[.5,0,-.42+s*.08],[0,0,-s*.18]], [[-.25,0,.65],[.5,0,.42-s*.08],[0,0,s*.18]])
    legs([[-.1,0,-.05],[.3,0,0]], [[-.1,0,.05],[.3,0,0]])
  } else if (id === 'emoji-so-cold') {
    if (rig.parts.head) rig.parts.head.rotation.z = fast*.035
    arms([[-.15,0,-.55+fast*.04],[.58,0,-.42],[0,0,0]], [[-.15,0,.55+fast*.04],[.58,0,.42],[0,0,0]])
    legs([[0,0,-.03+fast*.025],[.12,0,0]], [[0,0,.03+fast*.025],[.12,0,0]])
  } else {
    rig.root.scale.set(1.04, .91+Math.sin(time*1.5)*.008, 1.03)
    if (rig.parts.head) rig.parts.head.rotation.set(.09, 0, s*.02)
    arms([[.08,0,-.18],[.28,0,-.08]], [[.08,0,.18],[.28,0,.08]])
    legs([[-.35,0,-.18],[.82,0,0],[-.4,0,0]], [[-.35,0,.18],[.82,0,0],[-.4,0,0]])
  }
  rig.updateTail(time, id === 'emoji-so-cold' ? .025 : .05, id === 'emoji-so-cold' ? 7 : 1.4)
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
