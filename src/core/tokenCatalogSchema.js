export const TOKEN_CATALOG_SCHEMA_VERSION = 2

export const TOKEN_CATALOG_COLUMNS = Object.freeze([
  'tokenId', 'eyes', 'face', 'fur', 'gear',
  'background', 'special', 'imageExtension', 'originalImageUrl',
])

export const TOKEN_CATALOG_EXCLUSIONS = Object.freeze([
  Object.freeze({ tokenId: '4768', reason: 'excluded-missing-image' }),
  Object.freeze({
    tokenId: '4188087532617125273825521422781690267136463389660746064323733694581280079873',
    reason: 'excluded-invalid-token',
  }),
])

export function decodeTokenCatalogRow(row) {
  if (!Array.isArray(row) || row.length !== TOKEN_CATALOG_COLUMNS.length) return null
  return Object.fromEntries(TOKEN_CATALOG_COLUMNS.map((column, index) => [column, row[index] ?? null]))
}

export function validateTokenCatalog(payload) {
  const errors = []
  if (payload?.schemaVersion !== TOKEN_CATALOG_SCHEMA_VERSION) errors.push('unsupported-schema-version')
  if (JSON.stringify(payload?.columns) !== JSON.stringify(TOKEN_CATALOG_COLUMNS)) errors.push('invalid-columns')
  if (!Array.isArray(payload?.tokens) || payload.tokens.length !== payload?.count) errors.push('invalid-token-count')
  if (JSON.stringify(payload?.excluded) !== JSON.stringify(TOKEN_CATALOG_EXCLUSIONS)) errors.push('invalid-exclusions')
  for (const [index, row] of (payload?.tokens ?? []).entries()) {
    const token = decodeTokenCatalogRow(row)
    if (!token) { errors.push(`invalid-row:${index}`); continue }
    if (!/^\d+$/.test(token.tokenId)) errors.push(`invalid-token-id:${index}`)
    if (!/^(png|webp)$/.test(token.imageExtension ?? '')) errors.push(`invalid-image-extension:${token.tokenId}`)
    if (!/^https:\/\//.test(token.originalImageUrl ?? '')) errors.push(`invalid-source-url:${token.tokenId}`)
  }
  return { valid: errors.length === 0, errors }
}
