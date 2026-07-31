import { messages } from '../src/i18n/messages.js'
import { characterParameterLabels } from '../src/i18n/characterParameterLabels.js'

function* walk(obj, prefix=[]) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) yield* walk(v, prefix.concat(k))
  } else if (typeof obj === 'string') {
    yield { path: prefix.join('.'), value: obj }
  }
}

const hasCN = (s) => /[\u4e00-\u9fff]/.test(s)
for (const locale of ['en','ja']) {
  console.log(`\n=== ${locale} messages ===`)
  let count = 0
  for (const { path, value } of walk(messages[locale])) {
    if (hasCN(value)) {
      console.log(`${path} => ${value}`)
      count++
    }
  }
  console.log('count', count)
}
console.log('\n=== parameter labels ===')
for (const locale of ['en','ja']) {
  console.log(`\n=== ${locale} parameter labels ===`)
  let count = 0
  for (const { path, value } of walk(characterParameterLabels[locale])) {
    if (hasCN(value)) {
      console.log(`${path} => ${value}`)
      count++
    }
  }
  console.log('count', count)
}
