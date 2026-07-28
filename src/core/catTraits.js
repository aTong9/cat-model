import {
  BACKGROUND_TRAITS, DEFAULT_TRAITS, EYE_STYLES, FACE_EXPRESSIONS,
  FUR_TRAITS, GEAR_TRAITS, SPECIAL_TRAITS, getFurTrait,
} from '../config/traits.js'

export const CAT_TRAITS_SCHEMA_VERSION = 1
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

export function isExcludedTokenId(value) {
  const tokenId = normalizeTokenId(value)
  return tokenId == null || EXCLUDED_TOKEN_IDS.has(tokenId)
}

export function createCatTraits(input = {}) {
  const fur = normalizeValue('fur', input.fur ?? input.furStyle) ?? DEFAULT_TRAITS.fur
  return {
    schemaVersion: CAT_TRAITS_SCHEMA_VERSION,
    tokenId: normalizeTokenId(input.tokenId),
    eyes: normalizeValue('eyes', input.eyes ?? input.eyeStyle) ?? DEFAULT_TRAITS.eyes,
    face: normalizeValue('face', input.face ?? input.faceExpression) ?? DEFAULT_TRAITS.face,
    fur,
    furColor: input.furColor ?? getFurTrait(fur).color,
    gear: normalizeValue('gear', input.gear ?? input.gearType),
    background: normalizeValue('background', input.background),
    special: normalizeValue('special', input.special),
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
  for (const key of Object.keys(definitions)) {
    const value = traits?.[key]
    if (value != null && !definitions[key].includes(value)) errors.push(`invalid-${key}:${value}`)
  }
  if (traits?.tokenId != null && isExcludedTokenId(traits.tokenId)) errors.push(`excluded-token:${traits.tokenId}`)
  return { valid: errors.length === 0, errors }
}

export function toMetadataAttributes(traits) {
  return [['Eyes', traits.eyes], ['Face', traits.face], ['Fur Color', traits.fur], ['Gear', traits.gear], ['Background', traits.background], ['Special', traits.special]]
    .filter(([, value]) => value != null)
    .map(([trait_type, value]) => ({ trait_type, value }))
}
