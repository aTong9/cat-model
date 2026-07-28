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

## 主要目录

```text
src/
  components/       Vue 界面与 Three.js 画布
  config/           猫咪属性、预设和默认配置
  stores/           Pinia 状态
  styles/           全局样式
  three/            猫咪模型、装备、场景与 SDF 几何
pixel_cat_3d/        原始参考素材
public/              静态素材和独立查看页面
docs/                架构与开发路线文档
output/              模型开发过程的输出文件
```

应用入口是 `index.html`，随后加载 `src/main.js` 和 `src/App.vue`。

## 导出

页面底部提供：

- 保存当前 Three.js 画布为 PNG；
- 使用 Three.js `GLTFExporter` 导出 GLB。

当前 GLB 导出仍以整个场景为输入。面向小游戏的角色级 GLB 重构计划见 [`docs/LIBERTY_CATS_3D_ROADMAP.md`](docs/LIBERTY_CATS_3D_ROADMAP.md)。

