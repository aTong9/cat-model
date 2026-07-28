export const FUR_TRAITS = [
  { id: 'Black', label: '午夜黑', color: '#53515b', accent: '#29272f', pattern: 'solid' },
  { id: 'Blue Lightning Tabby', label: '蓝闪电虎斑', color: '#59647f', accent: '#75dff2', pattern: 'lightning-tabby' },
  { id: 'Calico', label: '三花', color: '#f5f1e8', accent: '#f0aa52', pattern: 'calico' },
  { id: 'Golden', label: '招财金', color: '#f4dc7a', accent: '#d5ae35', pattern: 'solid' },
  { id: 'Gray', label: '太空灰', color: '#9999a2', accent: '#696973', pattern: 'solid' },
  { id: 'Leopard Patterned', label: '豹纹', color: '#efc66f', accent: '#705a34', pattern: 'leopard' },
  { id: 'Orange', label: '焦糖橙', color: '#f5cda4', accent: '#d98242', pattern: 'solid' },
  { id: 'Tuxedo', label: '燕尾服', color: '#62635f', accent: '#2b2c2a', pattern: 'tuxedo' },
]

export const EYE_STYLES = ['Original', 'Relaxed', 'Alert', 'Blue Ring', 'Sunglasses', 'VR', 'Big Black']
export const FACE_EXPRESSIONS = ['Excited', 'Smile', 'Whistling', 'Wow', 'Yum']

export const GEAR_TRAITS = [
  { id: 'Baseball Cap', label: '棒球帽' },
  { id: 'Camera', label: '相机' },
  { id: 'Gold Round Glasses', label: '金框眼镜' },
  { id: 'Good Luck Gold Bar', label: '大吉金条' },
  { id: 'Hiking Backpack', label: '登山背包' },
  { id: 'Hot Coffee', label: '热咖啡' },
  { id: 'Investment Book', label: '投资书' },
  { id: 'Ramen', label: '拉面' },
  { id: 'Sake', label: '清酒' },
  { id: 'Wealth Gold Bar', label: '招财金条' },
]

export const BACKGROUND_TRAITS = [
  'Blue Gradient',
  'Green Gradient',
  'Green To Blue Gradient',
  'Orange Gradient',
  'Pink To Orange Gradient',
  'Purple Gradient',
  'Red To Pink Gradient',
  'Yellow To Green Gradient',
]

export const SPECIAL_TRAITS = [
  { id: 'Fitness Guru', label: '健身搭档', fullScene: false },
  { id: 'Galactic Voyage', label: '星际漫游', fullScene: true },
  { id: 'Golden General', label: '黄金守护', fullScene: true },
  { id: 'Onsen journey', label: '温泉假日', fullScene: false },
  { id: 'Realm of Mt.Fuji', label: '富士幻境', fullScene: false },
  { id: 'Thunderous Might', label: '雷霆能量', fullScene: false },
  { id: 'Time Traveler', label: '时空旅人', fullScene: true },
]

export const PRESET_CATS = [
  { tokenId: 2, eyes: 'Relaxed', face: 'Smile', fur: 'Black', gear: 'Wealth Gold Bar', background: 'Green To Blue Gradient' },
  { tokenId: 3, eyes: 'Alert', face: 'Wow', fur: 'Orange', gear: 'Investment Book', background: 'Blue Gradient' },
  { tokenId: 4, eyes: 'Original', face: 'Yum', fur: 'Gray', gear: 'Gold Round Glasses', background: 'Yellow To Green Gradient' },
  { tokenId: 6, eyes: 'VR', face: 'Whistling', fur: 'Blue Lightning Tabby', gear: 'Good Luck Gold Bar', background: 'Pink To Orange Gradient' },
  { tokenId: 8, eyes: 'Blue Ring', face: 'Excited', fur: 'Tuxedo', gear: 'Hot Coffee', background: 'Red To Pink Gradient' },
  { tokenId: 10, eyes: 'Alert', face: 'Excited', fur: 'Leopard Patterned', gear: 'Investment Book', background: 'Green Gradient' },
  { tokenId: 11, eyes: 'Sunglasses', face: 'Excited', fur: 'Tuxedo', gear: 'Camera', special: 'Thunderous Might', weather: 'thunder' },
  { tokenId: 26, eyes: 'Alert', face: 'Yum', fur: 'Orange', gear: 'Baseball Cap', background: 'Purple Gradient' },
  { tokenId: 32, eyes: 'Sunglasses', face: 'Excited', fur: 'Black', gear: 'Sake', background: 'Orange Gradient' },
  { tokenId: 414, eyes: 'Blue Ring', face: 'Wow', fur: 'Calico', gear: 'Ramen', special: 'Realm of Mt.Fuji' },
  { tokenId: 3000, special: 'Galactic Voyage' },
  { tokenId: 3001, eyes: 'VR', face: 'Smile', fur: 'Gray', special: 'Onsen journey' },
  { tokenId: 9033, special: 'Golden General' },
  { tokenId: 9038, eyes: 'Relaxed', face: 'Smile', fur: 'Tuxedo', gear: 'Hiking Backpack', special: 'Time Traveler' },
  { tokenId: 9066, eyes: 'Original', face: 'Smile', fur: 'Golden', special: 'Fitness Guru' },
]

export const DEFAULT_TRAITS = {
  fur: 'Golden',
  eyes: 'Original',
  face: 'Excited',
  gear: null,
  background: 'Blue Gradient',
  special: null,
}

export function getFurTrait(id) {
  return FUR_TRAITS.find(item => item.id === id) || FUR_TRAITS.find(item => item.id === DEFAULT_TRAITS.fur)
}

export function createRng(seed) {
  let state = Number(seed) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
