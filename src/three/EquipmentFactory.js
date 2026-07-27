import * as THREE from 'three'

const loader = new THREE.TextureLoader()
const cache = {}

// ===== 预加载所有装备贴图 =====
export async function preloadGearTextures() {
  const list = {
    Camera: '/equipment/Camera.png',
    'Good Luck Gold Bar': '/equipment/GoodLuckGoldBar.png',
    'Wealth Gold Bar': '/equipment/WealthGoldBar.png',
    Ramen: '/equipment/Ramen.png',
  }

  const entries = Object.entries(list)
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

// ===== 贴图装备创建 =====

function createCamera() {
  const g = new THREE.Group()
  const t = tex('Camera')

  // 机身（深灰金属）
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.13, 0.08),
    new THREE.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.35, metalness: 0.15 })
  )
  body.castShadow = true
  g.add(body)

  // 正面贴图细节层
  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 1.38
    const w = 0.18
    const h = w / aspect
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: true, depthWrite: true })
    )
    decal.position.set(0, 0.13 / 2 - h / 2, 0.041)
    g.add(decal)
  }

  // 镜头
  const lensBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.045, 0.08, 20),
    new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.1, metalness: 0.6 })
  )
  lensBase.rotation.x = Math.PI / 2
  lensBase.position.set(0.04, -0.01, 0.09)
  lensBase.castShadow = true
  g.add(lensBase)

  // 镜片高光
  const lensFront = new THREE.Mesh(
    new THREE.CircleGeometry(0.033, 16),
    new THREE.MeshStandardMaterial({ color: '#334466', roughness: 0.05, metalness: 0.3 })
  )
  lensFront.position.set(0.04, -0.01, 0.132)
  g.add(lensFront)

  // 红色背带
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

function createGoodLuckGoldBar() {
  const g = new THREE.Group()
  const t = tex('Good Luck Gold Bar')

  // 扁胶囊体作为金条主体
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.105, 0.26, 8, 18),
    new THREE.MeshStandardMaterial({ color: '#e8ae15', roughness: 0.2, metalness: 0.9 })
  )
  body.rotation.z = Math.PI / 2
  body.scale.set(0.74, 1, 0.38)
  body.castShadow = true
  g.add(body)

  // 略大的外框（高光带）
  const outer = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.11, 0.28, 8, 18),
    new THREE.MeshStandardMaterial({ color: '#ffdb3e', roughness: 0.15, metalness: 0.9 })
  )
  outer.rotation.z = Math.PI / 2
  outer.scale.set(0.74, 1, 0.34)
  outer.position.z = -0.006
  g.add(outer)

  // 正面贴图（"大吉"文字）
  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 2.5
    const h = 0.07
    const w = h * aspect
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: true, depthWrite: true })
    )
    decal.position.set(0, 0, 0.042)
    g.add(decal)
  }

  // 两端封口环
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

function createWealthGoldBar() {
  const g = new THREE.Group()
  const t = tex('Wealth Gold Bar')

  // 长方体金条
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.08, 0.28),
    new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.18, metalness: 0.92 })
  )
  body.castShadow = true
  g.add(body)

  // 边框高光
  const bevel = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.015, 0.26),
    new THREE.MeshStandardMaterial({ color: '#ffe566', roughness: 0.12, metalness: 0.95 })
  )
  bevel.position.y = 0.045
  g.add(bevel)

  // 正面贴图（"亿万两"文字）
  if (t) {
    const aspect = t.image ? t.image.width / t.image.height : 2.5
    const h = 0.055
    const w = h * aspect
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: true, depthWrite: true })
    )
    decal.position.set(0, 0, 0.141)
    g.add(decal)
  }

  g.position.set(-0.42, 0.38, 0.48)
  g.rotation.set(0.3, -0.4, 0.2)
  return g
}

function createRamen() {
  const g = new THREE.Group()
  const t = tex('Ramen')

  // 碗身
  const bowlGeo = new THREE.SphereGeometry(0.13, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55)
  const bowl = new THREE.Mesh(
    bowlGeo,
    new THREE.MeshStandardMaterial({ color: '#e67e22', roughness: 0.35, metalness: 0.05 })
  )
  bowl.scale.set(1, 0.55, 0.9)
  bowl.position.y = -0.03
  bowl.castShadow = true
  g.add(bowl)

  // 碗的深色底部
  const bowlBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.3 })
  )
  bowlBase.position.y = -0.10
  g.add(bowlBase)

  // 碗口边缘
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.016, 8, 28),
    new THREE.MeshStandardMaterial({ color: '#d35400', roughness: 0.25, metalness: 0.1 })
  )
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.05
  g.add(rim)

  // 顶部贴图（拉面俯视图）
  if (t) {
    const topDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.105, 32),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthTest: true, depthWrite: true })
    )
    topDisc.rotation.x = -Math.PI / 2
    topDisc.position.y = 0.065
    g.add(topDisc)
  }

  // 少量面线探出
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

  // 筷子
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
export function createGear(type) {
  switch (type) {
    case 'Camera':
      return createCamera()
    case 'Good Luck Gold Bar':
      return createGoodLuckGoldBar()
    case 'Wealth Gold Bar':
      return createWealthGoldBar()
    case 'Ramen':
      return createRamen()
    default:
      return null
  }
}

// 是否由贴图工厂处理（不被 CatModel 的 switch 重复处理）
export const TEXTURE_GEAR_TYPES = new Set([
  'Camera',
  'Good Luck Gold Bar',
  'Wealth Gold Bar',
  'Ramen',
])
