# Liberty Cats 3D Generator 开发 Roadmap

版本：2026-07-28  
定位：以 Liberty Cats 全量 metadata 为事实来源，将 2D NFT 特征重建为可配置、可复现、可导出 GLB、可直接进入小游戏的 Three.js 角色系统。

## 当前开发进度（2026-07-28）

- 已完成 9,901 个有效 token 的规范化 catalog、排除规则和自动审计。
- 已完成不依赖 Vue/DOM 的 `createCatAssembly()` 角色装配入口。
- 已完成角色根节点 GLB 导出、PBR 映射和 Three.js 回读验证基础。
- 已保留天天过马路的底层技术原型：确定性 seed 道路、格子跳跃和多端输入控制器。
- 产品优先级已调整：小游戏安排到最后阶段；当前先完善生成器主界面、角色外观、trait 覆盖和导出体验，主界面暂不暴露游戏入口。
- 主界面已支持相邻 Token 浏览、CatTraits JSON 复制、完整配置分享链接，以及正面、3/4、侧面、背面固定相机视角。
- 已加入当前 trait 实现状态审计：普通外观进入参数化角色与导出流程，Background 明确为预览环境，Special 在完成视觉覆盖验收前统一标记为部分实现。
- 已完成独立 2D/3D 对照窗：远程原图优先、本地图片兜底，并提供加载中、来源和失败状态；桌面端左侧展开，手机端使用底部浮层。
- 下一轮开始逐 trait 视觉修正，优先处理基础身体轮廓、装备挂点和最常见的毛色/眼睛组合。
- 毛色与眼睛已建立独立视觉配置：覆盖 8 种 Fur 和 7 种 Eyes，修正了身体缩短后错位的口鼻、胸口、三花头斑与闪电纹遮罩；在逐项对照截图完成前保持 `partial`。
- 5 种 Face 已建立独立嘴型配置和可导出的轮廓元数据，统一了表情缩放与尺寸边界；在逐项对照截图完成前保持 `partial`。
- 天气效果已从 `CatCanvas.vue` 抽离为独立 `WeatherController`，初始天气可立即生效，雨云资源可统一销毁，雷电结束后恢复当前场景背景而非固定颜色。
- 键盘输入已从 `CatCanvas.vue` 抽离为独立 `CharacterInputController`，键盘与未来虚拟摇杆共享逐帧输入协议，并保留输入框焦点保护和一次性跳跃语义。
- 主界面 GLB 导出已提供角色检查、PBR 转换、编码、回读校验和下载阶段反馈；成功后显示网格、三角面与文件体积，失败不再依赖阻塞式弹窗。
- 10 种 Gear 已从各工厂内的写死世界坐标迁移到统一挂点配置，覆盖 `head-top`、`face-eyes`、`chest-front`、`back` 和 `paw-left`；在逐件截图验收前状态保持为 partial。

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
    crossy/                    第一款无尽街机跳跳游戏
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
- 所有 trait 必须有 `implemented / partial / blocked` 状态；主界面实现矩阵可浏览并直接切换全部 45 项。

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

目标：完成当前目录中所有 45 个唯一 trait 的独立 3D 实现。

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

验收：45 个 trait 均为 implemented，视觉覆盖集无阻断性差异。

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

## Phase 7：第一款小游戏——天天过马路式无尽街机跳跳

目标：用当前项目内的猫、装备、配色、材质和 Special 场景元素，开发一款类似经典过马路玩法的原创无尽跳跳游戏，验证角色系统真正可用于玩法，而非只能展示。

### 核心循环

1. 开局选择任意受支持的 Liberty Cat token；
2. 玩家按格向前、后、左、右跳跃；
3. 连续穿越程序生成的道路、安全区和主题区域；
4. 躲避移动障碍，拾取或利用装备道具；
5. 按最高前进格数计分，失败后立即重开；
6. 使用确定性 seed 复现同一局地图，方便调试和每日挑战。

### 输入与平台

- PC：方向键与 WASD，每次输入移动一格；
- 手机浏览器/WebView：点击前进，四向滑动移动；
- 支持横屏和竖屏，但第一版优先竖屏单手操作；
- 输入进入统一 `GridHopController`，不得直接操作模型内部节点；
- 后台切换时暂停地图、障碍、动画和音频，恢复后不补算离线帧。

### 无尽地图

- 使用固定宽度的 lane/chunk，从角色前方生成、后方回收；
- lane 类型至少包括安全地面、普通道路、快速道路和 Special 主题段；
- 所有视觉素材来自当前项目，不引入未经确认授权的外部模型；
- 道路、地面和标线使用现有几何、背景配色与程序材质组合；
- 富士、雷暴、温泉、银河、时间传送门等元素作为稀有主题 chunk；
- 地图生成逻辑与 Three.js Mesh 创建分离，便于测试 seed、可通行性和难度曲线。

### 装备作为道路道具

道路上的道具统一取自当前 10 种装备资产：

- Baseball Cap
- Camera
- Gold Round Glasses
- Good Luck Gold Bar
- Hiking Backpack
- Hot Coffee
- Investment Book
- Ramen
- Sake
- Wealth Gold Bar

装备通过共享 `AssetRegistry` 获取几何体、材质和纹理，但道路道具必须是独立实例，不与角色佩戴节点共享 transform 或生命周期。

首版可将装备划分为三种用途：

- 障碍物：占据格子，需要绕行或等待；
- 收集物：增加分数、连击或短时效果；
- 移动物：沿道路 lane 移动，承担传统交通障碍的玩法职责。

具体装备与效果映射在玩法原型阶段测试后冻结，不能仅凭名称直接决定长期数值。

### 相机、碰撞与动画

- 使用等距/斜俯视跟随相机，角色前进时相机平滑推进；
- 逻辑碰撞以格子和简化包围体为准，不用高模 Mesh 做逐三角形碰撞；
- 每次移动播放起跳、空中、落地三段状态；
- 快速连续输入进入小型输入缓冲，但不能穿越被占用格；
- 死亡、落水或碰撞使用独立失败状态，禁止继续接收移动输入。

### MVP 范围

- 单机、无尽地图、第三人称斜俯视；
- 角色选择、开始、暂停、失败、重开；
- 距离分数、装备收集分和本地最高分；
- 至少 4 种 lane、3 种移动速度和 5 种装备道具；
- 不做链上登录、联网排行、实时多人和复杂道具养成；
- Special 首版作为稀有主题区域，不实现独立剧情关卡。

### 验收标准

- 视觉覆盖集中的任意角色都能进入游戏；
- seed 相同则 lane、装备与移动障碍序列一致；
- 自动地图测试确认始终存在可通行路径；
- PC 浏览器目标稳定 60 FPS；
- 手机浏览器和目标 WebView 提供 30/60 FPS 质量档，具体设备门槛由测试矩阵冻结；
- 连续游玩 20 分钟无明显资源增长或 WebGL 崩溃；
- 所有道路道具均来自当前项目装备资产，无额外外部模型依赖。

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

1. 装备争夺派对：复用无尽跳跳中的装备实例池和拾取交互；
2. 障碍竞速：复用 `GridHopController`、chunk 生成和检查点系统；
3. Special 主题关卡：时间传送门、富士攀登、雷暴躲避；
4. 暂缓多人实时同步，直到单机角色和关卡接口稳定。

## 七、测试策略

建议新增以下命令，具体测试框架在实施时选择：

```text
test:data          metadata、token 范围、trait schema
test:traits        45 个 trait 构建与组合规则
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

### 当前实施状态（第一轮重构）

已完成：

- 建立 `CatTraits` schema、metadata trait 映射和未知值拒绝规则；
- 固化 token `4768` 与异常超长 token 的排除规则；
- 新增只读全量数据审计，验证 9,901 个目标 token 与 9,901 张图片一一对应；
- 建立 `createCatAssembly()`，现有 viewer 已通过角色工厂创建和更新猫咪；
- 角色根节点写入规范化 traits，并与场景根节点分离；
- GLB 按钮改为只导出角色根节点；
- GLB 导出已抽为独立模块，导出前检查 Mesh、三角面、材质、纹理和环境节点；
- 导出时过滤关节、尾巴表面等运行时 `userData` 对象引用，保留可序列化的 token/trait extras；
- GLB 下载前已加入 `GLTFLoader` 回读，校验 Mesh、材质和 token extras；
- 导出审计明确标记 Toon 材质转换警告，为后续标准 PBR/Blender 对照保留问题清单；
- 已加入 `blender-pbr-v1` 导出材质配置：在安全角色副本上将 `MeshToonMaterial` 显式转换为 `MeshStandardMaterial`，实时网页材质不变；
- 导出报告记录 PBR 转换数量，避免依赖 GLTFExporter 的隐式 Toon 降级；
- Toon 渐变改为 `DataTexture`，角色工厂可脱离 Vue 和 DOM 进行测试；
- 新增数据规范、排除规则、未知 trait 和角色工厂测试；
- 已生成 9,901 条精简 token catalog，不将 39MB 原始 metadata 打入前端；
- Pinia store 已支持按真实 tokenId 异步加载属性；
- 参数面板已支持 token 搜索和 NFT 原图/3D 对照；
- 开发环境和生产环境均优先读取 metadata 中的远程原图，本地图片只作为加载失败兜底；
- 生产构建通过。

下一轮优先项：

1. 确定 WebView/生产环境的 9,901 张参考图打包与分发策略；
2. 把场景、天气和输入从 `CatCanvas.vue` 继续拆出；
3. 在具备 Blender 的环境中建立自动/人工导入检查，并校准 Toon→PBR 的颜色、粗糙度与透明材质；
4. 建立 45 个 trait 的实现矩阵与视觉覆盖集；
5. Token 搜索已支持上一只、下一只；图鉴已接入 9,901 条真实目录、六类 trait 联合筛选、远程图片优先与 60 项渲染上限。

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
3. 开发天天过马路式无尽街机跳跳 MVP；
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
