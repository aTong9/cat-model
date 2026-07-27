# Pixel Cat 3D Generator

**参数化 3D 猫生成器** — 参考 [Meow-Generator](https://github.com/ringhyacinth/Meow-Generator) 的参数化架构，将所有 `properties.md` 中 6 个属性类别实现为 **3D 模型参数**，通过 **程序化 Three.js 渲染 + Puppeteer 批量出图**。

## 核心架构

```
┌─────────────────────────────────────────────────┐
│  properties.md                                  │
│  ├─ Eyes (6)  ├─ Face (5)   ├─ Fur Color (8)  │
│  ├─ Gear (10) ├─ Background (8) ├─ Special (7) │
└───────────────────┬─────────────────────────────┘
                    │ 参数映射
                    ▼
┌─────────────────────────────────────────────────┐
│  public/render.html (Three.js)                  │
│  ├─ 程序化几何体: 头/身/耳/腿/尾/眼睛/嘴/胡须 │
│  ├─ 毛色纹理: solid/striped/patches/spots/     │
│  │              tuxedo (Canvas 2D 生成)        │
│  ├─ 眼睛系统: 标准/蓝环/墨镜/VR/半闭          │
│  ├─ 表情系统: 口型(微笑/张/吹哨/吐舌) + 脸红  │
│  ├─ 装备: 11 种 3D 配件                        │
│  └─ 背景: 渐变 / Special 场景元素              │
└───────────────────┬─────────────────────────────┘
                    │ URL 参数驱动
                    ▼
┌─────────────────────────────────────────────────┐
│  src/generate.js (Puppeteer)                    │
│  ├─ 随机特征组合 → 去重                         │
│  ├─ headless Chrome 渲染 → Canvas 截图          │
│  └─ 输出: PNG + OpenSea 标准 JSON               │
└─────────────────────────────────────────────────┘
```

## 属性一览 (44 种取值)

| 属性 | 数量 | 取值 |
|------|------|------|
| **Eyes** | 6 | Alert, Blue Ring, Original, Relaxed, Sunglasses, VR |
| **Face** | 5 | Excited, Smile, Whistling, Wow, Yum |
| **Fur Color** | 8 | Black, Blue Lightning Tabby, Calico, Golden, Gray, Leopard Patterned, Orange, Tuxedo |
| **Gear** | 10 | Baseball Cap ~ Wealth Gold Bar (15% 无装备) |
| **Background** | 8 | 8 种渐变色 |
| **Special** | 7 | Fitness Guru ~ Time Traveler (8% 概率触发) |

## 项目结构

```
cat-cenerator/
├── public/
│   └── render.html          # Three.js 3D猫渲染页 (可独立在浏览器打开预览)
├── src/
│   ├── config.js            # 属性配置 + 3D参数映射
│   └── generate.js          # Puppeteer 批量生成脚本
├── pixel_cat_3d/            # 原始参考素材
│   ├── properties.md        # 属性定义
│   └── img/                 # 15张参考图
├── output/
│   ├── images/              # 生成的 PNG
│   └── metadata/            # OpenSea 标准 JSON
├── package.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

> Puppeteer 会自动下载 Chromium (~350MB)，仅首次需要。

### 2. 预览 3D 猫 (浏览器)

直接在浏览器打开 `public/render.html`，通过 URL 参数控制所有属性：

```
file:///E:/cat/demo/cat-cenerator/public/render.html?fur=Orange&eyes=Alert&face=Smile&gear=Camera&bg=Purple%20Gradient
```

### 3. 批量生成

```bash
# 默认生成 10 只
npm run generate

# 生成 100 只
npm run generate:100

# 生成尽可能多的不重复组合 (上限 10000)
npm run generate:all

# 指定随机种子 (相同种子 = 相同结果)
node src/generate.js --seed=42 --count=50
```

## 3D 模型特性

### 毛色系统
- **Solid**: 纯色 (Black, Golden, Gray, Orange)
- **Striped**: 条纹纹理 (Blue Lightning Tabby) — Canvas 2D 程序化生成
- **Patches**: 随机色块 (Calico) — 仿三花猫
- **Spots**: 椭圆斑点 (Leopard Patterned)
- **Tuxedo**: 黑白配色，白色胸腹+嘴部

### 眼睛系统
- **标准眼**: 白色 + 黑色瞳孔 + 高光
- **Blue Ring**: 蓝色发光环
- **Relaxed**: 半闭眼 (上眼睑遮挡)
- **Sunglasses**: 3D 墨镜方块
- **VR**: 全包头显 + 绿色 LED 发光

### 表情系统
- **Smile**: 微笑弧线 (TubeGeometry 曲线管道)
- **Open** (Excited/Wow): 球形张嘴 + 眉毛角度
- **Whistle**: 环形吹哨口型
- **Tongue** (Yum): 张嘴 + 粉色舌头

### 装备 (3D 几何体)
- 棒球帽 / 相机 / 金丝圆眼镜 / 金条 / 登山包
- 热咖啡 / 投资书 / 拉面碗 / 清酒瓶

### Special 场景
| Special | 类型 | 效果 |
|---------|------|------|
| Galactic Voyage | FullScene | 星空 + 行星 + 环 |
| Golden General | FullScene | 金色天空 |
| Fitness Guru | 场景增强 | 蓝天 + 绿地 + 哑铃 |
| Onsen journey | 场景增强 | 暖色天 + 水面 |
| Realm of Mt.Fuji | 场景增强 | 山 + 雪顶 |
| Thunderous Might | 场景增强 | 暗天 + 闪电 |
| Time Traveler | 场景增强 | 紫色天空 + 时钟 + 传送门 |

### 渲染特性
- **Toon 着色**: StandardMaterial + ACES 色调映射
- **三光源**: 主光 + 补光 + 轮廓光
- **阴影**: 启用 shadowMap
- **相同种子稳定重现**: mulberry32 PRNG

## 输出格式

### 图片
`output/images/{tokenId}.png` — 1024×1024 PNG

### 元数据 (OpenSea 标准)
```json
{
  "name": "Pixel Cat 3D #1",
  "description": "A unique parametric 3D pixel cat...",
  "image": "1.png",
  "attributes": [
    { "trait_type": "Background", "value": "Blue Gradient" },
    { "trait_type": "Fur Color", "value": "Orange" },
    { "trait_type": "Face", "value": "Smile" },
    { "trait_type": "Eyes", "value": "Alert" },
    { "trait_type": "Gear", "value": "Camera" },
    { "trait_type": "Special", "value": "None" }
  ]
}
```

## 技术栈

- **Node.js** >= 18 (ESM)
- **Three.js** 0.160 (CDN, 程序化 3D 建模 + 材质)
- **Puppeteer** (headless Chrome, WebGL 渲染 + 截图)
- **Canvas 2D** (程序化毛色纹理生成)

## License

参考 Meow-Generator，个人学习/研究/实验使用。商业使用需单独授权。
