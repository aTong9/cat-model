import * as THREE from 'three'
import { POSE_CHANNELS, resolvePoseChannel } from './poseChannels.js'

export const ANIMATION_DOCUMENT_VERSION = 1
export const ANIMATION_INTERPOLATIONS = Object.freeze(['linear', 'step', 'smooth'])
export const ANIMATION_PROPERTIES = Object.freeze(['rotation', 'position', 'scale'])

const interpolationMode = {
  linear: THREE.InterpolateLinear,
  step: THREE.InterpolateDiscrete,
  smooth: THREE.InterpolateSmooth,
}

function finiteVector(value, fallback) {
  return Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every(Number.isFinite)
    ? value.slice(0, 3)
    : [...fallback]
}

export function createAnimationDocument({
  id = 'custom-animation', label = 'Custom Action', labelKey = null, duration = 1, loop = true,
  rootMotion = false, speed = 1, amplitude = 1, tracks = [], events = [],
} = {}) {
  const knownChannels = new Set(POSE_CHANNELS.map(channel => channel.id))
  const normalizedDuration = Math.max(0.01, Number(duration) || 1)
  const normalizedTracks = tracks
    .filter(track => knownChannels.has(track.channel) && ANIMATION_PROPERTIES.includes(track.property ?? 'rotation'))
    .map(track => {
      const property = track.property ?? 'rotation'
      const fallback = property === 'scale' ? [1, 1, 1] : [0, 0, 0]
      const keyframes = (track.keyframes ?? [])
        .map(frame => ({
          time: THREE.MathUtils.clamp(Number(frame.time) || 0, 0, normalizedDuration),
          value: finiteVector(frame.value, fallback),
        }))
        .sort((a, b) => a.time - b.time)
      return Object.freeze({
        channel: track.channel,
        property,
        interpolation: ANIMATION_INTERPOLATIONS.includes(track.interpolation) ? track.interpolation : 'linear',
        keyframes: Object.freeze(keyframes.map(frame => Object.freeze({ time: frame.time, value: Object.freeze(frame.value) }))),
      })
    })
  const normalizedEvents = events.map(event => Object.freeze({
    time: THREE.MathUtils.clamp(Number(event.time) || 0, 0, normalizedDuration),
    type: String(event.type || 'marker'),
    value: event.value ?? null,
  })).sort((a, b) => a.time - b.time)
  return Object.freeze({
    schemaVersion: ANIMATION_DOCUMENT_VERSION,
    id: String(id || 'custom-animation'),
    label: String(label || 'Custom Action'),
    labelKey: labelKey ? String(labelKey) : null,
    duration: normalizedDuration,
    loop: Boolean(loop),
    rootMotion: Boolean(rootMotion),
    parameters: Object.freeze({
      speed: Math.max(0.01, Number(speed) || 1),
      amplitude: Math.max(0, Number(amplitude) || 0),
    }),
    tracks: Object.freeze(normalizedTracks),
    events: Object.freeze(normalizedEvents),
  })
}

export function animationDocumentToClip(input, registry) {
  const document = createAnimationDocument(input)
  const tracks = []
  for (const definition of document.tracks) {
    const object = resolvePoseChannel(registry, definition.channel)
    if (!object?.name || !definition.keyframes.length) continue
    const times = definition.keyframes.map(frame => frame.time / document.parameters.speed)
    if (definition.property === 'rotation') {
      const values = definition.keyframes.flatMap(frame => {
        const scaled = frame.value.map(value => value * document.parameters.amplitude)
        return new THREE.Quaternion().setFromEuler(new THREE.Euler(...scaled)).toArray()
      })
      tracks.push(new THREE.QuaternionKeyframeTrack(
        `${object.name}.quaternion`, times, values, interpolationMode[definition.interpolation],
      ))
    } else {
      const values = definition.keyframes.flatMap(frame => definition.property === 'position'
        ? frame.value.map(value => value * document.parameters.amplitude)
        : frame.value)
      tracks.push(new THREE.VectorKeyframeTrack(
        `${object.name}.${definition.property}`, times, values, interpolationMode[definition.interpolation],
      ))
    }
  }
  const clip = new THREE.AnimationClip(document.id, document.duration / document.parameters.speed, tracks)
  clip.userData = {
    schemaVersion: document.schemaVersion,
    labelKey: document.labelKey,
    label: document.label,
    loop: document.loop,
    rootMotion: document.rootMotion,
    events: document.events.map(event => ({ ...event })),
  }
  return clip
}

function mirroredChannelId(channelId) {
  return channelId.includes('-left')
    ? channelId.replace('-left', '-right')
    : channelId.includes('-right') ? channelId.replace('-right', '-left') : channelId
}

export function mirrorAnimationDocument(input) {
  const document = createAnimationDocument(input)
  return createAnimationDocument({
    ...document,
    id: `${document.id}-mirrored`,
    label: `${document.label} (Mirror)`,
    tracks: document.tracks.map(track => ({
      ...track,
      channel: mirroredChannelId(track.channel),
      keyframes: track.keyframes.map(frame => ({
        time: frame.time,
        value: track.property === 'rotation'
          ? [-frame.value[0], frame.value[1], -frame.value[2]]
          : track.property === 'position'
            ? [-frame.value[0], frame.value[1], frame.value[2]]
            : frame.value,
      })),
    })),
  })
}

function sampleTrack(track, time) {
  if (!track?.keyframes?.length) return track?.property === 'scale' ? [1, 1, 1] : [0, 0, 0]
  const nextIndex = track.keyframes.findIndex(frame => frame.time >= time)
  if (nextIndex <= 0) return [...track.keyframes[Math.max(0, nextIndex)].value]
  if (nextIndex < 0) return [...track.keyframes.at(-1).value]
  const previous = track.keyframes[nextIndex - 1]
  const next = track.keyframes[nextIndex]
  const alpha = next.time === previous.time ? 0 : (time - previous.time) / (next.time - previous.time)
  return previous.value.map((value, index) => THREE.MathUtils.lerp(value, next.value[index], alpha))
}

export function blendAnimationDocuments(fromInput, toInput, weight = 0.5) {
  const from = createAnimationDocument(fromInput)
  const to = createAnimationDocument(toInput)
  const amount = THREE.MathUtils.clamp(Number(weight) || 0, 0, 1)
  const duration = Math.max(from.duration, to.duration)
  const keys = new Set([...from.tracks, ...to.tracks].map(track => `${track.channel}:${track.property}`))
  const find = (document, key) => document.tracks.find(track => `${track.channel}:${track.property}` === key)
  const tracks = [...keys].map(key => {
    const a = find(from, key)
    const b = find(to, key)
    const template = a ?? b
    const times = new Set([0, duration, ...(a?.keyframes.map(frame => frame.time) ?? []), ...(b?.keyframes.map(frame => frame.time) ?? [])])
    return {
      channel: template.channel,
      property: template.property,
      interpolation: 'linear',
      keyframes: [...times].sort((x, y) => x - y).map(time => {
        const left = sampleTrack(a, time)
        const right = sampleTrack(b, time)
        return { time, value: left.map((value, index) => THREE.MathUtils.lerp(value, right[index], amount)) }
      }),
    }
  })
  return createAnimationDocument({
    id: `${from.id}-${to.id}-blend`,
    label: `${from.label} / ${to.label}`,
    duration,
    loop: from.loop && to.loop,
    rootMotion: from.rootMotion || to.rootMotion,
    tracks,
    events: [...from.events, ...to.events],
  })
}

export function createAnimationTransition(fromPose, toPose, { id = 'pose-transition', label = 'Pose Transition', duration = 0.25 } = {}) {
  const resolvedLabel = String(label || 'Pose Transition')
  const channels = new Set([...Object.keys(fromPose?.channels ?? {}), ...Object.keys(toPose?.channels ?? {})])
  return createAnimationDocument({
    id, label: resolvedLabel, labelKey: 'animation.transition', duration, loop: false,
    tracks: [...channels].flatMap(channel => {
      const from = fromPose.channels?.[channel]
      const to = toPose.channels?.[channel]
      return ['rotation', 'position', 'scale'].flatMap(property => {
        if (!from?.[property] && !to?.[property]) return []
        const fallback = property === 'scale' ? [1, 1, 1] : [0, 0, 0]
        return [{ channel, property, keyframes: [
          { time: 0, value: from?.[property] ?? fallback },
          { time: duration, value: to?.[property] ?? fallback },
        ] }]
      })
    }),
  })
}
