# Liberty Cat 参数化角色系统 Roadmap

> 状态：当前唯一面向“统一猫模型、Trait 配方、姿势、动作与游戏运行时”的执行路线。
>
> 核心约束：所有普通 Token 共用一套基础猫、语义骨架和装配管线。Token 只能提供配置，不得拥有专属网格或坐标补丁；独一视觉差异必须建模为可命名、可测试的 Special recipe。

## 最终目标

使用版本化、确定性的 `CatConfig` 驱动唯一基础猫，使任意合法配置都可以：

1. 在编辑器中实时预览和修改；
2. 通过 Trait recipe 生成外观和装备；
3. 应用可序列化的静态姿势和关键帧动作；
4. 导出包含标准骨架、动画和 metadata 的 GLB；
5. 在未来游戏运行时中复用同一角色装配入口。

```text
metadata / seed / editor
          ↓
       CatConfig
          ↓
 normalize → validate → migrate
          ↓
 resolveTraitRecipes()
          ↓
 createCatAssembly()
          ↓
 morphology → appearance → equipment → pose → animation
```

## 不做的事情

- 不为 9,901 个普通 Token 建立独立模型。
- 不为普通 Token ID 编写局部坐标修正。
- 不要求逐 Token 人工评审。
- 不把背景、灯光、天气写入角色 GLB。
- 不建立第二套仅供导出或游戏使用的角色生成逻辑。
- 不从单张 2D 参考图推断不可见面的精确结构。

## 完成状态

任务只使用以下状态：

- `implemented`：实现存在；
- `contract-tested`：参数、装配和导出合同有自动测试；
- `runtime-ready`：编辑器、导出和游戏运行时可共同消费。

参考图片用于确定 recipe，不建立人工审批状态。

## Phase 1 — 冻结唯一基础猫与语义合同

目标：为形态、Trait、姿势和动画提供不会随视觉迭代漂移的稳定目标。

- [x] 保留唯一 `createCatAssembly()` 装配入口。
- [x] 建立稳定 part、joint 和 socket registry。
- [x] 建立基础四肢蒙皮、手脚关节和装备 socket。
- [x] 冻结角色单位、Y-up、forward axis 和脚底原点。
- [x] 冻结完整语义骨架层级与 Rest Pose。
- [x] 为全部 part、joint、socket 输出机器可读 manifest。
- [x] 禁止动作、装备和 UI 通过私有字段访问角色节点。
- [x] GLB 回读后验证骨架、Rest Pose、节点 ID 和 socket manifest。

验收：编辑器、GLB 回读和独立运行时看到同一角色层级；新增视觉实现不改公共 ID。

## Phase 2 — 统一参数注册表

目标：所有可调参数只定义一次，自动服务规范化、校验、随机、UI 和测试。

- [x] 建立 morphology 参数注册表第一版。
- [x] 注册类型、标签、分组、范围、步长、默认值和影响域。
- [x] 从注册表派生兼容的 `MORPHOLOGY_DEFINITIONS`。
- [x] 编辑器控件从注册表派生，不再重复维护标签和范围。
- [x] 将 appearance、equipment、pose 和 animation 参数接入同一注册机制。
- [x] 为参数增加依赖、互斥和重建成本 metadata。
- [x] 提供 `normalizeParameters()`、`getDefaultParameters()` 和 diff API。
- [x] 为高频连续参数区分 transform/uniform 更新与 geometry 重建。

验收：新增参数只需注册、实现影响器并补测试，不需要同步修改多份枚举。

## Phase 3 — Trait Recipe 解析层

目标：Trait 只描述意图，recipe 将意图解析成最终几何、材质和挂载参数。

- [x] 8 种 Fur 有独立程序化配方。
- [x] Eyes 与 Face 有独立外观配方。
- [x] 10 类装备通过语义 socket 装配。
- [x] Background 与 Special 有独立环境配方。
- [x] 新增统一 `resolveTraitRecipes(catConfig)` 纯函数入口。
- [x] 定义 `CharacterResolvedConfig`，禁止 recipe 直接依赖 Pinia 或组件。
- [x] 将颜色、遮罩、组件可见性、冲突和覆盖写入可序列化结果。
- [x] 明确 Special 对外观、装备、姿势、动画和环境的覆盖顺序。
- [x] 全量 catalog 自动验证只能产生合法 resolved config。

验收：9,901 Token 均解析为同一基础猫的合法参数集合；没有普通 Token 专属逻辑。

## Phase 4 — 通用 PoseDocument

目标：静态姿势是数据，不是散落的专用更新函数。

- [x] 已有可编辑 pose channel 和关键帧基础。
- [x] 手指、脚趾和主要关节可寻址。
- [x] 定义版本化 `PoseDocument` schema。
- [x] 记录骨骼 rotation、必要的 translation、面部和道具通道。
- [x] 支持 Pose 保存、加载、镜像、混合和复位。
- [x] 建立关节限制与非法值规范化。
- [x] 将 standing、sit 等基础姿势迁移为 PoseDocument 或通用约束。
- [x] Pose 应用后可无损恢复 Rest Pose。

验收：同一 PoseDocument 可应用到全部合法 morphology，并可烘焙进 GLB。

## Phase 5 — 参数化 AnimationDocument

目标：动作由可配置轨道、关键帧、参数和事件组成。

- [x] 已有动作策略、关键帧烘焙和 GLB AnimationClip 输出。
- [x] 已有动作速度、幅度和道具参数基础。
- [x] 定义版本化 `AnimationDocument` schema。
- [x] 统一轨道寻址、插值、循环、速度和幅度。
- [x] 明确 Root Motion 与代码位移责任。
- [x] 支持动作事件：音效、特效、命中和道具切换。
- [x] 支持动作镜像、混合和过渡。
- [x] 将现有动作逐步迁移到同一文档/求解管线。
- [x] 运行时播放和 GLB 烘焙必须消费相同动作定义。

验收：编辑器、GLB 和未来游戏播放同一份动作配置。

## Phase 6 — 形态、装备与动作兼容

目标：任意合法体型都能安全播放动作并携带装备。

- [x] 已有 morphology 极值有限包围盒测试。
- [x] 已有手持道具跟随手腕和装备 socket 测试。
- [x] 建立全部基础动作 × morphology 边界组合测试。
- [x] 建立脚底接地、双手抓握和头部注视约束。
- [x] 为动作幅度提供基于体型的确定性修正。
- [x] 防止装备与眼睛、脸部、头部配件冲突。
- [x] 动作切换、取消和销毁后不得遗留变换。

验收：动作和装备不需要 Token 专属修正；所有输出保持有限并可复现。

## Phase 7 — 标准 GLB 管线

目标：生成可供 DCC 和游戏运行时消费的标准角色资产。

- [x] 角色根节点独立导出。
- [x] Toon → PBR 导出副本与 Three.js 回读。
- [x] morphology、identity、socket 和动画 metadata 回读。
- [x] 接入 Khronos glTF Validator。
- [x] 建立静态、游戏和 DCC 导出 preset。
- [x] 使用 glTF Transform 清理、去重和压缩。
- [x] 建立真实 Blender 无界面导入检查。
- [x] 验证单位、轴向、脚底原点、骨架、动画循环和材质。
- [x] 冻结每种 preset 的网格、材质、骨骼、动画和体积预算。

验收：相同 CatConfig 的预览和导出结果一致，GLB 通过标准验证并可播放动作。

## Phase 8 — 独立游戏角色运行时

目标：小游戏只依赖角色合同，不依赖 Vue、Pinia 或编辑器。

- [x] 抽出 `character-runtime` 公共边界。
- [x] 定义角色 collider、ground probe 和 interaction volumes。
- [x] 定义 idle、walk、run、jump、fall、land 状态。
- [x] 建立动作状态机和输入到动作的映射。
- [x] 建立 LOD0/LOD1/LOD2 和同屏角色预算。
- [x] Crossy 原型通过 `createCatAssembly()` 和 runtime contract 创建角色。
- [x] 编辑器与游戏对相同 CatConfig 产生一致角色。

验收：任意 Token 或用户配置均可直接成为可控制游戏角色。

## 当前执行顺序

1. 完成 Phase 2 参数注册表；
2. 冻结 Phase 1 的坐标、骨架和 Rest Pose manifest；
3. 建立 Phase 3 `CharacterResolvedConfig`；
4. 完成 PoseDocument；
5. 完成 AnimationDocument；
6. 再扩展新动作和游戏能力。

## 完成状态

截至 2026-07-31，Phase 0–8 已全部实现。最终验收命令：

- `npm test`：单元、合同、全 Token 解析和 morphology × 动作兼容测试；
- `npm run build`：编辑器与游戏生产构建；
- `npm run validate:animation`：生成带标准动画的 GLB；
- `npm run validate:blender`：使用真实 Blender 无界面导入 GLB，并验证网格与 Idle、Run、Jump、Wave 动作。
