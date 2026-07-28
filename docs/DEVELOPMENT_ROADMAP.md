# Liberty Cats 3D Generator 开发 Roadmap

版本：2026-07-28  
定位：以 Liberty Cats 全量 metadata 为事实来源，将 2D NFT 特征重建为可配置、可复现、可导出 GLB、可直接进入小游戏的 Three.js 角色系统。

## 一、最终目标

项目最终应形成四个共享同一数据与角色内核的产品面：

```text
Liberty Cats metadata + 本地参考图
                 │
                 ▼
        规范化 CatTraits / TokenCatalog
                 │
                 ▼
          createCatAssembly(traits)
            │        │        │
            ▼        ▼        ▼
         配置器     GLB导出    游戏运行时
            │                    │
            ▼                    ▼
        视觉对照工具          多款小游戏
```

核心验收定义：

- 产品范围内的 9,901 个 token 均能被解析并生成；
- 每个 token 都能稳定生成同一个 3D 角色；
- 六类 trait 均有明确的 3D 映射或 Special 处理规则；
- 导出的 GLB 能重新加载，且角色、材质、装备和动画一致；
- 配置器和小游戏只依赖同一个角色生成 API；
- 不预生成 9,901 个重复 GLB，默认采用参数驱动和按需导出。

### 已冻结的产品决策

- 运行平台：PC 浏览器、手机浏览器和应用内 WebView；
- GLB 消费者：当前 Three.js 项目优先，同时按标准 glTF 2.0 约束保持 Blender 等工具的后续兼容性；
- token `4768`：从产品支持范围排除，不补图、不生成角色；
- 异常超长 token：无有效数据，从产品支持范围排除；
- 最终目标集合：9,901 只具有本地图片和有效 metadata 的猫。

## 二、当前数据基线

### 已有数据

- `liberty_cats_download/all_metadata.json`
  - 声明 9,903 条记录；
  - 正常数字 token 为 `0–9901`，共 9,902 条原始记录；
  - token `4768` 已决定从产品范围排除；
  - 存在一条无图片、无有效属性的异常超长 token ID，已决定排除；
  - 合约地址：`0x0030F47D6a73Bc518CF18fE027Ea91DD6B2b6003`。
- `liberty_cats_download/images/`
  - 9,901 张图片；
  - 9,412 张 PNG，489 张 WebP；
  - 9,901 张图片与最终支持的 9,901 个 token 一一对应。
- `liberty_cats_download/properties.md`
  - Eyes：6 种；
  - Face：5 种；
  - Fur Color：8 种；
  - Gear：10 种；
  - Background：8 种；
  - Special：7 种。

### 数据规则

- metadata 是 token 与属性关系的事实来源；
- 图片是视觉验证来源，不从图片重新猜属性；
- `properties.md` 是人工可读目录，不作为程序运行时唯一数据源；
- 原始下载文件只读保留，派生数据由脚本写入独立目录；
- 异常记录必须保留审计日志，不能静默丢弃。

## 三、从 Meow-Generator 借鉴什么

参考项目：[ringhyacinth/Meow-Generator](https://github.com/ringhyacinth/Meow-Generator)

### 值得借鉴的工程思想

1. **确定性生成**
   - 种子和显式参数可以重现同一角色；
   - 随机仅用于“创建参数”，不应在角色构建阶段偷偷引入不可控差异。
2. **程序几何与外观配置分离**
   - SDF/模型结构负责身体；
   - coat、眼睛、姿态、配色各自维护；
   - 避免把所有特征塞进一个超大类。
3. **静态展示与 Motion 分层**
   - 展示角色和可运动角色使用同一外观参数；
   - 骨架、蒙皮、动画采样和状态机独立于 UI。
4. **参数交接包**
   - 导出参数 JSON、参考 PNG、GLB；
   - 资产可追溯到 token、schema 版本和生成器版本。
5. **专项自动测试**
   - 动画、交互区域、分享/导出分别测试；
   - 不只依赖人工打开网页观察。
6. **本地优先**
   - 配置和生成可在浏览器完成；
   - 核心角色体验不依赖后端或登录。

### 不直接照搬的部分

- Liberty Cats 的目标是忠实映射既有 NFT trait，不是自由捏体型；
- 背景不属于角色 GLB，Special 需要区分角色变体与关卡主题；
- 小游戏需要更严格的角色尺寸、碰撞、LOD 和动画接口；
- Meow-Generator 采用 PolyForm Noncommercial 许可。借鉴设计思想可以，复制代码或用于商业项目之前必须核对并取得适当授权；本项目应优先独立实现。

## 四、目标代码架构

```text
src/
  data/
    tokenCatalog.js            token 查询接口
    traitCatalog.js            trait 稳定 ID、显示名、别名、实现状态
  core/
    normalizeMetadata.js       原始 metadata -> CatTraits
    validateTraits.js          schema 和组合规则校验
    createCatAssembly.js       唯一角色装配入口
    assetRegistry.js           几何体、材质、纹理、附件缓存
    disposeAssembly.js         资源生命周期
  character/
    body/                      身体/SDF/游戏网格
    materials/                 毛色与花纹
    face/                      眼睛和表情
    equipment/                 装备实现
    specials/                  Special 角色变体
    rig/                       骨架、蒙皮、动画 clips
  export/
    exportCharacterGlb.js      角色级 GLB
    exportCharacterPackage.js  traits + preview + GLB
    validateGlb.js             导出回读
  runtime/
    CharacterController.js     移动、跳跃、动作状态
    CharacterLoader.js         参数装配或 GLB 加载
    InputController.js         键鼠、触屏、手柄
  viewer/                      配置器和视觉对照页面
  games/
    shared/                    相机、关卡、碰撞、UI、计分
    runner/                    第一款跑酷游戏
```

Vue/Pinia 只负责界面状态。核心模块不得依赖 Vue、DOM 或页面中的 canvas。

## 五、统一数据模型

### CatTraits

内部 ID 使用小写短横线格式，metadata 原文只用于导入和展示：

```js
{
  schemaVersion: 1,
  tokenId: 4767,
  eyes: 'vr',
  face: 'whistling',
  fur: 'black',
  gear: 'ramen',
  background: 'blue-gradient',
  special: null
}
```

### CatAssembly

```js
{
  root,              // 只包含角色
  mixer,
  clips,
  sockets,
  collider,
  bounds,
  metadata,
  dispose()
}
```

### 组合规则

- 普通 token：Eyes + Face + Fur + 可选 Gear + Background；
- 普通 Special：保留猫角色，但背景由关卡或展示场景处理；
- Full-scene/Legendary：明确判断是独立角色模型，还是只在展示时替换完整场景；
- Background 永远不进入角色 GLB；
- 场景中的散落装备不进入角色 GLB；
- 所有 trait 必须有 `implemented / partial / blocked` 状态。

## 六、实施阶段

## Phase 0：冻结基线与权限确认

目标：确定数据范围和可合法使用的参考代码/美术范围。

任务：

- 保存当前构建可运行基线；
- 明确 Liberty Cats 图片、商标、3D 衍生与游戏分发权限；
- 明确 Meow-Generator 只借鉴架构还是已取得代码商业授权；
- 建立 PC 浏览器、手机浏览器和应用内 WebView 的测试设备矩阵；
- 确认角色美术目标是“trait 可识别”还是“尽量忠实还原原图”。

验收：权限和视觉目标有书面结论；没有结论的项目明确标为风险，不进入公开发布。

## Phase 1：数据规范化与覆盖报告

目标：把下载资料变成可测试的数据资产。

任务：

- 编写只读解析器读取 `all_metadata.json`；
- 过滤异常超长 token，记录原因；
- 输出精简的 `tokens.normalized.json`；
- 输出 `trait-catalog.json` 和出现次数；
- 报告缺图、重复 token、未知 trait、空值和异常组合；
- 将 token `4768` 和异常超长 token 写入显式排除清单；
- 从 9,901 个目标 token 中选出“最小视觉覆盖集”。

视觉覆盖集建议包含：

- 每个 trait 至少两个样本；
- 每个 Special 全部纳入；
- 常规组合约 30–50 个；
- 容易穿模的装备 × 毛色/表情组合；
- 当前 15 个已知预设。

验收：9,901 个目标 token 全部成功规范化，未知 trait 为 0；两条排除记录有固定原因和自动测试；报告可重复生成。

## Phase 2：角色工厂解耦

目标：预览、导出和游戏共用同一角色装配逻辑。

任务：

- 建立 `createCatAssembly(traits, options)`；
- 将 `CatModel`、装备装配、材质设置从 `CatCanvas.vue` 抽离；
- 所有构建随机行为改用显式 seed；
- 建立几何体、纹理、材质缓存；
- 建立统一销毁逻辑；
- Pinia store 只保存 `CatTraits` 和 UI 状态；
- URL 参数与 tokenId 都先经过规范化层。

验收：同一个 `CatTraits` 在刷新、预览和测试中得到稳定节点树、包围盒与外观。

## Phase 3：trait 视觉覆盖

目标：完成所有 44 个唯一 trait 的独立 3D 实现。

实施顺序：

1. 基础身体比例和轮廓；
2. 8 种 Fur；
3. 6 种 Eyes；
4. 5 种 Face；
5. 10 种 Gear；
6. 7 种 Special；
7. 8 种 Background 作为 viewer/game 环境。

每个 trait 的验收材料：

- 正面、侧面、45° 三张渲染；
- 对应 NFT 参考图；
- 实现状态；
- 三角面、材质数和纹理预算；
- 已知穿模或差异说明。

验收：44 个 trait 均为 implemented，视觉覆盖集无阻断性差异。

## Phase 4：游戏级骨架与动画

目标：让参数角色成为统一、可操控的游戏角色。

任务：

- 固定角色高度、脚底原点、面向和坐标轴；
- 选择统一 19 根左右的轻量骨架，或根据模型验证后调整；
- 完成蒙皮和装备 sockets；
- 动画最小集：idle、walk、run、jump_start、jump_loop、land、hit、interact、celebrate；
- 建立动画状态机，输入与模型内部节点解耦；
- 表情采用替换节点或 morph target；
- 建立胶囊碰撞体、脚底检测和地面坡度规则。

验收：视觉覆盖集中的所有角色都能跑跳、切换动画和佩戴装备，无明显骨骼爆炸或附件漂移。

## Phase 5：角色级 GLB 2.0

目标：导出可在当前项目和通用工具中复用的干净 GLB。

任务：

- 导出 `assembly.root`，不再导出整个 scene；
- 排除背景、地面、灯光、相机、天气、辅助对象和散落装备；
- 嵌入纹理、骨架、蒙皮和动画；
- 将 tokenId、traits、schemaVersion、generatorVersion 写入 `extras`；
- 文件命名：`liberty-cat-{tokenId}.glb`；
- 提供参数 JSON + 参考 PNG + GLB 的可选资产包；
- 导出后用 `GLTFLoader` 自动回读；
- 检查包围盒、节点名、动画数、纹理、文件大小和材质完整性。
- 优先使用 glTF 2.0 核心能力和 `MeshStandardMaterial` 可映射的 PBR 材质；
- 避免把运行时 ShaderMaterial、Canvas 引用、外部 URL 和 Three.js 私有状态写入 GLB；
- 增加 Blender 导入冒烟测试，检查比例、朝向、骨架、动画、透明材质和纹理。

验收：覆盖集全部通过 Three.js GLB 回读和 Blender 导入检查；重新加载后的角色与运行时装配角色一致。

## Phase 6：配置器升级

目标：从“参数面板原型”升级为全量 token 浏览和视觉校验工具。

任务：

- 支持 tokenId 搜索和上一只/下一只；
- 显示原始 NFT 图片与 3D 角色的对照视图；
- 支持按六类 trait 筛选；
- 显示 trait 实现状态和已知差异；
- 支持固定相机、灯光和质量档；
- 支持复制参数 JSON、保存当前 PNG、导出角色 GLB；
- 支持分享 URL，URL 只保存 tokenId 或规范化参数；
- 不在首屏加载 9,901 张图片，使用分页、缩略图和懒加载。
- WebView 不依赖 CDN、弹窗下载或浏览器扩展能力；导出功能通过能力检测决定下载、分享或交给宿主应用保存；
- 手机端处理触控、横竖屏、安全区、软键盘和低内存恢复。

验收：任意正常 token 可在 2–3 次交互内打开、对照和导出。

## Phase 7：第一款小游戏——收藏品跑酷

目标：验证角色系统真正可用于玩法，而非只能展示。

范围：

- 单机、单关卡、第三人称；
- WASD/方向键和移动端虚拟摇杆；
- 跑、跳、落地、收集鱼干或金币；
- 检查点、计时、分数、暂停、重开；
- 开始前选择 token；
- 至少三种装备提供简单玩法差异，但不破坏角色 schema；
- Special 先作为主题皮肤或关卡入口，不在第一版实现复杂剧情。

验收：覆盖集中的任意角色都可进入游戏；桌面端稳定 60 FPS，移动端目标帧率在实测后确定。

## Phase 8：全量自动审计与优化

目标：用机器证明全量覆盖。

任务：

- 对 9,901 个目标 token 执行参数构建检查；
- 生成缩略图回归和失败清单；
- 统计三角面、draw calls、材质、纹理、内存和构建耗时；
- 建立 `thumbnail / game / export` 三档质量；
- 对公共几何体、材质和纹理做共享缓存；
- 对同屏多角色考虑实例化、LOD 和纹理图集；
- 建立长时间运行的资源泄漏测试。

验收：解析成功率 100%，角色构建成功率 100%，没有未知 trait；性能超预算 token 有明确降级规则。

## Phase 9：第二、第三款小游戏

在共享运行时稳定后再选择：

1. 装备争夺派对：复用现有散落装备和拾取交互；
2. 障碍竞速：复用跑酷控制器，加入检查点和排行榜；
3. Special 主题关卡：时间传送门、富士攀登、雷暴躲避；
4. 暂缓多人实时同步，直到单机角色和关卡接口稳定。

## 七、测试策略

建议新增以下命令，具体测试框架在实施时选择：

```text
test:data          metadata、token 范围、trait schema
test:traits        44 个 trait 构建与组合规则
test:character     节点树、包围盒、socket、collider
test:motion        clips、骨架、蒙皮、状态机
test:export        GLB 导出与回读
test:coverage      视觉覆盖集
test:all-tokens    9,901 token 全量构建审计
```

每次合并至少运行：数据测试、trait 测试、构建和覆盖集 GLB 回读。全量 token 测试可以按计划运行，不必阻塞每次小改动。

## 八、性能与资产约定

初始预算，不是最终结论：

- 单个 game 角色：20k–50k 三角面；
- 单角色 draw calls：尽量不超过 10；
- 材质：尽量 1–4 个；
- 常规纹理：优先 1K；
- 移动端不实时生成高精度 SDF 网格，优先缓存 game mesh；
- WebView 和低性能手机默认使用 `game` 或更低质量档，并以能力检测选择阴影、像素比和后处理；
- 正确处理 WebGL context lost/restored，页面进入后台时暂停动画、物理和音频；
- Background 和关卡资源不打入角色 GLB；
- 公共附件按资源 ID 缓存，不为每只猫复制一份纹理；
- 1 Three.js unit = 1 米，Y-up，脚底原点；
- 角色朝向在 Phase 4 冻结，此后不得随意改变。

## 九、版本与产物

建议版本：

- `schemaVersion`：CatTraits 数据结构版本；
- `generatorVersion`：角色生成器版本；
- `assetVersion`：身体、装备、纹理版本；
- `gameRuntimeVersion`：控制器与动画接口版本。

同一 GLB 的 `extras` 中记录上述版本，方便未来发现旧模型并重新生成。

## 十、优先级与近期执行清单

### P0：现在开始

1. 完成 metadata 规范化脚本和数据审计报告；
2. 固化 token `4768` 与异常超长 token 的排除规则；
3. 生成最小视觉覆盖集；
4. 定义 `CatTraits` schema、稳定 ID 和 alias；
5. 确认视觉还原标准与授权边界。

### P1：数据稳定后

1. 抽出 `createCatAssembly()`；
2. 改造 viewer 使用角色工厂；
3. 建立 trait 实现矩阵；
4. 修正 GLB 导出边界；
5. 加入 GLB 自动回读。

### P2：角色可稳定导出后

1. 统一骨架与动作状态机；
2. 完成碰撞和游戏控制器；
3. 开发收藏品跑酷 MVP；
4. 执行全量 token 审计和性能优化。

## 十一、当前不确定事项

- 不确定两个 Legendary 是否应导出为猫角色、完整展示场景，或两者都提供；
- 不确定目标外观精度和可接受的 2D→3D 风格差异；
- 不确定商业发布范围以及 Liberty Cats、Meow-Generator 对应授权状态；
- 不确定具体需要覆盖哪些应用内 WebView 内核和最低系统版本，需要在 Phase 0 建立设备矩阵；
- Blender 兼容已经纳入目标；Unity、Godot 是否需要专项兼容仍不确定。

## 十二、项目决策原则

1. 数据先于建模：没有覆盖报告，不宣称支持全部猫；
2. 参数先于资产：token 保存参数，GLB 按需生成；
3. 角色与场景分离：Background/Special 场景不污染角色资产；
4. 内核与 UI 分离：Vue 不是角色生成器的依赖；
5. 预览、导出、游戏同源：只允许一个角色工厂；
6. 自动验证先于人工承诺：全量支持必须由报告证明；
7. 借鉴思想、尊重许可：第三方非商业代码不默认进入商业产品。
