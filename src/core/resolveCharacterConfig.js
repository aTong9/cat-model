import { createCatTraits } from './catTraits.js'
import { createSerializableFurRecipe } from '../character/appearance/furRecipes.js'
import { getEyeAppearanceProfile } from '../three/AppearanceProfiles.js'
import { getFaceAppearanceProfile } from '../three/FaceProfiles.js'
import { getEquipmentRecipe } from '../character/equipment/equipmentRecipes.js'
import { resolveEnvironmentRecipe } from '../character/appearance/environmentRecipes.js'
import { resolveFaceEquipmentPolicy } from '../character/appearance/faceCompositionContract.js'

export const RESOLVED_CHARACTER_CONFIG_VERSION = 1

function immutableCopy(value) {
  if (value == null || typeof value !== 'object') return value
  if (Array.isArray(value)) return Object.freeze(value.map(immutableCopy))
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [key, immutableCopy(child)])))
}

export function resolveCharacterConfig(input = {}) {
  const traits = createCatTraits(input)
  const special = resolveEnvironmentRecipe({ background: traits.background, special: traits.special })
  const faceEquipmentPolicy = resolveFaceEquipmentPolicy(traits.eyes, traits.gear)
  const equipment = traits.gear ? getEquipmentRecipe(traits.gear) : null
  const suppressedBySpecial = special.kind === 'special' && special.recipe?.equipmentOverrides?.strategy === 'suppress'
  return immutableCopy({
    schemaVersion: RESOLVED_CHARACTER_CONFIG_VERSION,
    generatorVersion: traits.generatorVersion,
    source: { tokenId: traits.tokenId, seed: traits.seed },
    morphology: traits.morphology,
    appearance: {
      fur: createSerializableFurRecipe(traits.fur, traits.furColor),
      eyes: { id: traits.eyes, ...getEyeAppearanceProfile(traits.eyes) },
      face: { id: traits.face, ...getFaceAppearanceProfile(traits.face) },
    },
    equipment: equipment ? {
      id: traits.gear,
      recipe: equipment,
      policy: faceEquipmentPolicy,
      visible: !suppressedBySpecial && faceEquipmentPolicy.equipmentVisible,
      suppressedBySpecial,
    } : null,
    environment: special,
    identity: traits.identity,
  })
}

