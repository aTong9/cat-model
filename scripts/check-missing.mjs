import { messages } from '../src/i18n/messages.js'

function collect(obj, out = new Set(), prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      collect(v, out, key)
    } else {
      out.add(key)
    }
  }
  return out
}

const base = collect(messages.zh)
for (const locale of ['en', 'ja']) {
  const keys = collect(messages[locale])
  const missing = [...base].filter((key) => !keys.has(key))
  console.log(locale, 'missing', missing.length)
  if (missing.length <= 240) {
    console.log(missing.join('\n'))
  } else {
    console.log(missing.slice(0, 240).join('\n'))
    console.log(`... and ${missing.length - 240} more`)
  }
}
