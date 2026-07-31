export const POSE_CONFIGS = Object.freeze([
  Object.freeze({ id: 'standing', label: '站立', labelKey: 'pose.standing', description: '自然下垂，轻微呼吸', descriptionKey: 'pose.standingDesc' }),
  Object.freeze({ id: 'sit', label: '端坐', labelKey: 'pose.sit', description: '屈膝坐稳，双爪自然垂下', descriptionKey: 'pose.sitDesc' }),
  Object.freeze({ id: 'run', label: '跑步', labelKey: 'pose.run', description: '四肢交替摆动', descriptionKey: 'pose.runDesc' }),
  Object.freeze({ id: 'jump', label: '跳跃', labelKey: 'pose.jump', description: '收腿并抬起双臂', descriptionKey: 'pose.jumpDesc' }),
  Object.freeze({ id: 'curious', label: '好奇', labelKey: 'pose.curious', description: '歪头观察，轻轻抬起一只爪', descriptionKey: 'pose.curiousDesc' }),
  Object.freeze({ id: 'stretch', label: '伸懒腰', labelKey: 'pose.stretch', description: '双爪前伸，舒展四肢', descriptionKey: 'pose.stretchDesc' }),
  Object.freeze({ id: 'wave', label: '招手', labelKey: 'pose.wave', description: '站立并挥动右手', descriptionKey: 'pose.waveDesc' }),
])

export const POSE_IDS = Object.freeze(POSE_CONFIGS.map(pose => pose.id))

export function normalizePoseId(value) {
  if (value === 'idle') return 'standing'
  return POSE_IDS.includes(value) ? value : 'standing'
}

export function getNextPoseId(current) {
  const index = POSE_IDS.indexOf(normalizePoseId(current))
  return POSE_IDS[(index + 1) % POSE_IDS.length]
}
