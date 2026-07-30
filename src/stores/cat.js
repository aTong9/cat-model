import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getAdjacentToken, getTokenById } from '../data/tokenCatalog.js'
import { createCatTraits, MORPHOLOGY_DEFINITIONS } from '../core/catTraits.js'
import { generateCatTraits } from '../core/generateCatTraits.js'
import { generateCatIdentity } from '../core/generateCatIdentity.js'
import { EditorHistory } from '../core/EditorHistory.js'
import {
  BACKGROUND_TRAITS,
  DEFAULT_TRAITS,
  EYE_STYLES,
  FACE_EXPRESSIONS,
  FUR_TRAITS,
  GEAR_TRAITS,
  PRESET_CATS,
  SPECIAL_TRAITS,
  createRng,
  getFurTrait,
} from '../config/traits.js'
import { POSE_CONFIGS } from '../config/poses.js'

export const FUR_PRESETS = FUR_TRAITS
export { EYE_STYLES, FACE_EXPRESSIONS, PRESET_CATS }
export const GEAR_LIST = GEAR_TRAITS
export const BACKGROUNDS = BACKGROUND_TRAITS
export const SPECIALS = SPECIAL_TRAITS
export const ACTIONS = POSE_CONFIGS
export const MORPHOLOGY_CONTROLS = Object.freeze([
  { key: 'bodyScale', label: '身体胖瘦', ...MORPHOLOGY_DEFINITIONS.bodyScale },
  { key: 'headScale', label: '头部比例', ...MORPHOLOGY_DEFINITIONS.headScale },
  { key: 'earScale', label: '耳朵大小', ...MORPHOLOGY_DEFINITIONS.earScale },
  { key: 'legLength', label: '腿部长度', ...MORPHOLOGY_DEFINITIONS.legLength },
  { key: 'tailLength', label: '尾巴长度', ...MORPHOLOGY_DEFINITIONS.tailLength },
  { key: 'tailCurl', label: '尾巴卷曲', ...MORPHOLOGY_DEFINITIONS.tailCurl },
])
export const MORPHOLOGY_PRESETS = Object.freeze([
  { id: 'classic', label: '经典', values: { bodyScale: 1, headScale: 1, earScale: 1, legLength: 1, tailLength: 1, tailCurl: 0 } },
  { id: 'kitten', label: '幼猫', values: { bodyScale: .86, headScale: 1.2, earScale: 1.12, legLength: .88, tailLength: .9, tailCurl: .12 } },
  { id: 'chubby', label: '圆滚滚', values: { bodyScale: 1.24, headScale: 1.08, earScale: .9, legLength: .84, tailLength: .92, tailCurl: .2 } },
  { id: 'tall', label: '高挑', values: { bodyScale: .92, headScale: .9, earScale: 1.08, legLength: 1.24, tailLength: 1.18, tailCurl: -.05 } },
  { id: 'big-head', label: '大头萌', values: { bodyScale: .94, headScale: 1.25, earScale: 1.04, legLength: .92, tailLength: .9, tailCurl: .18 } },
  { id: 'wild', label: '野性', values: { bodyScale: 1.08, headScale: .94, earScale: 1.32, legLength: 1.14, tailLength: 1.38, tailCurl: -.35 } },
  { id: 'compact', label: '短腿', values: { bodyScale: 1.12, headScale: 1.08, earScale: .92, legLength: .8, tailLength: 1.04, tailCurl: .35 } },
  { id: 'elegant', label: '优雅', values: { bodyScale: .88, headScale: .92, earScale: 1.14, legLength: 1.18, tailLength: 1.32, tailCurl: .62 } },
].map(preset => Object.freeze({ ...preset, values: Object.freeze(preset.values) })))

const WEATHERS = ['sunny', 'cloudy', 'thunder', 'rain']

export const useCatStore = defineStore('cat', () => {
  const defaultFur = getFurTrait(DEFAULT_TRAITS.fur)
  const furStyle = ref(defaultFur.id)
  const furColor = ref(defaultFur.color)
  const eyeStyle = ref(DEFAULT_TRAITS.eyes)
  const gearType = ref(DEFAULT_TRAITS.gear)
  const faceExpression = ref(DEFAULT_TRAITS.face)
  const background = ref(DEFAULT_TRAITS.background)
  const special = ref(DEFAULT_TRAITS.special)
  const tokenId = ref(1)
  const seed = ref(Date.now())
  const activePreset = ref(null)
  const actionMode = ref('standing')
  const qualityMode = ref('auto')
  const morphology = ref(Object.fromEntries(Object.entries(MORPHOLOGY_DEFINITIONS).map(([key, value]) => [key, value.default])))
  const morphologyLocks = ref(Object.fromEntries(Object.keys(MORPHOLOGY_DEFINITIONS).map(key => [key, false])))
  const identity = ref({ name: '', personality: [], occupation: '', theme: '', story: '', catchphrase: '' })

  const weather = ref('sunny')
  const lightIntensity = ref(1)
  const rainAmount = ref(.5)
  const cloudAmount = ref(.5)
  const fishAmount = ref(0)
  const musicOn = ref(false)
  const language = ref('zh')
  const loading = ref(true)
  const loadingProgress = ref(0)
  const panelExpanded = ref(true)
  const workspaceMode = ref('create')
  const showHints = ref(true)
  const tokenLoading = ref(false)
  const tokenError = ref('')
  const referenceImage = ref(null)
  const referenceImageFallback = ref(null)
  const referenceImageSource = ref('unavailable')
  const comparisonOpen = ref(false)

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
  function generateIdentity() { identity.value = { ...generateCatIdentity(currentTraits.value, seed.value) }; recordEditorState() }
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
      tokenError.value = '请输入有效的 token ID'
      return false
    }
    tokenLoading.value = true
    tokenError.value = ''
    try {
      const token = await getTokenById(requested)
      if (!token) {
        tokenError.value = requested === '4768' ? '#4768 已从项目范围排除' : `未找到 #${requested}`
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
      return true
    } catch (error) {
      console.warn(error)
      tokenError.value = 'Token 数据加载失败'
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
  const setLanguage = lang => { language.value = lang }

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
    furStyle, furColor, eyeStyle, gearType, faceExpression, background, special, actionMode, qualityMode, morphology, morphologyLocks, identity,
    tokenId, seed, activePreset, weather, lightIntensity, rainAmount, cloudAmount,
    fishAmount, musicOn, language, loading, loadingProgress, panelExpanded, workspaceMode, showHints,
    tokenLoading, tokenError, referenceImage, referenceImageFallback, referenceImageSource, comparisonOpen,
    isSpecialFullScene, currentTraits, canUndo, canRedo, undo, redo, setIdentity, generateIdentity, applyTraits, randomize, setFromSeed, cycleWeather, togglePanel, setWorkspaceMode, setLanguage,
    applyPreset, setFurStyle, setCustomFurColor, setBackground, setSpecial, setMorphology, resetMorphology, applyMorphologyPreset, toggleMorphologyLock, loadToken, loadAdjacent,
  }
})
