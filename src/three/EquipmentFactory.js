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

// --- 棒球帽 ---
function createBaseballCap() {
  const g = new THREE.Group()
  const t = tex('Baseball Cap')

  const domeColor = '#545b6b'
  const brimColor = '#9c7b5c'
  const seamColor = '#3e4452'
  const buttonColor = '#454c5a'

  // 帽顶：半球，6 片式棒球帽轮廓
  const domeGeo = new THREE.SphereGeometry(0.34, 48, 32, 0, Math.PI, 0, Math.PI / 2.05)
  const dome = new THREE.Mesh(
    domeGeo,
    new THREE.MeshStandardMaterial({ color: domeColor, roughness: 0.55, metalness: 0.02 })
  )
  dome.scale.set(1.0, 0.72, 0.88)
  dome.castShadow = true
  dome.rotation.y = -Math.PI / 2
  g.add(dome)

  // 6 条 panel seam（从顶纽扣辐射到下缘）
  const seamMat = new THREE.MeshStandardMaterial({ color: seamColor, roughness: 0.6 })
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI - Math.PI / 2
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.36, 0.02), seamMat)
    seam.position.set(Math.sin(a) * 0.30, 0.05, Math.cos(a) * 0.26)
    seam.rotation.x = -0.08
    seam.rotation.y = -a
    seam.rotation.z = Math.cos(a) * 0.05
    g.add(seam)
  }

  // 帽檐：微微弯曲的椭圆板
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.30, 0.30, 0.018, 36),
    new THREE.MeshStandardMaterial({ color: brimColor, roughness: 0.45, metalness: 0.02 })
  )
  brim.scale.set(1.05, 1, 0.55)
  brim.position.set(0, -0.07, 0.24)
  brim.rotation.x = -0.32
  brim.castShadow = true
  g.add(brim)

  // 帽檐下侧阴影面
  const brimUnder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.29, 0.008, 36),
    new THREE.MeshStandardMaterial({ color: '#7a5f45', roughness: 0.5 })
  )
  brimUnder.scale.set(1.05, 1, 0.55)
  brimUnder.position.set(0, -0.078, 0.24)
  brimUnder.rotation.x = -0.32
  g.add(brimUnder)

  // 正面 Bitcoin B 标志：程序生成 canvas 纹理
  function makeBitcoinTexture() {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // 帽身底色
    ctx.fillStyle = domeColor
    ctx.fillRect(0, 0, size, size)

    // 标志
    ctx.fillStyle = '#d4a04a'
    ctx.strokeStyle = '#d4a04a'
    ctx.lineWidth = 18
    ctx.lineCap = 'round'

    const cx = size / 2
    const cy = size / 2
    const w = 90
    const h = 120

    // 外圆角竖条（B 的竖线）
    ctx.beginPath()
    ctx.roundRect(cx - w / 2 + 12, cy - h / 2, 22, h, 10)
    ctx.fill()

    // 上下横线
    ctx.beginPath()
    ctx.moveTo(cx - w / 2 + 22, cy - h / 2 + 12)
    ctx.lineTo(cx + w / 2 - 10, cy - h / 2 + 12)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx - w / 2 + 22, cy - 4)
    ctx.lineTo(cx + w / 2 - 10, cy - 4)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx - w / 2 + 22, cy + 4)
    ctx.lineTo(cx + w / 2 - 10, cy + 4)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx - w / 2 + 22, cy + h / 2 - 12)
    ctx.lineTo(cx + w / 2 - 10, cy + h / 2 - 12)
    ctx.stroke()

    // 两个半圆构成 B
    ctx.beginPath()
    ctx.arc(cx + 8, cy - 26, 28, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx + 8, cy + 26, 36, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()

    // 竖线出头
    ctx.beginPath()
    ctx.moveTo(cx - w / 2 + 22, cy - h / 2 - 8)
    ctx.lineTo(cx - w / 2 + 32, cy - h / 2 - 8)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx - w / 2 + 22, cy + h / 2 + 8)
    ctx.lineTo(cx - w / 2 + 32, cy + h / 2 + 8)
    ctx.stroke()

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  // 优先使用原 PNG，否则 fallback 到程序生成的 Bitcoin 标志
  const frontTex = t || makeBitcoinTexture()
  if (frontTex) {
    const aspect = frontTex.image ? frontTex.image.width / frontTex.image.height : 1.0
    const h = 0.18
    const w = h * aspect
    const decal = createDecal(frontTex, w, h)
    decal.position.set(0, 0.06, 0.285)
    decal.rotation.x = -0.10
    g.add(decal)
  }

  // 顶部小纽扣
  const btn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16),
    new THREE.MeshStandardMaterial({ color: buttonColor, roughness: 0.4 })
  )
  btn.position.y = 0.165
  g.add(btn)

  g.position.set(0, 2.04, 0.04)
  g.rotation.x = -0.25
  return g
}

// --- 金框眼镜 ---
function createGoldRoundGlasses() {
  const g = new THREE.Group()
  const t = tex('Gold Round Glasses')

  // 两片金丝镜框
  for (const x of [-0.13, 0.13]) {
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.02, 8, 24),
      new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.22, metalness: 0.88 })
    )
    frame.position.x = x
    g.add(frame)

    // 镜片
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 24),
      new THREE.MeshPhysicalMaterial({
        color: '#ddeeff',
        roughness: 0.05,
        transparent: true,
        opacity: 0.3,
      })
    )
    lens.position.x = x
    g.add(lens)
  }

  // 正面 PNG 贴图：覆盖两片镜片区域，展示眼镜细节
  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 2.8
    const w = 0.42
    const h = w / aspect
    const decal = createDecal(t, w, h)
    decal.position.z = 0.002
    g.add(decal)
  }

  // 鼻桥
  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.22, metalness: 0.88 })
  )
  bridge.rotation.z = Math.PI / 2
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

// --- 相机 ---
function createCamera() {
  const g = new THREE.Group()
  const t = tex('Camera')

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.13, 0.08),
    new THREE.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.35, metalness: 0.15 })
  )
  body.castShadow = true
  g.add(body)

  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 1.38
    const w = 0.18
    const h = w / aspect
    const decal = createDecal(t, w, h)
    decal.position.set(0, 0.13 / 2 - h / 2, 0.041)
    g.add(decal)
  }

  const lensBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.045, 0.08, 20),
    new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.1, metalness: 0.6 })
  )
  lensBase.rotation.x = Math.PI / 2
  lensBase.position.set(0.04, -0.01, 0.09)
  lensBase.castShadow = true
  g.add(lensBase)

  const lensFront = new THREE.Mesh(
    new THREE.CircleGeometry(0.033, 16),
    new THREE.MeshStandardMaterial({ color: '#334466', roughness: 0.05, metalness: 0.3 })
  )
  lensFront.position.set(0.04, -0.01, 0.132)
  g.add(lensFront)

  const strapPts = [
    new THREE.Vector3(0.08, 0.04, -0.04),
    new THREE.Vector3(0.12, 0.16, -0.06),
    new THREE.Vector3(0.04, 0.26, -0.10),
    new THREE.Vector3(-0.04, 0.26, -0.10),
    new THREE.Vector3(-0.12, 0.16, -0.06),
    new THREE.Vector3(-0.08, 0.04, -0.04),
  ]
  g.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strapPts), 20, 0.01, 6, false),
      new THREE.MeshStandardMaterial({ color: '#e74c3c', roughness: 0.5, metalness: 0.1 })
    )
  )

  g.position.set(0, 1.18, 0.62)
  g.rotation.x = -0.15
  return g
}

// --- 大吉金条 ---
function createGoodLuckGoldBar() {
  const g = new THREE.Group()
  const t = tex('Good Luck Gold Bar')

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.105, 0.26, 8, 18),
    new THREE.MeshStandardMaterial({ color: '#e8ae15', roughness: 0.2, metalness: 0.9 })
  )
  body.rotation.z = Math.PI / 2
  body.scale.set(0.74, 1, 0.38)
  body.castShadow = true
  g.add(body)

  const outer = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.11, 0.28, 8, 18),
    new THREE.MeshStandardMaterial({ color: '#ffdb3e', roughness: 0.15, metalness: 0.9 })
  )
  outer.rotation.z = Math.PI / 2
  outer.scale.set(0.74, 1, 0.34)
  outer.position.z = -0.006
  g.add(outer)

  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 2.5
    const h = 0.07
    const w = h * aspect
    const decal = createDecal(t, w, h)
    decal.position.set(0, 0, 0.042)
    g.add(decal)
  }

  for (const z of [-0.069, 0.069]) {
    const seal = new THREE.Mesh(
      new THREE.TorusGeometry(0.027, 0.009, 6, 16),
      new THREE.MeshStandardMaterial({ color: '#ffe77a', roughness: 0.1, metalness: 0.95 })
    )
    seal.position.set(0, 0, z)
    g.add(seal)
  }

  g.position.set(-0.40, 0.42, 0.52)
  g.rotation.set(0.15, -0.42, 0.08)
  return g
}

// --- 招财金条 ---
function createWealthGoldBar() {
  const g = new THREE.Group()
  const t = tex('Wealth Gold Bar')

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.08, 0.28),
    new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.18, metalness: 0.92 })
  )
  body.castShadow = true
  g.add(body)

  const bevel = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.015, 0.26),
    new THREE.MeshStandardMaterial({ color: '#ffe566', roughness: 0.12, metalness: 0.95 })
  )
  bevel.position.y = 0.045
  g.add(bevel)

  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 2.5
    const h = 0.055
    const w = h * aspect
    const decal = createDecal(t, w, h)
    decal.position.set(0, 0, 0.141)
    g.add(decal)
  }

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
