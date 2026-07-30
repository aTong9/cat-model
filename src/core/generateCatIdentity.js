import { createRng } from '../config/traits.js'

const NAMES = ['Mochi', 'Pixel', 'Nova', 'Miso', 'Lucky', 'Nimbus', 'Taro', 'Luna']
const TRAITS = ['勇敢', '好奇', '温柔', '机敏', '乐观', '沉着', '顽皮', '可靠']
const JOBS = ['星际摄影师', '好运收藏家', '城市探险家', '拉面鉴赏家', '梦境向导', '山野守护者']
const pick = (rng, list) => list[Math.floor(rng() * list.length)]

export function generateCatIdentity(traits, seed = traits?.tokenId ?? 1) {
  const rng = createRng(seed)
  const name = pick(rng, NAMES)
  const personality = [pick(rng, TRAITS), pick(rng, TRAITS)].filter((value, index, list) => list.indexOf(value) === index)
  const occupation = pick(rng, JOBS)
  const theme = traits?.special || traits?.background || '自由都市'
  const signature = traits?.gear ? `随身带着${traits.gear}` : '相信轻装也能远行'
  return Object.freeze({
    name, personality, occupation, theme,
    story: `${name} 是一位${personality.join('又')}的${occupation}。在${theme}中，${signature}，并把每一次相遇收藏成新的故事。`,
    catchphrase: `今天也要保持${personality[0] || '好奇'}！`,
  })
}

export async function expandCatIdentity(identity, { provider } = {}) {
  if (provider == null) return Object.freeze({ ...identity, personality: [...(identity.personality ?? [])] })
  if (typeof provider !== 'function') throw new Error('Identity expansion provider must be a function')
  const expanded = await provider(Object.freeze({ ...identity, personality: [...(identity.personality ?? [])] }))
  return Object.freeze({ ...identity, ...expanded, personality: [...(expanded?.personality ?? identity.personality ?? [])].slice(0, 5) })
}
