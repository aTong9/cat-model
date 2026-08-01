import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getAdjacentToken, getTokenById } from '../data/tokenCatalog.js'
import { createCatTraits, MORPHOLOGY_DEFINITIONS } from '../core/catTraits.js'
import { MORPHOLOGY_PARAMETER_REGISTRY } from '../core/characterParameterRegistry.js'
import { generateCatTraits } from '../core/generateCatTraits.js'
import { generateCatIdentity } from '../core/generateCatIdentity.js'
import { EditorHistory } from '../core/EditorHistory.js'
import {
  BACKGROUND_TRAITS,
  DEFAULT_TRAITS,
  EYE_STYLES,
  EYE_STYLE_OPTIONS,
  FACE_EXPRESSIONS,
  FACE_EXPRESSION_OPTIONS,
  FUR_TRAITS,
  GEAR_TRAITS,
  PRESET_CATS,
  SPECIAL_TRAITS,
  createRng,
  getFurTrait,
} from '../config/traits.js'
import { POSE_CONFIGS } from '../config/poses.js'
import { POSE_CHANNELS, createPoseDocument, upsertPoseKeyframe } from '../character/animation/poseAuthoring.js'
import { createEquipmentAnimationDocument, upsertEquipmentKeyframe } from '../character/equipment/equipmentAnimation.js'
import { EMOJI_ACTION_IDS } from '../config/emojiActions.js'
import { DEFAULT_ACTION_PARAMETERS, normalizeActionParameters } from '../character/animation/actionParameters.js'
import { normalizeLocale, SUPPORT_LOCALES } from '../i18n/index.js'

export const FUR_PRESETS = FUR_TRAITS
export { EYE_STYLES, FACE_EXPRESSIONS, PRESET_CATS, EYE_STYLE_OPTIONS, FACE_EXPRESSION_OPTIONS }
export const GEAR_LIST = GEAR_TRAITS
export const BACKGROUNDS = BACKGROUND_TRAITS
export const SPECIALS = SPECIAL_TRAITS
export const ACTIONS = POSE_CONFIGS
export const MORPHOLOGY_CONTROLS = MORPHOLOGY_PARAMETER_REGISTRY
export const DEFAULT_TOKEN_ID = 9038
export const MORPHOLOGY_PRESETS = Object.freeze([
  { id: 'pack5', label: 'Pack5 标准', labelKey: 'panel.morphologyPresets.pack5', values: { bodyScale: 1, bodyWidth: 1, bodyHeight: 1, bodyDepth: 1, headScale: 1, earScale: 1, legLength: 1, tailLength: 1, tailCurl: 0 } },
  { id: 'classic', label: '经典长身', labelKey: 'panel.morphologyPresets.classic', values: { bodyScale: .96, bodyWidth: .90, bodyHeight: 1.10, bodyDepth: 1.05, headScale: .96, earScale: 1, legLength: 1.08, tailLength: 1, tailCurl: 0 } },
  { id: 'kitten', label: '幼猫', labelKey: 'panel.morphologyPresets.kitten', values: { bodyScale: .86, bodyWidth: .92, bodyHeight: .88, bodyDepth: .9, headScale: 1.2, earScale: 1.12, legLength: .88, tailLength: .9, tailCurl: .12 } },
  { id: 'chubby', label: '圆滚滚', labelKey: 'panel.morphologyPresets.chubby', values: { bodyScale: 1.18, bodyWidth: 1.2, bodyHeight: .9, bodyDepth: 1.18, headScale: 1.08, earScale: .9, legLength: .84, tailLength: .92, tailCurl: .2 } },
  { id: 'tall', label: '高挑', labelKey: 'panel.morphologyPresets.tall', values: { bodyScale: .92, bodyWidth: .86, bodyHeight: 1.16, bodyDepth: .92, headScale: .9, earScale: 1.08, legLength: 1.24, tailLength: 1.18, tailCurl: -.05 } },
  { id: 'big-head', label: '大头萌', labelKey: 'panel.morphologyPresets.big-head', values: { bodyScale: .94, bodyWidth: 1.04, bodyHeight: .9, bodyDepth: 1, headScale: 1.25, earScale: 1.04, legLength: .92, tailLength: .9, tailCurl: .18 } },
  { id: 'wild', label: '野性', labelKey: 'panel.morphologyPresets.wild', values: { bodyScale: 1.04, bodyWidth: .92, bodyHeight: 1.08, bodyDepth: .96, headScale: .94, earScale: 1.32, legLength: 1.14, tailLength: 1.38, tailCurl: -.35 } },
  { id: 'compact', label: '短腿', labelKey: 'panel.morphologyPresets.compact', values: { bodyScale: 1.08, bodyWidth: 1.12, bodyHeight: .82, bodyDepth: 1.08, headScale: 1.08, earScale: .92, legLength: .8, tailLength: 1.04, tailCurl: .35 } },
  { id: 'elegant', label: '优雅', labelKey: 'panel.morphologyPresets.elegant', values: { bodyScale: .88, bodyWidth: .86, bodyHeight: 1.08, bodyDepth: .88, headScale: .92, earScale: 1.14, legLength: 1.18, tailLength: 1.32, tailCurl: .62 } },
].map(preset => Object.freeze({
  ...preset,
  values: Object.freeze({
    ...Object.fromEntries(Object.entries(MORPHOLOGY_DEFINITIONS).map(([key, definition]) => [key, definition.default])),
    ...preset.values,
  }),
})))

const WEATHERS = ['sunny', 'cloudy', 'thunder', 'rain']
const STORAGE_KEYS = Object.freeze({
  language: 'liberty-cat-language',
  theme: 'liberty-cat-theme',
})

function readStorageString(key, fallback, allowed = null) {
  try {
    const value = window?.localStorage?.getItem?.(key)
    if (value == null) return fallback
    if (allowed && !allowed.includes(value)) return fallback
    return value
  } catch {
    return fallback
  }
}

function writeStorageString(key, value) {
  try {
    window?.localStorage?.setItem?.(key, String(value))
  } catch {}
}

export const useCatStore = defineStore('cat', () => {
  const defaultFur = getFurTrait(DEFAULT_TRAITS.fur)
  const furStyle = ref(defaultFur.id)
  const furColor = ref(defaultFur.color)
  const eyeStyle = ref(DEFAULT_TRAITS.eyes)
  const gearType = ref(DEFAULT_TRAITS.gear)
  const faceExpression = ref(DEFAULT_TRAITS.face)
  const background = ref(DEFAULT_TRAITS.background)
  const special = ref(DEFAULT_TRAITS.special)
  const tokenId = ref(DEFAULT_TOKEN_ID)
  const seed = ref(Date.now())
  const activePreset = ref(null)
  const actionMode = ref('standing')
  const actionParameters = ref(Object.fromEntries(EMOJI_ACTION_IDS.map(id => [id, { ...DEFAULT_ACTION_PARAMETERS }])))
  const poseAuthoringEnabled = ref(false)
  const selectedPoseChannel = ref('head')
  const poseCursor = ref(0)
  const customPose = ref(Object.fromEntries(POSE_CHANNELS.map(channel => [channel.id, [0, 0, 0]])))
  const poseDocument = ref(createPoseDocument())
  const equipmentAuthoringEnabled = ref(false)
  const selectedEquipmentId = ref(null)
  const equipmentAnimation = ref('Semantic')
  const equipmentCursor = ref(0)
  const equipmentTransform = ref({ position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] })
  const equipmentPoseDocument = ref(createEquipmentAnimationDocument())
  const qualityMode = ref('auto')
  const stageStyle = ref('minimal')
  const stageScale = ref(1)
  const stageHeight = ref(0)
  const stageTextureUrl = ref(null)
  const morphology = ref(Object.fromEntries(Object.entries(MORPHOLOGY_DEFINITIONS).map(([key, value]) => [key, value.default])))
  const morphologyLocks = ref(Object.fromEntries(Object.keys(MORPHOLOGY_DEFINITIONS).map(key => [key, false])))
  const identity = ref({ name: '', personality: [], occupation: '', theme: '', story: '', catchphrase: '' })

  const weather = ref('sunny')
  const lightIntensity = ref(1)
  const rainAmount = ref(.5)
  const cloudAmount = ref(.5)
  const fishAmount = ref(0)
  const musicOn = ref(false)
  const language = ref(readStorageString(STORAGE_KEYS.language, 'zh', SUPPORT_LOCALES))
  const theme = ref(readStorageString(STORAGE_KEYS.theme, 'midnight', ['midnight', 'dark']))
  const loading = ref(true)
  const loadingProgress = ref(0)
  const panelExpanded = ref(true)
  const workspaceMode = ref('create')
  const showHints = ref(true)
  const tokenLoading = ref(false)
  const referenceImage = ref(null)
  const referenceImageFallback = ref(null)
  const referenceImageSource = ref('unavailable')
  const comparisonOpen = ref(false)
  const tokenErrorMessage = ref({ key: '', values: null })

  const isSpecialFullScene = computed(() => SPECIALS.find(item => item.id === special.value)?.fullScene ?? false)
  const currentTraits = computed(() => createCatTraits({
    tokenId: tokenId.value, fur: furStyle.value, furColor: furColor.value,
    eyes: eyeStyle.value, face: faceExpression.value, gear: gearType.value,
    background: background.value, special: special.value, morphology: morphology.value, identity: identity.value,
  }))
  const historyVersion = ref(0)
  const editorHistory = new EditorHistory(currentTraits.value)
  const canUndo = computed(() => { historyVersion.value; return editorHistory.canUndo })
  const canRedo = computed(() => { historyVersion.value; return editorHistory.canRedo })
  function recordEditorState() { editorHistory.push(currentTraits.value); historyVersion.value++ }
  function resetEditorHistory() { editorHistory.reset(currentTraits.value); historyVersion.value++ }
  function restoreEditorState(snapshot) {
    if (!snapshot) return false
    const fur = getFurTrait(snapshot.fur)
    furStyle.value = fur.id; furColor.value = snapshot.furColor
    eyeStyle.value = snapshot.eyes; faceExpression.value = snapshot.face; gearType.value = snapshot.gear
    background.value = snapshot.background; special.value = snapshot.special
    morphology.value = { ...snapshot.morphology }; identity.value = { ...snapshot.identity, personality: [...snapshot.identity.personality] }
    tokenId.value = Number(snapshot.tokenId || tokenId.value); historyVersion.value++
    return true
  }
  const undo = () => restoreEditorState(editorHistory.undo())
  const redo = () => restoreEditorState(editorHistory.redo())
  function setIdentity(key, value) {
    identity.value = { ...identity.value, [key]: key === 'personality' ? String(value).split(/[，,]/).map(item => item.trim()).filter(Boolean).slice(0, 5) : String(value ?? '') }
    recordEditorState()
  }
  function generateIdentity() { identity.value = { ...generateCatIdentity(currentTraits.value, seed.value, { locale: language.value }) }; recordEditorState() }
  function applyTraits(input, { record = true } = {}) {
    const traits = createCatTraits(input)
    const fur = getFurTrait(traits.fur)
    furStyle.value = fur.id; furColor.value = traits.furColor
    eyeStyle.value = traits.eyes; faceExpression.value = traits.face; gearType.value = traits.gear
    background.value = traits.background; special.value = traits.special
    morphology.value = { ...traits.morphology }
    identity.value = { ...traits.identity, personality: [...traits.identity.personality] }
    tokenId.value = Number(traits.tokenId || 1); seed.value = traits.seed
    activePreset.value = null; referenceImage.value = null; referenceImageFallback.value = null
    if (record) recordEditorState()
    else resetEditorHistory()
    return traits
  }

  function setMorphology(key, value) {
    const definition = MORPHOLOGY_DEFINITIONS[key]
    if (!definition) return
    const numeric = Number(value)
    morphology.value[key] = Number.isFinite(numeric) ? Math.min(definition.max, Math.max(definition.min, numeric)) : definition.default
    activePreset.value = null
    recordEditorState()
  }

  function resetMorphology() {
    for (const [key, definition] of Object.entries(MORPHOLOGY_DEFINITIONS)) morphology.value[key] = definition.default
  }
  function applyMorphologyPreset(values) {
    for (const [key, value] of Object.entries(values ?? {})) {
      const definition = MORPHOLOGY_DEFINITIONS[key]
      if (definition) morphology.value[key] = Math.min(definition.max, Math.max(definition.min, Number(value)))
    }
    activePreset.value = null
    recordEditorState()
  }

  function toggleMorphologyLock(key) {
    if (Object.hasOwn(morphologyLocks.value, key)) morphologyLocks.value[key] = !morphologyLocks.value[key]
  }

  function setFurStyle(id) {
    const trait = getFurTrait(id)
    furStyle.value = trait.id
    furColor.value = trait.color
    activePreset.value = null
    referenceImage.value = null
    recordEditorState()
  }

  function setCustomFurColor(color) {
    furStyle.value = 'Custom'
    furColor.value = color
    activePreset.value = null
    referenceImage.value = null
    recordEditorState()
  }

  function setBackground(value) {
    background.value = value
    if (value) special.value = null
    activePreset.value = null
    recordEditorState()
  }

  function setSpecial(value) {
    special.value = value
    if (value) background.value = null
    else if (!background.value) background.value = DEFAULT_TRAITS.background
    activePreset.value = null
    recordEditorState()
  }

  function applyGeneratedTraits(value, rng = createRng(value)) {
    const generated = generateCatTraits(value, {
      base: currentTraits.value,
      locks: { morphology: morphologyLocks.value },
    })
    const fur = getFurTrait(generated.fur)
    furStyle.value = fur.id; furColor.value = fur.color
    eyeStyle.value = generated.eyes; faceExpression.value = generated.face
    gearType.value = generated.gear; special.value = generated.special; background.value = generated.background
    weather.value = generated.special === 'Thunderous Might' ? 'thunder' : WEATHERS[Math.floor(rng() * WEATHERS.length)]
    for (const [key, value] of Object.entries(generated.morphology)) if (!morphologyLocks.value[key]) setMorphology(key, value)
  }

  function randomize() {
    activePreset.value = null
    seed.value = Math.floor(Math.random() * 0xffffffff)
    applyGeneratedTraits(seed.value)
    tokenId.value = (seed.value % 9901) + 1
    referenceImage.value = null
    referenceImageFallback.value = null
  }

  function setFromSeed(value) {
    const normalized = Number(value) >>> 0
    seed.value = normalized
    activePreset.value = null
    applyGeneratedTraits(normalized)
    tokenId.value = normalized || 1
    referenceImage.value = null
    referenceImageFallback.value = null
  }

  async function loadToken(value) {
    const requested = String(value ?? '').trim()
    if (!/^\d+$/.test(requested)) {
      tokenErrorMessage.value = { key: 'panel.loadError', values: null }
      return false
    }
    tokenLoading.value = true
    tokenErrorMessage.value = { key: '', values: null }
    try {
      const token = await getTokenById(requested)
      if (!token) {
        tokenErrorMessage.value = requested === '4768'
          ? { key: 'panel.tokenExcluded', values: { tokenId: requested } }
          : { key: 'panel.tokenNotFound', values: { tokenId: requested } }
        return false
      }
      const fur = getFurTrait(token.fur || DEFAULT_TRAITS.fur)
      tokenId.value = token.tokenId
      seed.value = Number(token.tokenId)
      activePreset.value = Number(token.tokenId)
      furStyle.value = fur.id
      furColor.value = fur.color
      eyeStyle.value = token.eyes || DEFAULT_TRAITS.eyes
      faceExpression.value = token.face || DEFAULT_TRAITS.face
      gearType.value = token.gear
      background.value = token.background
      special.value = token.special
      weather.value = token.special === 'Thunderous Might' ? 'thunder' : 'sunny'
      referenceImage.value = token.imageUrl
      referenceImageFallback.value = token.fallbackImageUrl
      referenceImageSource.value = token.imageSource
      resetMorphology()
      resetEditorHistory()
      return true
    } catch (error) {
      console.warn(error)
      tokenErrorMessage.value = { key: 'panel.tokenLoadFailed', values: null }
      return false
    } finally {
      tokenLoading.value = false
    }
  }

  async function loadAdjacent(direction) {
    const token = await getAdjacentToken(tokenId.value, direction)
    return loadToken(token.tokenId)
  }

  const cycleWeather = () => { weather.value = WEATHERS[(WEATHERS.indexOf(weather.value) + 1) % WEATHERS.length] }
  const togglePanel = () => { panelExpanded.value = !panelExpanded.value }
  function setWorkspaceMode(mode) {
    workspaceMode.value = mode === 'verify' ? 'verify' : 'create'
    if (workspaceMode.value === 'verify' && referenceImage.value) comparisonOpen.value = true
  }
  const setLanguage = lang => {
    const normalized = normalizeLocale(lang)
    language.value = normalized
    writeStorageString(STORAGE_KEYS.language, normalized)
  }
  const setTheme = mode => {
    const normalized = mode === 'dark' ? 'dark' : 'midnight'
    theme.value = normalized
    writeStorageString(STORAGE_KEYS.theme, normalized)
  }
  function setPoseRotation(channelId, axis, value) {
    if (!customPose.value[channelId] || !['x', 'y', 'z'].includes(axis)) return
    const index = { x: 0, y: 1, z: 2 }[axis]
    const next = [...customPose.value[channelId]]
    next[index] = Math.min(Math.PI, Math.max(-Math.PI, Number(value) || 0))
    customPose.value = { ...customPose.value, [channelId]: next }
  }
  function setActionParameter(actionId, key, value) {
    if (!EMOJI_ACTION_IDS.includes(actionId) || !(key in DEFAULT_ACTION_PARAMETERS)) return
    actionParameters.value = {
      ...actionParameters.value,
      [actionId]: normalizeActionParameters({ ...actionParameters.value[actionId], [key]: value }),
    }
  }
  function resetActionParameters(actionId) {
    if (!EMOJI_ACTION_IDS.includes(actionId)) return
    actionParameters.value = { ...actionParameters.value, [actionId]: { ...DEFAULT_ACTION_PARAMETERS } }
  }
  function setPoseChannelRotation(channelId, rotation) {
    if (!customPose.value[channelId] || !Array.isArray(rotation)) return
    customPose.value = { ...customPose.value, [channelId]: rotation.slice(0, 3).map(value => Number(value) || 0) }
  }
  function addPoseKeyframe() { poseDocument.value = upsertPoseKeyframe(poseDocument.value, poseCursor.value, customPose.value) }
  function resetCustomPose() { customPose.value = Object.fromEntries(POSE_CHANNELS.map(channel => [channel.id, [0, 0, 0]])) }
  function setEquipmentTransform(transform) {
    equipmentTransform.value = {
      position: [...(transform?.position ?? [0, 0, 0])],
      rotation: [...(transform?.rotation ?? [0, 0, 0])],
      scale: [...(transform?.scale ?? [1, 1, 1])],
    }
  }
  function setEquipmentRotation(axis, value) {
    const index = { x: 0, y: 1, z: 2 }[axis]
    if (index == null) return
    const rotation = [...equipmentTransform.value.rotation]
    rotation[index] = Math.min(Math.PI, Math.max(-Math.PI, Number(value) || 0))
    setEquipmentTransform({ ...equipmentTransform.value, rotation })
  }
  function addEquipmentKeyframe() {
    equipmentPoseDocument.value = upsertEquipmentKeyframe(equipmentPoseDocument.value, equipmentCursor.value, equipmentTransform.value)
  }
  function setStageTexture(file) {
    if (stageTextureUrl.value?.startsWith?.('blob:')) URL.revokeObjectURL(stageTextureUrl.value)
    stageTextureUrl.value = file ? URL.createObjectURL(file) : null
  }

  function applyPreset(preset) {
    activePreset.value = preset.tokenId
    tokenId.value = preset.tokenId
    seed.value = preset.tokenId
    const fur = getFurTrait(preset.fur || DEFAULT_TRAITS.fur)
    furStyle.value = fur.id
    furColor.value = fur.color
    eyeStyle.value = preset.eyes || DEFAULT_TRAITS.eyes
    faceExpression.value = preset.face || DEFAULT_TRAITS.face
    gearType.value = preset.gear ?? null
    special.value = preset.special ?? null
    background.value = special.value ? null : (preset.background ?? DEFAULT_TRAITS.background)
    weather.value = preset.weather ?? 'sunny'
    referenceImage.value = null
    referenceImageFallback.value = null
    resetMorphology()
  }

  return {
    furStyle, furColor, eyeStyle, gearType, faceExpression, background, special, actionMode, actionParameters, poseAuthoringEnabled, selectedPoseChannel, poseCursor, customPose, poseDocument, equipmentAuthoringEnabled, selectedEquipmentId, equipmentAnimation, equipmentCursor, equipmentTransform, equipmentPoseDocument, qualityMode, stageStyle, stageScale, stageHeight, stageTextureUrl, morphology, morphologyLocks, identity,
    tokenId, seed, activePreset, weather, lightIntensity, rainAmount, cloudAmount,
    fishAmount, musicOn, language, loading, loadingProgress, panelExpanded, workspaceMode, showHints,
    tokenLoading, tokenError: tokenErrorMessage, referenceImage, referenceImageFallback, referenceImageSource, comparisonOpen,
    isSpecialFullScene, currentTraits, canUndo, canRedo, undo, redo, setIdentity, generateIdentity, applyTraits, randomize, setFromSeed, cycleWeather, togglePanel, setWorkspaceMode, setLanguage, theme, setTheme,
    applyPreset, setFurStyle, setCustomFurColor, setBackground, setSpecial, setStageTexture, setActionParameter, resetActionParameters, setPoseRotation, setPoseChannelRotation, addPoseKeyframe, resetCustomPose, setEquipmentTransform, setEquipmentRotation, addEquipmentKeyframe, setMorphology, resetMorphology, applyMorphologyPreset, toggleMorphologyLock, loadToken, loadAdjacent,
  }
})
