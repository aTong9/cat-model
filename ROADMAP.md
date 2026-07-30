# 参数化猫猫 IP 生成器开发路线图

> 本文是面向开发者与 AI 编码代理的执行文档。开始任务前先阅读本文件、`README.md`、相关测试和目标模块；一次只推进一个可验证切片，不得绕过 `createCatAssembly()` 建立第二套角色生成逻辑。

## 1. 产品目标

把现有 Liberty Cats 3D trait 配置器升级为可创作、可复现、可分享、可导出的参数化猫猫 IP 生成器，同时保持 9,901 个历史 Token 的兼容性。

核心输出：实时 3D 预览、透明 PNG、GLB、CatTraits JSON、IP 角色卡。任何角色都应能由 `schemaVersion + generatorVersion + seed + traits` 重建。

## 2. 架构原则

- `CatTraits` 是角色事实来源；Pinia 只保存编辑状态。
- `createCatAssembly(traits, options)` 是预览、导出和游戏的唯一角色入口。
- `character`、`environment`、`editor` 参数分离；背景、天气、灯光不进入角色 GLB。
- 随机只负责生成参数，不得在装配过程中引入不可控随机。
- 新参数必须包含默认值、范围、规范化、校验、分享序列化和测试。
- 旧 schema、旧分享链接和 Token metadata 必须可迁移。
- Three.js 资源必须可销毁；连续调参优先更新 transform/uniform，昂贵几何重建需节流。

## 3. 目标数据模型

```js
{
  schemaVersion: 2,
  generatorVersion: '3.x',
  tokenId: '42',
  seed: 42,
  morphology: {
    bodyScale: 1,
    headScale: 1,
    earScale: 1,
    legLength: 1,
    tailLength: 1,
    tailCurl: 0
  },
  appearance: {
    fur: 'Tuxedo', furColor: '#53515b', eyes: 'VR', face: 'Smile'
  },
  accessories: { gear: 'Camera' },
  identity: { name: '', personality: [], occupation: '', theme: '', story: '' },
  environment: { background: 'Purple Gradient' }
}
```

迁移期间允许内部保留扁平兼容字段，但新增功能应按上述领域边界设计。

## 4. 执行阶段

### Phase A — Schema v2 与兼容层（当前）

任务：

- [x] 建立本 Roadmap。
- [x] 将 `CatTraits` 升级到 v2，并为 v1/旧 URL 提供兼容迁移。
- [x] 增加 morphology 参数定义、范围限制和确定性默认值。
- [x] 分享 URL、JSON、Token 导入覆盖新参数。
- [x] 单测覆盖默认值、边界、v1 迁移和 round-trip。

验收：现有 Token 外观不变；旧链接可打开；同一输入生成完全相同的 v2 traits；全部测试通过。

### Phase B — 连续造型 MVP

任务：

- [x] 接入 bodyScale、headScale、earScale、legLength、tailLength、tailCurl。
- [ ] 将造型实现从动画 root transform 中隔离。
- [x] 参数面板增加滑杆、数值显示、复位和锁定。
- [ ] 拖动时不泄漏 geometry/material，不造成明显掉帧。
- [x] GLB 回读后保留造型比例及 morphology metadata。

验收：最小值/最大值无 NaN、无明显穿模；预览、PNG、GLB 一致。

### Phase C — 角色内核模块化

目标目录：

```text
src/character/
  body/ ears/ tail/ face/ coat/ equipment/ rig/
```

任务：逐步拆分 `CatModel.js`，保留稳定 facade；建立 socket、bounds、collider 和 dispose 合约；不得一次性重写全部模型。

进度：

- [x] 尾巴节点、曲线几何、动态更新与资源置换迁移至 `src/character/tail/`。
- [x] morphology transform 迁移至 `src/character/morphology/`。
- [x] 增加 morphology 极值、包围盒和 geometry 释放测试。
- [ ] 拆分耳朵模块，并建立可复用角色 parts/socket 注册表。

验收：调用方无需直接依赖子模块；现有动画、装备、导出测试不回退。

### Phase D — 规则化随机生成

任务：参数锁定、按主题随机、相似变体、权重/稀有度、装备冲突规则、Special 覆盖规则。所有模式都必须由 seed 确定。

验收：固定 seed 与锁定集合可复现；不产生非法组合；规则有独立单测。

### Phase E — 创作型编辑器

任务：按身体/外观/装饰/场景/IP 分栏；撤销重做；锁定随机；搜索；正侧背视图；移动端布局；未实现与冲突提示。

验收：键盘可访问；移动端可完成核心流程；编辑状态与角色数据分离。

### Phase F — IP 身份与角色卡

任务：名称、性格、职业、主题、故事、口头禅；先实现离线模板，再提供可选 AI 扩写；生成头像和三视图角色卡。

验收：无网络仍可完整生成；文本与 seed/traits 可复现；用户可编辑后导出。

### Phase G — 输出与质量门禁

任务：透明头像、社交头像、三视图、JSON、GLB、完整角色包；视觉基准截图；设备矩阵；性能预算；schema/generator 版本记录。

验收：历史 Token 与参数化角色批量审计通过；主流 PC/移动 WebGL 环境稳定。

## 5. AI 任务模板

每次开发按以下顺序执行：

1. 指定一个 Roadmap checkbox，不扩大范围。
2. 读取依赖模块、调用方和现有测试。
3. 先补或更新测试，再做最小实现。
4. 运行 `npm.cmd test` 与 `npm.cmd run build`。
5. 更新 checkbox，并记录重要设计决策。
6. 汇报改动文件、验证结果、已知风险和下一项建议。

## 6. 当前下一任务

为参数锁定补充 Pinia 单测；随后拆分耳朵模块，并建立角色 parts/socket 注册表，减少 `CatModel` 对私有字段的直接编排。
