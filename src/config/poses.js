export const POSE_CONFIGS = Object.freeze([
  Object.freeze({ id: 'standing', label: '站立', description: '自然下垂，轻微呼吸' }),
  Object.freeze({ id: 'sit-splay', label: '岔腿坐', description: '身体下沉，双腿向两侧展开' }),
  Object.freeze({ id: 'run', label: '跑步', description: '四肢交替摆动' }),
  Object.freeze({ id: 'jump', label: '跳跃', description: '收腿并抬起双臂' }),
  Object.freeze({ id: 'lie-down', label: '趴下', description: '身体贴地，四肢自然收拢' }),
  Object.freeze({ id: 'sleep', label: '睡觉', description: '蜷卧休息，缓慢呼吸' }),
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
