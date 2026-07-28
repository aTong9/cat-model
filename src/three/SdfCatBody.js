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

  const wid = Math.max(0.82, Math.sqrt(Math.max(0.65, chub)))
  const hRad = 0.33 * hr * wid

  const prims = [
    // ================================================================
    //  头部
    // ================================================================
    sphere({
      c: { x: 0, y: 1.05, z: 0.02 },
      r: hRad,
      s: [1.20 * hr, 1.04, 0.92],
      k: 0.22,
      tag: 'head',
    }),

    // 吻部
    sphere({
      c: { x: 0, y: 0.98, z: 0.28 },
      r: hRad * 0.32,
      s: [1.30, 0.72, 0.60],
      k: 0.10,
      tag: 'snout',
    }),

    // 左耳
    roundCone({
      a: { x: -0.22 * wid, y: 1.27, z: -0.04 },
      b: { x: -0.29 * wid, y: 1.57, z: -0.08 },
      r1: 0.115 * hr, r2: 0.018,
      k: 0.16, tag: 'ear',
    }),

    // 右耳
    roundCone({
      a: { x: 0.22 * wid, y: 1.27, z: -0.04 },
      b: { x: 0.29 * wid, y: 1.57, z: -0.08 },
      r1: 0.115 * hr, r2: 0.018,
      k: 0.16, tag: 'ear',
    }),

    // ================================================================
    //  躯干（上胸 / 中腹 / 下臀）
    // ================================================================
    // 上胸 —— 略宽，模拟锁骨/肩膀区域
    sphere({
      c: { x: 0, y: 0.72, z: 0 },
      r: 0.30,
      s: [1.18 * wid, 1.08, 0.72],
      k: 0.22, tag: 'body',
    }),

    // 中腹 —— 收腰感
    sphere({
      c: { x: 0, y: 0.46, z: 0.02 },
      r: 0.29,
      s: [1.08 * wid, 1.0, 0.72],
      k: 0.22, tag: 'body',
    }),

    // 臀部 —— 略宽
    sphere({
      c: { x: 0, y: 0.20, z: 0.04 },
      r: 0.30,
      s: [1.16 * wid, 0.92, 0.78],
      k: 0.22, tag: 'body',
    }),

    // ================================================================
    //  后腿（站立）
    // ================================================================
    // 左大腿
    roundCone({
      a: { x: -0.13, y: 0.04, z: 0.02 },
      b: { x: -0.15, y: -0.22, z: 0.06 },
      r1: 0.092, r2: 0.072,
      k: 0.16, tag: 'leg',
    }),
    // 左小腿
    roundCone({
      a: { x: -0.15, y: -0.22, z: 0.06 },
      b: { x: -0.14, y: -0.40, z: 0.10 },
      r1: 0.072, r2: 0.058,
      k: 0.14, tag: 'leg',
    }),
    // 左脚掌
    sphere({
      c: { x: -0.14, y: -0.42, z: 0.15 },
      r: 0.068,
      s: [1.25, 0.45, 1.65],
      k: 0.12, tag: 'leg',
    }),

    // 右大腿
    roundCone({
      a: { x: 0.13, y: 0.04, z: 0.02 },
      b: { x: 0.15, y: -0.22, z: 0.06 },
      r1: 0.092, r2: 0.072,
      k: 0.16, tag: 'leg',
    }),
    // 右小腿
    roundCone({
      a: { x: 0.15, y: -0.22, z: 0.06 },
      b: { x: 0.14, y: -0.40, z: 0.10 },
      r1: 0.072, r2: 0.058,
      k: 0.14, tag: 'leg',
    }),
    // 右脚掌
    sphere({
      c: { x: 0.14, y: -0.42, z: 0.15 },
      r: 0.068,
      s: [1.25, 0.45, 1.65],
      k: 0.12, tag: 'leg',
    }),

    // ================================================================
    //  前臂（酷 pose）
    // ================================================================
    // 左臂 —— 自然下垂
    roundCone({
      a: { x: -0.34, y: 0.72, z: 0.03 },
      b: { x: -0.40, y: 0.44, z: 0.09 },
      r1: 0.076, r2: 0.064,
      k: 0.14, tag: 'arm',
    }),
    roundCone({
      a: { x: -0.40, y: 0.44, z: 0.09 },
      b: { x: -0.37, y: 0.20, z: 0.12 },
      r1: 0.064, r2: 0.052,
      k: 0.12, tag: 'arm',
    }),
    // 左爪
    sphere({
      c: { x: -0.37, y: 0.17, z: 0.13 },
      r: 0.060,
      s: [1.15, 0.70, 0.70],
      k: 0.12, tag: 'arm',
    }),

    // 右臂 —— 叉腰（往内弯折，又酷又痞）
    roundCone({
      a: { x: 0.34, y: 0.72, z: 0.03 },
      b: { x: 0.30, y: 0.46, z: -0.08 },
      r1: 0.076, r2: 0.064,
      k: 0.14, tag: 'arm',
    }),
    roundCone({
      a: { x: 0.26, y: 0.46, z: -0.08 },
      b: { x: 0.18, y: 0.30, z: -0.04 },
      r1: 0.058, r2: 0.048,
      k: 0.12, tag: 'arm',
    }),
    // 右爪
    sphere({
      c: { x: 0.18, y: 0.28, z: -0.04 },
      r: 0.052,
      s: [0.70, 0.70, 1.15],
      k: 0.12, tag: 'arm',
    }),

    // ================================================================
    //  尾巴（S 形甩动）
    // ================================================================
    // 根部
    roundCone({
      a: { x: 0, y: 0.14, z: -0.30 },
      b: { x: -0.18, y: -0.08, z: -0.34 },
      r1: 0.068, r2: 0.058,
      k: 0.14, tag: 'tail',
    }),
    // 中段
    roundCone({
      a: { x: -0.18, y: -0.08, z: -0.34 },
      b: { x: -0.36, y: -0.24, z: -0.24 },
      r1: 0.058, r2: 0.048,
      k: 0.12, tag: 'tail',
    }),
    // 尾尖上翘
    roundCone({
      a: { x: -0.36, y: -0.24, z: -0.24 },
      b: { x: -0.32, y: -0.06, z: -0.06 },
      r1: 0.048, r2: 0.030,
      k: 0.10, tag: 'tail',
    }),
  ]

  // 网格化
  const cellSize = resolveCatMeshCellSize(prims, 'static')
  const floorY = -0.50
  const geo = meshFromSDF(prims, cellSize, floorY)

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
  const headCenter = new THREE.Vector3(0, 1.05, 0.02)

  return { mesh, headCenter, headRadius: hRad, prims }
}
