const defineNumber = ({ key, label, group, min, max, defaultValue = 1, step = 0.01, affects = [], update = 'transform' }) => Object.freeze({
  key,
  label,
  domain: 'morphology',
  type: 'number',
  group,
  min,
  max,
  step,
  default: defaultValue,
  affects: Object.freeze([...affects]),
  update,
  dependencies: Object.freeze([]),
})

export const MORPHOLOGY_PARAMETER_REGISTRY = Object.freeze([
  defineNumber({ key: 'bodyScale', label: '身体胖瘦', group: 'body', min: 0.8, max: 1.25, affects: ['body', 'arm-left', 'arm-right', 'tail'] }),
  defineNumber({ key: 'bodyWidth', label: '身体宽度', group: 'body', min: 0.78, max: 1.28, affects: ['morphology-root'] }),
  defineNumber({ key: 'bodyHeight', label: '身体高度', group: 'body', min: 0.78, max: 1.2, affects: ['morphology-root', 'floor-anchor'] }),
  defineNumber({ key: 'bodyDepth', label: '身体厚度', group: 'body', min: 0.8, max: 1.25, affects: ['morphology-root'] }),
  defineNumber({ key: 'headScale', label: '头部比例', group: 'head', min: 0.8, max: 1.25, affects: ['head'] }),
  defineNumber({ key: 'eyeScale', label: '眼睛大小', group: 'face', min: 0.8, max: 1.4, affects: ['eye-left', 'eye-right', 'eyelids', 'performance-eyes'] }),
  defineNumber({ key: 'eyeSpacing', label: '眼睛间距', group: 'face', min: 0.8, max: 1.25, affects: ['eye-left', 'eye-right', 'eyelids', 'brows'] }),
  defineNumber({ key: 'mouthScale', label: '嘴部大小', group: 'face', min: 0.8, max: 1.4, affects: ['mouth'] }),
  defineNumber({ key: 'earScale', label: '耳朵大小', group: 'ears', min: 0.7, max: 1.35, affects: ['ear-left', 'ear-right'] }),
  defineNumber({ key: 'earWidth', label: '耳朵宽度', group: 'ears', min: 0.75, max: 1.3, affects: ['ear-left', 'ear-right'] }),
  defineNumber({ key: 'earHeight', label: '耳朵高度', group: 'ears', min: 0.75, max: 1.3, affects: ['ear-left', 'ear-right'] }),
  defineNumber({ key: 'pawScale', label: '手掌比例', group: 'limbs', min: 0.75, max: 1.35, affects: ['paw-left', 'paw-right'] }),
  defineNumber({ key: 'footScale', label: '脚掌比例', group: 'limbs', min: 0.8, max: 1.35, affects: ['foot-left', 'foot-right'] }),
  defineNumber({ key: 'legLength', label: '腿部长度', group: 'limbs', min: 0.8, max: 1.25, affects: ['leg-left', 'leg-right'] }),
  defineNumber({ key: 'tailLength', label: '尾巴长度', group: 'tail', min: 0.7, max: 1.4, affects: ['tail'] }),
  defineNumber({ key: 'tailCurl', label: '尾巴卷曲', group: 'tail', min: -0.6, max: 0.8, defaultValue: 0, affects: ['tail-geometry'], update: 'geometry' }),
])

export const MORPHOLOGY_DEFINITIONS = Object.freeze(Object.fromEntries(
  MORPHOLOGY_PARAMETER_REGISTRY.map(({ key, min, max, default: defaultValue }) => [
    key,
    Object.freeze({ min, max, default: defaultValue }),
  ]),
))

const defineEnum = ({ key, label, domain, group, values, defaultValue = null, nullable = false, affects = [], conflicts = [] }) => Object.freeze({
  key,
  label,
  domain,
  type: 'enum',
  group,
  values: Object.freeze([...values]),
  default: defaultValue,
  nullable,
  affects: Object.freeze([...affects]),
  conflicts: Object.freeze([...conflicts]),
  update: domain === 'environment' ? 'scene' : 'assembly',
  dependencies: Object.freeze([]),
})

export const TRAIT_PARAMETER_REGISTRY = Object.freeze([
  defineEnum({ key: 'fur', label: '毛色', domain: 'appearance', group: 'fur', values: [...FUR_TRAITS.map(item => item.id), 'Custom'], defaultValue: DEFAULT_TRAITS.fur, affects: ['body-materials', 'limb-materials'] }),
  defineEnum({ key: 'eyes', label: '眼睛', domain: 'appearance', group: 'face', values: EYE_STYLES, defaultValue: DEFAULT_TRAITS.eyes, affects: ['face-eyes'] }),
  defineEnum({ key: 'face', label: '表情', domain: 'appearance', group: 'face', values: FACE_EXPRESSIONS, defaultValue: DEFAULT_TRAITS.face, affects: ['face-mouth'] }),
  defineEnum({ key: 'gear', label: '装备', domain: 'equipment', group: 'equipment', values: GEAR_TRAITS.map(item => item.id), nullable: true, affects: ['gear-root'], conflicts: ['eyes', 'special'] }),
  defineEnum({ key: 'background', label: '背景', domain: 'environment', group: 'scene', values: BACKGROUND_TRAITS, defaultValue: DEFAULT_TRAITS.background, nullable: true, affects: ['preview-environment'], conflicts: ['special'] }),
  defineEnum({ key: 'special', label: '特殊场景', domain: 'environment', group: 'scene', values: SPECIAL_TRAITS.map(item => item.id), nullable: true, affects: ['appearance', 'equipment', 'preview-environment', 'animation'], conflicts: ['background', 'gear'] }),
])

export const CHARACTER_PARAMETER_REGISTRY = Object.freeze([
  ...MORPHOLOGY_PARAMETER_REGISTRY,
  ...TRAIT_PARAMETER_REGISTRY,
  Object.freeze({ key: 'pose', label: '姿势', domain: 'pose', type: 'document', group: 'motion', default: null, affects: Object.freeze(['semantic-joints']), dependencies: Object.freeze(['character-contract']), update: 'pose' }),
  Object.freeze({ key: 'animation', label: '动作', domain: 'animation', type: 'document', group: 'motion', default: null, affects: Object.freeze(['semantic-joints', 'action-props']), dependencies: Object.freeze(['character-contract', 'pose']), update: 'animation' }),
])

export function getMorphologyDefaults() {
  return Object.fromEntries(MORPHOLOGY_PARAMETER_REGISTRY.map(parameter => [parameter.key, parameter.default]))
}

export function getMorphologyParameter(key) {
  return MORPHOLOGY_PARAMETER_REGISTRY.find(parameter => parameter.key === key) ?? null
}

export function normalizeMorphologyParameters(input = {}) {
  return Object.fromEntries(MORPHOLOGY_PARAMETER_REGISTRY.map(parameter => {
    const value = Number(input?.[parameter.key])
    const normalized = Number.isFinite(value)
      ? Math.min(parameter.max, Math.max(parameter.min, value))
      : parameter.default
    return [parameter.key, Math.round(normalized * 1000) / 1000]
  }))
}

export function diffMorphologyParameters(previous = {}, next = {}) {
  return Object.freeze(MORPHOLOGY_PARAMETER_REGISTRY
    .filter(parameter => previous?.[parameter.key] !== next?.[parameter.key])
    .map(parameter => Object.freeze({
      key: parameter.key,
      previous: previous?.[parameter.key],
      next: next?.[parameter.key],
      update: parameter.update,
      affects: parameter.affects,
    })))
}
import {
  BACKGROUND_TRAITS, DEFAULT_TRAITS, EYE_STYLES, FACE_EXPRESSIONS,
  FUR_TRAITS, GEAR_TRAITS, SPECIAL_TRAITS,
} from '../config/traits.js'
