export const POSE_CONFIGS = Object.freeze([
  Object.freeze({ id: 'standing', label: '站立', description: '自然下垂，轻微呼吸' }),
  Object.freeze({ id: 'sit', label: '端坐', description: '屈膝坐稳，双爪自然垂下' }),
  Object.freeze({ id: 'run', label: '跑步', description: '四肢交替摆动' }),
  Object.freeze({ id: 'jump', label: '跳跃', description: '收腿并抬起双臂' }),
  Object.freeze({ id: 'curious', label: '好奇', description: '歪头观察，轻轻抬起一只爪' }),
  Object.freeze({ id: 'stretch', label: '伸懒腰', description: '双爪前伸，舒展四肢' }),
  Object.freeze({ id: 'wave', label: '招手', description: '站立并挥动右手' }),
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
