import { createRng } from '../config/traits.js'

const IDENTITY_LIBRARY = Object.freeze({
  zh: {
    names: ['Mochi', 'Pixel', 'Nova', 'Miso', 'Lucky', 'Nimbus', 'Taro', 'Luna'],
    traits: ['勇敢', '好奇', '温柔', '机敏', '乐观', '沉着', '顽皮', '可靠'],
    jobs: ['星际摄影师', '好运收藏家', '城市探险家', '拉面鉴赏家', '梦境向导', '山野守护者'],
    fallbackTheme: '自由都市',
    signatures: ['相机总是比直觉更可靠', '相信轻装也能远行', '今天也要把每一次邂逅记成故事'],
  },
  en: {
    names: ['Mochi', 'Pixel', 'Nova', 'Miso', 'Lucky', 'Nimbus', 'Taro', 'Luna'],
    traits: ['Brave', 'Curious', 'Gentle', 'Agile', 'Optimistic', 'Calm', 'Mischievous', 'Reliable'],
    jobs: ['Space Photographer', 'Lucky Collector', 'City Explorer', 'Ramen Taster', 'Dream Guide', 'Wilderness Guardian'],
    fallbackTheme: 'Neon Metropolis',
    signatures: ['The camera is often more reliable than instinct', 'A light pack can still roam far', 'Every encounter becomes a new story'],
  },
  ja: {
    names: ['モチ', 'ピクセル', 'ノヴァ', 'ミソ', 'ラッキー', 'ニンバス', 'タロウ', 'ルナ'],
    traits: ['勇敢', '好奇心', '優しさ', '機敏', '楽観', '冷静', 'いたずら好き', '信頼できる'],
    jobs: ['宇宙写真家', '幸運の収集家', '都市探検家', 'ラーメン鑑定士', '夢ガイド', '里山の守人'],
    fallbackTheme: '自由都市',
    signatures: ['写真は直感より先に世界を写す', '軽装でも遠くまで歩ける', '一つの出会いが次の物語になる'],
  },
})
function pickLibrary(locale = 'zh') {
  return IDENTITY_LIBRARY[locale] ?? IDENTITY_LIBRARY.zh
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)]
const STORY_TEMPLATES = {
  zh: {
    storyTemplate: ({ name, personality, occupation, theme, signature }) => `${name} 是一位${personality.join('又')}的${occupation}。在${theme}中，${signature}，并把每一次相遇收藏成新的故事。`,
    catchphraseTemplate: ({ personality }) => `今天也要保持${personality[0] || '好奇'}！`,
    signatureWithGearPrefix: '随身带着',
  },
  en: {
    storyTemplate: ({ name, personality, occupation, theme, signature }) => `${name} is a ${personality.join(' and ')} ${occupation} living in ${theme}. ${signature}.`,
    catchphraseTemplate: ({ personality }) => `Stay curious, always (${personality[0] || 'curious'})!`,
    signatureWithGearPrefix: 'carrying ',
  },
  ja: {
    storyTemplate: ({ name, personality, occupation, theme, signature }) => `${name}は、${personality.join('で')}の性格を持つ${occupation}です。${theme}で、${signature}。`,
    catchphraseTemplate: ({ personality }) => `常に好奇心を忘れずに（${personality[0] || '好奇心'}）！`,
    signatureWithGearPrefix: '常に ',
  },
}

export function generateCatIdentity(traits, seed = traits?.tokenId ?? 1, options = {}) {
  const locale = options.locale || 'zh'
  const library = pickLibrary(locale)
  const localeProfile = STORY_TEMPLATES[locale] ?? STORY_TEMPLATES.zh
  const rng = createRng(seed)
  const name = pick(rng, library.names)
  const personality = [pick(rng, library.traits), pick(rng, library.traits)].filter((value, index, list) => list.indexOf(value) === index)
  const occupation = pick(rng, library.jobs)
  const theme = traits?.special || traits?.background || library.fallbackTheme
  const signature = traits?.gear
    ? `${localeProfile.signatureWithGearPrefix}${traits.gear}`
    : pick(rng, library.signatures)
  return Object.freeze({
    name, personality, occupation, theme,
    story: localeProfile.storyTemplate({ name, personality, occupation, theme, signature }),
    catchphrase: localeProfile.catchphraseTemplate({ personality }),
  })
}

export async function expandCatIdentity(identity, { provider } = {}) {
  if (provider == null) return Object.freeze({ ...identity, personality: [...(identity.personality ?? [])] })
  if (typeof provider !== 'function') throw new Error('Identity expansion provider must be a function')
  const expanded = await provider(Object.freeze({ ...identity, personality: [...(identity.personality ?? [])] }))
  return Object.freeze({ ...identity, ...expanded, personality: [...(expanded?.personality ?? identity.personality ?? [])].slice(0, 5) })
}
