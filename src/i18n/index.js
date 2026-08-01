import { createI18n } from 'vue-i18n'
import { messages } from './messages.js'
import { characterParameterLabels } from './characterParameterLabels.js'

function deepMerge(base, patch) {
  const output = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    const baseValue = base[key]
    if (value && typeof value === 'object' && !Array.isArray(value) && baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)) {
      output[key] = deepMerge(baseValue, value)
    } else {
      output[key] = value
    }
  }
  return output
}

const localeMessages = Object.fromEntries(Object.entries(messages).map(([locale, data]) => [
  locale,
  deepMerge(data, characterParameterLabels[locale] ?? {}),
]))

export const SUPPORT_LOCALES = ['zh', 'ja', 'en']

export const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages: localeMessages,
})

export function normalizeLocale(locale) {
  return SUPPORT_LOCALES.includes(locale) ? locale : 'zh'
}
