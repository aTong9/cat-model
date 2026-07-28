# Pixel Cat 3D Generator

基于 Vue 3、Pinia 和 Three.js 的参数化 3D 猫咪生成器。可以在浏览器中配置猫咪毛色、眼睛、表情、装备、背景和特殊场景，并导出 PNG 或 GLB。

## 技术栈

- Vue 3
- Pinia
- Three.js
- Vite

需要 Node.js 18 或更高版本。

## 本地运行

```bash
npm install
npm run dev
```

开发服务器默认使用 `http://localhost:1118`。

## 构建与预览

```bash
npm run build
npm run preview
```

## 数据审计与测试

```bash
npm test
npm run audit:data
npm run catalog:build
npm run test:data
```

数据审计只读取 `liberty_cats_download`，不会批量生成图片。`catalog:build` 会更新供前端查询的精简 catalog。当前规则支持 9,901 个 token，并显式排除 token `4768` 和无有效数据的异常超长 token。

## 主要目录

```text
src/
  core/             CatTraits 规范与角色装配工厂
  components/       Vue 界面与 Three.js 画布
  config/           猫咪属性、预设和默认配置
  stores/           Pinia 状态
  styles/           全局样式
  three/            猫咪模型、装备、场景与 SDF 几何
pixel_cat_3d/        原始参考素材
public/              静态素材和独立查看页面
docs/                架构与开发路线文档
output/              模型开发过程的输出文件
scripts/             只读数据审计工具
tests/               数据规范与角色工厂测试
```

应用入口是 `index.html`，随后加载 `src/main.js` 和 `src/App.vue`。

## 导出

页面底部提供：

- 保存当前 Three.js 画布为 PNG；
- 使用独立 GLB 管线导出角色：导出副本将 Toon 材质显式映射为 `blender-pbr-v1` 标准 PBR，过滤运行时对象引用，导出后通过 `GLTFLoader` 回读验证，再触发下载。

参数面板支持输入真实 tokenId，从精简 catalog 加载对应属性并显示 NFT 原图进行 2D/3D 对照。开发环境和生产环境均优先读取 metadata 中的远程原图地址，本地图片只作为失败兜底。

GLB 导出以角色根节点为输入，不包含地面、灯光和背景场景。骨架动画与 Blender 回读仍在后续计划中，详见 [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md)。

主界面支持上一只/下一只 Token 浏览、复制规范化 CatTraits JSON，以及复制能够恢复当前外观配置的分享链接。分享链接会保存毛色、眼睛、表情、装备、背景和 Special 参数。
