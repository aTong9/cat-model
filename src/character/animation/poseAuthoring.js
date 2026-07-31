import * as THREE from 'three'
import { ANIMATION_DOCUMENT_VERSION, animationDocumentToClip } from './animationDocument.js'
import { POSE_CHANNELS, resolvePoseChannel } from './poseChannels.js'

export { POSE_CHANNELS, resolvePoseChannel } from './poseChannels.js'

export const POSE_DOCUMENT_VERSION = 1
export const STATIC_POSE_DOCUMENT_VERSION = 1
export const POSE_CHANNEL_LIMITS = Object.freeze({
  rotation: Object.freeze([-Math.PI, Math.PI]),
  position: Object.freeze([-5, 5]),
  scale: Object.freeze([0.1, 4]),
})
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

function finiteVector(value, [min, max], fallback = [0, 0, 0]) {
  return Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every(Number.isFinite)
    ? value.slice(0, 3).map(component => THREE.MathUtils.clamp(component, min, max))
    : [...fallback]
}

function normalizePoseTransform(value) {
  const source = Array.isArray(value) ? { rotation: value } : value ?? {}
  return Object.freeze({
    rotation: Object.freeze(finiteVector(source.rotation, POSE_CHANNEL_LIMITS.rotation)),
    position: Array.isArray(source.position) ? Object.freeze(finiteVector(source.position, POSE_CHANNEL_LIMITS.position)) : null,
    scale: Array.isArray(source.scale) ? Object.freeze(finiteVector(source.scale, POSE_CHANNEL_LIMITS.scale, [1, 1, 1])) : null,
  })
}

export function createStaticPoseDocument({ id = 'custom-pose', label = '自定义姿势', channels = {} } = {}) {
  const known = new Set(POSE_CHANNELS.map(channel => channel.id))
  return Object.freeze({
    schemaVersion: STATIC_POSE_DOCUMENT_VERSION,
    id: String(id || 'custom-pose'),
    label: String(label || '自定义姿势'),
    channels: Object.freeze(Object.fromEntries(Object.entries(channels)
      .filter(([channelId]) => known.has(channelId))
      .map(([channelId, transform]) => [channelId, normalizePoseTransform(transform)]))),
  })
}

export function captureStaticPoseDocument(registry, options = {}) {
  return createStaticPoseDocument({ ...options, channels: Object.fromEntries(POSE_CHANNELS.map(channel => {
    const object = resolvePoseChannel(registry, channel.id)
    return [channel.id, object ? {
      rotation: object.rotation.toArray().slice(0, 3),
      position: object.position.toArray(),
      scale: object.scale.toArray(),
    } : {}]
  })) })
}

export function applyStaticPoseDocument(registry, document) {
  for (const [channelId, transform] of Object.entries(createStaticPoseDocument(document).channels)) {
    const object = resolvePoseChannel(registry, channelId)
    if (!object) continue
    object.rotation.set(...transform.rotation)
    if (transform.position) object.position.set(...transform.position)
    if (transform.scale) object.scale.set(...transform.scale)
  }
}

export function mirrorStaticPoseDocument(document) {
  const source = createStaticPoseDocument(document)
  const channels = {}
  for (const [channelId, transform] of Object.entries(source.channels)) {
    const mirroredId = channelId.includes('-left')
      ? channelId.replace('-left', '-right')
      : channelId.includes('-right') ? channelId.replace('-right', '-left') : channelId
    channels[mirroredId] = {
      rotation: [-transform.rotation[0], transform.rotation[1], -transform.rotation[2]],
      position: transform.position ? [-transform.position[0], transform.position[1], transform.position[2]] : null,
      scale: transform.scale,
    }
  }
  return createStaticPoseDocument({ id: `${source.id}-mirrored`, label: `${source.label}（镜像）`, channels })
}

export function blendStaticPoseDocuments(from, to, alpha = 0.5) {
  const left = createStaticPoseDocument(from)
  const right = createStaticPoseDocument(to)
  const amount = THREE.MathUtils.clamp(Number(alpha) || 0, 0, 1)
  const channelIds = new Set([...Object.keys(left.channels), ...Object.keys(right.channels)])
  const channels = Object.fromEntries([...channelIds].map(channelId => {
    const a = left.channels[channelId] ?? normalizePoseTransform({})
    const b = right.channels[channelId] ?? normalizePoseTransform({})
    const lerp = (from, to) => from.map((value, index) => THREE.MathUtils.lerp(value, to[index], amount))
    return [channelId, {
      rotation: lerp(a.rotation, b.rotation),
      position: a.position || b.position ? lerp(a.position ?? [0, 0, 0], b.position ?? [0, 0, 0]) : null,
      scale: a.scale || b.scale ? lerp(a.scale ?? [1, 1, 1], b.scale ?? [1, 1, 1]) : null,
    }]
  }))
  return createStaticPoseDocument({ id: `${left.id}-${right.id}-blend`, label: `${left.label} / ${right.label}`, channels })
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
    if (document?.schemaVersion === ANIMATION_DOCUMENT_VERSION && document?.tracks?.length) clips.push(animationDocumentToClip(document, model.registry))
    else if (document?.keyframes?.length) clips.push(poseDocumentToClip(document, model.registry))
  }
  model.setAnimation(previousMode)
  model.update(0)
  return clips
}
