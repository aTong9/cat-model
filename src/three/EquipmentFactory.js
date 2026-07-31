import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { installEquipmentAnimationRig } from '../character/equipment/equipmentAnimation.js'

const loader = new THREE.TextureLoader()
const cache = {}

// ===== 预加载所有装备贴图 =====
const TEXTURE_MAP = {
  'Baseball Cap': '/equipment/BaseballCap.png',
  'Camera': '/equipment/Camera.png',
  'Gold Round Glasses': '/equipment/GoldRoundGlasses.png',
  'Good Luck Gold Bar': '/equipment/GoodLuckGoldBar.png',
  'Hiking Backpack': '/equipment/HikingBackpack.png',
  'Hot Coffee': '/equipment/HotCoffee.png',
  'Investment Book': '/equipment/InvestmentBook.png',
  'Ramen': '/equipment/Ramen.png',
  'Sake': '/equipment/Sake.png',
  'Wealth Gold Bar': '/equipment/WealthGoldBar.png',
}

export async function preloadGearTextures() {
  const entries = Object.entries(TEXTURE_MAP)
  await Promise.all(
    entries.map(
      ([key, path]) =>
        new Promise((resolve) => {
          loader.load(
            path,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace
              cache[key] = tex
              resolve()
            },
            undefined,
            () => {
              console.warn(`[Equipment] failed to load texture: ${path}`)
              cache[key] = null
              resolve()
            }
          )
        })
    )
  )
}

function tex(key) {
  return cache[key] || null
}

export const GEAR_MODEL_SPECS = {
  'Baseball Cap': { reference: '/equipment/BaseballCap.png', socket: 'head-top', collider: { type: 'box', size: [0.78, 0.28, 0.62] } },
  'Camera': { reference: '/equipment/Camera.png', socket: 'chest-front', collider: { type: 'box', size: [0.32, 0.20, 0.16] } },
  'Gold Round Glasses': { reference: '/equipment/GoldRoundGlasses.png', socket: 'face-eyes', collider: { type: 'box', size: [0.48, 0.22, 0.06] } },
  'Good Luck Gold Bar': { reference: '/equipment/GoodLuckGoldBar.png', socket: 'paw-left', collider: { type: 'box', size: [0.21, 0.36, 0.08] } },
  'Hiking Backpack': { reference: '/equipment/HikingBackpack.png', socket: 'back', collider: { type: 'box', size: [0.30, 0.42, 0.16] } },
  'Hot Coffee': { reference: '/equipment/HotCoffee.png', socket: 'head-top', collider: { type: 'cylinder', radius: 0.08, height: 0.25 } },
  'Investment Book': { reference: '/equipment/InvestmentBook.png', socket: 'head-top', collider: { type: 'box', size: [0.30, 0.06, 0.24] } },
  'Ramen': { reference: '/equipment/Ramen.png', socket: 'head-top', collider: { type: 'cylinder', radius: 0.16, height: 0.22 } },
  'Sake': { reference: '/equipment/Sake.png', socket: 'head-top', collider: { type: 'compound', parts: ['bottle', 'cup'] } },
  'Wealth Gold Bar': { reference: '/equipment/WealthGoldBar.png', socket: 'paw-left', collider: { type: 'box', size: [0.22, 0.38, 0.12] } },
}

function decorateGearModel(type, root) {
  const spec = GEAR_MODEL_SPECS[type]
  root.name = `Gear:${type}`
  root.userData.gearType = type
  root.userData.referenceImage = spec.reference
  root.userData.attachment = { socket: spec.socket, contactType: 'socket', gapTolerance: 0.02 }
  root.userData.collider = structuredClone(spec.collider)
  root.userData.exportable = true

  const parts = {}
  let partIndex = 0
  root.traverse(child => {
    if (!child.isMesh) return
    if (!child.name) child.name = `${type.replaceAll(' ', '')}:part-${partIndex}`
    child.castShadow = true
    child.receiveShadow = true
    child.userData.partId = child.name
    child.userData.explodeWithParent = true
    parts[child.name] = child
    partIndex++
  })
  // Mesh references must stay outside userData: GLTFExporter serializes userData as JSON.
  Object.defineProperty(root, 'sculptRuntime', {
    value: { parts, sockets: { attachment: spec.socket }, colliders: [root.userData.collider] },
    configurable: true,
  })
  installEquipmentAnimationRig(root, type)
  return root
}

// ===== 辅助：创建带贴图的平面 decal（始终正对相机的最佳实践）=====
function createDecal(tex, width, height, opts = {}) {
  const geo = new THREE.PlaneGeometry(width, height)
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthTest: opts.depthTest !== false,
    depthWrite: opts.depthWrite !== false,
    side: opts.side || THREE.FrontSide,
  })
  return new THREE.Mesh(geo, mat)
}

// ===== 装备创建函数 =====

// --- 棒球帽（像素体素风格，参考 Camera.html 的 Box 堆积建模方式） ---
function createBaseballCap() {
  const g = new THREE.Group()

  const domeColor = '#545b6b'
  const brimColor = '#8c7258'
  const bandColor = '#6b5542'
  const seamColor = '#3e4452'
  const buttonColor = '#454c5a'
  const goldColor = '#c9a84c'

  const inner = new THREE.Group()

  // ===== 帽顶：多层 Box 堆出半球（完全不用 SphereGeometry） =====
  const domeLayers = [
    { y: 0.000, w: 0.66, h: 0.04, d: 0.58 },
    { y: 0.040, w: 0.62, h: 0.04, d: 0.54 },
    { y: 0.080, w: 0.56, h: 0.04, d: 0.49 },
    { y: 0.120, w: 0.48, h: 0.04, d: 0.42 },
    { y: 0.160, w: 0.36, h: 0.04, d: 0.32 },
    { y: 0.200, w: 0.20, h: 0.04, d: 0.18 },
  ]
  const domeMat = new THREE.MeshStandardMaterial({ color: domeColor, roughness: 0.55, metalness: 0.02 })
  domeLayers.forEach(l => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(l.w, l.h, l.d), domeMat)
    block.position.y = l.y
    block.castShadow = true
    inner.add(block)
  })

  // ===== 6 条 panel seam（垂直方柱，从帽顶辐射到下缘） =====
  const seamMatLocal = new THREE.MeshStandardMaterial({ color: seamColor, roughness: 0.6 })
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI - Math.PI / 2
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.22, 0.02), seamMatLocal)
    seam.position.set(Math.sin(a) * 0.28, 0.1, Math.cos(a) * 0.24)
    seam.rotation.y = -a
    inner.add(seam)
  }

  // ===== 帽檐：扁平方块 =====
  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 0.02, 0.32),
    new THREE.MeshStandardMaterial({ color: brimColor, roughness: 0.45, metalness: 0.02 })
  )
  brim.position.set(0, -0.03, 0.28)
  brim.rotation.x = -0.05
  brim.castShadow = true
  inner.add(brim)

  // ===== 帽檐上方深色条带 =====
  const brimBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.024, 0.06),
    new THREE.MeshStandardMaterial({ color: bandColor, roughness: 0.45 })
  )
  brimBand.position.set(0, -0.025, 0.14)
  inner.add(brimBand)

  // ===== 帽檐下侧阴影 =====
  const brimUnder = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.01, 0.30),
    new THREE.MeshStandardMaterial({ color: '#6e5842', roughness: 0.5 })
  )
  brimUnder.position.set(0, -0.04, 0.28)
  brimUnder.rotation.x = -0.05
  inner.add(brimUnder)

  // ===== 3D 像素化 Bitcoin B 标志（小方块浮在帽子正面） =====
  const pixelBGroup = new THREE.Group()
  const bMat = new THREE.MeshStandardMaterial({ color: goldColor, roughness: 0.3, metalness: 0.3 })
  const pixelSize = 0.02
  const bPattern = [
    ' ███  ',
    '██ ██ ',
    '██ ██ ',
    '████  ',
    '██ ██ ',
    '████  ',
    '██ ██ ',
    '██ ██ ',
    ' ███  ',
  ]
  const gapScale = 0.02
  bPattern.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '█') {
        const p = new THREE.Mesh(
          new THREE.BoxGeometry(pixelSize, pixelSize, pixelSize * 0.6),
          bMat
        )
        p.position.set(
          (x - (row.length - 1) / 2) * (pixelSize + gapScale),
          (bPattern.length / 2 - y - 0.5) * (pixelSize + gapScale),
          0
        )
        pixelBGroup.add(p)
      }
    }
  })
  pixelBGroup.position.set(0, 0.08, 0.285)
  pixelBGroup.rotation.x = -0.10
  inner.add(pixelBGroup)

  // ===== 顶部小纽扣 =====
  const btn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12),
    new THREE.MeshStandardMaterial({ color: buttonColor, roughness: 0.4 })
  )
  btn.position.y = 0.22
  inner.add(btn)

  g.add(inner)
  g.position.set(0, 1.32, -0.02)
  g.rotation.x = -0.25
  return g
}

// --- 金框眼镜（像素方块圆环 + 粗黑边框，参考 GoldRoundGlasses.html） ---
function createGoldRoundGlasses() {
  const g = new THREE.Group()

  const goldMat  = new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.22, metalness: 0.88 })
  const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 })

  const RADIUS = 0.09
  const PIXEL_SIZE = 0.014
  const SPACING = 0.115 // 镜框到中心距离

  // 创建一个像素圆环（粗黑边框 + 金色主体）
  function createPixelRing() {
    const ring = new THREE.Group()
    const circumference = 2 * Math.PI * RADIUS
    const count = Math.floor(circumference / PIXEL_SIZE)
    const geo = new THREE.BoxGeometry(PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE * 0.6)

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = Math.cos(angle) * RADIUS
      const y = Math.sin(angle) * RADIUS

      // 黑色边框层（放后面，尺寸放大）
      const border = new THREE.Mesh(geo, blackMat)
      border.position.set(x, y, -0.008)
      border.scale.set(1.4, 1.4, 1.2)
      ring.add(border)

      // 金色主体层（放前面，原尺寸）
      const main = new THREE.Mesh(geo, goldMat)
      main.position.set(x, y, 0)
      ring.add(main)
    }
    return ring
  }

  // 鼻桥（像素方块 + 黑色边框）
  function createBridge() {
    const bridge = new THREE.Group()
    const bw = 4 * PIXEL_SIZE * 1.4 // 4 格宽
    const bh = 2 * PIXEL_SIZE * 1.4 // 2 格高

    // 黑色背景
    const borderGeo = new THREE.BoxGeometry(bw, bh, PIXEL_SIZE * 0.6)
    const border = new THREE.Mesh(borderGeo, blackMat)
    border.position.z = -0.008
    bridge.add(border)

    // 金色主体
    const mainGeo = new THREE.BoxGeometry(4 * PIXEL_SIZE, 2 * PIXEL_SIZE, PIXEL_SIZE * 0.5)
    const main = new THREE.Mesh(mainGeo, goldMat)
    bridge.add(main)

    return bridge
  }

  // 左镜框
  const leftRing = createPixelRing()
  leftRing.position.x = -SPACING
  g.add(leftRing)

  // 右镜框
  const rightRing = createPixelRing()
  rightRing.position.x = SPACING
  g.add(rightRing)

  // 鼻桥
  const bridge = createBridge()
  g.add(bridge)

  g.position.set(0, 1.02, 0.32)
  return g
}

// --- 登山背包（像素风 Box 堆积建模，参考 HikingBackpack.html） ---
function createHikingBackpack() {
  const g = new THREE.Group()

  // 材质
  const orangeFabric = new THREE.MeshStandardMaterial({ color: '#E86C1A', roughness: 0.85, metalness: 0.0 })
  const darkOrange    = new THREE.MeshStandardMaterial({ color: '#C44A10', roughness: 0.90, metalness: 0.0 })
  const frontPanelMat = new THREE.MeshStandardMaterial({ color: '#F08020', roughness: 0.80, metalness: 0.0 })
  const brownLeather   = new THREE.MeshStandardMaterial({ color: '#8B5A2B', roughness: 0.60, metalness: 0.0 })
  const darkBrown     = new THREE.MeshStandardMaterial({ color: '#5C3A1A', roughness: 0.70, metalness: 0.0 })
  const brassMetal    = new THREE.MeshStandardMaterial({ color: '#C4A35A', roughness: 0.25, metalness: 0.92 })
  const stitchMat     = new THREE.MeshStandardMaterial({ color: '#6B3A15', roughness: 0.70 })
  const seamMat       = new THREE.MeshStandardMaterial({ color: '#803000', roughness: 0.90 })
  const rollHighlightMat = new THREE.MeshStandardMaterial({
    color: '#FF9A30', roughness: 0.8, metalness: 0, transparent: true, opacity: 0.25,
  })

  const inner = new THREE.Group()

  // 尺寸（适配站立猫比例）
  const bodyW = 0.30
  const bodyH = 0.40
  const bodyD = 0.14
  const bodyY = -0.02

  // ===== 1. 包身主体 =====
  const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyD)
  const bodyMesh = new THREE.Mesh(bodyGeo, orangeFabric)
  bodyMesh.position.y = bodyY
  bodyMesh.castShadow = true
  inner.add(bodyMesh)

  // 正面高光面板
  const frontGeo = new THREE.BoxGeometry(bodyW * 0.88, bodyH * 0.86, 0.003)
  const frontPanel = new THREE.Mesh(frontGeo, frontPanelMat)
  frontPanel.position.set(0, bodyY, bodyD / 2 + 0.002)
  inner.add(frontPanel)

  // 侧面阴影条
  const sideShadowGeo = new THREE.BoxGeometry(0.006, bodyH * 0.88, bodyD * 0.88)
  const sideShadowMat = new THREE.MeshStandardMaterial({ color: '#A04000', roughness: 0.9 })
  for (const sx of [-1, 1]) {
    const shadow = new THREE.Mesh(sideShadowGeo, sideShadowMat)
    shadow.position.set(sx * (bodyW / 2 + 0.003), bodyY, 0)
    inner.add(shadow)
  }

  // 侧面面板
  const sidePanelGeo = new THREE.BoxGeometry(0.012, bodyH * 0.82, bodyD * 0.82)
  for (const sx of [-1, 1]) {
    const sidePanel = new THREE.Mesh(sidePanelGeo, darkOrange)
    sidePanel.position.set(sx * (bodyW / 2 + 0.006), bodyY, 0)
    inner.add(sidePanel)
  }

  // 侧面缝线
  const seamGeo = new THREE.BoxGeometry(0.003, bodyH * 0.88, 0.003)
  for (const sx of [-1, 1]) {
    const seam = new THREE.Mesh(seamGeo, seamMat)
    seam.position.set(sx * (bodyW / 2 + 0.013), bodyY, 0)
    inner.add(seam)
  }

  // ===== 2. 顶部卷口 =====
  const rollR = 0.07
  const rollLen = bodyW * 1.10
  const rollY = bodyY + bodyH / 2 + rollR * 0.65

  const rollGeo = new THREE.CylinderGeometry(rollR, rollR, rollLen, 18)
  const roll = new THREE.Mesh(rollGeo, orangeFabric)
  roll.rotation.z = Math.PI / 2
  roll.position.y = rollY
  roll.castShadow = true
  inner.add(roll)

  // 卷口右侧端盖
  const capGeo = new THREE.CylinderGeometry(rollR, rollR, 0.012, 18)
  const rightCap = new THREE.Mesh(capGeo, darkOrange)
  rightCap.rotation.z = Math.PI / 2
  rightCap.position.set(rollLen / 2 + 0.006, rollY, 0)
  inner.add(rightCap)

  // 卷口高光
  const rollHlGeo = new THREE.CylinderGeometry(rollR * 0.6, rollR * 0.6, rollLen * 0.9, 18)
  const rollHighlight = new THREE.Mesh(rollHlGeo, rollHighlightMat)
  rollHighlight.rotation.z = Math.PI / 2
  rollHighlight.position.set(0, rollY + 0.012, rollR * 0.28)
  inner.add(rollHighlight)

  // 卷口下方阴影条
  const rollShadowGeo = new THREE.BoxGeometry(bodyW * 1.04, 0.02, bodyD * 0.6)
  const rollShadow = new THREE.Mesh(rollShadowGeo, darkOrange)
  rollShadow.position.y = bodyY + bodyH / 2 + 0.008
  inner.add(rollShadow)

  // ===== 3. 正面口袋 =====
  const pkW = bodyW * 0.82
  const pkH = bodyH * 0.36
  const pkD = 0.046
  const pkZ = bodyD / 2 + pkD / 2
  const pkY = bodyY - bodyH * 0.06

  const pocketGeo = new THREE.BoxGeometry(pkW, pkH, pkD)
  const pocket = new THREE.Mesh(pocketGeo, orangeFabric)
  pocket.position.set(0, pkY, pkZ)
  pocket.castShadow = true
  inner.add(pocket)

  // 口袋正面高光
  const pkFrontGeo = new THREE.BoxGeometry(pkW * 0.9, pkH * 0.84, 0.003)
  const pkFront = new THREE.Mesh(pkFrontGeo, frontPanelMat)
  pkFront.position.set(0, pkY, pkZ + pkD / 2 + 0.002)
  inner.add(pkFront)

  // 口袋翻盖
  const flapGeo = new THREE.BoxGeometry(pkW + 0.012, 0.016, pkD + 0.008)
  const flap = new THREE.Mesh(flapGeo, darkOrange)
  flap.position.set(0, pkY + pkH / 2 + 0.008, pkZ)
  flap.castShadow = true
  inner.add(flap)

  // ===== 4. 正面竖带 + 黄铜扣 =====
  const stW = 0.026
  const stH = 0.20
  const stD = 0.012
  const stY = pkY - 0.008
  const stZ = pkZ + pkD / 2 + stD / 2 + 0.002

  const stGeo = new THREE.BoxGeometry(stW, stH, stD)
  const frontStrap = new THREE.Mesh(stGeo, brownLeather)
  frontStrap.position.set(0, stY, stZ)
  frontStrap.castShadow = true
  inner.add(frontStrap)

  // 竖带缝线
  const stitchGeo = new THREE.BoxGeometry(stW + 0.004, 0.004, stD + 0.004)
  for (let i = 0; i < 3; i++) {
    const stitch = new THREE.Mesh(stitchGeo, stitchMat)
    stitch.position.set(0, stY - 0.05 + i * 0.05, stZ)
    inner.add(stitch)
  }

  // 黄铜扣
  const bkW = 0.044, bkH = 0.028, bkD = 0.014
  const bkGeo = new THREE.BoxGeometry(bkW, bkH, bkD)
  const buckle = new THREE.Mesh(bkGeo, brassMetal)
  buckle.position.set(0, stY - stH / 2 + 0.022, stZ + 0.004)
  buckle.castShadow = true
  inner.add(buckle)

  // 扣内凹陷
  const bkInGeo = new THREE.BoxGeometry(bkW * 0.48, bkH * 0.36, bkD + 0.005)
  const buckleInner = new THREE.Mesh(bkInGeo, darkBrown)
  buckleInner.position.set(0, stY - stH / 2 + 0.022, stZ + 0.004)
  inner.add(buckleInner)

  // ===== 5. 上方左右带 + 黄铜扣 =====
  const tStW = 0.024
  const tStH = 0.11
  const tStD = 0.010
  const tStY = bodyY + bodyH * 0.28
  const tStZ = bodyD / 2 + 0.014
  const tStX = bodyW * 0.30

  const tStGeo = new THREE.BoxGeometry(tStW, tStH, tStD)
  const tBkGeo = new THREE.BoxGeometry(0.036, 0.028, 0.012)
  for (const sx of [-1, 1]) {
    const tSt = new THREE.Mesh(tStGeo, brownLeather)
    tSt.position.set(sx * tStX, tStY, tStZ)
    tSt.castShadow = true
    inner.add(tSt)

    const tBk = new THREE.Mesh(tBkGeo, brassMetal)
    tBk.position.set(sx * tStX, tStY - tStH / 2 + 0.006, tStZ + 0.004)
    inner.add(tBk)
  }

  // ===== 6. 侧面提手 =====
  const hR = 0.020, hT = 0.006
  const hGeo = new THREE.TorusGeometry(hR, hT, 6, 14, Math.PI)
  const handle = new THREE.Mesh(hGeo, brownLeather)
  handle.position.set(bodyW / 2 + hR - 0.005, bodyY + 0.015, 0)
  handle.rotation.y = Math.PI / 2
  handle.castShadow = true
  inner.add(handle)

  // 提手固定铆钉
  const studGeo = new THREE.BoxGeometry(0.012, 0.012, 0.016)
  for (const sz of [-1, 1]) {
    const stud = new THREE.Mesh(studGeo, darkBrown)
    stud.position.set(bodyW / 2 + 0.004, bodyY + 0.015 + hR * 0.5, sz * hR * 0.7)
    inner.add(stud)
  }

  g.add(inner)
  g.position.set(0, 0.60, -0.32)
  return g
}

// --- 热咖啡 ---
function createHotCoffee() {
  const g = new THREE.Group()
  const white = new THREE.MeshStandardMaterial({ color: '#f6f3eb', roughness: 0.42 })
  const sleeveMat = new THREE.MeshStandardMaterial({ color: '#7a6b5d', roughness: 0.82 })
  const sleeveDark = new THREE.MeshStandardMaterial({ color: '#3c332d', roughness: 0.78 })

  // 参考图是外带纸杯：上宽下窄，无把手。
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.052, 0.18, 24), white)
  cup.castShadow = true
  g.add(cup)

  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.067, 0.059, 0.085, 24), sleeveMat)
  sleeve.position.y = -0.005
  g.add(sleeve)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.078, 0.009), sleeveDark)
    rib.position.set(Math.sin(angle) * 0.064, -0.005, Math.cos(angle) * 0.064)
    rib.rotation.y = angle
    g.add(rib)
  }

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.073, 0.068, 0.025, 24), white)
  lid.position.y = 0.102
  g.add(lid)
  const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.018, 24), white)
  lidTop.position.y = 0.122
  g.add(lidTop)

  const steamCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.132, 0),
    new THREE.Vector3(0.020, 0.165, 0),
    new THREE.Vector3(-0.012, 0.195, 0),
    new THREE.Vector3(0.014, 0.225, 0),
  ])
  const steam = new THREE.Mesh(
    new THREE.TubeGeometry(steamCurve, 18, 0.006, 6, false),
    new THREE.MeshBasicMaterial({ color: '#fff7f0', transparent: true, opacity: 0.72 })
  )
  g.add(steam)
  for (let i = 0; i < 3; i++) {
    const accent = new THREE.Mesh(new THREE.TorusGeometry(0.010, 0.0035, 5, 12), new THREE.MeshBasicMaterial({ color: '#d9958b' }))
    accent.position.set(i % 2 ? -0.008 : 0.008, 0.165 + i * 0.025, 0.003)
    accent.rotation.x = Math.PI / 2
    g.add(accent)
  }

  g.position.set(0, 1.50, 0.02)
  return g
}

// --- 投资书 ---
function createInvestmentBook() {
  const g = new THREE.Group()
  const red = '#c93c36'
  const paper = '#f6f3e8'
  const ink = '#191919'

  // 厚封面、书页和封底都是独立实体，侧视时仍能读出书本层次。
  const bookBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.04, 0.28),
    new THREE.MeshStandardMaterial({ color: red, roughness: 0.42 })
  )
  g.add(bookBody)

  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(0.205, 0.032, 0.262),
    new THREE.MeshStandardMaterial({ color: paper, roughness: 0.62 })
  )
  pages.position.y = 0.012
  g.add(pages)
  for (const y of [0.001, 0.010, 0.019]) {
    const pageLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.208, 0.003, 0.266),
      new THREE.MeshStandardMaterial({ color: ink, roughness: 0.72 })
    )
    pageLine.position.y = y
    g.add(pageLine)
  }

  const coverCanvas = document.createElement('canvas')
  coverCanvas.width = 512
  coverCanvas.height = 640
  const ctx = coverCanvas.getContext('2d')
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, 512, 640)
  ctx.fillStyle = red
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(250, 0)
  ctx.lineTo(128, 640)
  ctx.lineTo(0, 640)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = red
  ctx.fillStyle = red
  ctx.lineWidth = 34
  ctx.lineCap = 'square'
  ctx.lineJoin = 'miter'
  ctx.beginPath()
  ctx.moveTo(255, 440)
  ctx.lineTo(330, 370)
  ctx.lineTo(365, 410)
  ctx.lineTo(440, 270)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(440, 270)
  ctx.lineTo(420, 355)
  ctx.lineTo(485, 315)
  ctx.closePath()
  ctx.fill()
  const coverTexture = new THREE.CanvasTexture(coverCanvas)
  coverTexture.colorSpace = THREE.SRGBColorSpace
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(0.224, 0.012, 0.284),
    new THREE.MeshStandardMaterial({ map: coverTexture, roughness: 0.48 })
  )
  cover.position.y = 0.045
  g.add(cover)

  // 书脊和书签提供侧面的识别特征。
  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.058, 0.288),
    new THREE.MeshStandardMaterial({ color: ink, roughness: 0.66 })
  )
  spine.position.set(-0.105, 0.014, 0)
  g.add(spine)

  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.02, 0.10),
    new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.2, metalness: 0.8 })
  )
  ribbon.position.set(0, 0.02, 0.16)
  g.add(ribbon)

  g.position.set(0, 1.47, 0.02)
  g.rotation.set(-0.12, -0.18, -0.08)
  return g
}

// --- 清酒 ---
function createSake() {
  const g = new THREE.Group()
  const ceramic = new THREE.MeshStandardMaterial({ color: '#f8f7ef', roughness: 0.28 })
  const dark = new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.55 })
  const sakeGold = new THREE.MeshStandardMaterial({ color: '#f2bd19', roughness: 0.32, metalness: 0.12 })

  // 参考图是方肩白瓷瓶：主体、肩部、颈部均有真实厚度。
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.22, 0.09, 3, 0.015), ceramic)
  body.position.y = -0.015
  body.castShadow = true
  g.add(body)

  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.064, 0.050, 8), ceramic)
  shoulder.position.y = 0.115
  g.add(shoulder)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.038, 0.070, 12), ceramic)
  neck.position.y = 0.168
  g.add(neck)
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.018, 12), ceramic)
  lip.position.y = 0.212
  g.add(lip)
  const neckBand = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.018, 0.096), dark)
  neckBand.position.y = 0.150
  g.add(neckBand)

  const bottleGoldBand = new THREE.Mesh(new THREE.BoxGeometry(0.134, 0.018, 0.094), sakeGold)
  bottleGoldBand.position.y = -0.095
  g.add(bottleGoldBand)

  const ochoko = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.070, 16), ceramic)
  ochoko.position.set(0.115, -0.080, 0.025)
  g.add(ochoko)
  const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 16), sakeGold)
  drink.position.set(0.115, -0.041, 0.025)
  g.add(drink)
  const cupBand = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.006, 6, 16), sakeGold)
  cupBand.rotation.x = Math.PI / 2
  cupBand.position.set(0.115, -0.073, 0.025)
  g.add(cupBand)

  g.position.set(-0.38, 0.24, 0.24)
  g.rotation.set(0.10, -0.34, 0.05)
  return g
}

// --- 相机（像素复古相机，程序化建模） ---
function createCamera() {
  const g = new THREE.Group()

  // 材质
  const bodyMat  = new THREE.MeshStandardMaterial({ color: '#3d3d3d', roughness: 0.45, metalness: 0.05 })
  const topMat   = new THREE.MeshStandardMaterial({ color: '#b0b0b0', roughness: 0.40, metalness: 0.05 })
  const darkMat  = new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.50, metalness: 0.05 })
  const lensMat  = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.10, metalness: 0.55 })
  const ringMat  = new THREE.MeshStandardMaterial({ color: '#555555', roughness: 0.25, metalness: 0.45 })
  const strapMat = new THREE.MeshStandardMaterial({ color: '#6b3e26', roughness: 0.50, metalness: 0.05 })
  const whiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' })

  const inner = new THREE.Group()

  // 机身主体
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.95, 0.9), bodyMat)
  body.position.y = 0
  inner.add(body)

  // 顶部浅灰区域
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.38, 0.9), topMat)
  top.position.y = 0.665
  inner.add(top)

  // 顶部左侧黑色长条
  const topSlot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.08), darkMat)
  topSlot.position.set(-0.45, 0.70, 0.42)
  inner.add(topSlot)

  // 顶部最左侧小凸起
  const topLeft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.35), darkMat)
  topLeft.position.set(-0.78, 0.90, 0.1)
  inner.add(topLeft)

  // 镜头外圈
  const lensRing = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.28, 20), ringMat)
  lensRing.rotation.x = Math.PI / 2
  lensRing.position.set(0.05, 0.05, 0.58)
  inner.add(lensRing)

  // 黑色镜片
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.16, 20), lensMat)
  lens.rotation.x = Math.PI / 2
  lens.position.set(0.05, 0.05, 0.70)
  inner.add(lens)

  // 镜头高光（三层像素化反光）
  const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), whiteMat)
  hl1.position.set(0.18, 0.16, 0.79)
  inner.add(hl1)

  const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), whiteMat)
  hl2.position.set(0.02, -0.02, 0.79)
  inner.add(hl2)

  const hl3 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), whiteMat)
  hl3.position.set(-0.12, -0.12, 0.79)
  inner.add(hl3)

  // 左侧连接扣 + 挂带
  const buckleL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.2), strapMat)
  buckleL.position.set(-1.05, 0.25, 0.1)
  inner.add(buckleL)

  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 1.4), strapMat)
  strapL.position.set(-1.2, 0.25, -0.55)
  strapL.rotation.y = 0.15
  inner.add(strapL)

  // 右侧连接扣 + 挂带
  const buckleR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.2), strapMat)
  buckleR.position.set(1.05, 0.25, 0.1)
  inner.add(buckleR)

  const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 1.4), strapMat)
  strapR.position.set(1.2, 0.25, -0.55)
  strapR.rotation.y = -0.15
  inner.add(strapR)

  // 内层整体微调（与 Camera.html 一致）
  inner.position.y = -0.1
  inner.rotation.y = -0.15

  g.add(inner)

  // 缩放适配猫的比例并定位到胸前
  g.scale.setScalar(0.1)
  g.position.set(0, 0.78, 0.34)
  g.rotation.x = -0.15

  return g
}

// ===== 金牌结构：胶囊外壳、内凹面、横向起伏、实例化凸字 =====
function makeCapsulePlateGeometry(width, height, depth, radius, bevelSize = 0.006) {
  const shape = new THREE.Shape()
  const x = width / 2
  const y = height / 2
  shape.moveTo(-x + radius, -y)
  shape.lineTo(x - radius, -y)
  shape.quadraticCurveTo(x, -y, x, -y + radius)
  shape.lineTo(x, y - radius)
  shape.quadraticCurveTo(x, y, x - radius, y)
  shape.lineTo(-x + radius, y)
  shape.quadraticCurveTo(-x, y, -x, y - radius)
  shape.lineTo(-x, -y + radius)
  shape.quadraticCurveTo(-x, -y, -x + radius, -y)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 12,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize,
    bevelThickness: bevelSize,
  })
  geometry.translate(0, 0, -depth / 2)
  return geometry
}

function createEmbossedGlyph(character, width, height, depth, material, name) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.clearRect(0, 0, 128, 128)
  ctx.fillStyle = '#fff'
  ctx.font = '900 108px "Microsoft YaHei", "SimHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(character, 64, 68)
  const pixels = ctx.getImageData(0, 0, 128, 128).data
  const cells = 24
  const filled = []
  for (let row = 0; row < cells; row++) {
    for (let column = 0; column < cells; column++) {
      const px = Math.floor((column + .5) * 128 / cells)
      const py = Math.floor((row + .5) * 128 / cells)
      if (pixels[(py * 128 + px) * 4 + 3] > 72) filled.push([column, row])
    }
  }

  const cellW = width / cells
  const cellH = height / cells
  const geometry = new THREE.BoxGeometry(cellW * 1.12, cellH * 1.12, depth)
  const mesh = new THREE.InstancedMesh(geometry, material, filled.length)
  mesh.name = name
  const matrix = new THREE.Matrix4()
  filled.forEach(([column, row], index) => {
    const px = (column + .5) * cellW - width / 2
    const py = height / 2 - (row + .5) * cellH
    matrix.makeTranslation(px, py, 0)
    mesh.setMatrixAt(index, matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.castShadow = true
  return mesh
}

function createGoldPlaque({ characters, width, height, depth, faceInset, ridgeCount }) {
  const root = new THREE.Group()
  const shellMat = new THREE.MeshPhysicalMaterial({ color: '#e7b91f', metalness: .96, roughness: .16, clearcoat: .62, clearcoatRoughness: .14 })
  const rimMat = new THREE.MeshPhysicalMaterial({ color: '#fff06a', metalness: .98, roughness: .10, clearcoat: .78, clearcoatRoughness: .09 })
  const recessMat = new THREE.MeshStandardMaterial({ color: '#a96a00', metalness: .94, roughness: .21 })
  const faceMat = new THREE.MeshPhysicalMaterial({ color: '#e2b51f', metalness: .92, roughness: .20, clearcoat: .52, clearcoatRoughness: .13 })
  const glyphShadowMat = new THREE.MeshStandardMaterial({ color: '#714000', metalness: .76, roughness: .30 })
  const glyphMat = new THREE.MeshPhysicalMaterial({
    color: '#ffe45a',
    emissive: '#a86b00',
    emissiveIntensity: .24,
    metalness: .88,
    roughness: .12,
    clearcoat: .76,
    clearcoatRoughness: .08,
  })

  const shell = new THREE.Mesh(makeCapsulePlateGeometry(width, height, depth, width * .44, .007), shellMat)
  shell.name = 'GoldPlaque:solid-shell'
  root.add(shell)

  const rim = new THREE.Mesh(makeCapsulePlateGeometry(width * .965, height * .972, .014, width * .415, .004), rimMat)
  rim.name = 'GoldPlaque:bright-rim'
  rim.position.z = depth / 2 + .005
  root.add(rim)

  const recess = new THREE.Mesh(makeCapsulePlateGeometry(width - faceInset * 1.38, height - faceInset * 1.28, .012, width * .34, .003), recessMat)
  recess.name = 'GoldPlaque:recess-shadow'
  recess.position.z = depth / 2 + .013
  root.add(recess)

  const faceWidth = width - faceInset * 1.75
  const faceHeight = height - faceInset * 1.52
  const face = new THREE.Mesh(makeCapsulePlateGeometry(faceWidth, faceHeight, .010, width * .31, .0025), faceMat)
  face.name = 'GoldPlaque:inset-face'
  face.position.z = depth / 2 + .020
  root.add(face)

  for (let index = 0; index < ridgeCount; index++) {
    const normalized = ridgeCount === 1 ? 0 : index / (ridgeCount - 1)
    const ridge = new THREE.Mesh(
      new RoundedBoxGeometry(faceWidth * (.88 - Math.abs(normalized - .5) * .08), .016, .010, 2, .006),
      index % 2 ? faceMat : rimMat
    )
    ridge.name = `GoldPlaque:horizontal-ridge-${index}`
    ridge.position.set(0, (normalized - .5) * faceHeight * .82, depth / 2 + .030)
    ridge.userData.explodeWithParent = true
    root.add(ridge)
  }

  const glyphHeight = faceHeight / characters.length * .88
  characters.forEach((character, index) => {
    const y = (characters.length - 1) * glyphHeight * .51 - index * glyphHeight * 1.02
    const glyphWidth = faceWidth * (characters.length === 2 ? .88 : .84)
    const shadow = createEmbossedGlyph(character, glyphWidth, glyphHeight, .016, glyphShadowMat, `GoldPlaque:glyph-shadow-${character}`)
    shadow.position.set(.004, y - .005, depth / 2 + .040)
    shadow.scale.set(1.10, 1.10, 1)
    root.add(shadow)
    const glyph = createEmbossedGlyph(character, glyphWidth, glyphHeight, .018, glyphMat, `GoldPlaque:glyph-${character}`)
    glyph.position.set(0, y, depth / 2 + .054)
    root.add(glyph)
  })

  return root
}

function createGoodLuckGoldBar() {
  const g = createGoldPlaque({ characters: ['大', '吉'], width: .205, height: .355, depth: .060, faceInset: .030, ridgeCount: 7 })
  g.position.set(-.38, .28, .22)
  g.rotation.set(.10, -.22, .05)
  return g
}

function createWealthGoldBar() {
  const g = createGoldPlaque({ characters: ['億', '万', '両'], width: .220, height: .375, depth: .105, faceInset: .030, ridgeCount: 8 })
  g.position.set(-.40, .26, .22)
  g.rotation.set(.10, -.38, .06)
  return g
}

// --- 拉面 ---
function createRamen() {
  const g = new THREE.Group()
  const ceramic = new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: 0.28 })
  const red = new THREE.MeshStandardMaterial({ color: '#ef4d4d', roughness: 0.38 })
  const brothMat = new THREE.MeshStandardMaterial({ color: '#8f5426', roughness: 0.35 })

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.095, 0.14, 32, 1, false), ceramic)
  bowl.position.y = -0.035
  bowl.castShadow = true
  g.add(bowl)

  const bowlBase = new THREE.Mesh(new THREE.CylinderGeometry(0.070, 0.078, 0.035, 20), ceramic)
  bowlBase.position.y = -0.122
  g.add(bowlBase)

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.010, 8, 32), red)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.037
  g.add(rim)

  const broth = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.008, 32), brothMat)
  broth.position.y = 0.038
  g.add(broth)
  const noodleMat = new THREE.MeshStandardMaterial({ color: '#f0b94e', roughness: 0.48 })
  for (let i = 0; i < 6; i++) {
    const noodle = new THREE.Mesh(new THREE.TorusGeometry(0.058 + i * 0.007, 0.009, 6, 24, Math.PI * 1.45), noodleMat)
    noodle.rotation.x = Math.PI / 2
    noodle.rotation.z = 0.25 + i * 0.42
    noodle.position.set(-0.025, 0.055 + i * 0.002, 0.005)
    g.add(noodle)
  }

  const eggWhite = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 12), ceramic)
  eggWhite.scale.set(1.15, 0.22, 0.86)
  eggWhite.position.set(0.055, 0.075, 0.025)
  g.add(eggWhite)
  const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), new THREE.MeshStandardMaterial({ color: '#f4b93f', roughness: 0.32 }))
  yolk.scale.y = 0.42
  yolk.position.set(0.055, 0.086, 0.035)
  g.add(yolk)

  const noriMat = new THREE.MeshStandardMaterial({ color: '#26342c', roughness: 0.76, side: THREE.DoubleSide })
  for (const x of [-0.045, 0.02]) {
    const nori = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.12), noriMat)
    nori.position.set(x, 0.105, -0.055)
    nori.rotation.x = -0.25
    nori.rotation.z = x < 0 ? -0.18 : 0.14
    g.add(nori)
  }

  const chopMat = new THREE.MeshStandardMaterial({ color: '#79513a', roughness: 0.62 })
  for (const z of [-0.022, 0.022]) {
    const chopstick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.32, 8), chopMat)
    chopstick.rotation.z = Math.PI / 2
    chopstick.position.set(0, 0.105, z)
    g.add(chopstick)
  }

  g.position.set(0, 1.47, 0.01)
  g.scale.setScalar(0.92)
  return g
}

// ===== 主入口 =====
const FACTORY_MAP = {
  'Baseball Cap': createBaseballCap,
  'Camera': createCamera,
  'Gold Round Glasses': createGoldRoundGlasses,
  'Good Luck Gold Bar': createGoodLuckGoldBar,
  'Hiking Backpack': createHikingBackpack,
  'Hot Coffee': createHotCoffee,
  'Investment Book': createInvestmentBook,
  'Ramen': createRamen,
  'Sake': createSake,
  'Wealth Gold Bar': createWealthGoldBar,
}

export function createGear(type) {
  const fn = FACTORY_MAP[type]
  if (fn) return decorateGearModel(type, fn())
  return null
}

// 全部装备都由贴图工厂处理
export const TEXTURE_GEAR_TYPES = new Set(Object.keys(FACTORY_MAP))
