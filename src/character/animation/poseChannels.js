const HAND_CHANNELS = ['thumb', 'index', 'middle', 'ring', 'little']
  .flatMap(joint => ['left', 'right'].flatMap(side => [
    {
      id: `arm-${side}/${joint}`,
      label: `${side === 'left' ? '左' : '右'}手${joint}`,
      part: `arm-${side}`,
      joint,
    },
    {
      id: `arm-${side}/${joint}-distal`,
      label: `${side === 'left' ? '左' : '右'}手${joint}末节`,
      part: `arm-${side}`,
      joint: `${joint}Distal`,
    },
  ]))

const FOOT_CHANNELS = ['toe1', 'toe2', 'toe3', 'toe4', 'toe5']
  .flatMap(joint => ['left', 'right'].map(side => ({
    id: `leg-${side}/${joint}`,
    label: `${side === 'left' ? '左' : '右'}脚${joint}`,
    part: `leg-${side}`,
    joint,
  })))

export const POSE_CHANNELS = Object.freeze([
  { id: 'motion-root', label: '角色根运动', part: 'motion-root' },
  { id: 'head', label: '头部', part: 'head' },
  { id: 'ear-left', label: '左耳', part: 'ear-left' },
  { id: 'ear-right', label: '右耳', part: 'ear-right' },
  { id: 'arm-left', label: '左臂', part: 'arm-left' },
  { id: 'arm-left/elbow', label: '左肘', part: 'arm-left', joint: 'elbow' },
  { id: 'arm-left/wrist', label: '左腕', part: 'arm-left', joint: 'wrist' },
  { id: 'arm-right', label: '右臂', part: 'arm-right' },
  { id: 'arm-right/elbow', label: '右肘', part: 'arm-right', joint: 'elbow' },
  { id: 'arm-right/wrist', label: '右腕', part: 'arm-right', joint: 'wrist' },
  { id: 'leg-left', label: '左腿', part: 'leg-left' },
  { id: 'leg-left/knee', label: '左膝', part: 'leg-left', joint: 'knee' },
  { id: 'leg-left/ankle', label: '左踝', part: 'leg-left', joint: 'ankle' },
  { id: 'leg-right', label: '右腿', part: 'leg-right' },
  { id: 'leg-right/knee', label: '右膝', part: 'leg-right', joint: 'knee' },
  { id: 'leg-right/ankle', label: '右踝', part: 'leg-right', joint: 'ankle' },
  { id: 'face/eye-left', label: '左眼视线', part: 'face', joint: 'eyeLeft' },
  { id: 'face/eye-right', label: '右眼视线', part: 'face', joint: 'eyeRight' },
  { id: 'face/eyelid-left', label: '左眼睑', part: 'face', joint: 'eyelidLeft' },
  { id: 'face/eyelid-right', label: '右眼睑', part: 'face', joint: 'eyelidRight' },
  { id: 'face/brow-left', label: '左眉', part: 'face', joint: 'browLeft' },
  { id: 'face/brow-right', label: '右眉', part: 'face', joint: 'browRight' },
  { id: 'face/jaw', label: '下巴', part: 'face', joint: 'jaw' },
  ...HAND_CHANNELS,
  ...FOOT_CHANNELS,
])

export function resolvePoseChannel(registry, channelId) {
  const channel = POSE_CHANNELS.find(item => item.id === channelId)
  if (!channel) return null
  return channel.joint ? registry.getJoints(channel.part)[channel.joint] ?? null : registry.getPart(channel.part)
}
