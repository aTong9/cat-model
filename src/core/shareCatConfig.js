import { createCatTraits } from './catTraits.js'

const PARAMS = Object.freeze({ eyes: 'eyes', face: 'face', fur: 'fur', furColor: 'color', gear: 'gear', background: 'bg', special: 'special' })

export function createShareQuery(input) {
  const traits = createCatTraits(input)
  const params = new URLSearchParams()
  if (traits.tokenId != null) params.set('tokenId', traits.tokenId)
  for (const [key, param] of Object.entries(PARAMS)) {
    const value = traits[key]
    if (value != null && value !== '') params.set(param, value)
  }
  return params.toString()
}

export function parseShareQuery(query) {
  const params = query instanceof URLSearchParams ? query : new URLSearchParams(String(query).replace(/^\?/, ''))
  const input = { tokenId: params.get('tokenId') }
  for (const [key, param] of Object.entries(PARAMS)) {
    if (params.has(param)) input[key] = params.get(param) || null
  }
  return createCatTraits(input)
}

export function createShareUrl(baseUrl, input) {
  const url = new URL(baseUrl)
  url.search = createShareQuery(input)
  url.hash = ''
  return url.toString()
}

export function serializeCatConfig(input) {
  return JSON.stringify(createCatTraits(input), null, 2)
}
