import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getAdjacentToken, getTokenById } from '../data/tokenCatalog.js'
import { createCatTraits } from '../core/catTraits.js'
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
    background: background.value, special: special.value,
  }))

  function setFurStyle(id) {
    const trait = getFurTrait(id)
    furStyle.value = trait.id
    furColor.value = trait.color
    activePreset.value = null
    referenceImage.value = null
  }

  function setCustomFurColor(color) {
    furStyle.value = 'Custom'
    furColor.value = color
    activePreset.value = null
    referenceImage.value = null
  }

  function setBackground(value) {
    background.value = value
    if (value) special.value = null
    activePreset.value = null
  }

  function setSpecial(value) {
    special.value = value
    if (value) background.value = null
    else if (!background.value) background.value = DEFAULT_TRAITS.background
    activePreset.value = null
  }

  function applyGeneratedTraits(value, rng = createRng(value)) {
    const pick = list => list[Math.floor(rng() * list.length)]
    const fur = pick(FUR_PRESETS)
    furStyle.value = fur.id
    furColor.value = fur.color
    eyeStyle.value = pick(EYE_STYLES)
    faceExpression.value = pick(FACE_EXPRESSIONS)
    gearType.value = rng() < .2 ? null : pick(GEAR_LIST).id
    special.value = rng() < .08 ? pick(SPECIALS).id : null
    background.value = special.value ? null : pick(BACKGROUNDS)
    weather.value = pick(WEATHERS)
  }

  function randomize() {
    activePreset.value = null
    seed.value = Math.floor(Math.random() * 0xffffffff)
    applyGeneratedTraits(seed.value)
    tokenId.value = Math.floor(Math.random() * 9999) + 1
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
  }

  return {
    furStyle, furColor, eyeStyle, gearType, faceExpression, background, special, actionMode, qualityMode,
    tokenId, seed, activePreset, weather, lightIntensity, rainAmount, cloudAmount,
    fishAmount, musicOn, language, loading, loadingProgress, panelExpanded, showHints,
    tokenLoading, tokenError, referenceImage, referenceImageFallback, referenceImageSource, comparisonOpen,
    isSpecialFullScene, currentTraits, randomize, setFromSeed, cycleWeather, togglePanel, setLanguage,
    applyPreset, setFurStyle, setCustomFurColor, setBackground, setSpecial, loadToken, loadAdjacent,
  }
})
