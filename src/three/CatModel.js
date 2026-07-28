import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createGear, TEXTURE_GEAR_TYPES } from './EquipmentFactory.js'
import { createSdfCatBody } from './SdfCatBody.js'
import { getFurTrait } from '../config/traits.js'

// ===== Toon 渐变贴图（参考 Meow-Generator MeshToonMaterial） =====
let _sharedToonMap = null
function getToonGradientMap() {
  if (_sharedToonMap) return _sharedToonMap
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = 2
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, size, 0)
  // 暗面 → 中间调 → 亮面（模拟 cel-shading 但保留软过渡）
  grad.addColorStop(0.0, '#261e14')
  grad.addColorStop(0.28, '#4a3a24')
  grad.addColorStop(0.50, '#9e7a48')
  grad.addColorStop(0.72, '#dcc498')
  grad.addColorStop(1.0, '#fef9f0')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, 2)
  _sharedToonMap = new THREE.CanvasTexture(canvas)
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

const WHITE_FUR = new THREE.Color('#f5f1e6')
const DARK_FUR = new THREE.Color('#29272f')

function cellNoise(x, y, z, seed = 0) {
  const qx = Math.floor(x * 13)
  const qy = Math.floor(y * 11)
  const qz = Math.floor(z * 9)
  const value = Math.sin(qx * 127.1 + qy * 311.7 + qz * 74.7 + seed * 19.19) * 43758.5453
  return value - Math.floor(value)
}

function applyFurVertexColors(geometry, style, customColor) {
  const trait = style === 'Custom'
    ? { color: customColor, accent: customColor, pattern: 'solid' }
    : getFurTrait(style)
  const base = new THREE.Color(customColor || trait.color)
  const accent = new THREE.Color(trait.accent || trait.color)
  const positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3)
  const color = new THREE.Color()

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const ax = Math.abs(x)
    const front = z > 0.08
    const muzzle = front && y > 0.79 && y < 1.13 && ax < 0.235
    const chestWidth = 0.10 + Math.max(0, 0.82 - y) * 0.14
    const chest = front && y > -0.35 && y < 0.84 && ax < chestWidth
    const paws = front && y < -0.30 && ax > 0.065
    const whiteMask = muzzle || chest || paws

    color.copy(base)
    if (trait.pattern === 'tuxedo') {
      if (whiteMask || (front && y > 0.80 && ax < 0.11)) color.copy(WHITE_FUR)
    } else if (trait.pattern === 'calico') {
      color.copy(WHITE_FUR)
      const patch = cellNoise(x * 0.8, y * 0.75, z * 0.8, 3)
      if (!whiteMask && patch > 0.57) color.copy(patch > 0.78 ? DARK_FUR : accent)
    } else if (trait.pattern === 'leopard') {
      if (whiteMask) color.copy(WHITE_FUR)
      else {
        const spot = cellNoise(x * 1.8, y * 1.7, z * 1.5, 7)
        if (spot > 0.74) color.copy(accent)
      }
    } else if (trait.pattern === 'lightning-tabby') {
      if (whiteMask) color.copy(WHITE_FUR)
      const forehead = front && y > 1.05 && ax < 0.20
      const bodyStripe = Math.sin((y + x * 0.75) * 34) > 0.58 && z > -0.05
      if ((forehead && Math.sin((x + y) * 48) > 0.05) || (bodyStripe && !whiteMask)) color.copy(accent)
    } else if (whiteMask) {
      color.copy(WHITE_FUR)
    }

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.attributes.color.needsUpdate = true
}
function innerEarMat() {
  return new THREE.MeshStandardMaterial({
    color: '#e85a50',
    roughness: 0.42,
    metalness: 0.02,
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

// ===== 内耳贴花（参考 Meow-Generator makeInnerEarDecal） =====
function createInnerEarDecal(headRadius, earSide) {
  const shape = new THREE.Shape()
  shape.moveTo(-headRadius * 0.20, -headRadius * 0.20)
  shape.lineTo(headRadius * 0.20, -headRadius * 0.20)
  shape.lineTo(0, headRadius * 0.34)
  shape.closePath()
  const innerGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.008, bevelSegments: 2 })
  innerGeo.center()
  const innerMesh = new THREE.Mesh(innerGeo, innerEarMat())
  innerMesh.position.set(earSide * headRadius * 0.72, headRadius * 1.02, headRadius * 0.10)
  innerMesh.rotation.z = -earSide * 0.12
  innerMesh.castShadow = true
  return innerMesh
}

export class CatModel {
  constructor() {
    this.root = new THREE.Group()
    this._furMaterials = []
    this._furColor = '#f4c430'
    this._furStyle = 'Golden'
    this._eyeStyle = 'Original'
    this._faceExpression = 'Excited'
    this._gearType = null
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

    this._buildBody()
  }

  // ========== Public API ==========

  get group() { return this.root }

  setFurTrait(style, hex) {
    this._furStyle = style || 'Custom'
    this._furColor = hex
    if (this._bodyGeoRef) applyFurVertexColors(this._bodyGeoRef, this._furStyle, this._furColor)
    this._furMaterials.forEach(m => m.color.set('#ffffff'))
    this._eyelids.forEach(lid => lid.material.color.set(hex))
  }

  setFurColor(hex) { this.setFurTrait('Custom', hex) }

  setEyeStyle(style) {
    this._eyeStyle = style
    this._rebuildEyes()
    this._rebuildVRHeadset()
  }

  setFaceExpression(expr) {
    this._faceExpression = expr
    this._rebuildMouth()
  }

  setGear(type) {
    this._gearType = type
    this._rebuildGear()
  }

  update(time) {
    // 呼吸动画 + Meow-Generator 风格 idle
    const breathe = 1 + Math.sin(time * 1.5) * 0.012
    this.root.scale.set(1.14 * breathe, 0.92 * breathe, breathe)

    if (this._headGroup) {
      // 头部轻微独立晃动
      this._headGroup.rotation.z = Math.sin(time * 0.8) * 0.020
      this._headGroup.rotation.x = Math.sin(time * 1.05) * 0.012
      this._headGroup.rotation.y = Math.sin(time * 0.65) * 0.015
    }

    // 耳朵独立微动
    if (this._earLGroup) {
      this._earLGroup.rotation.z = Math.sin(time * 1.3 + 0.5) * 0.04
      this._earLGroup.rotation.x = Math.sin(time * 1.1) * 0.03
    }
    if (this._earRGroup) {
      this._earRGroup.rotation.z = Math.sin(time * 1.3 - 0.5) * 0.04
      this._earRGroup.rotation.x = Math.sin(time * 1.1 + 0.3) * 0.03
    }
  }

  dispose() {
    this.root.traverse(child => {
      if (child.geometry && child.geometry !== this._bodyGeoRef) {
        child.geometry.dispose()
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          if (child.material.map) child.material.map.dispose()
          child.material.dispose()
        }
      }
    })
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
    applyFurVertexColors(sdfBody.geometry, this._furStyle, this._furColor)

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
    const bodyGroup = new THREE.Group()
    bodyGroup.add(sdfBody)
    bodyGroup.add(outline)
    this.root.add(bodyGroup)
    this._bodyGroup = bodyGroup

    // -- 头部组（面特征容器） --
    const headGroup = new THREE.Group()
    headGroup.position.copy(headCenter)
    this.root.add(headGroup)
    this._headGroup = headGroup

    // -- 内耳贴花（粉红耳内） --
    this._earLGroup = new THREE.Group()
    const earLDecal = createInnerEarDecal(headRadius, -1)
    this._earLGroup.add(earLDecal)
    this._earLGroup.position.copy(headCenter)
    this.root.add(this._earLGroup)

    this._earRGroup = new THREE.Group()
    const earRDecal = createInnerEarDecal(headRadius, 1)
    this._earRGroup.add(earRDecal)
    this._earRGroup.position.copy(headCenter)
    this.root.add(this._earRGroup)

    // -- 鼻子 --
    const nGeo = new THREE.SphereGeometry(headRadius * 0.11, 16, 12)
    const n = new THREE.Mesh(nGeo, noseMat())
    n.scale.set(1.2, 0.8, 1)
    n.position.set(0, -headRadius * 0.22, headRadius * 0.91)
    n.castShadow = true
    headGroup.add(n)

    // -- 嘴巴组 --
    this._mouthGroup = new THREE.Group()
    this._mouthGroup.position.set(0, -headRadius * 0.52, headRadius * 0.82)
    this._mouthGroup.scale.setScalar(1.18)
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
    this._eyeGroupL.position.set(-headRadius * 0.43, headRadius * 0.08, headRadius * 0.84)
    headGroup.add(this._eyeGroupL)

    this._eyeGroupR = new THREE.Group()
    this._eyeGroupR.position.set(headRadius * 0.43, headRadius * 0.08, headRadius * 0.84)
    headGroup.add(this._eyeGroupR)

    // -- VR 头显根 --
    this._vrHeadset = new THREE.Group()
    this._vrHeadset.position.set(0, headRadius * 0.08, headRadius * 0.44)
    headGroup.add(this._vrHeadset)

    // -- 装备根 --
    this._gearRoot = new THREE.Group()
    this.root.add(this._gearRoot)

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

    if (expr === 'Excited') {
      const cavity = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 20, 14, 0, Math.PI * 2, 0, Math.PI),
        mouthCavityMat()
      )
      cavity.scale.set(1.3, 0.8, 0.7)
      cavity.rotation.x = Math.PI
      cavity.position.set(0, -0.01, 0.01)
      g.add(cavity)

      const tongue = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        tongueMat()
      )
      tongue.scale.set(1.1, 0.6, 0.8)
      tongue.position.set(0, -0.045, 0.025)
      g.add(tongue)

      for (const sx of [-1, 1]) {
        const fang = new THREE.Mesh(
          new THREE.ConeGeometry(0.014, 0.05, 8),
          new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 })
        )
        fang.position.set(sx * 0.065, 0.03, 0.03)
        fang.rotation.z = sx * 0.15
        g.add(fang)
      }
    } else if (expr === 'Smile') {
      const smile = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.010, 8, 20, Math.PI),
        new THREE.MeshStandardMaterial({ color: '#381212', roughness: 0.5 })
      )
      smile.rotation.x = Math.PI
      smile.position.set(0, -0.015, 0.01)
      g.add(smile)
    } else if (expr === 'Whistling') {
      const o = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.015, 20, 1, false),
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
    } else if (expr === 'Wow') {
      const o = new THREE.Mesh(
        new THREE.SphereGeometry(0.060, 20, 14),
        mouthCavityMat()
      )
      o.scale.set(1, 1.1, 0.7)
      o.position.set(0, -0.02, 0.01)
      g.add(o)
    } else if (expr === 'Yum') {
      const cavity = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 18, 12, 0, Math.PI * 2, 0, Math.PI),
        mouthCavityMat()
      )
      cavity.scale.set(1.2, 0.6, 0.7)
      cavity.rotation.x = Math.PI
      cavity.position.set(0, -0.005, 0.01)
      g.add(cavity)
      const tongue = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
        tongueMat()
      )
      tongue.scale.set(1, 0.4, 0.9)
      tongue.position.set(0, -0.04, 0.06)
      tongue.rotation.x = 0.4
      g.add(tongue)
    }
  }

  // ========== Private: 眼睛 ==========

  _rebuildEyes() {
    const clear = (g) => { while (g.children.length) g.remove(g.children[0]) }
    clear(this._eyeGroupL)
    clear(this._eyeGroupR)
    this._eyelids = []

    // 头部半径参考（约 0.3）
    const eyeR = 0.098
    const irR = 0.043
    const hlR = 0.016

    const build = (group) => {
      switch (this._eyeStyle) {
        case 'Original': {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(eyeR, 20, 16), eyeWhite()))
          const p = new THREE.Mesh(new THREE.SphereGeometry(irR, 14, 10), pupil())
          p.position.z = 0.095; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.018, 0.024, 0.126); group.add(h)
          break
        }
        case 'Relaxed': {
          const w = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.95, 20, 14), eyeWhite())
          w.scale.y = 0.66; group.add(w)
          for (let line = -1; line <= 1; line++) {
            const bar = new THREE.Mesh(
              new THREE.BoxGeometry(eyeR * 1.35, 0.009, 0.012),
              new THREE.MeshBasicMaterial({ color: '#17151b' })
            )
            bar.position.set(0, line * 0.022, 0.094)
            group.add(bar)
          }
          break
        }
        case 'Alert': {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(eyeR * 1.18, 20, 16), eyeWhite()))
          const p = new THREE.Mesh(new THREE.SphereGeometry(irR * 0.65, 12, 8), pupil())
          p.position.z = 0.112; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR * 1.1, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.012, 0.020, 0.136); group.add(h)
          break
        }
        case 'Blue Ring': {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.95, 20, 16), eyeWhite()))
          const ring = new THREE.Mesh(new THREE.TorusGeometry(irR * 1.05, 0.016, 10, 22),
            new THREE.MeshStandardMaterial({ color: '#4488ff', roughness: 0.2, metalness: 0.3,
              emissive: '#112244', emissiveIntensity: 0.4 }))
          ring.position.z = 0.104; group.add(ring)
          const p = new THREE.Mesh(new THREE.SphereGeometry(irR * 0.70, 12, 8), pupil())
          p.position.z = 0.110; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.020, 0.024, 0.130); group.add(h)
          break
        }
        case 'Sunglasses': {
          const lens = new THREE.Mesh(new THREE.CylinderGeometry(eyeR * 1.10, eyeR * 1.10, 0.035, 24),
            new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.15, metalness: 0.5 }))
          lens.rotation.x = Math.PI / 2; lens.position.z = 0.022; group.add(lens)
          const refl = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.65, 12, 6),
            new THREE.MeshBasicMaterial({ color: '#667799', transparent: true, opacity: 0.25 }))
          refl.position.set(0.018, 0.026, 0.042); group.add(refl)
          break
        }
        case 'VR': {
          // VR 头显由 _rebuildVRHeadset 单独绘制
          break
        }
        case 'Big Black': {
          const be = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 1.22, 22, 18),
            new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.12, metalness: 0.05 }))
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
    build(this._eyeGroupL)
    build(this._eyeGroupR)
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

    // 深黑玻璃曲面
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: '#0a0a12',
      roughness: 0.04,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.5,
    })

    const frameShell = new THREE.Mesh(
      new RoundedBoxGeometry(0.90, 0.38, 0.20, 5, 0.10),
      metal('#d0d5dd')
    )
    frameShell.position.set(0, 0, 0.18)
    frameShell.castShadow = true
    g.add(frameShell)

    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.32, 0.20, 5, 0.09), visorMat)
    visor.position.set(0, 0, 0.205)
    visor.castShadow = true
    g.add(visor)

    // 银色铝框
    const frameMat = metal('#d0d5dd')

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

  // ========== Private: 装备 ==========

  _rebuildGear() {
    while (this._gearRoot.children.length) this._gearRoot.remove(this._gearRoot.children[0])
    if (!this._gearType) return

    if (TEXTURE_GEAR_TYPES.has(this._gearType)) {
      const gear = createGear(this._gearType)
      if (gear) this._gearRoot.add(gear)
    }
  }
}
