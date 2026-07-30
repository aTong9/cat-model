import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createSdfCatBody } from './SdfCatBody.js'
import { getFurTrait } from '../config/traits.js'
import { getEyeAppearanceProfile } from './AppearanceProfiles.js'
import { getFaceAppearanceProfile } from './FaceProfiles.js'
import { createCatTail, updateCatTail } from '../character/tail/createCatTail.js'
import { applyMorphology } from '../character/morphology/applyMorphology.js'
import { createCatEar } from '../character/ears/createCatEar.js'
import { CharacterPartRegistry } from '../character/registry/CharacterPartRegistry.js'
import { EquipmentAssembler } from '../character/equipment/EquipmentAssembler.js'
import { disposeObject3DResources } from '../character/resources/disposeObject3DResources.js'
import { assembleBodyShell } from '../character/body/assembleBodyShell.js'
import { createLimbSet } from '../character/limbs/createLimbSet.js'
import { createRaisedArm, createFoot } from '../character/limbs/createCatLimbs.js'
import { CatAnimator } from '../character/animation/CatAnimator.js'
import { createCatPoseStrategies } from '../character/animation/catPoseStrategies.js'
import { createCatAnimationRig } from '../character/animation/createCatAnimationRig.js'
import { applyFurRecipeToGeometry } from '../character/appearance/furRecipes.js'
import { resolveFaceEquipmentPolicy } from '../character/appearance/faceCompositionContract.js'

// ===== Toon 渐变贴图（参考 Meow-Generator MeshToonMaterial） =====
let _sharedToonMap = null
function getToonGradientMap() {
  if (_sharedToonMap) return _sharedToonMap
  const size = 128
  const stops = [
    [0, new THREE.Color('#261e14')],
    [0.28, new THREE.Color('#4a3a24')],
    [0.5, new THREE.Color('#9e7a48')],
    [0.72, new THREE.Color('#dcc498')],
    [1, new THREE.Color('#fef9f0')],
  ]
  const data = new Uint8Array(size * 4)
  for (let index = 0; index < size; index++) {
    const position = index / (size - 1)
    let upper = 1
    while (upper < stops.length - 1 && position > stops[upper][0]) upper++
    const [fromPosition, fromColor] = stops[upper - 1]
    const [toPosition, toColor] = stops[upper]
    const color = fromColor.clone().lerp(toColor, (position - fromPosition) / (toPosition - fromPosition))
    data[index * 4] = Math.round(color.r * 255)
    data[index * 4 + 1] = Math.round(color.g * 255)
    data[index * 4 + 2] = Math.round(color.b * 255)
    data[index * 4 + 3] = 255
  }
  _sharedToonMap = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat)
  _sharedToonMap.needsUpdate = true
  _sharedToonMap.minFilter = THREE.LinearFilter
  _sharedToonMap.magFilter = THREE.NearestFilter
  _sharedToonMap.generateMipmaps = false
  return _sharedToonMap
}

// ===== 材质工厂 =====
function furMat(hex) {
  return new THREE.MeshToonMaterial({
    color: new THREE.Color(hex),
    gradientMap: getToonGradientMap(),
    vertexColors: true,
  })
}

function eyeWhite() {
  return new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.22 })
}
function pupil() {
  return new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.08 })
}
function noseMat() {
  return new THREE.MeshStandardMaterial({ color: '#e8917a', roughness: 0.38 })
}

function createHeartNose(size, material = noseMat()) {
  const shape = new THREE.Shape()
  shape.moveTo(0, -size * 0.72)
  shape.bezierCurveTo(-size * 0.18, -size * 0.48, -size, size * 0.02, -size * 0.48, size * 0.52)
  shape.bezierCurveTo(-size * 0.18, size * 0.78, 0, size * 0.52, 0, size * 0.30)
  shape.bezierCurveTo(0, size * 0.52, size * 0.18, size * 0.78, size * 0.48, size * 0.52)
  shape.bezierCurveTo(size, size * 0.02, size * 0.18, -size * 0.48, 0, -size * 0.72)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: size * 0.34,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: size * 0.12,
    bevelThickness: size * 0.10,
  })
  geometry.center()
  return new THREE.Mesh(geometry, material)
}
function mouthCavityMat() {
  return new THREE.MeshStandardMaterial({ color: '#381212', roughness: 0.50 })
}
function tongueMat() {
  return new THREE.MeshStandardMaterial({ color: '#f07070', roughness: 0.32 })
}
function metal(hex) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.22, metalness: 0.88 })
}

// ===== 描边效果（参考 Meow-Generator makeOutline） =====
function createOutlineGeometry(sourceGeo, thickness = 0.020) {
  const posSrc = sourceGeo.attributes.position.array
  const nrmSrc = sourceGeo.attributes.normal.array
  const idxSrc = sourceGeo.index ? sourceGeo.index.array : null

  const posOut = new Float32Array(posSrc.length)
  const nrmOut = new Float32Array(nrmSrc.length)

  for (let i = 0; i < posSrc.length; i += 3) {
    posOut[i]     = posSrc[i]     + nrmSrc[i]     * thickness
    posOut[i + 1] = posSrc[i + 1] + nrmSrc[i + 1] * thickness
    posOut[i + 2] = posSrc[i + 2] + nrmSrc[i + 2] * thickness
    nrmOut[i]     = -nrmSrc[i]
    nrmOut[i + 1] = -nrmSrc[i + 1]
    nrmOut[i + 2] = -nrmSrc[i + 2]
  }

  const outlineGeo = new THREE.BufferGeometry()
  outlineGeo.setAttribute('position', new THREE.Float32BufferAttribute(posOut, 3))
  outlineGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nrmOut, 3))
  if (idxSrc) outlineGeo.setIndex(Array.from(idxSrc))
  return outlineGeo
}


export class CatModel {
  constructor() {
    this.root = new THREE.Group()
    this.registry = new CharacterPartRegistry(this.root)
    this._furMaterials = []
    this._furColor = '#f4c430'
    this._furStyle = 'Golden'
    this._eyeStyle = 'Original'
    this._faceExpression = 'Excited'
    this._gearType = null
    this._equippedGear = null
    this._eyelids = []

    // 子组引用
    this._headGroup = null
    this._bodyGroup = null
    this._eyeGroupL = null
    this._eyeGroupR = null
    this._mouthGroup = null
    this._gearRoot = null
    this._vrHeadset = null

    // 动画状态
    this._earLGroup = null
    this._earRGroup = null
    this._armLGroup = null
    this._armRGroup = null
    this._footLGroup = null
    this._footRGroup = null
    this._tailGroup = null

    this._buildBody()
    this.equipmentAssembler = new EquipmentAssembler(this.registry)
    const animatorOptions = {
      root: this.root,
      registry: this.registry,
      parts: {
        body: this._bodyGroup, head: this._headGroup,
        earLeft: this._earLGroup, earRight: this._earRGroup,
        armLeft: this._armLGroup, armRight: this._armRGroup,
        legLeft: this._footLGroup, legRight: this._footRGroup,
      },
      updateTail: (...args) => this._updateTailSurface(...args),
    }
    this.animator = new CatAnimator(animatorOptions)
    this.animationRig = createCatAnimationRig({
      root: this.root, registry: this.registry,
      updateTail: animatorOptions.updateTail,
      getRunSpeed: () => this.animator.runSpeed,
    })
    for (const [mode, strategy] of Object.entries(createCatPoseStrategies(this.animationRig))) {
      this.animator.registerStrategy(mode, strategy)
    }
  }

  // ========== Public API ==========

  get group() { return this.root }

  setFurTrait(style, hex) {
    this._furStyle = style || 'Custom'
    this._furColor = hex
    if (this._bodyGeoRef) {
      const recipe = applyFurRecipeToGeometry(this._bodyGeoRef, this._furStyle, this._furColor)
      this.root.userData.appearance = { ...(this.root.userData.appearance ?? {}), fur: recipe }
    }
    this._furMaterials.forEach(m => m.color.set('#ffffff'))
    this._eyelids.forEach(lid => lid.material.color.set(hex))
    const trait = style === 'Custom' ? { color: hex } : getFurTrait(style)
    this.root.traverse(part => {
      if (!part.isMesh || !part.material?.color) return
      if (/Arm(Left|Right)(Upper|Fore|Socket|ShoulderBlend|ElbowBlend|WristCover|ContinuousSurface)|Leg(Left|Right)(Upper|Lower|HipBlend|KneeBlend|AnkleCover|ContinuousSurface)|Tail(Segment|RootBlend|Blend|Surface)|Ear(Left|Right)Outer/.test(part.name)) part.material.color.set(trait.color)
      if (/Paw$|Digit\d|Leg(Left|Right)Sole|Toe\d/.test(part.name)) part.material.color.set('#f5f1e6')
    })
  }

  setFurColor(hex) { this.setFurTrait('Custom', hex) }

  setEyeStyle(style) {
    this._eyeStyle = style
    this._rebuildEyes()
    this._rebuildVRHeadset()
    if (this._gearType) this.setGear(this._gearType)
  }

  setFaceExpression(expr) {
    this._faceExpression = expr
    this._rebuildMouth()
  }

  setGear(type) {
    this._gearType = type
    this._equippedGear = this.equipmentAssembler.set(type)
    const policy = resolveFaceEquipmentPolicy(this._eyeStyle, type)
    if (this._equippedGear) {
      this._equippedGear.visible = policy.equipmentVisible
      this._equippedGear.userData.faceEquipmentPolicy = policy
      if (policy.offset) this._equippedGear.position.add(new THREE.Vector3(...policy.offset))
    }
  }

  setAnimation(mode = 'standing') {
    this.animator.setAnimation(mode)
  }

  setRunSpeed(speed = 1) {
    this.animator.setRunSpeed(speed)
  }

  _updateTailSurface(time, intensity = 0.06, speed = 1) {
    updateCatTail(this._tailGroup, time, intensity, speed)
  }




  setMorphology({ bodyScale = 1, headScale = 1, earScale = 1, legLength = 1, tailLength = 1, tailCurl = 0 } = {}) {
    this.root.userData.morphology = applyMorphology({
      body: this.registry.getPart('body'), head: this.registry.getPart('head'),
      earLeft: this.registry.getPart('ear-left'), earRight: this.registry.getPart('ear-right'),
      armLeft: this.registry.getPart('arm-left'), armRight: this.registry.getPart('arm-right'),
      legLeft: this.registry.getPart('leg-left'), legRight: this.registry.getPart('leg-right'), tail: this.registry.getPart('tail'),
    }, { bodyScale, headScale, earScale, legLength, tailLength, tailCurl })
  }







  update(time) {
    this.animator.update(time)
  }

  dispose() {
    this.equipmentAssembler.dispose()
    this._equippedGear = null
    disposeObject3DResources(this.root, { detach: false, excludeGeometries: [this._bodyGeoRef] })
  }

  // ========== Private: 构建身体 ==========

  _buildBody() {
    // -- SDF 主体（loaf 面包猫） --
    const { mesh: sdfBody, headCenter, headRadius } = createSdfCatBody(this._furColor, {
      headSize: 1.0,
      chubbiness: 1.0,
    })

    // 替换 SDF 默认材质为 ToonMaterial
    if (sdfBody.material) sdfBody.material.dispose()
    sdfBody.material = furMat(this._furColor)
    sdfBody.material.color.set('#ffffff')
    this._furMaterials.push(sdfBody.material)
    this._bodyGeoRef = sdfBody.geometry
    const initialFurRecipe = applyFurRecipeToGeometry(sdfBody.geometry, this._furStyle, this._furColor)
    this.root.userData.appearance = { ...(this.root.userData.appearance ?? {}), fur: initialFurRecipe }

    // 描边
    const outlineGeo = createOutlineGeometry(sdfBody.geometry, 0.018)
    const outlineMat = new THREE.MeshBasicMaterial({
      color: '#1a1518',
      side: THREE.BackSide,
      depthTest: true,
      depthWrite: false,
    })
    const outline = new THREE.Mesh(outlineGeo, outlineMat)
    outline.renderOrder = 1
    outline.name = 'SdfCatOutline'

    // 身体组（身体 + 描边）
    const bodyGroup = assembleBodyShell(sdfBody, outline)
    this.root.add(bodyGroup)
    this._bodyGroup = bodyGroup
    this.registry.registerPart('body', bodyGroup)

    // Arms are separate, thick 3D assemblies so they stay visible and animation-ready.
    const limbOptions = { gradientMap: getToonGradientMap(), createHeart: createHeartNose }
    const limbs = createLimbSet(
      side => createRaisedArm(side, limbOptions),
      side => createFoot(side, limbOptions),
    )
    this._armLGroup = limbs.armLeft
    this._armRGroup = limbs.armRight
    this.root.add(this._armLGroup, this._armRGroup)
    this.registry.registerPart('arm-left', this._armLGroup)
    this.registry.registerPart('arm-right', this._armRGroup)
    this.registry.registerJoints('arm-left', this._armLGroup.userData.joints)
    this.registry.registerJoints('arm-right', this._armRGroup.userData.joints)
    delete this._armLGroup.userData.joints
    delete this._armRGroup.userData.joints

    // Match the reference stance: one planted foot and one lifted sole, both with five toes.
    this._footLGroup = limbs.legLeft
    this._footRGroup = limbs.legRight
    this.root.add(this._footLGroup, this._footRGroup)
    this.registry.registerPart('leg-left', this._footLGroup)
    this.registry.registerPart('leg-right', this._footRGroup)
    this.registry.registerJoints('leg-left', this._footLGroup.userData.joints)
    this.registry.registerJoints('leg-right', this._footRGroup.userData.joints)
    delete this._footLGroup.userData.joints
    delete this._footRGroup.userData.joints

    this._tailGroup = createCatTail(getToonGradientMap())
    this.root.add(this._tailGroup)
    this.registry.registerPart('tail', this._tailGroup)

    // -- 头部组（面特征容器） --
    const headGroup = new THREE.Group()
    headGroup.position.copy(headCenter)
    this.root.add(headGroup)
    this._headGroup = headGroup
    this.registry.registerPart('head', headGroup)
    // Face is a stable semantic aggregate. It aliases the head transform so all
    // eyes/mouth/nose children share one animation/export coordinate contract.
    this.registry.registerPart('face', headGroup)

    // -- 内耳贴花（粉红耳内） --
    this._earLGroup = createCatEar(headRadius, -1, getToonGradientMap())
    this._earLGroup.position.add(headCenter)
    this.root.add(this._earLGroup)
    this.registry.registerPart('ear-left', this._earLGroup)

    this._earRGroup = createCatEar(headRadius, 1, getToonGradientMap())
    this._earRGroup.position.add(headCenter)
    this.root.add(this._earRGroup)
    this.registry.registerPart('ear-right', this._earRGroup)

    // -- 鼻子 --
    const n = createHeartNose(headRadius * 0.105)
    // Keep the default heart nose proud of the rounded muzzle, like the pixel references.
    n.position.set(0, -headRadius * 0.22, headRadius * 1.22)
    n.castShadow = true
    headGroup.add(n)

    // -- 嘴巴组 --
    this._mouthGroup = new THREE.Group()
    this._mouthGroup.name = 'FaceMouth'
    // Keep the expression root on the muzzle surface. Small line/tube expressions were
    // previously buried inside the deeper SDF head while only the large Excited mouth escaped.
    this._mouthGroup.position.set(0, -headRadius * 0.50, headRadius * 1.18)
    this._mouthGroup.scale.setScalar(1.05)
    headGroup.add(this._mouthGroup)
    this._rebuildMouth()

    // -- 胡须 --
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 3; i++) {
        const startY = -headRadius * (0.28 + i * 0.12)
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * headRadius * 0.28, startY, headRadius * 0.82),
          new THREE.Vector3(s * headRadius * 0.52, startY + (1 - i) * 0.015, headRadius * 0.85),
          new THREE.Vector3(s * headRadius * (0.82 + i * 0.08), startY + (1 - i) * 0.035, headRadius * 0.78),
        ])
        const wGeo = new THREE.TubeGeometry(curve, 12, 0.006, 5, false)
        const w = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({ color: '#27232b', roughness: 0.62 }))
        w.castShadow = true
        headGroup.add(w)
      }
    }

    // -- 眼睛占位 --
    this._eyeGroupL = new THREE.Group()
    this._eyeGroupL.name = 'FaceEyeLeft'
    this._eyeGroupL.position.set(-headRadius * 0.43, headRadius * 0.10, headRadius * 0.84)
    headGroup.add(this._eyeGroupL)

    this._eyeGroupR = new THREE.Group()
    this._eyeGroupR.name = 'FaceEyeRight'
    this._eyeGroupR.position.set(headRadius * 0.43, headRadius * 0.10, headRadius * 0.84)
    headGroup.add(this._eyeGroupR)

    // -- VR 头显根 --
    this._vrHeadset = new THREE.Group()
    this._vrHeadset.position.set(0, headRadius * 0.08, headRadius * 0.44)
    headGroup.add(this._vrHeadset)

    // -- 装备根 --
    this._gearRoot = new THREE.Group()
    this.root.add(this._gearRoot)
    this.registry.registerPart('gear-root', this._gearRoot)
    this.registry.createSocket('head-top', headGroup, [-headCenter.x, 1.30 - headCenter.y, -headCenter.z])
    this.registry.createSocket('face-eyes', headGroup, [-headCenter.x, 0.955 - headCenter.y, 0.395 - headCenter.z])
    this.registry.registerSocket('face-mouth', this._mouthGroup)
    this.registry.createSocket('chest-front', bodyGroup, [0, 0.57, 0.405])
    this.registry.createSocket('back', bodyGroup, [0, 0.47, -0.37])
    this.registry.createSocket('paw-left', this._armLGroup, [-0.14, -0.46, 0.20])
    this.registry.createSocket('shoulder-left', bodyGroup, [-0.32, 0.64, 0.12])
    this.registry.createSocket('shoulder-right', bodyGroup, [0.32, 0.64, 0.12])
    this.registry.createSocket('hip-left', bodyGroup, [-0.18, -0.10, 0.02])
    this.registry.createSocket('hip-right', bodyGroup, [0.18, -0.10, 0.02])
    this.registry.createSocket('tail-base', bodyGroup, [0.04, -0.08, -0.31])

    // 初始构建
    this._rebuildEyes()
    this._rebuildVRHeadset()
  }

  // ========== Private: 嘴巴 ==========

  _rebuildMouth() {
    if (!this._mouthGroup) return
    while (this._mouthGroup.children.length) this._mouthGroup.remove(this._mouthGroup.children[0])

    const expr = this._faceExpression
    const g = this._mouthGroup
    const profile = getFaceAppearanceProfile(expr)
    g.scale.setScalar(1.05 * profile.scale)
    g.userData.faceExpression = expr
    g.userData.faceFamily = profile.family
    g.userData.faceBounds = { width: profile.mouthWidth, height: profile.mouthHeight }
    g.userData.hasTongue = profile.hasTongue
    g.userData.hasFangs = profile.hasFangs
    g.userData.componentContract = ['mouth-cavity', 'teeth', 'tongue', 'lip-line']

    if (expr === 'Excited') {
      const cavity = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 22, 16, 0, Math.PI * 2, 0, Math.PI),
        mouthCavityMat()
      )
      cavity.scale.set(1.18, 1.02, 0.72)
      cavity.rotation.x = Math.PI
      cavity.position.set(0, -0.025, -0.060)
      g.add(cavity)

      const tongue = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        tongueMat()
      )
      tongue.scale.set(1.25, 0.82, 0.8)
      tongue.position.set(0, -0.080, -0.015)
      g.add(tongue)

      for (const sx of [-1, 1]) {
        const fang = new THREE.Mesh(
          new THREE.ConeGeometry(0.014, 0.05, 8),
          new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 })
        )
        fang.position.set(sx * 0.065, 0.03, -0.040)
        fang.rotation.z = sx * 0.15
        g.add(fang)
      }
    } else if (expr === 'Smile') {
      const smileMat = new THREE.MeshStandardMaterial({ color: '#381212', roughness: 0.5 })
      // A short philtrum and two asymmetric cubic arcs read more naturally than a sharp V.
      const philtrum = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.046, 0.025),
        new THREE.Vector3(0, 0.025, 0.031),
        new THREE.Vector3(0, 0.010, 0.031),
      ])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(philtrum, 8, 0.0065, 6, false), smileMat))
      for (const side of [-1, 1]) {
        const curve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(0, 0.010, 0.030),
          new THREE.Vector3(side * 0.018, -0.030, 0.036),
          new THREE.Vector3(side * 0.060, -0.031, 0.031),
          new THREE.Vector3(side * 0.084, 0.008, 0.022),
        )
        const cheek = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.084, 0.008, 0.022),
          new THREE.Vector3(side * 0.090, 0.018, 0.018),
        ])
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.007, 7, false), smileMat))
        g.add(new THREE.Mesh(new THREE.TubeGeometry(cheek, 4, 0.006, 6, false), smileMat))
      }
    } else if (expr === 'Whistling') {
      const o = new THREE.Mesh(
        new THREE.CylinderGeometry(0.030, 0.030, 0.018, 20, 1, false),
        mouthCavityMat()
      )
      o.rotation.x = Math.PI / 2
      o.position.set(0, -0.015, 0.02)
      g.add(o)
      const lip = new THREE.Mesh(
        new THREE.TorusGeometry(0.035, 0.008, 8, 20),
        new THREE.MeshStandardMaterial({ color: '#e8917a', roughness: 0.4 })
      )
      lip.position.set(0, -0.015, 0.02)
      g.add(lip)
      const noteMat = new THREE.MeshBasicMaterial({ color: '#17151b' })
      const stem = new THREE.Mesh(new RoundedBoxGeometry(0.015, 0.105, 0.015, 2, 0.006), noteMat)
      stem.position.set(0.115, -0.055, 0.035); stem.rotation.z = -0.10; g.add(stem)
      const flag = new THREE.Mesh(new RoundedBoxGeometry(0.070, 0.018, 0.015, 2, 0.007), noteMat)
      flag.position.set(0.085, -0.005, 0.035); flag.rotation.z = -0.25; g.add(flag)
      const noteHead = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 8), noteMat)
      noteHead.scale.x = 1.35; noteHead.position.set(0.100, -0.105, 0.04); g.add(noteHead)
    } else if (expr === 'Wow') {
      const o = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.063, 0.055, 8, 20),
        mouthCavityMat()
      )
      o.scale.set(0.92, 1.05, 0.48)
      o.position.set(0, -0.040, 0.028)
      g.add(o)
      const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.048, 18, 12), tongueMat())
      tongue.scale.set(1.04, 0.55, 0.42)
      tongue.position.set(0, -0.091, 0.063)
      g.add(tongue)
      const lowerLip = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.043, -0.112, 0.066),
        new THREE.Vector3(0, -0.122, 0.072),
        new THREE.Vector3(0.043, -0.112, 0.066),
      ])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(lowerLip, 12, 0.006, 6, false), tongueMat()))
    } else if (expr === 'Yum') {
      const smileMat = new THREE.MeshStandardMaterial({ color: '#381212', roughness: 0.5 })
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.065, 0, 0.02), new THREE.Vector3(0, -0.022, 0.025), new THREE.Vector3(0.065, 0, 0.02),
      ])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.008, 6, false), smileMat))
      // Side-licking tongue: broad at the mouth, rounded at the tip, and visibly creased.
      const tongueShape = new THREE.Shape()
      tongueShape.moveTo(-0.010, 0.020)
      tongueShape.bezierCurveTo(0.020, 0.012, 0.055, 0.002, 0.077, -0.020)
      tongueShape.bezierCurveTo(0.095, -0.040, 0.088, -0.068, 0.064, -0.073)
      tongueShape.bezierCurveTo(0.032, -0.078, 0.006, -0.050, -0.010, -0.025)
      tongueShape.closePath()
      const tongueGeo = new THREE.ExtrudeGeometry(tongueShape, {
        depth: 0.018, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.006, bevelThickness: 0.005,
      })
      const tongue = new THREE.Mesh(tongueGeo, tongueMat())
      tongue.position.set(0.025, -0.006, 0.060)
      g.add(tongue)
      const crease = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.072, -0.030, 0.088),
        new THREE.Vector3(0.078, -0.047, 0.090),
        new THREE.Vector3(0.066, -0.060, 0.088),
      ])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(crease, 8, 0.003, 5, false), smileMat))
    }
  }

  // ========== Private: 眼睛 ==========

  _rebuildEyes() {
    const clear = (g) => { while (g.children.length) g.remove(g.children[0]) }
    clear(this._eyeGroupL)
    clear(this._eyeGroupR)
    this._eyelids = []

    // 头部半径参考（约 0.3）
    const eyeR = 0.118
    const irR = 0.084
    const hlR = 0.026
    const profile = getEyeAppearanceProfile(this._eyeStyle)
    const eyeBounds = { radius: eyeR, irisRadius: irR, highlightRadius: hlR }
    for (const group of [this._eyeGroupL, this._eyeGroupR]) {
      group.userData.eyeStyle = this._eyeStyle
      group.userData.eyeFamily = profile.family
      group.userData.eyeBounds = eyeBounds
      group.userData.componentContract = ['eyeball', 'rim', 'pupil', 'highlight', 'wearable']
    }

    const build = (group, side) => {
      switch (this._eyeStyle) {
        case 'Original': {
          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(eyeR * 0.82, eyeR * 0.09, 10, 28),
            new THREE.MeshStandardMaterial({ color: profile.accent, roughness: profile.roughness, metalness: profile.metalness })
          )
          rim.position.z = 0.078; group.add(rim)
          const p = new THREE.Mesh(new THREE.SphereGeometry(irR, 18, 14), pupil())
          p.scale.set(1, 1.08, 0.72); p.position.z = 0.082; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(-0.025, 0.036, 0.145); group.add(h)
          const h2 = new THREE.Mesh(new THREE.SphereGeometry(hlR * 0.42, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h2.position.set(0.035, -0.025, 0.142); group.add(h2)
          break
        }
        case 'Relaxed': {
          const w = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.94, 20, 16), eyeWhite())
          w.scale.z = 0.72; group.add(w)
          for (let line = -1; line <= 1; line++) {
            const bar = new THREE.Mesh(
              new RoundedBoxGeometry(eyeR * 1.25, 0.010, 0.016, 2, 0.005),
            new THREE.MeshBasicMaterial({ color: profile.primary })
            )
            bar.position.set(0, line * 0.025, 0.100)
            group.add(bar)
          }
          break
        }
        case 'Alert': {
          const rim = new THREE.Mesh(new THREE.TorusGeometry(eyeR * 0.88, eyeR * 0.10, 10, 28),
            new THREE.MeshStandardMaterial({ color: profile.accent, roughness: 0.32 }))
          rim.position.z = 0.076; group.add(rim)
          const iris = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.82, 20, 16),
            new THREE.MeshStandardMaterial({ color: profile.primary, roughness: profile.roughness, metalness: profile.metalness }))
          iris.scale.set(0.88, 1.06, 0.68); iris.position.z = 0.080; group.add(iris)
          const p = new THREE.Mesh(new THREE.CapsuleGeometry(irR * 0.16, irR * 1.18, 6, 10), pupil())
          p.position.z = 0.142; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR * 1.1, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.035, 0.043, 0.157); group.add(h)
          break
        }
        case 'Blue Ring': {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(eyeR * 0.76, eyeR * 0.13, 12, 28),
            new THREE.MeshStandardMaterial({ color: profile.accent, roughness: profile.roughness, metalness: profile.metalness,
              emissive: profile.emissive, emissiveIntensity: profile.emissiveIntensity }))
          ring.position.z = 0.086; group.add(ring)
          const p = new THREE.Mesh(new THREE.SphereGeometry(irR * 0.90, 18, 14), pupil())
          p.scale.z = 0.68; p.position.z = 0.088; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.032, 0.040, 0.150); group.add(h)
          break
        }
        case 'Sunglasses': {
          const lens = new THREE.Mesh(new RoundedBoxGeometry(eyeR * 2.05, eyeR * 1.18, 0.055, 4, 0.025),
            new THREE.MeshStandardMaterial({ color: profile.primary, roughness: profile.roughness, metalness: profile.metalness }))
          lens.position.z = 0.080; group.add(lens)
          for (const [x, y, scale] of [[-0.035, 0.025, 1], [0.025, -0.018, 0.62]]) {
            const refl = new THREE.Mesh(new RoundedBoxGeometry(0.036 * scale, 0.055 * scale, 0.008, 2, 0.004),
              new THREE.MeshBasicMaterial({ color: '#ffffff' }))
            refl.position.set(x, y, 0.112); refl.rotation.z = -0.55; group.add(refl)
          }
          if (side < 0) {
            const bridge = new THREE.Mesh(new RoundedBoxGeometry(eyeR * 0.72, 0.032, 0.035, 2, 0.012),
              new THREE.MeshStandardMaterial({ color: '#09090d', roughness: 0.15, metalness: 0.4 }))
            bridge.position.set(eyeR * 1.35, 0.005, 0.091); group.add(bridge)
          }
          break
        }
        case 'VR': {
          // VR 头显由 _rebuildVRHeadset 单独绘制
          break
        }
        case 'Big Black': {
          const be = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 1.22, 22, 18),
            new THREE.MeshStandardMaterial({ color: profile.primary, roughness: profile.roughness, metalness: profile.metalness }))
          be.scale.set(1, 1.15, 0.7); group.add(be)
          for (const [x, y, s] of [[0.022, 0.035, 0.022], [-0.018, 0.048, 0.010]]) {
            const h = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6),
              new THREE.MeshBasicMaterial({ color: '#ffffff' }))
            h.position.set(x, y, 0.058); group.add(h)
          }
          break
        }
      }
    }
    build(this._eyeGroupL, -1)
    build(this._eyeGroupR, 1)
  }

  // ========== Private: VR 头显 ==========

  _rebuildVRHeadset() {
    if (!this._vrHeadset) return
    while (this._vrHeadset.children.length) this._vrHeadset.remove(this._vrHeadset.children[0])

    if (this._eyeStyle !== 'VR') {
      this._vrHeadset.visible = false
      return
    }
    this._vrHeadset.visible = true

    const g = this._vrHeadset
    const profile = getEyeAppearanceProfile('VR')

    // 深黑玻璃曲面
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: profile.primary,
      roughness: profile.roughness,
      metalness: profile.metalness,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.5,
    })

    const frameShell = new THREE.Mesh(
      new RoundedBoxGeometry(0.90, 0.38, 0.20, 5, 0.10),
      metal(profile.accent)
    )
    frameShell.position.set(0, 0, 0.18)
    frameShell.castShadow = true
    g.add(frameShell)

    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.32, 0.20, 5, 0.09), visorMat)
    visor.position.set(0, 0, 0.205)
    visor.castShadow = true
    g.add(visor)

    // 银色铝框
    const frameMat = metal(profile.accent)

    // 头带
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.50, 0.022, 8, 48),
      new THREE.MeshStandardMaterial({ color: '#c8cdd5', roughness: 0.35, metalness: 0.6 })
    )
    strap.rotation.x = Math.PI / 2
    strap.position.set(0, 0, -0.08)
    strap.scale.set(1, 1.08, 1)
    g.add(strap)

    // 玻璃反光条
    const reflMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })
    const refl1 = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.018), reflMat)
    refl1.position.set(-0.08, 0.045, 0.315)
    refl1.rotation.y = -0.08
    g.add(refl1)
    const refl2 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.018), reflMat)
    refl2.position.set(0.07, 0.045, 0.315)
    refl2.rotation.y = 0.06
    g.add(refl2)

    // 侧边扬声器
    const sidePod = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.035, 0.10, 6, 10),
      frameMat
    )
    sidePod.position.set(0.50, 0, 0.05)
    sidePod.rotation.z = Math.PI / 2
    g.add(sidePod)
    const sidePodL = sidePod.clone()
    sidePodL.position.set(-0.50, 0, 0.05)
    g.add(sidePodL)
  }

}
