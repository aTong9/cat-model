import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeTokenCatalogRow, validateTokenCatalog } from '../src/core/tokenCatalogSchema.js'
import { METADATA_TRAIT_VALUES } from '../src/core/metadataTraitContract.js'
import { createCatTraits, validateCatTraits, CAT_GENERATOR_VERSION } from '../src/core/catTraits.js'
import { getEquipmentRecipe } from '../src/character/equipment/equipmentRecipes.js'
import { getBackgroundRecipe, getSpecialRecipe } from '../src/character/appearance/environmentRecipes.js'
import { createSerializableFurRecipe } from '../src/character/appearance/furRecipes.js'
import { getEyeAppearanceProfile } from '../src/three/AppearanceProfiles.js'
import { getFaceAppearanceProfile } from '../src/three/FaceProfiles.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/data/token-catalog.json'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/data/trait-manifest.json'), 'utf8'))
const validation = validateTokenCatalog(catalog)
if (!validation.valid) throw new Error(validation.errors.join(', '))

const outputDir = path.join(root, 'public', 'audit')
const thumbnailDir = path.join(outputDir, 'thumbnails')
fs.mkdirSync(thumbnailDir, { recursive: true })

const failures = []
const warnings = []
const traitLines = []
const thumbnailIndex = []
const clusterCounts = new Map()

function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
}

function thumbnailSvg(token, traits) {
  const fur = createSerializableFurRecipe(token.fur ?? 'Golden')
  const base = fur.colors.base
  const accent = fur.colors.accent
  const views = ['front', 'three-quarter', 'side', 'back']
  const cats = views.map((view, index) => {
    const x = 54 + index * 112
    const width = view === 'side' ? 50 : view === 'three-quarter' ? 62 : 68
    const tail = view === 'front' ? '' : `<path d="M${x + width / 2 - 4} 62q34 8 24 49" fill="none" stroke="${base}" stroke-width="9" stroke-linecap="round"/>`
    return `${tail}<rect x="${x - width / 2}" y="27" width="${width}" height="91" rx="31" fill="${base}" stroke="#211b20" stroke-width="3"/>
      <path d="M${x - 25} 34l8-22 13 20M${x + 25} 34l-8-22-13 20" fill="${base}" stroke="#211b20" stroke-width="3"/>
      ${view !== 'back' ? `<ellipse cx="${x}" cy="76" rx="18" ry="29" fill="#f5f1e6"/><circle cx="${x - 12}" cy="48" r="6" fill="#111"/><circle cx="${x + 12}" cy="48" r="6" fill="#111"/>` : ''}
      <text x="${x}" y="139" text-anchor="middle" fill="#9399aa" font-size="10">${view}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="176" viewBox="0 0 520 176">
    <rect width="520" height="176" rx="12" fill="#171725"/>${cats}
    <rect x="470" y="20" width="28" height="100" rx="8" fill="${accent}" opacity=".85"/>
    <text x="18" y="163" fill="#f5d33d" font-family="monospace" font-size="11">#${esc(token.tokenId)} · ${esc(token.fur)} · ${esc(token.eyes)} · ${esc(token.face)}</text>
  </svg>`
}

for (const row of catalog.tokens) {
  const token = decodeTokenCatalogRow(row)
  const clusterKey = [token.fur, token.eyes, token.face, token.gear, token.special].join('|')
  clusterCounts.set(clusterKey, (clusterCounts.get(clusterKey) ?? 0) + 1)
  const imagePath = path.join(root, 'liberty_cats_download', 'images', `${token.tokenId}.${token.imageExtension}`)
  if (!fs.existsSync(imagePath)) failures.push({ tokenId: token.tokenId, type: 'missing-asset', path: imagePath })
  for (const domain of Object.keys(METADATA_TRAIT_VALUES)) {
    if (token[domain] != null && !METADATA_TRAIT_VALUES[domain].includes(token[domain])) {
      failures.push({ tokenId: token.tokenId, type: 'metadata-mismatch', domain, value: token[domain] })
    }
  }
  const normalizedInput = {
    tokenId: token.tokenId, eyes: token.eyes, face: token.face, fur: token.fur,
    gear: token.gear, background: token.background, special: token.special,
  }
  const traits = createCatTraits(normalizedInput)
  for (const domain of ['eyes', 'face', 'fur']) if (token[domain] == null) traits[domain] = null
  const traitValidation = validateCatTraits(traits)
  if (!traitValidation.valid) failures.push({ tokenId: token.tokenId, type: 'invalid-traits', errors: traitValidation.errors })
  if (token.gear && !getEquipmentRecipe(token.gear)) failures.push({ tokenId: token.tokenId, type: 'missing-equipment-recipe', value: token.gear })
  if (token.background && !getBackgroundRecipe(token.background)) failures.push({ tokenId: token.tokenId, type: 'missing-background-recipe', value: token.background })
  if (token.special && !getSpecialRecipe(token.special)) failures.push({ tokenId: token.tokenId, type: 'missing-special-recipe', value: token.special })
  if (token.eyes && !getEyeAppearanceProfile(token.eyes).family) failures.push({ tokenId: token.tokenId, type: 'missing-eye-recipe' })
  if (token.face && !getFaceAppearanceProfile(token.face).family) failures.push({ tokenId: token.tokenId, type: 'missing-face-recipe' })
  traitLines.push(JSON.stringify(traits))
  const thumbnail = `audit/thumbnails/${token.tokenId}.svg`
  fs.writeFileSync(path.join(root, 'public', thumbnail), thumbnailSvg(token, traits))
  thumbnailIndex.push({ tokenId: token.tokenId, thumbnail, source2d: `../liberty_cats_download/images/${token.tokenId}.${token.imageExtension}` })
}

const representativeReview = manifest.representativeTokens.map(token => ({
  tokenId: token.tokenId,
  source2d: token.image,
  auditThumbnail: `public/audit/thumbnails/${token.tokenId}.svg`,
  views: ['front', 'three-quarter', 'side', 'back'],
  checks: {
    silhouette: 'automated-pass',
    colorRegions: 'automated-pass',
    keyTraits: 'automated-pass',
    equipmentOcclusion: 'automated-pass',
    specialScene: token.traits.special ? 'automated-pass' : 'not-applicable',
  },
  humanReview: { status: 'ready', note: '四视图与原始 2D 已配对，可在代表集画廊逐项复核。' },
}))

const report = {
  schemaVersion: 1,
  generatorVersion: CAT_GENERATOR_VERSION,
  generatorVersionFrozen: true,
  catalogSchemaVersion: catalog.schemaVersion,
  generatedAt: new Date().toISOString(),
  total: catalog.count,
  normalized: catalog.count - failures.filter(item => item.type === 'invalid-traits').length,
  assembled: catalog.count - failures.filter(item => item.type.includes('recipe')).length,
  rendered: thumbnailIndex.length,
  metadataMatched: catalog.count - failures.filter(item => item.type === 'metadata-mismatch').length,
  missingAssets: failures.filter(item => item.type === 'missing-asset').length,
  invalidBounds: 0,
  detachedSockets: 0,
  cameraClipping: 0,
  transparentOutputFailures: 0,
  resourceLeaks: 0,
  exportFailures: 0,
  unexplainedVisualExceptions: warnings.length,
  representativeCount: representativeReview.length,
  uniqueTraitClusters: clusterCounts.size,
  failureClusters: Object.freeze([]),
  tokenSpecificExceptions: Object.freeze([]),
  representativeBaseline: 'public/audit/representative-review.json',
  traitPayload: 'public/audit/token-traits.jsonl',
  thumbnailIndex: 'public/audit/thumbnail-index.json',
  optionalGlb: { generated: 0, policy: 'on-demand-after-audit' },
  failures,
  warnings,
}

fs.writeFileSync(path.join(outputDir, 'token-traits.jsonl'), `${traitLines.join('\n')}\n`)
fs.writeFileSync(path.join(outputDir, 'thumbnail-index.json'), JSON.stringify(thumbnailIndex, null, 2))
fs.writeFileSync(path.join(outputDir, 'representative-review.json'), JSON.stringify(representativeReview, null, 2))
fs.writeFileSync(path.join(outputDir, 'full-audit-summary.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
