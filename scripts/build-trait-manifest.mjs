import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  TOKEN_CATALOG_COLUMNS,
  TOKEN_CATALOG_SCHEMA_VERSION,
  decodeTokenCatalogRow,
  validateTokenCatalog,
} from '../src/core/tokenCatalogSchema.js'
import { METADATA_TRAIT_VALUES } from '../src/core/metadataTraitContract.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = path.join(root, 'public', 'data', 'token-catalog.json')
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
const validation = validateTokenCatalog(catalog)
if (!validation.valid) throw new Error(`Invalid token catalog: ${validation.errors.join(', ')}`)

const tokens = catalog.tokens.map(decodeTokenCatalogRow)
const domainSpecs = Object.freeze({
  eyes: {
    implementationType: 'face-component',
    dependencies: ['head', 'face-eyes'],
    conflicts: { Sunglasses: ['gear:Gold Round Glasses'], VR: ['gear:Baseball Cap', 'gear:Gold Round Glasses'] },
  },
  face: { implementationType: 'expression-strategy', dependencies: ['head', 'face-mouth'], conflicts: {} },
  fur: { implementationType: 'procedural-coat-recipe', dependencies: ['body-local-coordinates', 'semantic-coat-masks'], conflicts: {} },
  gear: { implementationType: 'equipment-assembly', dependencies: ['character-registry', 'semantic-sockets'], conflicts: {} },
  background: { implementationType: 'environment-recipe', dependencies: ['scene', 'lighting', 'fog'], conflicts: { '*': ['special:*'] } },
  special: { implementationType: 'special-recipe', dependencies: ['character', 'environment', 'camera'], conflicts: { '*': ['background:*'] } },
})

function scoreRepresentative(token, domain) {
  let score = Number(token.tokenId)
  if (token.special) score += domain === 'special' ? 0 : 1_000_000
  if (domain === 'eyes' && ['Baseball Cap', 'Gold Round Glasses'].includes(token.gear)) score += 200_000
  if (domain === 'face' && ['Sunglasses', 'VR'].includes(token.eyes)) score += 200_000
  if (domain === 'fur' && token.gear === 'Hiking Backpack') score += 100_000
  return score
}

const manifestDomains = {}
const representativeIds = new Set()
for (const [domain, spec] of Object.entries(domainSpecs)) {
  const values = new Map()
  for (const token of tokens) {
    const value = token[domain]
    if (!value) continue
    if (!values.has(value)) values.set(value, [])
    values.get(value).push(token)
  }
  manifestDomains[domain] = {
    id: domain,
    domain,
    implementationType: spec.implementationType,
    nullCount: tokens.filter(token => !token[domain]).length,
    nullMeaning: domain === 'gear' ? 'no-equipment'
      : domain === 'background' ? 'replaced-by-special'
        : domain === 'special' ? 'standard-token' : 'owned-by-full-scene-special',
    traits: [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, matches]) => {
      const representatives = [...matches]
        .sort((a, b) => scoreRepresentative(a, domain) - scoreRepresentative(b, domain))
        .slice(0, Math.min(7, matches.length))
        .map(token => token.tokenId)
      representatives.forEach(idValue => representativeIds.add(idValue))
      return {
        id,
        domain,
        implementationType: spec.implementationType,
        frequency: matches.length,
        status: 'pending-visual-verification',
        dependencies: spec.dependencies,
        conflicts: spec.conflicts[id] ?? spec.conflicts['*'] ?? [],
        representativeTokenIds: representatives,
        evidence: representatives.map(tokenId => `liberty_cats_download/images/${tokenId}.${tokens.find(token => token.tokenId === tokenId).imageExtension}`),
      }
    }),
  }
}

const pairSpecs = [
  ['eyes', 'face'],
  ['fur', 'gear'],
  ['gear', 'special'],
  ['eyes', 'gear'],
]
const pairCoverage = pairSpecs.map(([left, right]) => {
  const combinations = new Map()
  for (const token of tokens) {
    if (!token[left] || !token[right]) continue
    const key = `${token[left]} × ${token[right]}`
    const record = combinations.get(key) ?? { left: token[left], right: token[right], frequency: 0, representativeTokenId: token.tokenId }
    record.frequency++
    combinations.set(key, record)
  }
  const possible = METADATA_TRAIT_VALUES[left].flatMap(leftValue =>
    METADATA_TRAIT_VALUES[right].map(rightValue => ({ left: leftValue, right: rightValue })))
  const observed = [...combinations.values()]
  const observedKeys = new Set(observed.map(item => `${item.left}\u0000${item.right}`))
  const missing = possible.filter(item => !observedKeys.has(`${item.left}\u0000${item.right}`))
  return {
    domains: [left, right],
    possibleCount: possible.length,
    observedCount: observed.length,
    missingCount: missing.length,
    combinations: observed,
    missing,
  }
})

const representativeTokens = [...representativeIds]
  .map(tokenId => tokens.find(token => token.tokenId === tokenId))
  .sort((a, b) => Number(a.tokenId) - Number(b.tokenId))
  .map(token => ({
    tokenId: token.tokenId,
    image: `liberty_cats_download/images/${token.tokenId}.${token.imageExtension}`,
    traits: Object.fromEntries(['eyes', 'face', 'fur', 'gear', 'background', 'special'].map(domain => [domain, token[domain]])),
  }))

const manifest = {
  schemaVersion: 1,
  catalogSchemaVersion: TOKEN_CATALOG_SCHEMA_VERSION,
  catalogColumns: TOKEN_CATALOG_COLUMNS,
  generatedFrom: ['public/data/token-catalog.json', 'liberty_cats_download/properties.md'],
  tokenCount: tokens.length,
  traitCount: Object.values(manifestDomains).reduce((sum, domain) => sum + domain.traits.length, 0),
  representativeCount: representativeTokens.length,
  domains: manifestDomains,
  representativeTokens,
  pairCoverage,
}

const target = path.join(root, 'public', 'data', 'trait-manifest.json')
fs.writeFileSync(target, JSON.stringify(manifest, null, 2))
console.log(`Wrote ${manifest.traitCount} traits and ${manifest.representativeCount} representative tokens to ${target}`)
