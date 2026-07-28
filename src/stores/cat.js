import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
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

export const FUR_PRESETS = FUR_TRAITS
export { EYE_STYLES, FACE_EXPRESSIONS, PRESET_CATS }
export const GEAR_LIST = GEAR_TRAITS
export const BACKGROUNDS = BACKGROUND_TRAITS
export const SPECIALS = SPECIAL_TRAITS
export const ACTIONS = [
  { id: 'idle', label: '默认' },
  { id: 'run', label: '跑步' },
  { id: 'flex', label: '秀肌肉' },
]

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
  const actionMode = ref('idle')

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

  const isSpecialFullScene = computed(() => SPECIALS.find(item => item.id === special.value)?.fullScene ?? false)

  function setFurStyle(id) {
    const trait = getFurTrait(id)
    furStyle.value = trait.id
    furColor.value = trait.color
    activePreset.value = null
  }

  function setCustomFurColor(color) {
    furStyle.value = 'Custom'
    furColor.value = color
    activePreset.value = null
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
  }

  function setFromSeed(value) {
    const normalized = Number(value) >>> 0
    seed.value = normalized
    activePreset.value = null
    applyGeneratedTraits(normalized)
    tokenId.value = normalized || 1
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
  }

  return {
    furStyle, furColor, eyeStyle, gearType, faceExpression, background, special, actionMode,
    tokenId, seed, activePreset, weather, lightIntensity, rainAmount, cloudAmount,
    fishAmount, musicOn, language, loading, loadingProgress, panelExpanded, showHints,
    isSpecialFullScene, randomize, setFromSeed, cycleWeather, togglePanel, setLanguage,
    applyPreset, setFurStyle, setCustomFurColor, setBackground, setSpecial,
  }
})
