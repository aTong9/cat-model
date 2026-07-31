import {
  BACKGROUND_TRAITS, DEFAULT_TRAITS, EYE_STYLES, FACE_EXPRESSIONS,
  FUR_TRAITS, GEAR_TRAITS, SPECIAL_TRAITS, getFurTrait,
} from '../config/traits.js'

export const CAT_TRAITS_SCHEMA_VERSION = 2
export const CAT_GENERATOR_VERSION = '3.0.0'
export const DEFAULT_IDENTITY = Object.freeze({ name: '', personality: [], occupation: '', theme: '', story: '', catchphrase: '' })
export const MORPHOLOGY_DEFINITIONS = Object.freeze({
  bodyScale: Object.freeze({ min: 0.8, max: 1.25, default: 1 }),
  bodyWidth: Object.freeze({ min: 0.78, max: 1.28, default: 1 }),
  bodyHeight: Object.freeze({ min: 0.78, max: 1.2, default: 1 }),
  bodyDepth: Object.freeze({ min: 0.8, max: 1.25, default: 1 }),
  headScale: Object.freeze({ min: 0.8, max: 1.25, default: 1 }),
  eyeScale: Object.freeze({ min: 0.8, max: 1.4, default: 1 }),
  eyeSpacing: Object.freeze({ min: 0.8, max: 1.25, default: 1 }),
  mouthScale: Object.freeze({ min: 0.8, max: 1.4, default: 1 }),
  earScale: Object.freeze({ min: 0.7, max: 1.35, default: 1 }),
  earWidth: Object.freeze({ min: 0.75, max: 1.3, default: 1 }),
  earHeight: Object.freeze({ min: 0.75, max: 1.3, default: 1 }),
  pawScale: Object.freeze({ min: 0.75, max: 1.35, default: 1 }),
  footScale: Object.freeze({ min: 0.8, max: 1.35, default: 1 }),
  legLength: Object.freeze({ min: 0.8, max: 1.25, default: 1 }),
  tailLength: Object.freeze({ min: 0.7, max: 1.4, default: 1 }),
  tailCurl: Object.freeze({ min: -0.6, max: 0.8, default: 0 }),
})
export const EXCLUDED_TOKEN_IDS = new Set([
  '4768',
  '4188087532617125273825521422781690267136463389660746064323733694581280079873',
])

const definitions = {
  eyes: EYE_STYLES,
  face: FACE_EXPRESSIONS,
  fur: [...FUR_TRAITS.map(item => item.id), 'Custom'],
  gear: GEAR_TRAITS.map(item => item.id),
  background: BACKGROUND_TRAITS,
  special: SPECIAL_TRAITS.map(item => item.id),
}

const metadataKeys = { Eyes: 'eyes', Face: 'face', 'Fur Color': 'fur', Gear: 'gear', Background: 'background', Special: 'special' }
const aliases = new Map()
for (const [key, values] of Object.entries(definitions)) {
  for (const value of values) aliases.set(`${key}:${value.toLowerCase()}`, value)
}

function normalizeTokenId(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value)
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  return value.replace(/^0+(?=\d)/, '')
}

function normalizeValue(key, value) {
  if (value == null || value === '' || value === 'None') return null
  return aliases.get(`${key}:${String(value).trim().toLowerCase()}`) ?? null
}

function normalizeMorphology(input = {}) {
  const source = input.morphology ?? input
  return Object.fromEntries(Object.entries(MORPHOLOGY_DEFINITIONS).map(([key, definition]) => {
    const value = Number(source?.[key])
    const normalized = Number.isFinite(value) ? Math.min(definition.max, Math.max(definition.min, value)) : definition.default
    return [key, Math.round(normalized * 1000) / 1000]
  }))
}

function normalizeIdentity(value = {}) {
  const text = key => String(value?.[key] ?? '').trim().slice(0, key === 'story' ? 1200 : 120)
  return {
    name: text('name'),
    personality: [...new Set((Array.isArray(value?.personality) ? value.personality : []).map(item => String(item).trim()).filter(Boolean))].slice(0, 5),
    occupation: text('occupation'), theme: text('theme'), story: text('story'), catchphrase: text('catchphrase'),
  }
}

export function isExcludedTokenId(value) {
  const tokenId = normalizeTokenId(value)
  return tokenId == null || EXCLUDED_TOKEN_IDS.has(tokenId)
}

export function createCatTraits(input = {}) {
  const fur = normalizeValue('fur', input.fur ?? input.furStyle) ?? DEFAULT_TRAITS.fur
  return {
    schemaVersion: CAT_TRAITS_SCHEMA_VERSION,
    generatorVersion: CAT_GENERATOR_VERSION,
    tokenId: normalizeTokenId(input.tokenId),
    seed: Number(input.seed ?? input.tokenId) >>> 0,
    eyes: normalizeValue('eyes', input.eyes ?? input.eyeStyle) ?? DEFAULT_TRAITS.eyes,
    face: normalizeValue('face', input.face ?? input.faceExpression) ?? DEFAULT_TRAITS.face,
    fur,
    furColor: input.furColor ?? getFurTrait(fur).color,
    gear: normalizeValue('gear', input.gear ?? input.gearType),
    background: normalizeValue('background', input.background),
    special: normalizeValue('special', input.special),
    morphology: normalizeMorphology(input),
    identity: normalizeIdentity(input.identity),
  }
}

export function normalizeMetadataRecord(record) {
  const tokenId = normalizeTokenId(record?.tokenId)
  if (isExcludedTokenId(tokenId)) return { ok: false, tokenId, reason: tokenId === '4768' ? 'excluded-missing-image' : 'excluded-invalid-token' }
  const properties = record?.raw?.metadata?.properties ?? record?.properties ?? record?.attributes
  if (!Array.isArray(properties)) return { ok: false, tokenId, reason: 'missing-properties' }
  const input = { tokenId }
  const unknown = []
  for (const property of properties) {
    const key = metadataKeys[property?.trait_type]
    if (!key) { unknown.push({ traitType: property?.trait_type ?? null, value: property?.value ?? null }); continue }
    const value = normalizeValue(key, property.value)
    if (value == null && property.value != null) unknown.push({ traitType: property.trait_type, value: property.value })
    else input[key] = value
  }
  if (unknown.length) return { ok: false, tokenId, reason: 'unknown-traits', unknown }
  const traits = createCatTraits(input)
  for (const key of Object.keys(definitions)) {
    if (!Object.hasOwn(input, key)) traits[key] = null
  }
  if (traits.fur == null) traits.furColor = null
  return { ok: true, traits }
}

export function validateCatTraits(traits) {
  const errors = []
  if (traits?.schemaVersion !== CAT_TRAITS_SCHEMA_VERSION) errors.push('unsupported-schema-version')
  if (traits?.generatorVersion !== CAT_GENERATOR_VERSION) errors.push('unsupported-generator-version')
  for (const key of Object.keys(definitions)) {
    const value = traits?.[key]
    if (value != null && !definitions[key].includes(value)) errors.push(`invalid-${key}:${value}`)
  }
  if (traits?.tokenId != null && isExcludedTokenId(traits.tokenId)) errors.push(`excluded-token:${traits.tokenId}`)
  for (const [key, definition] of Object.entries(MORPHOLOGY_DEFINITIONS)) {
    const value = traits?.morphology?.[key]
    if (!Number.isFinite(value) || value < definition.min || value > definition.max) errors.push(`invalid-morphology:${key}`)
  }
  return { valid: errors.length === 0, errors }
}

export function migrateCatTraits(input = {}) {
  return createCatTraits(input)
}

export function toMetadataAttributes(traits) {
  return [['Eyes', traits.eyes], ['Face', traits.face], ['Fur Color', traits.fur], ['Gear', traits.gear], ['Background', traits.background], ['Special', traits.special]]
    .filter(([, value]) => value != null)
    .map(([trait_type, value]) => ({ trait_type, value }))
}
