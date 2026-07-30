# 参数化 Liberty Cats 3D 生成器开发路线图

> 本文是面向开发者与 AI 编码代理的执行文档。开始任务前先阅读本文件、`README.md`、相关测试和目标模块；一次只推进一个可验证切片，不得绕过 `createCatAssembly()` 建立第二套角色生成逻辑。

## 1. 产品目标

把现有 Liberty Cats 3D trait 配置器升级为可创作、可复现、可分享、可导出的参数化猫猫 IP 生成器，并用一套共享角色系统确定性还原 9,901 个历史 Token。

核心输出：实时 3D 预览、透明 PNG、GLB、CatTraits JSON、IP 角色卡。任何角色都应能由 `schemaVersion + generatorVersion + tokenId + seed + traits` 重建。

数据事实来源：

- `liberty_cats_download/images/`：9,901 张完整 Token 图片，包含 9,412 张 PNG 和 489 张 WebP。
- `liberty_cats_download/all_metadata.json`：9,903 条源记录；排除 Token `4768`（缺图）和一个无效超长 Token 后，支持 9,901 个 Token。
- `liberty_cats_download/properties.md`：6 个属性维度、44 个离散 Trait。
- `pixel_cat_3d/img/`：15 张 Trait/Special 代表图片，用于建立首批视觉基准，不代表全部组合覆盖。
- `public/equipment/`：10 类装备的图片参考，部分装备已有 HTML 程序化原型。

## 2. 架构原则

- `CatTraits` 是角色事实来源；Pinia 只保存编辑状态。
- `createCatAssembly(traits, options)` 是预览、导出和游戏的唯一角色入口。
- `character`、`environment`、`editor` 参数分离；背景、天气、灯光不进入角色 GLB。
- 随机只负责生成参数，不得在装配过程中引入不可控随机。
- 新参数必须包含默认值、范围、规范化、校验、分享序列化和测试。
- 旧 schema、旧分享链接和 Token metadata 必须可迁移。
- Three.js 资源必须可销毁；连续调参优先更新 transform/uniform，昂贵几何重建需节流。
- 9,901 个 Token 是 9,901 份确定性配置，不是 9,901 套独立模型；禁止按 Token ID 复制角色网格或写坐标补丁。
- 44 个 Trait 必须按 Eyes、Face、Fur、Gear、Background、Special 六类实现；类别内部互斥，类别之间按规则组合。
- Special 是高优先级配方，可覆盖背景、装备、外观、动画和相机；不得将其视为普通背景贴图。
- 2D 图片是风格、轮廓、颜色和组合关系的证据；不可据单一正视图伪造不可见侧面的精确结构。

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
- [x] 将造型实现从动画 root transform 中隔离。
- [x] 参数面板增加滑杆、数值显示、复位和锁定。
- [x] 拖动时不泄漏 geometry/material，不造成明显掉帧。
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
- [x] 拆分耳朵模块，并建立可复用角色 parts/socket 注册表。
- [x] 将装备装配从世界坐标迁移为 registry socket 的局部变换。
- [x] 增加 headScale/bodyScale 极值下的装备挂点跟随测试。
- [x] 装备创建、挂载、替换与销毁迁移至独立 `EquipmentAssembler`。
- [x] 增加动态切换资源释放与 GLB socket/attachment metadata 回读测试。
- [x] 建立共享 Object3D 资源销毁工具并接入模型、装备和 GLB 回读。
- [x] 拆分身体 shell 与四肢集合装配边界。
- [x] 将 skinned limb 几何、手掌和脚掌工厂完整迁入 `src/character/limbs/`。
- [x] 动画系统仅通过 registry joints 合约访问骨骼。
- [x] 姿势模式、速度、策略分发与站立待机动画迁入独立 `CatAnimator`。
- [x] registry joints 改用稳定 part ID 作为键，不再使用 `Object3D` 引用作为键。
- [x] 各姿势关节计算迁入独立 animator strategy 模块，并提供可验证的策略注册合约。
- [x] 姿势 strategy 使用显式 animation rig 合约，并在每帧策略执行前重置基础 pose。

验收：调用方无需直接依赖子模块；现有动画、装备、导出测试不回退。

### Phase D — 规则化随机生成

任务：参数锁定、按主题随机、相似变体、权重/稀有度、装备冲突规则、Special 覆盖规则。所有模式都必须由 seed 确定。

- [x] 独立 seed 规则引擎与确定性回归测试。
- [x] 参数锁定、主题随机和相似变体。
- [x] 权重稀有度、装备冲突与 Special 覆盖规则。

验收：固定 seed 与锁定集合可复现；不产生非法组合；规则有独立单测。

### Phase E — 创作型编辑器

任务：按身体/外观/装饰/场景/IP 分栏；撤销重做；锁定随机；搜索；正侧背视图；移动端布局；未实现与冲突提示。

- [x] 身体、外观、装饰、场景、IP 与动作分栏。
- [x] 有界撤销/重做历史与 Pinia 集成。
- [x] 参数搜索、随机锁定、正侧背视图和冲突/实现状态提示。
- [x] 键盘焦点样式、移动端面板与移动控制布局。

验收：键盘可访问；移动端可完成核心流程；编辑状态与角色数据分离。

### Phase F — IP 身份与角色卡

任务：名称、性格、职业、主题、故事、口头禅；先实现离线模板，再提供可选 AI 扩写；生成头像和三视图角色卡。

- [x] 身份字段进入 CatTraits，并可在编辑器修改。
- [x] 基于 seed/traits 的确定性离线名称、性格、职业、主题、故事与口头禅。
- [x] SVG 角色卡、头像输出规格和正侧背三视图捕获。
- [x] AI 扩写保持可选，离线流程不依赖网络。

验收：无网络仍可完整生成；文本与 seed/traits 可复现；用户可编辑后导出。

### Phase G — 输出与质量门禁

任务：透明头像、社交头像、三视图、JSON、GLB、完整角色包；视觉基准截图；设备矩阵；性能预算；schema/generator 版本记录。

- [x] 透明头像、社交头像、三视图、JSON、GLB 与角色包 manifest。
- [x] 固定 seed/视图质量基准、设备矩阵和性能预算审计。
- [x] schemaVersion、generatorVersion、seed 与 traits 写入可审计输出。

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

Phase A–G 已完成。下一目标是以共享基础猫、44 个可组合视觉模块和 9,901 份确定性配置完成全量 3D 还原。按 Phase H–N 顺序推进；未通过当前阶段验收前，不进入下一阶段。

## 7. 全量 9,901 Token 实施路线

### Trait 实现分类

| 领域 | 数量 | 实现边界 | 当前数据覆盖 |
|---|---:|---|---:|
| Eyes | 6 | 眼球、眼圈、眼镜、VR 组件和眼部材质 | 9,899 |
| Face | 5 | 嘴部几何、牙齿、舌头、表情策略 | 9,899 |
| Fur Color | 8 | 角色局部坐标/UV 遮罩与材质配方 | 9,899 |
| Gear | 10 | 独立装备 assembly、socket、碰撞与导出 metadata | 9,806 |
| Background | 8 | 环境背景、灯光与雾，不进入角色 GLB | 9,459 |
| Special | 7 | 角色/装备/环境/动画/相机组合覆盖配方 | 442 |

Background 缺失数与 Special 出现数均为 442，默认规则为 Special 替代普通 Background；必须用元数据和代表图逐项验证例外。Eyes、Face、Fur 各缺失的 2 个 Token 应由完整角色 Special 配方接管，不得静默填入普通默认值。

### Phase H — 数据合同与视觉证据索引

目标：让每个视觉决策都能追溯到 metadata、完整 Token 图片或代表素材。

- [ ] 固化 9,901 Token catalog 的 schema、排除规则、图片扩展名和来源 URL。
- [ ] 为 44 个 Trait 建立 manifest：`id`、领域、频率、代表 Token、实现类型、依赖、冲突、状态和证据路径。
- [ ] 自动为每个 Trait 选取 3–8 个低遮挡代表 Token；Special 全量进入代表集。
- [ ] 建立组合覆盖矩阵，覆盖眼睛×表情、毛色×装备、装备×Special 等高风险组合。
- [ ] 明确 null 语义：无 Gear、无 Background、无 Special 与数据缺失必须可区分。
- [ ] 将 `properties.md` 的 44 个取值与代码枚举做双向一致性测试。

验收：9,901 Token 均能规范化；44 个 Trait 无遗漏、无未知别名；每个实现项至少有一个可点击的证据图片；数据审计为零失败。

### Phase I — 冻结共享基础猫与装配合约

目标：以新正视图/三视图为唯一默认造型基准，所有历史 Token 共用一套可动画模型。

- [ ] 冻结默认猫的正面、3/4、侧面和背面轮廓基准及相机参数。
- [ ] 校准连续头身、楔形耳朵、短腿宽脚、贴体手臂和后背竖向尾巴。
- [ ] 固化 `body/head/ears/arms/legs/tail/face` 的稳定 part ID、joint 和 socket 合约。
- [ ] 为肩、髋、尾根增加接触/嵌入检测，覆盖 bodyScale、headScale、legLength、tailLength 极值。
- [ ] 规定前脚掌垫默认不可见、后视脚掌垫可见，并建立视角回归。
- [ ] 建立基础猫性能预算和 GLB round-trip 基准。

验收：四个固定视角与参考轮廓一致；所有附肢无悬空、黑缝和开放截面；动画切换不破坏连接；极值测试和导出通过。

### Phase J — 程序化毛色与区域遮罩

目标：用统一角色局部坐标或 UV 生成 8 种可随体型变化的毛色，而不是把 2D 图片直接贴到正面。

- [ ] 建立 `muzzle/chest/belly/paw/tailTip/leftFace/rightFace/stripe/spot` 等语义遮罩。
- [ ] 完成 Golden 标准配方：黄色主体、白口鼻、白胸腹、白手、白脚和白尾尖。
- [ ] 完成 Orange、Gray、Black 的基础色与白区配方。
- [ ] 完成 Tuxedo 的黑白分区和脸部边界。
- [ ] 完成 Calico 的白底、橙黑面部和身体分区斑块。
- [ ] 完成 Blue Lightning Tabby 的方向性条纹。
- [ ] 完成 Leopard Patterned 的尺度稳定豹斑。
- [ ] 遮罩参数进入可序列化 appearance 配方，但历史 Token 默认值保持确定性。

验收：8 种 Fur 在默认、最瘦、最胖、头部极值下无漂移和拉伸；正/侧/背均有合理连续图案；固定 Token 截图可复现。

### Phase K — Eyes 与 Face 可组合系统

目标：6 种 Eyes 与 5 种 Face 能形成合法笛卡尔组合，不通过整脸预制件耦合。

- [ ] Eyes 独立实现 Original、Alert、Blue Ring、Relaxed、Sunglasses、VR。
- [ ] Face 独立实现 Excited、Smile、Whistling、Wow、Yum。
- [ ] 眼球、眼圈、高光、眼镜和 VR 的材质与尺寸分别参数化。
- [ ] 嘴腔、牙齿、舌头、唇线和表情动画分别注册到 face socket。
- [ ] 建立 Eyes×Face 全 30 组合的包围盒、遮挡和截图冒烟测试。
- [ ] 处理 Sunglasses/VR 与头部装备的优先级、互斥或局部偏移规则。

验收：30 种组合均可装配、动画和导出；无眼部穿模、嘴部埋入或装备冲突；代表图片逐项验收。

### Phase L — 10 类装备生产化

目标：每类装备只建一次，通过 socket 和局部配置覆盖全部关联 Token。

- [ ] 为 Baseball Cap、Gold Round Glasses 建立头/脸 socket 配方。
- [ ] 为 Camera、Hiking Backpack 建立胸前/背部 socket 配方。
- [ ] 为 Good Luck Gold Bar、Wealth Gold Bar、Hot Coffee、Investment Book、Ramen、Sake 建立手持配方。
- [ ] 复用并审计 `public/equipment` 图片与 HTML 原型；确定哪些是几何证据、哪些只是正视图样式证据。
- [ ] 每件装备补齐 named parts、collider、attachment metadata、dispose 和 GLB 回读。
- [ ] 建立默认与体型极值下的挂点、遮挡、左右手和动态切换测试。

验收：10 类装备均有独立 3D 轮廓和材质，不使用世界坐标；9,806 个含装备 Token 可批量装配；切换无资源泄漏。

### Phase M — Background 与 Special 配方系统

目标：区分普通环境和高优先级特殊配方，完整覆盖 442 个 Special Token。

- [ ] 完成 8 种 Background 的颜色、灯光、雾和导出策略。
- [ ] 定义 Special recipe 合约：`characterOverrides/equipmentOverrides/environmentFactory/lightingProfile/animationProfile/cameraProfile/exportPolicy`。
- [ ] 完成 Fitness Guru、Realm of Mt.Fuji、Thunderous Might 的组合配方。
- [ ] 完成 Onsen journey、Time Traveler 的角色与环境组合配方。
- [ ] 为 Galactic Voyage、Golden General 两个单 Token Special 建立英雄级专用配方。
- [ ] 明确 Special 与 Gear、Background、Fur、Eyes、Face 的覆盖优先级，并测试所有代表 Token。

验收：442 个 Special Token 无普通背景误叠加；Special 缺省字段不被静默补齐；场景资源可释放；角色 GLB 不夹带环境资源。

### Phase N — 代表集视觉门禁与 9,901 全量生成

目标：先用约 120–180 个代表 Token 覆盖规则，再批量验证全部 Token。

- [ ] 生成代表 Token 的正面、3/4、侧面、背面和原始 2D 对照图。
- [ ] 为轮廓、颜色区域、关键 Trait、装备遮挡和 Special 场景建立人工验收状态。
- [ ] 自动检测空模型、NaN、异常包围盒、悬空 socket、相机裁切、透明输出和资源泄漏。
- [ ] 批量生成 9,901 个 Token 的审计缩略图、CatTraits JSON 和可选 GLB。
- [ ] 输出全量报告：装配数、渲染数、metadata 匹配数、缺失资源、非法 bounds、socket 错误、导出失败和视觉警告。
- [ ] 对失败项按 Trait/组合聚类修复，禁止按 Token ID 打补丁；确属独一 Special 的例外必须写入 recipe manifest。
- [ ] 冻结 `generatorVersion`，保存代表集基准和全量审计摘要。

验收目标：

```text
9901 total
9901 normalized
9901 assembled
9901 rendered
9901 metadata matched
0 missing assets
0 invalid bounds
0 detached sockets
0 export failures
0 unexplained visual exceptions
```

## 8. 44 Trait 完成定义

任一 Trait 只有同时满足以下条件才可标记完成：

1. 有独立视觉实现，不是通用 fallback。
2. 有 metadata 枚举映射和 null/冲突语义。
3. 有至少 3 个普通代表 Token；样本不足的 Special 使用全部 Token。
4. 有正、侧、背至少三个视角证据。
5. 在相关体型极值下不漂移、不穿模、不悬空。
6. 可预览、可释放、可导出，并保留 metadata。
7. 固定输入可生成完全一致的结果。
8. 通过自动测试和人工视觉验收。

## 9. 当前推荐执行顺序

1. Phase H：Trait manifest 与代表 Token 集。
2. Phase I：冻结基础猫三维造型和 socket。
3. Phase J：Golden 标准分色及 8 种 Fur 遮罩。
4. Phase K：Eyes/Face 30 组合。
5. Phase L：10 类装备。
6. Phase M：8 类背景和 7 类 Special。
7. Phase N：代表集门禁与 9,901 全量审计。

当前下一 checkbox：`Phase H — 固化 9,901 Token catalog 的 schema、排除规则、图片扩展名和来源 URL。`
