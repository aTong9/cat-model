import * as THREE from 'three'
import { sphere, roundCone, meshFromSDF } from './sdf.js'

// 网格质量参数
export const CAT_MESH_QUALITY = {
  draft:   { cell: 0.046, maxScale: 2.0 },
  static:  { cell: 0.028, maxScale: 1.6 },
  motion:  { cell: 0.017, maxScale: 1.2 },
}

/**
 * 根据包围盒体积动态调节 cell 尺寸
 */
export function resolveCatMeshCellSize(prims, quality = 'static') {
  const q = CAT_MESH_QUALITY[quality] || CAT_MESH_QUALITY.static
  let minX = 1e9, minY = 1e9, minZ = 1e9, maxX = -1e9, maxY = -1e9, maxZ = -1e9
  for (const p of prims) {
    minX = Math.min(minX, p.bx - p.br)
    maxX = Math.max(maxX, p.bx + p.br)
    minY = Math.min(minY, p.by - p.br)
    maxY = Math.max(maxY, p.by + p.br)
    minZ = Math.min(minZ, p.bz - p.br)
    maxZ = Math.max(maxZ, p.bz + p.br)
  }
  const vol = (maxX - minX) * (maxY - minY) * (maxZ - minZ)
  const ref = 2.0
  const scale = Math.max(0.6, Math.min(q.maxScale, Math.cbrt(vol / ref)))
  return q.cell * scale
}

/**
 * 创建炫酷站立猫 SDF 身体
 *
 * 结构（bipedal stance）：
 *   - 圆润头部 + 吻部凸起 + 双耳
 *   - 三段躯干（胸 / 腹 / 臀）营造直立姿态曲线
 *   - 两条站立后腿 + 脚掌
 *   - 两条前臂（左臂自然下垂，右臂叉腰 — 酷）
 *   - 动态 S 形尾巴向一侧甩出
 *
 * @param {string} furColor - 毛色 hex
 * @param {object} [opts]
 * @param {number} [opts.headSize=1.0] - 头部大小倍率
 * @param {number} [opts.chubbiness=1.0] - 胖瘦（>=0.65）
 * @returns {{ mesh: THREE.Mesh, headCenter: THREE.Vector3, headRadius: number, prims: Array }}
 */
export function createSdfCatBody(furColor = '#f4c430', opts = {}) {
  const {
    headSize: hr = 1.0,
    chubbiness: chub = 1.0,
  } = opts

  const wid = Math.max(0.88, Math.sqrt(Math.max(0.65, chub)))
  const hRad = 0.37 * hr * wid

  const prims = [
    // ================================================================
    //  头部
    // ================================================================
    sphere({
      c: { x: 0, y: 1.00, z: 0.01 },
      r: hRad * 1.08,
      // The reference is broad and nearly vertical from the front, but notably
      // shallower in profile than the old loaf-shaped body.
      s: [1.13 * hr, 0.92, 0.98],
      k: 0.22,
      tag: 'head',
    }),

    // 吻部
    sphere({
      c: { x: 0, y: 0.89, z: 0.31 },
      r: hRad * 0.32,
      s: [1.32, 0.76, 0.76],
      k: 0.10,
      tag: 'snout',
    }),

    // 左耳
    roundCone({
      a: { x: -0.25 * wid, y: 1.27, z: -0.03 },
      b: { x: -0.32 * wid, y: 1.52, z: -0.06 },
      r1: 0.125 * hr, r2: 0.022,
      k: 0.16, tag: 'ear',
    }),

    // 右耳
    roundCone({
      a: { x: 0.25 * wid, y: 1.27, z: -0.03 },
      b: { x: 0.32 * wid, y: 1.52, z: -0.06 },
      r1: 0.125 * hr, r2: 0.022,
      k: 0.16, tag: 'ear',
    }),

    // ================================================================
    //  躯干（上胸 / 中腹 / 下臀）
    // ================================================================
    // 上胸 —— 略宽，模拟锁骨/肩膀区域
    sphere({
      c: { x: 0, y: 0.68, z: 0 },
      r: 0.39,
      s: [1.16 * wid, 1.15, 0.99],
      k: 0.22, tag: 'body',
    }),

    // 中腹 —— 收腰感
    sphere({
      c: { x: 0, y: 0.32, z: 0.01 },
      r: 0.40,
      s: [1.10 * wid, 1.18, 1.01],
      k: 0.22, tag: 'body',
    }),

    // 臀部 —— 略宽
    sphere({
      c: { x: 0, y: -0.12, z: 0.02 },
      r: 0.45,
      s: [1.10 * wid, 1.05, 1.04],
      k: 0.22, tag: 'body',
    }),

    // ================================================================
    //  后腿（站立）
    // ================================================================
    // 左大腿
    roundCone({
      a: { x: -0.15, y: -0.16, z: 0.02 },
      b: { x: -0.16, y: -0.38, z: 0.08 },
      r1: 0.105, r2: 0.082,
      k: 0.16, tag: 'leg',
    }),
    // 左小腿
    roundCone({
      a: { x: -0.16, y: -0.38, z: 0.08 },
      b: { x: -0.15, y: -0.47, z: 0.12 },
      r1: 0.072, r2: 0.058,
      k: 0.14, tag: 'leg',
    }),
    // 左脚掌
    sphere({
      c: { x: -0.15, y: -0.47, z: 0.16 },
      r: 0.068,
      s: [1.25, 0.45, 1.65],
      k: 0.12, tag: 'leg',
    }),

    // 右大腿
    roundCone({
      a: { x: 0.15, y: -0.16, z: 0.02 },
      b: { x: 0.16, y: -0.38, z: 0.08 },
      r1: 0.105, r2: 0.082,
      k: 0.16, tag: 'leg',
    }),
    // 右小腿
    roundCone({
      a: { x: 0.16, y: -0.38, z: 0.08 },
      b: { x: 0.15, y: -0.47, z: 0.12 },
      r1: 0.072, r2: 0.058,
      k: 0.14, tag: 'leg',
    }),
    // 右脚掌
    sphere({
      c: { x: 0.15, y: -0.47, z: 0.16 },
      r: 0.068,
      s: [1.25, 0.45, 1.65],
      k: 0.12, tag: 'leg',
    }),

  ]

  // 网格化
  // Ears and legs are now separate articulated assemblies in CatModel. Keeping
  // their old SDF primitives would create doubled silhouettes and rigid joints.
  const bodyPrims = prims.filter(primitive => primitive.tag !== 'ear' && primitive.tag !== 'leg')
  const cellSize = resolveCatMeshCellSize(bodyPrims, 'static')
  const floorY = -0.52
  const geo = meshFromSDF(bodyPrims, cellSize, floorY)

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(furColor),
    roughness: 0.62,
    metalness: 0.03,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.name = 'SdfCatBody'

  // 头部中心（供面特征定位）
  const headCenter = new THREE.Vector3(0, 1.00, 0.01)

  return { mesh, headCenter, headRadius: hRad, prims: bodyPrims }
}
