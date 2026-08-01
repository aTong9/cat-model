const sideLabelPrefix = {
  left: 'poseChannels.leftHand',
  right: 'poseChannels.rightHand',
}

const HAND_CHANNELS = ['thumb', 'index', 'middle', 'ring', 'little']
  .flatMap(joint => ['left', 'right'].flatMap(side => [
    {
      id: `arm-${side}/${joint}`,
      labelKey: `${sideLabelPrefix[side]}.${joint}`,
      part: `arm-${side}`,
      joint,
      label: `${side === 'left' ? '左' : '右'}手${joint}`,
    },
    {
      id: `arm-${side}/${joint}-distal`,
      labelKey: `${sideLabelPrefix[side]}.${joint}Distal`,
      part: `arm-${side}`,
      joint: `${joint}Distal`,
      label: `${side === 'left' ? '左' : '右'}手${joint}末节`,
    },
  ]))

const FOOT_CHANNELS = ['toe1', 'toe2', 'toe3', 'toe4', 'toe5']
  .flatMap(joint => ['left', 'right'].map(side => ({
    id: `leg-${side}/${joint}`,
    labelKey: `${side === 'left' ? 'poseChannels.leftLeg' : 'poseChannels.rightLeg'}.${joint}`,
    part: `leg-${side}`,
    joint,
    label: `${side === 'left' ? '左' : '右'}脚${joint}`,
  })))

export const POSE_CHANNELS = Object.freeze([
  { id: 'motion-root', labelKey: 'poseChannels.motionRoot', label: '角色根运动', part: 'motion-root' },
  { id: 'head', labelKey: 'poseChannels.head', label: '头部', part: 'head' },
  { id: 'ear-left', labelKey: 'poseChannels.earLeft', label: '左耳', part: 'ear-left' },
  { id: 'ear-right', labelKey: 'poseChannels.earRight', label: '右耳', part: 'ear-right' },
  { id: 'arm-left', labelKey: 'poseChannels.leftArm', label: '左臂', part: 'arm-left' },
  { id: 'arm-left/elbow', labelKey: 'poseChannels.leftElbow', label: '左肘', part: 'arm-left', joint: 'elbow' },
  { id: 'arm-left/wrist', labelKey: 'poseChannels.leftWrist', label: '左腕', part: 'arm-left', joint: 'wrist' },
  { id: 'arm-right', labelKey: 'poseChannels.rightArm', label: '右臂', part: 'arm-right' },
  { id: 'arm-right/elbow', labelKey: 'poseChannels.rightElbow', label: '右肘', part: 'arm-right', joint: 'elbow' },
  { id: 'arm-right/wrist', labelKey: 'poseChannels.rightWrist', label: '右腕', part: 'arm-right', joint: 'wrist' },
  { id: 'leg-left', labelKey: 'poseChannels.leftLeg', label: '左腿', part: 'leg-left' },
  { id: 'leg-left/knee', labelKey: 'poseChannels.leftKnee', label: '左膝', part: 'leg-left', joint: 'knee' },
  { id: 'leg-left/ankle', labelKey: 'poseChannels.leftAnkle', label: '左踝', part: 'leg-left', joint: 'ankle' },
  { id: 'leg-right', labelKey: 'poseChannels.rightLeg', label: '右腿', part: 'leg-right' },
  { id: 'leg-right/knee', labelKey: 'poseChannels.rightKnee', label: '右膝', part: 'leg-right', joint: 'knee' },
  { id: 'leg-right/ankle', labelKey: 'poseChannels.rightAnkle', label: '右踝', part: 'leg-right', joint: 'ankle' },
  { id: 'face/eye-left', labelKey: 'poseChannels.leftEyeAim', label: '左眼视线', part: 'face', joint: 'eyeLeft' },
  { id: 'face/eye-right', labelKey: 'poseChannels.rightEyeAim', label: '右眼视线', part: 'face', joint: 'eyeRight' },
  { id: 'face/eyelid-left', labelKey: 'poseChannels.leftEyelid', label: '左眼睑', part: 'face', joint: 'eyelidLeft' },
  { id: 'face/eyelid-right', labelKey: 'poseChannels.rightEyelid', label: '右眼睑', part: 'face', joint: 'eyelidRight' },
  { id: 'face/brow-left', labelKey: 'poseChannels.leftBrow', label: '左眉', part: 'face', joint: 'browLeft' },
  { id: 'face/brow-right', labelKey: 'poseChannels.rightBrow', label: '右眉', part: 'face', joint: 'browRight' },
  { id: 'face/jaw', labelKey: 'poseChannels.jaw', label: '下巴', part: 'face', joint: 'jaw' },
  ...HAND_CHANNELS,
  ...FOOT_CHANNELS,
])

export function resolvePoseChannel(registry, channelId) {
  const channel = POSE_CHANNELS.find(item => item.id === channelId)
  if (!channel) return null
  return channel.joint ? registry.getJoints(channel.part)[channel.joint] ?? null : registry.getPart(channel.part)
}
