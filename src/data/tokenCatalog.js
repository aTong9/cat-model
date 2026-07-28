const CATALOG_URL = `${import.meta.env?.BASE_URL ?? '/'}data/token-catalog.json`
let catalogPromise

function decodeToken(row) {
  const [tokenId, eyes, face, fur, gear, background, special, extension, remoteImage] = row
  return {
    tokenId, eyes, face, fur, gear, background, special,
    localImage: `/liberty_cats_download/images/${tokenId}.${extension}`,
    remoteImage,
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
        if (payload.schemaVersion !== 1 || !Array.isArray(payload.tokens)) throw new Error('Unsupported token catalog schema')
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
