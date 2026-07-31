import * as THREE from 'three'

export const POSE_DOCUMENT_VERSION = 1
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

export function createPoseDocument({ id = 'custom-action', label = '自定义动作', duration = 1.5, loop = true } = {}) {
  return { schemaVersion: POSE_DOCUMENT_VERSION, id, label, duration, loop, keyframes: [] }
}

export function capturePose(registry) {
  return Object.fromEntries(POSE_CHANNELS.map(channel => {
    const object = resolvePoseChannel(registry, channel.id)
    return [channel.id, object ? object.rotation.toArray().slice(0, 3) : [0, 0, 0]]
  }))
}

export function applyPose(registry, pose = {}) {
  for (const [channelId, rotation] of Object.entries(pose)) {
    const object = resolvePoseChannel(registry, channelId)
    if (object && Array.isArray(rotation)) object.rotation.set(...rotation.slice(0, 3))
  }
}

export function upsertPoseKeyframe(document, time, pose) {
  const normalized = THREE.MathUtils.clamp(Number(time) || 0, 0, Math.max(.1, Number(document.duration) || 1.5))
  const keyframe = { time: normalized, pose: structuredClone(pose) }
  const keyframes = document.keyframes.filter(item => Math.abs(item.time - normalized) > 0.0001)
  keyframes.push(keyframe)
  keyframes.sort((a, b) => a.time - b.time)
  return { ...document, keyframes }
}

export function reduceQuaternionTrack(track, tolerance = THREE.MathUtils.degToRad(.25)) {
  const count = track.times.length
  if (count <= 2 || !(tolerance > 0)) return track
  const keep = new Set([0, count - 1])
  const read = index => new THREE.Quaternion().fromArray(track.values, index * 4).normalize()

  function retainRange(start, end) {
    if (end - start <= 1) return
    const startTime = track.times[start]
    const duration = track.times[end] - startTime
    const startValue = read(start)
    const endValue = read(end)
    let worstIndex = -1
    let worstError = tolerance
    for (let index = start + 1; index < end; index++) {
      const alpha = duration > 0 ? (track.times[index] - startTime) / duration : 0
      const interpolated = startValue.clone().slerp(endValue, alpha)
      const error = interpolated.angleTo(read(index))
      if (error > worstError) {
        worstError = error
        worstIndex = index
      }
    }
    if (worstIndex >= 0) {
      keep.add(worstIndex)
      retainRange(start, worstIndex)
      retainRange(worstIndex, end)
    }
  }

  retainRange(0, count - 1)
  const indices = [...keep].sort((a, b) => a - b)
  const times = indices.map(index => track.times[index])
  const values = indices.flatMap(index => Array.from(track.values.slice(index * 4, index * 4 + 4)))
  return new THREE.QuaternionKeyframeTrack(track.name, times, values, track.getInterpolation())
}

export function poseDocumentToClip(document, registry, { rotationTolerance = THREE.MathUtils.degToRad(.25) } = {}) {
  const keyframes = [...document.keyframes].sort((a, b) => a.time - b.time)
  if (!keyframes.length) return new THREE.AnimationClip(document.id, document.duration, [])
  const tracks = []
  for (const channel of POSE_CHANNELS) {
    const object = resolvePoseChannel(registry, channel.id)
    if (!object?.name) continue
    const times = []
    const values = []
    for (const keyframe of keyframes) {
      const rotation = keyframe.pose[channel.id]
      if (!rotation) continue
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation))
      times.push(keyframe.time)
      values.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
    }
    if (times.length) {
      const track = new THREE.QuaternionKeyframeTrack(`${object.name}.quaternion`, times, values)
      tracks.push(reduceQuaternionTrack(track, rotationTolerance))
    }
  }
  const clip = new THREE.AnimationClip(document.id, document.duration, tracks)
  clip.userData = { schemaVersion: POSE_DOCUMENT_VERSION, label: document.label, loop: document.loop }
  return clip.optimize()
}

export const BUILTIN_EXPORT_ANIMATIONS = Object.freeze([
  { id: 'standing', name: 'Idle', duration: 2.0, loop: true },
  { id: 'run', name: 'Run', duration: .8, loop: true },
  { id: 'jump', name: 'Jump', duration: .7, loop: false },
  { id: 'wave', name: 'Wave', duration: 1.2, loop: true },
])

function captureObjectTransforms(root, time, samples) {
  root?.traverse(object => {
    if (!object.name) return
    if (!samples.has(object.name)) samples.set(object.name, { times: [], positions: [], rotations: [], scales: [] })
    const sample = samples.get(object.name)
    sample.times.push(time)
    sample.positions.push(...object.position.toArray())
    sample.rotations.push(...object.quaternion.toArray())
    sample.scales.push(...object.scale.toArray())
  })
}

function captureSingleObjectTransform(object, time, samples) {
  if (!object?.name) return
  if (!samples.has(object.name)) samples.set(object.name, { times: [], positions: [], rotations: [], scales: [] })
  const sample = samples.get(object.name)
  sample.times.push(time)
  sample.positions.push(...object.position.toArray())
  sample.rotations.push(...object.quaternion.toArray())
  sample.scales.push(...object.scale.toArray())
}

function appendObjectTransformTracks(clip, samples) {
  for (const [name, sample] of samples) {
    clip.tracks.push(
      new THREE.VectorKeyframeTrack(`${name}.position`, sample.times, sample.positions),
      new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, sample.times, sample.rotations),
      new THREE.VectorKeyframeTrack(`${name}.scale`, sample.times, sample.scales),
    )
  }
  return clip
}

function appendObjectScaleTracks(clip, samples) {
  for (const [name, sample] of samples) {
    clip.tracks.push(new THREE.VectorKeyframeTrack(`${name}.scale`, sample.times, sample.scales))
  }
  return clip
}

function appendObjectPositionTracks(clip, samples) {
  for (const [name, sample] of samples) {
    clip.tracks.push(new THREE.VectorKeyframeTrack(`${name}.position`, sample.times, sample.positions))
  }
  return clip
}

export function bakeProceduralAnimationClips(model, { fps = 30, include = BUILTIN_EXPORT_ANIMATIONS, customDocuments = [] } = {}) {
  const previousMode = model.animator.mode
  const clips = []
  for (const spec of include) {
    const document = createPoseDocument({ id: spec.name, label: spec.name, duration: spec.duration, loop: spec.loop })
    const frameCount = Math.max(2, Math.round(spec.duration * fps))
    const rootTimes = []
    const rootPositions = []
    const actionPropSamples = new Map()
    const faceTransformSamples = new Map()
    const partPositionSamples = new Map()
    for (let frame = 0; frame <= frameCount; frame++) {
      const time = frame / frameCount * spec.duration
      model.setAnimation(spec.id)
      model.update(time)
      document.keyframes.push({ time, pose: capturePose(model.registry) })
      const motionRoot = model.registry.getPart('motion-root')
      if (motionRoot) {
        rootTimes.push(time)
        rootPositions.push(...motionRoot.position.toArray())
      }
      captureObjectTransforms(model.actionProps?.props?.[spec.id], time, actionPropSamples)
      const faceJoints = model.registry.getJoints('face')
      captureObjectTransforms(faceJoints?.jaw, time, faceTransformSamples)
      captureObjectTransforms(faceJoints?.eyeLeft, time, faceTransformSamples)
      captureObjectTransforms(faceJoints?.eyeRight, time, faceTransformSamples)
      captureObjectTransforms(faceJoints?.actionEyeLeft, time, faceTransformSamples)
      captureObjectTransforms(faceJoints?.actionEyeRight, time, faceTransformSamples)
      captureObjectTransforms(faceJoints?.eyeStarLeft, time, faceTransformSamples)
      captureObjectTransforms(faceJoints?.eyeStarRight, time, faceTransformSamples)
      captureObjectTransforms(faceJoints?.browLeft, time, faceTransformSamples)
      captureObjectTransforms(faceJoints?.browRight, time, faceTransformSamples)
      captureObjectTransforms(faceJoints?.cheekLeft, time, faceTransformSamples)
      captureObjectTransforms(faceJoints?.cheekRight, time, faceTransformSamples)
      for (const partId of ['head', 'ear-left', 'ear-right', 'arm-left', 'arm-right', 'leg-left', 'leg-right']) {
        const part = model.registry.getPart(partId)
        captureSingleObjectTransform(part, time, partPositionSamples)
      }
    }
    const clip = poseDocumentToClip(document, model.registry)
    if (rootTimes.length) clip.tracks.push(new THREE.VectorKeyframeTrack('CharacterMotion.position', rootTimes, rootPositions))
    appendObjectScaleTracks(clip, faceTransformSamples)
    appendObjectPositionTracks(clip, partPositionSamples)
    clips.push(appendObjectTransformTracks(clip, actionPropSamples).optimize())
  }
  for (const document of customDocuments) {
    if (document?.keyframes?.length) clips.push(poseDocumentToClip(document, model.registry))
  }
  model.setAnimation(previousMode)
  model.update(0)
  return clips
}
