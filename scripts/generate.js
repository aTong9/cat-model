/**
 * 像素猫 3D 生成器 —— Puppeteer 批量渲染
 *
 * 架构：
 *   1. 启动 headless Chrome
 *   2. 对每个特征组合，用 URL 参数驱动 public/render.html 的 Three.js 渲染
 *   3. 获取 canvas 截图保存为 PNG
 *   4. 生成 OpenSea 标准 metadata
 *
 * 用法:
 *   node src/generate.js                  # 默认 10 只
 *   node src/generate.js --count=100      # 100 只
 *   node src/generate.js --count=0        # 尽可能多 (上限 ~10000)
 *   node src/generate.js --seed=42        # 指定随机种子
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import {
  TRAITS,
  SPECIAL_FULLSCENES,
  CANVAS_SIZE,
  IMAGES_DIR,
  METADATA_DIR,
} from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, '../public/render.html');
const TEMPLATE_URL = `file://${TEMPLATE_PATH.replace(/\\/g, '/')}`;

// ============================================================
// 工具函数
// ============================================================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** mulberry32 RNG */
function createRNG(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function randItem(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/** 编码 URL 参数值 */
function encodeVal(v) {
  return encodeURIComponent(v);
}

// ============================================================
// 组合生成
// ============================================================
function pickTraits(rng) {
  const selected = {};

  // Special
  const specialChance = TRAITS.special.chance;
  if (rng() < specialChance) {
    selected.special = randItem(TRAITS.special.values, rng);
  }

  const isFull = selected.special && SPECIAL_FULLSCENES.includes(selected.special);

  // 非完整场景需要基础属性
  if (!isFull) {
    selected.background = randItem(TRAITS.background.values, rng);
    selected.fur_color  = randItem(TRAITS.fur_color.values, rng);
    selected.face       = randItem(TRAITS.face.values, rng);
    selected.eyes       = randItem(TRAITS.eyes.values, rng);

    if (rng() >= TRAITS.gear.noneChance) {
      selected.gear = randItem(TRAITS.gear.values, rng);
    }
  }

  return { selected, isFull };
}

function comboKey(sel) {
  const parts = [];
  for (const key of Object.keys(TRAITS)) {
    parts.push(sel[key] || 'None');
  }
  return parts.join('|');
}

// ============================================================
// 元数据生成
// ============================================================
function generateMetadata(tokenId, selected) {
  const attrs = [];
  for (const [key, trait] of Object.entries(TRAITS)) {
    attrs.push({
      trait_type: trait.displayName,
      value: selected[key] || 'None',
    });
  }
  return {
    name: `Pixel Cat 3D #${tokenId}`,
    description: 'A unique parametric 3D pixel cat. Each trait maps to procedural 3D geometry, materials, and scene composition.',
    image: `${tokenId}.png`,
    attributes: attrs,
  };
}

// ============================================================
// URL 构建
// ============================================================
function buildRenderURL(selected) {
  const p = new URLSearchParams();
  p.set('batch', '1');
  if (selected.fur_color)  p.set('fur', selected.fur_color);
  if (selected.eyes)       p.set('eyes', selected.eyes);
  if (selected.face)       p.set('face', selected.face);
  if (selected.gear)       p.set('gear', selected.gear);
  if (selected.background) p.set('bg', selected.background);
  if (selected.special)    p.set('special', selected.special);
  return `${TEMPLATE_URL}?${p.toString()}`;
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  let count = 10;
  let seed = Date.now();

  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      const v = parseInt(arg.split('=')[1], 10);
      if (!isNaN(v)) count = v;
    } else if (arg.startsWith('--seed=')) {
      const v = parseInt(arg.split('=')[1], 10);
      if (!isNaN(v)) seed = v;
    }
  }

  console.log('╔══════════════════════════════════════╗');
  console.log('║   🐱 Pixel Cat 3D Generator v2      ║');
  console.log('║   参数化 3D 模型 + 批量渲染         ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`\n📐 模板: ${TEMPLATE_PATH}`);

  ensureDir(IMAGES_DIR);
  ensureDir(METADATA_DIR);

  const rng = createRNG(seed);
  console.log(`🔢 Seed: ${seed}`);

  // 计算最大组合数
  if (count === 0) {
    count = 1;
    for (const [key, trait] of Object.entries(TRAITS)) {
      if (key === 'special') continue;
      const n = trait.values.length + (key === 'gear' ? 1 : 0);
      count *= (n || 1);
    }
    count = Math.floor(count * 1.08);
    count = Math.min(count, 10000);
    console.log(`   理论组合数 ~${count.toLocaleString()}, 上限 10000`);
  }

  // 找到继续的 tokenId
  let tokenId = 1;
  if (fs.existsSync(IMAGES_DIR)) {
    const existing = fs.readdirSync(IMAGES_DIR)
      .filter(f => /^\d+\.png$/.test(f))
      .map(f => parseInt(f, 10))
      .filter(n => !isNaN(n));
    if (existing.length > 0) {
      tokenId = Math.max(...existing) + 1;
      console.log(`   已有 ${existing.length} 个, 从 #${tokenId} 继续`);
    }
  }

  // 启动浏览器
  console.log('\n🚀 启动 headless Chrome...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: CANVAS_SIZE, height: CANVAS_SIZE, deviceScaleFactor: 1 });

  console.log('✅ Chrome 就绪\n');
  console.log(`🎨 开始生成 ${count} 只猫...\n`);

  const usedCombos = new Set();
  let generated = 0;
  let skipped = 0;
  const startTime = Date.now();
  const maxAttempts = count * 20;

  const canvasEl = await page.$('canvas'); // will be null until first page load

  for (let attempts = 0; generated < count && attempts < maxAttempts; attempts++) {
    const { selected } = pickTraits(rng);
    const ck = comboKey(selected);
    if (usedCombos.has(ck)) { skipped++; continue; }
    usedCombos.add(ck);

    const url = buildRenderURL(selected);

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
      // 等待 Three.js 渲染完成信号
      await page.waitForSelector('body[data-rendered="true"]', { timeout: 10000 });

      // 获取 canvas 数据
      const dataUrl = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        if (!c) throw new Error('No canvas found');
        return c.toDataURL('image/png');
      });

      const base64 = dataUrl.split(',')[1];
      const buf = Buffer.from(base64, 'base64');

      // 保存图片
      const imgName = `${tokenId}.png`;
      fs.writeFileSync(path.join(IMAGES_DIR, imgName), buf);

      // 保存元数据
      const meta = generateMetadata(tokenId, selected);
      fs.writeFileSync(
        path.join(METADATA_DIR, `${tokenId}.json`),
        JSON.stringify(meta, null, 2),
        'utf-8',
      );

      // 日志
      const traitsStr = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k, v]) => `${TRAITS[k].displayName}:${v}`)
        .join(' | ');
      console.log(`  [#${tokenId}] ${traitsStr || 'FullScene Special'}`);

      tokenId++;
      generated++;
    } catch (err) {
      console.error(`  ✗ 渲染失败: ${err.message}`);
    }
  }

  await browser.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ 完成! ${generated} 只 / ${elapsed}s`);
  console.log(`   跳过(重复): ${skipped}`);
  console.log(`   图片: ${path.resolve(IMAGES_DIR)}/`);
  console.log(`   元数据: ${path.resolve(METADATA_DIR)}/`);
}

main().catch(err => {
  console.error('❌ 致命错误:', err);
  process.exit(1);
});
