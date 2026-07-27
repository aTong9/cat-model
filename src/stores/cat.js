import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const FUR_PRESETS = [
  { label: '招财黄', color: '#f4c430' }, { label: '蜜糖黄', color: '#e6ae27' },
  { label: '奶油白', color: '#f5f0dc' }, { label: '焦糖橙', color: '#e98b3a' },
  { label: '太空灰', color: '#657080' }, { label: '午夜黑', color: '#282634' },
]
export const EYE_STYLES = ['VR', 'Original', 'Relaxed', 'Alert', 'Blue Ring', 'Sunglasses', 'Big Black']
export const FACE_EXPRESSIONS = ['Excited', 'Smile', 'Wow', 'Yum', 'Whistling']
export const GEAR_LIST = [
  { id: 'Baseball Cap', label: '棒球帽' }, { id: 'Camera', label: '相机' }, { id: 'Gold Round Glasses', label: '金框眼镜' },
  { id: 'Good Luck Gold Bar', label: '大吉金条' }, { id: 'Hiking Backpack', label: '登山背包' }, { id: 'Hot Coffee', label: '热咖啡' },
  { id: 'Investment Book', label: '投资书' }, { id: 'Ramen', label: '拉面' }, { id: 'Sake', label: '清酒' }, { id: 'Wealth Gold Bar', label: '招财金条' },
]
export const BACKGROUNDS = ['Blue Gradient', 'Green Gradient', 'Green To Blue Gradient', 'Orange Gradient', 'Pink To Orange Gradient', 'Purple Gradient', 'Red To Pink Gradient', 'Yellow To Green Gradient']
export const SPECIALS = [
  { id: 'Fitness Guru', label: '健身搭档', fullScene: false }, { id: 'Galactic Voyage', label: '星际漫游', fullScene: true },
  { id: 'Golden General', label: '黄金守护', fullScene: true }, { id: 'Onsen journey', label: '温泉假日', fullScene: false },
  { id: 'Realm of Mt.Fuji', label: '富士幻境', fullScene: false }, { id: 'Thunderous Might', label: '雷霆能量', fullScene: false }, { id: 'Time Traveler', label: '时空旅人', fullScene: false },
]
const WEATHERS = ['sunny', 'cloudy', 'thunder', 'rain']
export const PRESET_CATS = [
  { tokenId: 2, eyes: 'Relaxed', face: 'Smile', fur: '#3f3d48', gear: 'Wealth Gold Bar', background: 'Green To Blue Gradient' },
  { tokenId: 3, eyes: 'Alert', face: 'Wow', fur: '#f4bd84', gear: 'Investment Book', background: 'Blue Gradient' },
  { tokenId: 4, eyes: 'Original', face: 'Yum', fur: '#97979f', gear: 'Gold Round Glasses', background: 'Yellow To Green Gradient' },
  { tokenId: 6, eyes: 'VR', face: 'Whistling', fur: '#57627d', gear: 'Good Luck Gold Bar', background: 'Pink To Orange Gradient' },
  { tokenId: 8, eyes: 'Blue Ring', face: 'Excited', fur: '#41413d', gear: 'Hot Coffee', background: 'Red To Pink Gradient' },
  { tokenId: 10, eyes: 'Alert', face: 'Excited', fur: '#d8ae60', gear: 'Investment Book', background: 'Green Gradient' },
  { tokenId: 11, eyes: 'Sunglasses', face: 'Excited', fur: '#41413d', gear: 'Camera', special: 'Thunderous Might', weather: 'thunder' },
  { tokenId: 26, eyes: 'Alert', face: 'Yum', fur: '#f4bd84', gear: 'Baseball Cap', background: 'Purple Gradient' },
  { tokenId: 32, eyes: 'Sunglasses', face: 'Excited', fur: '#3f3d48', gear: 'Sake', background: 'Orange Gradient' },
  { tokenId: 414, eyes: 'Blue Ring', face: 'Wow', fur: '#dfb26c', gear: 'Ramen', special: 'Realm of Mt.Fuji' },
  { tokenId: 3000, special: 'Galactic Voyage' },
  { tokenId: 3001, eyes: 'VR', face: 'Smile', fur: '#97979f', special: 'Onsen journey' },
  { tokenId: 9033, special: 'Golden General' },
  { tokenId: 9038, eyes: 'Relaxed', face: 'Smile', fur: '#41413d', gear: 'Hiking Backpack', special: 'Time Traveler' },
  { tokenId: 9066, eyes: 'Original', face: 'Smile', fur: '#f4d260', special: 'Fitness Guru' },
]

export const useCatStore = defineStore('cat', () => {
  const furColor = ref('#f4c430'), eyeStyle = ref('VR'), gearType = ref(null), faceExpression = ref('Excited'), background = ref('Blue Gradient'), special = ref(null), tokenId = ref(1), seed = ref(Date.now()), activePreset = ref(null)
  const weather = ref('sunny'), lightIntensity = ref(1), rainAmount = ref(.5), cloudAmount = ref(.5), fishAmount = ref(0), musicOn = ref(false), language = ref('zh')
  const loading = ref(true), loadingProgress = ref(0), panelExpanded = ref(false), showHints = ref(true)
  const isSpecialFullScene = computed(() => SPECIALS.find(item => item.id === special.value)?.fullScene ?? false)
  function randomize() {
    const pick = list => list[Math.floor(Math.random() * list.length)]
    activePreset.value = null; seed.value = Math.floor(Math.random() * 0xffffffff); furColor.value = pick(FUR_PRESETS).color; eyeStyle.value = pick(EYE_STYLES); faceExpression.value = pick(FACE_EXPRESSIONS); background.value = pick(BACKGROUNDS); gearType.value = Math.random() < .2 ? null : pick(GEAR_LIST).id; special.value = Math.random() < .08 ? pick(SPECIALS).id : null; weather.value = pick(WEATHERS); tokenId.value = Math.floor(Math.random() * 9999) + 1
  }
  function setFromSeed(value) { seed.value = value; let hash = value; const rnd = () => { hash = (hash * 1103515245 + 12345) & 0x7fffffff; return hash / 0x7fffffff }; const pick = list => list[Math.floor(rnd() * list.length)]; furColor.value = pick(FUR_PRESETS).color; eyeStyle.value = pick(EYE_STYLES); faceExpression.value = pick(FACE_EXPRESSIONS); background.value = pick(BACKGROUNDS); gearType.value = rnd() < .2 ? null : pick(GEAR_LIST).id; special.value = rnd() < .08 ? pick(SPECIALS).id : null; weather.value = pick(WEATHERS); tokenId.value = value }
  const cycleWeather = () => { weather.value = WEATHERS[(WEATHERS.indexOf(weather.value) + 1) % WEATHERS.length] }
  const togglePanel = () => { panelExpanded.value = !panelExpanded.value }
  const setLanguage = lang => { language.value = lang }
  function applyPreset(preset) { activePreset.value = preset.tokenId; tokenId.value = preset.tokenId; if (preset.eyes) eyeStyle.value = preset.eyes; if (preset.face) faceExpression.value = preset.face; if (preset.fur) furColor.value = preset.fur; gearType.value = preset.gear ?? null; background.value = preset.background ?? 'Blue Gradient'; special.value = preset.special ?? null; weather.value = preset.weather ?? 'sunny' }
  return { furColor, eyeStyle, gearType, faceExpression, background, special, tokenId, seed, activePreset, weather, lightIntensity, rainAmount, cloudAmount, fishAmount, musicOn, language, loading, loadingProgress, panelExpanded, showHints, isSpecialFullScene, randomize, setFromSeed, cycleWeather, togglePanel, setLanguage, applyPreset }
})
