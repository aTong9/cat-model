import * as THREE from 'three'

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
  g.position.set(0, 2.04, 0.04)
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

  g.position.set(0, 1.78, 0.54)
  return g
}

// --- 登山背包 ---
function createHikingBackpack() {
  const g = new THREE.Group()
  const t = tex('Hiking Backpack')

  // 背包主体（椭圆柱体模拟包身）
  const bagGeo = new THREE.CapsuleGeometry(0.20, 0.34, 8, 14)
  const bag = new THREE.Mesh(
    bagGeo,
    new THREE.MeshStandardMaterial({ color: '#3d6f62', roughness: 0.38, metalness: 0.05 })
  )
  bag.rotation.x = Math.PI / 2
  bag.scale.set(1, 1, 0.55)
  bag.castShadow = true
  g.add(bag)

  // 正面前袋
  const flap = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.11, 0.035),
    new THREE.MeshStandardMaterial({ color: '#527f70', roughness: 0.35, metalness: 0.05 })
  )
  flap.position.set(0, 0.07, 0.13)
  g.add(flap)

  // 正面贴图
  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 0.8
    const w = 0.22
    const h = w / aspect
    const decal = createDecal(t, w, h)
    decal.position.set(0, 0.02, 0.11)
    g.add(decal)
  }

  // 两侧口袋 + 背带
  for (const side of [-1, 1]) {
    const pocket = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 8),
      new THREE.MeshStandardMaterial({ color: '#d88a3c', roughness: 0.4, metalness: 0.05 })
    )
    pocket.scale.set(0.75, 1, 0.45)
    pocket.position.set(side * 0.20, -0.06, 0)
    g.add(pocket)

    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.013, 6, 18, Math.PI),
      new THREE.MeshStandardMaterial({ color: '#2b473f', roughness: 0.5 })
    )
    strap.rotation.set(Math.PI / 2, 0, side * 0.20)
    strap.position.set(side * 0.13, 0.02, 0.17)
    g.add(strap)
  }

  g.position.set(0, 1.03, -0.48)
  return g
}

// --- 热咖啡 ---
function createHotCoffee() {
  const g = new THREE.Group()
  const t = tex('Hot Coffee')

  // 杯身
  const cupGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.16, 24)
  const cup = new THREE.Mesh(
    cupGeo,
    new THREE.MeshStandardMaterial({ color: '#f5f5f0', roughness: 0.35, metalness: 0.05 })
  )
  cup.castShadow = true
  g.add(cup)

  // 侧面贴图
  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 1.0
    const h = 0.12
    const w = h * aspect
    const decal = createDecal(t, w, h)
    decal.position.z = 0.075
    g.add(decal)
  }

  // 把手
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.015, 8, 12, Math.PI),
    new THREE.MeshStandardMaterial({ color: '#f5f5f0', roughness: 0.35 })
  )
  handle.position.set(0.09, 0.02, 0)
  handle.rotation.set(Math.PI / 2, Math.PI / 2, 0)
  g.add(handle)

  // 杯口（咖啡液面）
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.005, 24),
    new THREE.MeshStandardMaterial({ color: '#4a2c0a', roughness: 0.3 })
  )
  top.position.y = 0.08
  g.add(top)

  // 热气粒子
  for (let i = 0; i < 3; i++) {
    const steam = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 6, 4),
      new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.3 })
    )
    steam.position.set((i - 1) * 0.03, 0.13 + i * 0.04, 0)
    g.add(steam)
  }

  g.position.set(0.42, 0.24, 0.56)
  return g
}

// --- 投资书 ---
function createInvestmentBook() {
  const g = new THREE.Group()
  const t = tex('Investment Book')

  // 书本主体
  const bookBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.04, 0.28),
    new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.35, metalness: 0.05 })
  )
  g.add(bookBody)

  // 书页侧面
  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.025, 0.26),
    new THREE.MeshStandardMaterial({ color: '#f5f0e0', roughness: 0.5 })
  )
  pages.position.y = 0.03
  g.add(pages)

  // 顶部封面贴图
  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 0.8
    const w = 0.18
    const h = w / aspect
    const decal = createDecal(t, w, h)
    decal.position.set(0, 0.036, 0)
    decal.rotation.x = -Math.PI / 2
    g.add(decal)
  }

  // 金色书签带
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.02, 0.10),
    new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.2, metalness: 0.8 })
  )
  ribbon.position.set(0, 0.02, 0.16)
  g.add(ribbon)

  g.position.set(0.40, 0.38, 0.52)
  g.rotation.set(0.2, -0.5, 0.1)
  return g
}

// --- 清酒 ---
function createSake() {
  const g = new THREE.Group()
  const t = tex('Sake')

  // 瓶身
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.20, 20),
    new THREE.MeshStandardMaterial({ color: '#e8e8e0', roughness: 0.3, metalness: 0.05 })
  )
  body.castShadow = true
  g.add(body)

  // 瓶身标签贴图
  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 0.6
    const h = 0.14
    const w = h * aspect
    const decal = createDecal(t, w, h)
    decal.position.z = 0.065
    g.add(decal)
  }

  // 瓶颈
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.04, 0.07, 14),
    new THREE.MeshStandardMaterial({ color: '#e8e8e0', roughness: 0.3, metalness: 0.05 })
  )
  neck.position.y = 0.13
  g.add(neck)

  // 瓶盖
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.02, 14),
    new THREE.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.25, metalness: 0.4 })
  )
  cap.position.y = 0.17
  g.add(cap)

  // 小酒杯
  const ochoko = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.03, 0.05, 14),
    new THREE.MeshStandardMaterial({ color: '#f0f0e8', roughness: 0.25, metalness: 0.05 })
  )
  ochoko.position.set(0.08, -0.04, 0.02)
  g.add(ochoko)

  g.position.set(-0.40, 0.30, 0.54)
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
  g.position.set(0, 1.18, 0.62)
  g.rotation.x = -0.15

  return g
}

// ===== 金条纹理生成（CSS 风格金色渐变 + 浮雕文字 + 金属条纹） =====
function makeGoldBarTexture(textLines) {
  const w = 512, h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  // CSS 风格金色线性渐变背景
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#f4d03f')
  grad.addColorStop(0.25, '#ffd700')
  grad.addColorStop(0.5, '#ffec8b')
  grad.addColorStop(0.75, '#daa520')
  grad.addColorStop(1, '#b8860b')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // CSS rgba 半透明水平金属条纹
  ctx.strokeStyle = 'rgba(184, 134, 11, 0.22)'
  ctx.lineWidth = 2
  for (let y = 0; y < h; y += 10) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  // CSS text-shadow 模拟浮雕深度
  ctx.shadowColor = 'rgba(101, 67, 33, 0.55)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 3

  // 文字
  ctx.fillStyle = '#8b6914'
  ctx.font = 'bold 80px "Microsoft YaHei", "SimHei", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  textLines.forEach((line, i) => {
    const y = h / 2 + (i - (textLines.length - 1) / 2) * 86
    ctx.fillText(line, w / 2, y)
  })

  ctx.shadowColor = 'transparent'

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 辅助：生成 bump map（文字凸起浮雕）
function makeGoldBarBumpMap(textLines) {
  const w = 512, h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  // 中性灰背景
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, w, h)

  // 文字白色（凸起）
  ctx.fillStyle = '#e0e0e0'
  ctx.font = 'bold 80px "Microsoft YaHei", "SimHei", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  textLines.forEach((line, i) => {
    const y = h / 2 + (i - (textLines.length - 1) / 2) * 86
    ctx.fillText(line, w / 2, y)
  })

  const tex = new THREE.CanvasTexture(canvas)
  return tex
}

// --- 大吉金条（Box 堆积建模 + 正面平面文字 decal，参考 Camera.html 风格） ---
function createGoodLuckGoldBar() {
  const g = new THREE.Group()
  const inner = new THREE.Group()

  const goldMat  = new THREE.MeshStandardMaterial({ color: '#daa520', roughness: 0.18, metalness: 0.90 })
  const rimMat   = new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.10, metalness: 0.96 })
  const edgeMat  = new THREE.MeshStandardMaterial({ color: '#cd9b1d', roughness: 0.14, metalness: 0.88 })

  // 主体：多层 Box 堆出圆角金条
  const bodyLayers = [
    { x: 0.00, y: 0.00, w: 0.22, h: 0.10, d: 0.28 },
    { x: 0.00, y: 0.06, w: 0.20, h: 0.03, d: 0.27 },
    { x: 0.00, y: -0.06, w: 0.20, h: 0.03, d: 0.27 },
    { x: 0.11, y: 0.00, w: 0.03, h: 0.08, d: 0.27 },
    { x: -0.11, y: 0.00, w: 0.03, h: 0.08, d: 0.27 },
  ]
  bodyLayers.forEach(l => {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(l.w, l.h, l.d),
      l.y === 0 && l.x === 0 ? goldMat : edgeMat
    )
    block.position.set(l.x, l.y, 0)
    block.castShadow = true
    inner.add(block)
  })

  // 金边外框（上下左右四条细条）
  const rimData = [
    { x: 0, y: 0.04, w: 0.21, h: 0.010, d: 0.28 },
    { x: 0, y: -0.04, w: 0.21, h: 0.010, d: 0.28 },
    { x: 0.10, y: 0, w: 0.010, h: 0.09, d: 0.28 },
    { x: -0.10, y: 0, w: 0.010, h: 0.09, d: 0.28 },
  ]
  rimData.forEach(r => {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(r.w, r.h, r.d), rimMat)
    rim.position.set(r.x, r.y, 0.002)
    inner.add(rim)
  })

  // 正面文字 decal（flat PlaneGeometry，清晰显示）
  const colorMap = makeGoldBarTexture(['大', '吉'])
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.11),
    new THREE.MeshBasicMaterial({ map: colorMap, transparent: true, depthTest: true, depthWrite: false })
  )
  decal.position.z = 0.143
  inner.add(decal)

  g.add(inner)
  g.position.set(-0.40, 0.42, 0.52)
  g.rotation.set(0.15, -0.42, 0.08)
  return g
}

// --- 招财金条（Box 堆积建模 + 正面平面文字 decal，参考 Camera.html 风格） ---
function createWealthGoldBar() {
  const g = new THREE.Group()
  const inner = new THREE.Group()

  const goldMat = new THREE.MeshStandardMaterial({ color: '#daa520', roughness: 0.18, metalness: 0.90 })
  const rimMat  = new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.10, metalness: 0.96 })
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#cd9b1d', roughness: 0.14, metalness: 0.88 })

  // 主体：长方体
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.24),
    goldMat
  )
  body.castShadow = true
  inner.add(body)

  // 边缘 bevel（上下前后左右，共 8 条）
  const bevels = [
    { x: 0,     y: 0.07,  z: 0,     w: 0.175, h: 0.013, d: 0.235 },
    { x: 0,     y: -0.07, z: 0,     w: 0.175, h: 0.013, d: 0.235 },
    { x: 0.085, y: 0,     z: 0,     w: 0.013, h: 0.115, d: 0.235 },
    { x: -0.085, y: 0,    z: 0,     w: 0.013, h: 0.115, d: 0.235 },
    { x: 0,     y: 0,     z: 0.115, w: 0.175, h: 0.115, d: 0.013 },
    { x: 0,     y: 0,     z: -0.115,w: 0.175, h: 0.115, d: 0.013 },
  ]
  bevels.forEach(b => {
    const bevel = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), edgeMat)
    bevel.position.set(b.x, b.y, b.z)
    inner.add(bevel)
  })

  // 金边
  const rimData = [
    { x: 0,     y: 0.055, z: 0.123, w: 0.17, h: 0.008, d: 0.004 },
    { x: 0,     y: -0.055,z: 0.123, w: 0.17, h: 0.008, d: 0.004 },
    { x: 0.08,  y: 0,     z: 0.123, w: 0.008, h: 0.11, d: 0.004 },
    { x: -0.08, y: 0,     z: 0.123, w: 0.008, h: 0.11, d: 0.004 },
  ]
  rimData.forEach(r => {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(r.w, r.h, r.d), rimMat)
    rim.position.set(r.x, r.y, r.z)
    inner.add(rim)
  })

  // 正面文字 decal（flat PlaneGeometry，清晰显示）
  const colorMap = makeGoldBarTexture(['亿', '万', '两'])
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, 0.15),
    new THREE.MeshBasicMaterial({ map: colorMap, transparent: true, depthTest: true, depthWrite: false })
  )
  decal.position.z = 0.125
  inner.add(decal)

  g.add(inner)
  g.position.set(-0.42, 0.38, 0.48)
  g.rotation.set(0.3, -0.4, 0.2)
  return g
}

// --- 拉面 ---
function createRamen() {
  const g = new THREE.Group()
  const t = tex('Ramen')

  const bowlGeo = new THREE.SphereGeometry(0.13, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55)
  const bowl = new THREE.Mesh(
    bowlGeo,
    new THREE.MeshStandardMaterial({ color: '#e67e22', roughness: 0.35, metalness: 0.05 })
  )
  bowl.scale.set(1, 0.55, 0.9)
  bowl.position.y = -0.03
  bowl.castShadow = true
  g.add(bowl)

  const bowlBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.3 })
  )
  bowlBase.position.y = -0.10
  g.add(bowlBase)

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.016, 8, 28),
    new THREE.MeshStandardMaterial({ color: '#d35400', roughness: 0.25, metalness: 0.1 })
  )
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.05
  g.add(rim)

  if (t) {
    const topDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.105, 32),
      new THREE.MeshBasicMaterial({
        map: t,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
      })
    )
    topDisc.rotation.x = -Math.PI / 2
    topDisc.position.y = 0.065
    g.add(topDisc)
  }

  const noodlePts1 = [
    new THREE.Vector3(-0.02, 0.06, 0.04),
    new THREE.Vector3(-0.01, 0.10, 0.03),
    new THREE.Vector3(0.01, 0.08, 0.02),
  ]
  g.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(noodlePts1), 8, 0.008, 6, false),
      new THREE.MeshStandardMaterial({ color: '#f5deb3', roughness: 0.5 })
    )
  )

  const noodlePts2 = [
    new THREE.Vector3(0.03, 0.06, -0.03),
    new THREE.Vector3(0.04, 0.11, -0.01),
    new THREE.Vector3(0.02, 0.09, 0.01),
  ]
  g.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(noodlePts2), 8, 0.008, 6, false),
      new THREE.MeshStandardMaterial({ color: '#f5deb3', roughness: 0.5 })
    )
  )

  for (const dx of [-0.04, 0.04]) {
    const cp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.01, 0.18, 8),
      new THREE.MeshStandardMaterial({ color: '#deb887', roughness: 0.4 })
    )
    cp.rotation.set(0, 0.2, 0.25)
    cp.position.set(dx, 0.08, 0.02)
    g.add(cp)
  }

  g.position.set(0, 0.16, 0.62)
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
  if (fn) return fn()
  return null
}

// 全部装备都由贴图工厂处理
export const TEXTURE_GEAR_TYPES = new Set(Object.keys(FACTORY_MAP))
