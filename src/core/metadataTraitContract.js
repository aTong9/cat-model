import {
  BACKGROUND_TRAITS,
  EYE_STYLES,
  FACE_EXPRESSIONS,
  FUR_TRAITS,
  GEAR_TRAITS,
  SPECIAL_TRAITS,
} from '../config/traits.js'

// Big Black and Custom are editor-only extensions, not Liberty Cats metadata values.
export const METADATA_TRAIT_VALUES = Object.freeze({
  eyes: Object.freeze(EYE_STYLES.filter(value => value !== 'Big Black')),
  face: Object.freeze([...FACE_EXPRESSIONS]),
  fur: Object.freeze(FUR_TRAITS.map(item => item.id)),
  gear: Object.freeze(GEAR_TRAITS.map(item => item.id)),
  background: Object.freeze([...BACKGROUND_TRAITS]),
  special: Object.freeze(SPECIAL_TRAITS.map(item => item.id)),
})

export const METADATA_TRAIT_COUNT = Object.values(METADATA_TRAIT_VALUES)
  .reduce((sum, values) => sum + values.length, 0)
