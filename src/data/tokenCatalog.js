import { referenceImagePolicy } from './referenceImagePolicy.js'
const CATALOG_URL = `${import.meta.env?.BASE_URL ?? '/'}data/token-catalog.json`
let catalogPromise

function decodeToken(row) {
  const [tokenId, eyes, face, fur, gear, background, special, extension, remoteImage] = row
  const image = referenceImagePolicy.resolve({ tokenId, extension, remoteImage })
  return {
    tokenId, eyes, face, fur, gear, background, special,
    remoteImage, localImage: `/liberty_cats_download/images/${tokenId}.${extension}`,
    thumbnailImage: `/audit/thumbnails/${tokenId}.svg`,
    ...image,
  }
}

export async function loadTokenCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL)
      .then(response => {
        if (!response.ok) throw new Error(`Token catalog request failed: ${response.status}`)
        return response.json()
      })
      .then(payload => {
        if (![1, 2].includes(payload.schemaVersion) || !Array.isArray(payload.tokens)) throw new Error('Unsupported token catalog schema')
        const tokens = payload.tokens.map(decodeToken)
        return { count: payload.count, tokens, byId: new Map(tokens.map(token => [token.tokenId, token])) }
      })
    catalogPromise.catch(() => { catalogPromise = null })
  }
  return catalogPromise
}

export async function getTokenById(tokenId) {
  const normalized = String(tokenId).replace(/^0+(?=\d)/, '')
  return (await loadTokenCatalog()).byId.get(normalized) ?? null
}

export async function getAdjacentToken(tokenId, direction = 1) {
  const catalog = await loadTokenCatalog()
  const current = String(tokenId).replace(/^0+(?=\d)/, '')
  const index = catalog.tokens.findIndex(token => token.tokenId === current)
  if (index < 0) return catalog.tokens[direction < 0 ? catalog.tokens.length - 1 : 0]
  const nextIndex = (index + (direction < 0 ? -1 : 1) + catalog.tokens.length) % catalog.tokens.length
  return catalog.tokens[nextIndex]
}

export function filterTokenCatalog(tokens, filters = {}, limit = 60) {
  const activeFilters = Object.entries(filters).filter(([, value]) => value != null && value !== '')
  const matches = tokens.filter(token => activeFilters.every(([key, value]) => token[key] === value))
  return { total: matches.length, tokens: matches.slice(0, Math.max(0, limit)) }
}

export function countTokenFilterOptions(tokens, filters = {}, key) {
  const otherFilters = Object.fromEntries(Object.entries(filters).filter(([filterKey, value]) => filterKey !== key && value != null && value !== ''))
  const counts = new Map()
  for (const token of tokens) {
    if (!Object.entries(otherFilters).every(([filterKey, value]) => token[filterKey] === value)) continue
    const value = token[key]
    if (value != null) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}
