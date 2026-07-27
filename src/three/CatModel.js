import * as THREE from 'three'
import { createGear, TEXTURE_GEAR_TYPES } from './EquipmentFactory.js'

// ===== 材质工厂 =====
function furMat(hex) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: 0.62,
    metalness: 0.03,
  })
}
function whiteFurMat() {
  return new THREE.MeshStandardMaterial({
    color: '#f8f8f8',
    roughness: 0.65,
    metalness: 0.02,
  })
}
function innerEarMat() {
  return new THREE.MeshStandardMaterial({
    color: '#e85a50',
    roughness: 0.45,
    metalness: 0.02,
  })
}
function eyeWhite() {
  return new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 })
}
function pupil() {
  return new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.1 })
}
function noseMat() {
  return new THREE.MeshStandardMaterial({ color: '#e8917a', roughness: 0.4 })
}
function mouthCavityMat() {
  return new THREE.MeshStandardMaterial({ color: '#4a1a1a', roughness: 0.55 })
}
function tongueMat() {
  return new THREE.MeshStandardMaterial({ color: '#f07070', roughness: 0.35 })
}
function metal(hex) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.22, metalness: 0.88 })
}
// ===== 心形掌垫几何体 =====
function createHeartPadGeometry(scale = 1) {
  const s = new THREE.Shape()
  const x = 0, y = 0
  s.moveTo(x, y + 0.06)
  s.bezierCurveTo(x - 0.05, y + 0.10, x - 0.10, y + 0.05, x - 0.10, y)
  s.bezierCurveTo(x - 0.10, y - 0.08, x, y - 0.14, x, y - 0.14)
  s.bezierCurveTo(x, y - 0.14, x + 0.10, y - 0.08, x + 0.10, y)
  s.bezierCurveTo(x + 0.10, y + 0.05, x + 0.05, y + 0.10, x, y + 0.06)
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 })
  geo.scale(scale, scale, scale)
  geo.center()
  return geo
}

export class CatModel {
  constructor() {
    this.root = new THREE.Group()
    this._furMaterials = []
    this._furColor = '#f4c430'
    this._eyeStyle = 'VR'
    this._faceExpression = 'Excited'
    this._gearType = null
    this._eyelids = []

    // 子组引用
    this._headGroup = null
    this._eyeGroupL = null
    this._eyeGroupR = null
    this._mouthGroup = null
    this._gearRoot = null
    this._vrHeadset = null

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
    // 呼吸动画：整体轻微缩放 + 头部微微独立晃动
    const breathe = 1 + Math.sin(time * 1.6) * 0.010
    this.root.scale.setScalar(breathe)
    if (this._headGroup) {
      this._headGroup.rotation.z = Math.sin(time * 0.9) * 0.015
      this._headGroup.rotation.x = Math.sin(time * 1.1) * 0.01
    }
  }

  dispose() {
    this.root.traverse(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  }

  // ========== Private: 构建身体 ==========

  _buildBody() {
    const f = () => {
      const m = furMat(this._furColor)
      this._furMaterials.push(m)
      return m
    }
    const wf = whiteFurMat()

    // -- 主躯干：圆润梨形 --
    const bodyGeo = new THREE.SphereGeometry(0.62, 40, 32)
    const body = new THREE.Mesh(bodyGeo, f())
    body.scale.set(1.0, 1.18, 0.86)
    body.position.set(0, 0.98, 0)
    body.castShadow = true
    body.receiveShadow = true
    this.root.add(body)

    // -- 白色胸腹斑 --
    const chestGeo = new THREE.SphereGeometry(0.45, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55)
    const chest = new THREE.Mesh(chestGeo, wf)
    chest.scale.set(1.05, 1.35, 0.55)
    chest.position.set(0, 0.92, 0.30)
    chest.rotation.x = -0.12
    chest.receiveShadow = true
    this.root.add(chest)

    // -- 头部 --
    const headGroup = new THREE.Group()
    headGroup.position.set(0, 1.74, 0.06)
    this.root.add(headGroup)
    this._headGroup = headGroup

    const headGeo = new THREE.SphereGeometry(0.48, 40, 32)
    const head = new THREE.Mesh(headGeo, f())
    head.scale.set(1.18, 1.06, 0.96)
    head.castShadow = true
    head.receiveShadow = true
    headGroup.add(head)

    // -- 耳朵 (外黄内红) --
    const addEar = (x, rotZ) => {
      const eg = new THREE.Group()
      eg.position.set(x, 0.30, -0.06)
      eg.rotation.z = rotZ
      eg.rotation.x = -0.12

      const outerGeo = new THREE.ConeGeometry(0.15, 0.40, 16, 4)
      const outer = new THREE.Mesh(outerGeo, f())
      outer.position.y = 0.08
      outer.castShadow = true
      eg.add(outer)

      const innerGeo = new THREE.ConeGeometry(0.09, 0.26, 16, 4)
      const inner = new THREE.Mesh(innerGeo, innerEarMat())
      inner.position.set(0, 0.06, 0.035)
      inner.scale.z = 0.55
      eg.add(inner)

      headGroup.add(eg)
    }
    addEar(-0.29, 0.28)
    addEar(0.29, -0.28)

    // -- 吻部 --
    const muzzGeo = new THREE.SphereGeometry(0.14, 24, 16)
    const muzz = new THREE.Mesh(muzzGeo, f())
    muzz.scale.set(1.25, 0.75, 0.65)
    muzz.position.set(0, -0.16, 0.36)
    muzz.castShadow = true
    headGroup.add(muzz)

    // -- 鼻子 --
    const nGeo = new THREE.SphereGeometry(0.045, 16, 12)
    const n = new THREE.Mesh(nGeo, noseMat())
    n.scale.set(1.2, 0.8, 1)
    n.position.set(0, -0.06, 0.43)
    headGroup.add(n)

    // -- 嘴巴组 --
    this._mouthGroup = new THREE.Group()
    this._mouthGroup.position.set(0, -0.14, 0.40)
    headGroup.add(this._mouthGroup)
    this._rebuildMouth()

    // -- 胡须 --
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 3; i++) {
        const wGeo = new THREE.CylinderGeometry(0.006, 0.010, 0.32, 6)
        const w = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.5 }))
        w.position.set(s * (0.10 + i * 0.03), -0.09 - i * 0.045, 0.36)
        w.rotation.z = s * (0.12 + i * 0.06)
        w.rotation.y = s * (0.45 + i * 0.08)
        w.rotation.x = -0.05
        headGroup.add(w)
      }
    }

    // -- 前肢 --
    const addFrontArm = (x) => {
      const ag = new THREE.Group()
      ag.position.set(x, 1.18, 0.12)
      // 上臂
      const armGeo = new THREE.CapsuleGeometry(0.095, 0.30, 8, 14)
      const arm = new THREE.Mesh(armGeo, f())
      arm.position.y = -0.10
      arm.rotation.z = x > 0 ? -0.12 : 0.12
      arm.castShadow = true
      ag.add(arm)
      // 白色手掌
      const pawGeo = new THREE.SphereGeometry(0.10, 16, 12)
      const paw = new THREE.Mesh(pawGeo, wf)
      paw.scale.set(1, 0.75, 1.1)
      paw.position.set(x > 0 ? 0.02 : -0.02, -0.40, 0.02)
      paw.castShadow = true
      ag.add(paw)
      this.root.add(ag)
    }
    addFrontArm(-0.48)
    addFrontArm(0.48)

    // -- 后肢 --
    const addBackLeg = (x) => {
      const lg = new THREE.Group()
      lg.position.set(x, 0.42, -0.04)
      // 腿
      const legGeo = new THREE.CapsuleGeometry(0.11, 0.32, 8, 14)
      const leg = new THREE.Mesh(legGeo, f())
      leg.position.y = -0.08
      leg.castShadow = true
      lg.add(leg)
      // 白色脚
      const footGeo = new THREE.SphereGeometry(0.12, 18, 14)
      const foot = new THREE.Mesh(footGeo, wf)
      foot.scale.set(1, 0.65, 1.25)
      foot.position.set(0, -0.32, 0.04)
      foot.castShadow = true
      lg.add(foot)
      // 红色心形掌垫 (朝后 -Z)
      const pad = new THREE.Mesh(createHeartPadGeometry(1.15), innerEarMat())
      pad.position.set(0, -0.32, -0.105)
      pad.rotation.x = -0.12
      pad.scale.set(0.55, 0.55, 0.55)
      lg.add(pad)
      this.root.add(lg)
    }
    addBackLeg(-0.24)
    addBackLeg(0.24)

    // -- 尾巴 (带白尖) --
    const tailPts = [
      new THREE.Vector3(0, 0.65, -0.52),
      new THREE.Vector3(0.04, 0.95, -0.72),
      new THREE.Vector3(0.12, 1.28, -0.68),
      new THREE.Vector3(0.18, 1.52, -0.50),
      new THREE.Vector3(0.14, 1.68, -0.30),
    ]
    const tailCurve = new THREE.CatmullRomCurve3(tailPts)
    const tailGeo = new THREE.TubeGeometry(tailCurve, 32, 0.07, 12, false)
    const tail = new THREE.Mesh(tailGeo, f())
    tail.castShadow = true
    tail.receiveShadow = true
    this.root.add(tail)

    // 尾巴白尖
    const tipGeo = new THREE.SphereGeometry(0.075, 16, 12)
    const tip = new THREE.Mesh(tipGeo, wf)
    tip.scale.set(1, 0.85, 1)
    tip.position.copy(tailPts[tailPts.length - 1])
    tip.position.y += 0.02
    this.root.add(tip)

    // -- 眼睛占位 --
    this._eyeGroupL = new THREE.Group()
    this._eyeGroupL.position.set(-0.145, 0.06, 0.36)
    headGroup.add(this._eyeGroupL)

    this._eyeGroupR = new THREE.Group()
    this._eyeGroupR.position.set(0.145, 0.06, 0.36)
    headGroup.add(this._eyeGroupR)

    // -- VR 头显根 ( eyeStyle === 'VR' 时启用) --
    this._vrHeadset = new THREE.Group()
    this._vrHeadset.position.set(0, 0.06, 0.18)
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
      // 张开大笑：暗腔 + 舌头 + 獠牙
      const cavity = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 20, 14, 0, Math.PI * 2, 0, Math.PI),
        mouthCavityMat()
      )
      cavity.scale.set(1.3, 0.8, 0.7)
      cavity.rotation.x = Math.PI
      cavity.position.set(0, -0.02, 0.02)
      g.add(cavity)

      const tongue = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        tongueMat()
      )
      tongue.scale.set(1.1, 0.6, 0.8)
      tongue.position.set(0, -0.055, 0.035)
      g.add(tongue)

      for (const sx of [-1, 1]) {
        const fang = new THREE.Mesh(
          new THREE.ConeGeometry(0.018, 0.06, 8),
          new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 })
        )
        fang.position.set(sx * 0.08, 0.04, 0.04)
        fang.rotation.z = sx * 0.15
        g.add(fang)
      }
    } else if (expr === 'Smile') {
      const smile = new THREE.Mesh(
        new THREE.TorusGeometry(0.07, 0.012, 8, 20, Math.PI),
        new THREE.MeshStandardMaterial({ color: '#4a1a1a', roughness: 0.5 })
      )
      smile.rotation.x = Math.PI
      smile.position.set(0, -0.02, 0.01)
      g.add(smile)
    } else if (expr === 'Whistling') {
      const o = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20, 1, false),
        mouthCavityMat()
      )
      o.rotation.x = Math.PI / 2
      o.position.set(0, -0.02, 0.02)
      g.add(o)
      const lip = new THREE.Mesh(
        new THREE.TorusGeometry(0.045, 0.01, 8, 20),
        new THREE.MeshStandardMaterial({ color: '#e8917a', roughness: 0.4 })
      )
      lip.position.set(0, -0.02, 0.02)
      g.add(lip)
    } else if (expr === 'Wow') {
      const o = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 20, 14),
        mouthCavityMat()
      )
      o.scale.set(1, 1.1, 0.7)
      o.position.set(0, -0.025, 0.015)
      g.add(o)
    } else if (expr === 'Yum') {
      const cavity = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 18, 12, 0, Math.PI * 2, 0, Math.PI),
        mouthCavityMat()
      )
      cavity.scale.set(1.2, 0.6, 0.7)
      cavity.rotation.x = Math.PI
      cavity.position.set(0, -0.01, 0.015)
      g.add(cavity)
      const tongue = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
        tongueMat()
      )
      tongue.scale.set(1, 0.4, 0.9)
      tongue.position.set(0, -0.05, 0.08)
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

    // VR 模式下眼睛被头显遮住，但仍可保留以便切换其它眼睛时可见
    const build = (group) => {
      switch (this._eyeStyle) {
        case 'Original': {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 16), eyeWhite()))
          const p = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), pupil())
          p.position.z = 0.06; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.018, 0.025, 0.078); group.add(h)
          break
        }
        case 'Relaxed': {
          const w = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), eyeWhite())
          w.scale.y = 0.55; group.add(w)
          const lidGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.12, 20, 1, false, 0, Math.PI)
          const lid = new THREE.Mesh(lidGeo, furMat(this._furColor))
          lid.rotation.z = Math.PI / 2; lid.position.y = 0.028
          group.add(lid)
          this._eyelids.push(lid)
          break
        }
        case 'Alert': {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), eyeWhite()))
          const p = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), pupil())
          p.position.z = 0.07; group.add(p)
          const h = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }))
          h.position.set(0.012, 0.020, 0.088); group.add(h)
          break
        }
        case 'Blue Ring': {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 16), eyeWhite()))
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.018, 10, 22),
            new THREE.MeshStandardMaterial({ color: '#4488ff', roughness: 0.2, metalness: 0.3,
              emissive: '#112244', emissiveIntensity: 0.4 }))
          ring.position.z = 0.05; group.add(ring)
          const p = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), pupil())
          p.position.z = 0.058; group.add(p)
          break
        }
        case 'Sunglasses': {
          const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 24),
            new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.15, metalness: 0.5 }))
          lens.rotation.x = Math.PI / 2; lens.position.z = 0.025; group.add(lens)
          const refl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 6),
            new THREE.MeshBasicMaterial({ color: '#667799', transparent: true, opacity: 0.25 }))
          refl.position.set(0.02, 0.03, 0.048); group.add(refl)
          break
        }
        case 'VR': {
          // VR 模式下眼睛本身不可见，由 _rebuildVRHeadset 绘制头显
          break
        }
        case 'Big Black': {
          const be = new THREE.Mesh(new THREE.SphereGeometry(0.11, 22, 18),
            new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.12, metalness: 0.05 }))
          be.scale.set(1, 1.15, 0.7); group.add(be)
          for (const [x, y] of [[0.025, 0.04], [-0.02, 0.055]]) {
            const h = new THREE.Mesh(new THREE.SphereGeometry(x === 0.025 ? 0.025 : 0.012, 8, 6),
              new THREE.MeshBasicMaterial({ color: '#ffffff' }))
            h.position.set(x, y, 0.065); group.add(h)
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

    // 曲面镜体：用圆柱侧面截出横向弯曲的护目镜
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

    // 头带 (绕过头部)
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.50, 0.022, 8, 48),
      new THREE.MeshStandardMaterial({ color: '#c8cdd5', roughness: 0.35, metalness: 0.6 })
    )
    strap.rotation.x = Math.PI / 2
    strap.position.set(0, 0, -0.08)
    strap.scale.set(1, 1.08, 1)
    g.add(strap)

    // 玻璃反光条 (Vision Pro 标志性的两条高光)
    const reflMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })
    const refl1 = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.018), reflMat)
    refl1.position.set(-0.08, 0.045, 0.36)
    refl1.rotation.y = -0.08
    g.add(refl1)
    const refl2 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.018), reflMat)
    refl2.position.set(0.07, 0.045, 0.36)
    refl2.rotation.y = 0.06
    g.add(refl2)

    // 左侧旋钮 / 扬声器网格细节
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

    // 全部装备委托给 EquipmentFactory（程序化 + 贴图混合）
    if (TEXTURE_GEAR_TYPES.has(this._gearType)) {
      const gear = createGear(this._gearType)
      if (gear) this._gearRoot.add(gear)
    }
  }
}
