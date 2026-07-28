import * as THREE from 'three'
import { createGear, TEXTURE_GEAR_TYPES } from './EquipmentFactory.js'
import { createSdfCatBody } from './SdfCatBody.js'

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
    roughness: 0.55,
    metalness: 0.02,
  })
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
function createInnerEarDecal(headCenter, headRadius, earSide) {
  // 耳朵根部在头部上的位置
  const sx = earSide > 0 ? 1 : -1
  const earBase = new THREE.Vector3(
    headCenter.x + sx * headRadius * 0.52,
    headCenter.y + headRadius * 0.62,
    headCenter.z - headRadius * 0.08
  )
  const earTip = new THREE.Vector3(
    headCenter.x + sx * headRadius * 0.62,
    headCenter.y + headRadius * 1.20,
    headCenter.z - headRadius * 0.15
  )
  // 方向：耳朵轴线
  const dir = new THREE.Vector3().subVectors(earTip, earBase).normalize()
  const up = new THREE.Vector3(0, 1, 0)
  // 构建局部坐标系
  const right = new THREE.Vector3().crossVectors(dir, up).normalize()
  if (right.length() < 0.01) right.set(1, 0, 0)
  up.crossVectors(right, dir).normalize()

  // 创建一个锥形来表示内耳粉红色区域
  const innerGeo = new THREE.ConeGeometry(headRadius * 0.28, headRadius * 0.65, 12, 4)
  const innerMesh = new THREE.Mesh(innerGeo, innerEarMat())

  // 放置到耳朵位置
  innerMesh.position.copy(earBase).addScaledVector(dir, headRadius * 0.20)
  // 旋转使锥体沿耳朵方向
  const quat = new THREE.Quaternion()
  const m4 = new THREE.Matrix4().lookAt(
    new THREE.Vector3(0, 0, 0),
    dir,
    up
  )
  quat.setFromRotationMatrix(m4)
  innerMesh.setRotationFromQuaternion(quat)
  innerMesh.scale.set(1, 1, 0.6) // 压扁贴合耳朵

  return innerMesh
}

export class CatModel {
  constructor() {
    this.root = new THREE.Group()
    this._furMaterials = []
    this._furColor = '#f4c430'
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

  setFurColor(hex) {
    this._furColor = hex
    this._furMaterials.forEach(m => m.color.set(hex))
    this._eyelids.forEach(lid => lid.material.color.set(hex))
  }

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
    this.root.scale.setScalar(breathe)

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
    this._furMaterials.push(sdfBody.material)
    this._bodyGeoRef = sdfBody.geometry

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
    const earLDecal = createInnerEarDecal(headCenter, headRadius, -1)
    this._earLGroup.add(earLDecal)
    this._earLGroup.position.copy(headCenter)
    this.root.add(this._earLGroup)

    this._earRGroup = new THREE.Group()
    const earRDecal = createInnerEarDecal(headCenter, headRadius, 1)
    this._earRGroup.add(earRDecal)
    this._earRGroup.position.copy(headCenter)
    this.root.add(this._earRGroup)

    // -- 鼻子 --
    const nGeo = new THREE.SphereGeometry(headRadius * 0.16, 16, 12)
    const n = new THREE.Mesh(nGeo, noseMat())
    n.scale.set(1.2, 0.8, 1)
    n.position.set(0, -headRadius * 0.25, headRadius * 0.88)
    n.castShadow = true
    headGroup.add(n)

    // -- 嘴巴组 --
    this._mouthGroup = new THREE.Group()
    this._mouthGroup.position.set(0, -headRadius * 0.42, headRadius * 0.80)
    headGroup.add(this._mouthGroup)
    this._rebuildMouth()

    // -- 胡须 --
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 3; i++) {
        const wGeo = new THREE.CylinderGeometry(0.005, 0.009, headRadius * 0.70, 6)
        const w = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.5 }))
        w.position.set(
          s * (headRadius * 0.32 + i * 0.06),
          -headRadius * 0.28 - i * 0.10,
          headRadius * 0.78
        )
        w.rotation.z = s * (0.12 + i * 0.06)
        w.rotation.y = s * (0.48 + i * 0.08)
        w.rotation.x = -0.06
        w.castShadow = true
        headGroup.add(w)
      }
    }

    // -- 眼睛占位 --
    this._eyeGroupL = new THREE.Group()
    this._eyeGroupL.position.set(-headRadius * 0.50, headRadius * 0.10, headRadius * 0.82)
    headGroup.add(this._eyeGroupL)

    this._eyeGroupR = new THREE.Group()
    this._eyeGroupR.position.set(headRadius * 0.50, headRadius * 0.10, headRadius * 0.82)
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
    const eyeR = 0.082
    const irR = 0.036
    const hlR = 0.013

    const build = (group) => {
      switch (this._eyeStyle) {
        case 'Original': {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(eyeR, 20, 16), eyeWhite()))
          const p = new THREE.Mesh(new THREE.SphereGeometry(irR, 14, 10), pupil())
          p.position.z = 0.055; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.016, 0.022, 0.070); group.add(h)
          break
        }
        case 'Relaxed': {
          const w = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.95, 20, 14), eyeWhite())
          w.scale.y = 0.55; group.add(w)
          const lidGeo = new THREE.CylinderGeometry(eyeR, eyeR, 0.10, 20, 1, false, 0, Math.PI)
          const lid = new THREE.Mesh(lidGeo, furMat(this._furColor))
          lid.rotation.z = Math.PI / 2; lid.position.y = 0.025
          group.add(lid)
          this._eyelids.push(lid)
          break
        }
        case 'Alert': {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(eyeR * 1.18, 20, 16), eyeWhite()))
          const p = new THREE.Mesh(new THREE.SphereGeometry(irR * 0.65, 12, 8), pupil())
          p.position.z = 0.065; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(hlR * 1.1, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.010, 0.018, 0.080); group.add(h)
          break
        }
        case 'Blue Ring': {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.95, 20, 16), eyeWhite()))
          const ring = new THREE.Mesh(new THREE.TorusGeometry(irR * 1.05, 0.016, 10, 22),
            new THREE.MeshStandardMaterial({ color: '#4488ff', roughness: 0.2, metalness: 0.3,
              emissive: '#112244', emissiveIntensity: 0.4 }))
          ring.position.z = 0.045; group.add(ring)
          const p = new THREE.Mesh(new THREE.SphereGeometry(irR * 0.70, 12, 8), pupil())
          p.position.z = 0.052; group.add(p)
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

    const visorGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 48, 1, true, -Math.PI * 0.62, Math.PI * 1.24)
    const visor = new THREE.Mesh(visorGeo, visorMat)
    visor.rotation.z = Math.PI / 2
    visor.scale.set(1.15, 1, 0.78)
    visor.position.set(0, 0, 0.18)
    visor.castShadow = true
    g.add(visor)

    // 银色铝框
    const frameMat = metal('#d0d5dd')
    const frameCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.40, 0.12, 0.28),
      new THREE.Vector3(-0.46, 0, 0.22),
      new THREE.Vector3(-0.40, -0.12, 0.28),
      new THREE.Vector3(0, -0.16, 0.32),
      new THREE.Vector3(0.40, -0.12, 0.28),
      new THREE.Vector3(0.46, 0, 0.22),
      new THREE.Vector3(0.40, 0.12, 0.28),
      new THREE.Vector3(0, 0.16, 0.32),
      new THREE.Vector3(-0.40, 0.12, 0.28),
    ], true)
    const frame = new THREE.Mesh(new THREE.TubeGeometry(frameCurve, 64, 0.014, 8, true), frameMat)
    g.add(frame)

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
    refl1.position.set(-0.08, 0.045, 0.36)
    refl1.rotation.y = -0.08
    g.add(refl1)
    const refl2 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.018), reflMat)
    refl2.position.set(0.07, 0.045, 0.36)
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
