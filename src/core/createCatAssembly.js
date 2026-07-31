import { CatModel } from '../three/CatModel.js'
import { createCatTraits, validateCatTraits } from './catTraits.js'
import { BASE_CAT_CONTRACT_VERSION, BASE_CAT_COORDINATE_CONTRACT } from '../character/baseCatContract.js'
import { resolveCharacterConfig } from './resolveCharacterConfig.js'

const DEFAULT_MOVEMENT = Object.freeze({ controls: 'WASD', enabled: true, walkSpeed: 1.1, runSpeed: 2.4, sneakSpeed: 0.55, jumpVelocity: 3.4 })

export function createCatAssembly(input, options = {}) {
  let traits = null
  const model = new CatModel()
  const root = model.group
  root.name = 'LibertyCat'
  root.userData.exportable = true
  root.userData.movement = { ...DEFAULT_MOVEMENT, ...options.movement }
  const characterManifest = model.registry.createManifest({
    contractVersion: BASE_CAT_CONTRACT_VERSION,
    coordinates: BASE_CAT_COORDINATE_CONTRACT,
  })
  root.userData.characterContract = characterManifest

  function apply(nextInput) {
    const nextTraits = createCatTraits({ ...traits, ...nextInput })
    const validation = validateCatTraits(nextTraits)
    if (!validation.valid) throw new Error(`Invalid CatTraits: ${validation.errors.join(', ')}`)
    if (!traits || traits.fur !== nextTraits.fur || traits.furColor !== nextTraits.furColor) model.setFurTrait(nextTraits.fur, nextTraits.furColor)
    if (!traits || traits.eyes !== nextTraits.eyes) model.setEyeStyle(nextTraits.eyes)
    if (!traits || traits.face !== nextTraits.face) model.setFaceExpression(nextTraits.face)
    if (!traits || traits.gear !== nextTraits.gear) model.setGear(nextTraits.gear)
    if (!traits || Object.keys(nextTraits.morphology).some(key => traits.morphology[key] !== nextTraits.morphology[key])) model.setMorphology(nextTraits.morphology)
    traits = nextTraits
    root.userData.catTraits = { ...traits }
    root.userData.resolvedConfig = resolveCharacterConfig(traits)
    return { ...traits }
  }

  apply(input)
  model.setAnimation(options.animation ?? 'idle')
  return {
    root, model,
    registry: model.registry,
    characterManifest,
    get parts() { return Object.fromEntries(model.registry.partNames.map(name => [name, model.registry.getPart(name)])) },
    get sockets() { return Object.fromEntries(model.registry.socketNames.map(name => [name, model.registry.getSocket(name)])) },
    get traits() { return { ...traits } },
    get resolvedConfig() { return root.userData.resolvedConfig },
    apply,
    update: time => model.update(time),
    setAnimation: mode => model.setAnimation(mode),
    setRunSpeed: speed => model.setRunSpeed(speed),
    dispose: () => model.dispose(),
  }
}
