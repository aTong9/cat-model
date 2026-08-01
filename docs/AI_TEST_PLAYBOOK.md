# Liberty Cat Studio：AI 全项目测试与修复手册

> 适用项目：Vue 3 + Pinia + Three.js 参数化 3D 猫生成器  
> 适用对象：后续负责测试、诊断和修改代码的 AI Agent  
> 当前基线（2026-08-01）：`npm test` 共 233 项通过  
> 关联资料：[测试计划](./TEST_PLAN.md)、[设计哲学](./DESIGN_PHILOSOPHY.md)、[开发路线图](./DEVELOPMENT_ROADMAP.md)

## 1. 使用方式

后续 AI 接到任何修改任务时，先阅读本文，再按“变更影响 → 最小测试集 → 浏览器验证 → 全量门禁”的顺序工作。本文是执行清单；`TEST_PLAN.md` 继续描述产品级测试目标、UX、可访问性和发布标准。

测试必须观察公开行为，不测试私有实现细节。禁止为了让测试通过而删除断言、放宽既有合同、跳过失败用例或把错误吞掉。

## 2. 已确认的测试缝隙（公共边界）

| 缝隙 | 公共边界 | 主要代码 | 观察结果 |
|---|---|---|---|
| URL/Token | URL 查询参数、Token 目录 | `src/App.vue`、`src/data/tokenCatalog.js` | 正确 token、trait、场景和回退 |
| 角色配置 | `CatTraits`、参数注册表、配置解析器 | `src/core/` | 输入规范化、确定性、不可变配置 |
| 编辑器状态 | Pinia store 和用户操作 | `src/stores/cat.js` | 撤销、重做、锁定、模式隔离 |
| 角色装配 | `createCatAssembly`、`CharacterRuntime` | `src/core/`、`src/character/` | 节点、socket、碰撞体、有限包围盒 |
| 输入与移动 | `CharacterInputController`、运行时更新 | `src/three/CharacterInputController.js` | WASD、虚拟按键、跳跃、输入框隔离 |
| 装备 | 装配器、工厂、附件 socket | `src/character/equipment/`、`src/three/EquipmentFactory.js` | 唯一装备、正确挂点、切换清理 |
| 动画 | 动画文档、Animator、姿势 API | `src/character/animation/` | 有限变换、可恢复、可导出轨道 |
| 环境 | 场景工厂及 `SpecialSceneLoader` | `src/three/scenes/`、各世界目录 | token 隔离、层级、碰撞、销毁 |
| 渲染生命周期 | 页面可见性、Resize、WebGL context | `src/three/RenderLifecycleController.js` | 暂停、恢复、重建、监听清理 |
| 导出 | PNG/角色卡/GLB 公共导出入口 | `src/export/` | 当前配置一致、格式有效、只导出角色 |
| 数据审计 | catalog、manifest、全 token 审计 | `scripts/`、`public/data/` | 9,901 token、44 metadata trait、零未知 |
| 用户界面 | 可见控件和响应式布局 | `src/components/` | 操作可达、状态同步、无遮挡 |

新增测试应优先放在这些边界上。只有公共合同缺失且业务需要时，才新增缝隙。

## 3. AI 的强制工作流程

### 3.1 修改前

1. 执行 `git status --short`，把已有修改视为用户资产，不覆盖、不回滚。
2. 阅读需求涉及的源文件和对应测试；搜索优先使用 `rg`。
3. 运行能复现问题的最小命令，并记录失败原文。
4. 写出本次变更涉及的公共缝隙、预期行为和不应改变的行为。
5. Bug 修复或新功能采用红—绿循环：先补一条能稳定失败的行为测试，再做最小实现。

### 3.2 修改中

1. 一次只处理一个纵向行为切片。
2. 不模拟被测模块内部对象；只模拟浏览器、文件下载、时间或 WebGL 等真正外部边界。
3. 测试名称写成用户或调用者能观察的行为。
4. 固定预期值来自合同、参考样例或明确字面值，不能复制生产实现重新计算。
5. 每个新增 Three.js 对象都要同时考虑命名、碰撞、质量档和 `dispose()`。

### 3.3 修改后

依次执行：

```bash
npm test
npm run build
npm run audit:data
git diff --check
```

涉及全目录、trait、manifest 或全 token 行为时额外执行：

```bash
npm run audit:full
```

涉及 GLB、骨架或动画导出时额外执行：

```bash
npm run validate:animation
npm run validate:blender
```

最后必须在实际浏览器中完成对应 URL 的人工/自动交互测试。Node 单测全绿不能替代 WebGL 页面验证。

## 4. 自动化测试套件地图

| 变更区域 | 至少运行的测试 |
|---|---|
| `src/core/` | `resolveCharacterConfig`、`catTraits`、`generateCatTraits`、`characterParameterRegistry`、`shareCatConfig` |
| `src/stores/cat.js` | `catStore*`、`editorHistory`、`traitMatrix` |
| 身体、耳朵、四肢、尾巴、脸 | `baseCatContract`、`morphology*`、`limbSkinning`、`face*`、`catPaws` |
| 动作与姿势 | `animationDocument`、`poseAuthoring`、`staticPoseDocument`、`action*`、`characterConstraints` |
| 装备 | `equipmentAssembler`、`equipmentAttachments`、`equipmentEffects`、`equipmentProduction`、`equipmentSocketIntegration` |
| 输入、相机、运行时 | `characterInputController`、`characterRuntime`、`renderLifecycleController` |
| 背景、天气、画质 | `previewEnvironmentController`、`environmentRecipes`、`weatherController`、`renderQualityController` |
| 特殊场景 | `specialSceneLoader` 加对应的 `*-world*.test.mjs` |
| PNG/角色卡 | `captureOutputs`、`characterOutputs` |
| GLB | `exportRequest`、`exportCharacterGlb`、`gltfStandardPipeline` |
| catalog/trait 数据 | `tokenCatalog`、`tokenFilter`、`traitManifest`、`fullTokenAudit` |
| Crossy 游戏 | `crossyCore` |
| 任意跨模块改动 | 完整 `npm test` + `npm run build` |

单文件可使用：

```bash
node --test tests/<name>.test.mjs
```

## 5. P0 冒烟测试

任何代码修改后都必须执行以下用例。

| ID | 前置/步骤 | 预期结果 |
|---|---|---|
| SMK-001 | 打开 `/` | 页面加载完成；仅一个 Canvas；猫可见；无控制台 error |
| SMK-002 | 打开 `/?tokenId=414` | token 正确载入；角色、trait 和原图证据一致 |
| SMK-003 | 在画布按 W/A/S/D，随后松键 | 猫按方向移动并停止；动画状态正确 |
| SMK-004 | 输入框聚焦后按 WASD/Space | 表单正常输入；猫不移动、不跳跃 |
| SMK-005 | 切换装备两次 | 只有最终装备存在；旧资源和节点被清理 |
| SMK-006 | 修改参数后撤销、重做 | 每步精确恢复；角色不重建成空节点 |
| SMK-007 | 保存 PNG 和复制分享链接 | 输出成功；链接重新打开得到等价角色 |
| SMK-008 | 导出 GLB 并回读 | 有角色、材质、metadata 和动画；没有场景环境 |
| SMK-009 | 页面隐藏后恢复 | 隐藏时暂停，恢复后继续；没有第二个动画循环 |
| SMK-010 | 修改视口大小 | Canvas、相机和 UI 正常；无拉伸和 NaN |
| SMK-011 | 快速切换两个 Special | 最后一次选择生效；旧异步结果不能覆盖新结果 |
| SMK-012 | 切换到另一 token | 前一 token 的场景、碰撞体、粒子和监听全部销毁 |

## 6. Token 与参数系统测试

| ID | 用例 | 预期结果 | 自动化建议 |
|---|---|---|---|
| TOK-001 | 载入最小、最大和普通有效 token | 都解析为合法不可变运行配置 | 参数化单测 |
| TOK-002 | 载入不存在、负数、空值、非数字 token | 明确回退或报错；保留可用页面 | 单测 + 浏览器 |
| TOK-003 | 连续切换 200 个 token | 无错配、无旧场景残留、内存趋于稳定 | 浏览器脚本 |
| TOK-004 | 同一 token 刷新 3 次 | trait、身份和可复现视觉一致 | 单测 + 截图 |
| TOK-005 | 普通 token 选择 Special | 按合同覆盖背景，配置元数据不丢失 | 单测 |
| TOK-006 | 全 9,901 token 解析 | 零未知 trait、零非法记录 | `audit:full` |
| PAR-001 | 每个参数输入 min/default/max | 规范化值正确，模型包围盒有限 | 参数化单测 |
| PAR-002 | 输入 NaN、Infinity、字符串和越界值 | 安全归一化，不污染 Three.js 变换 | 单测 |
| PAR-003 | 锁定两参数后重复随机 | 锁定值不变，其他值确定性变化 | 单测 |
| PAR-004 | 分享 URL 往返 | 只包含可分享状态，恢复后配置等价 | 单测 + 浏览器 |
| PAR-005 | 编辑器撤销形成新分支 | redo 被清除，历史容量有界 | 单测 |

## 7. 角色、形态、脸与材质测试

| ID | 用例 | 预期结果 |
|---|---|---|
| CAT-001 | 默认角色四视角检查 | 耳、脸、四肢、尾巴连续；无错误裁切 |
| CAT-002 | 所有 morphology 最小/最大组合 | 所有矩阵和包围盒有限；肩、髋、尾根保持嵌入 |
| CAT-003 | 所有 Eyes × Face 组合 | 组件可见、命名稳定、可导出、不互相异常遮挡 |
| CAT-004 | 所有毛色配方 | 语义区域正确；共享材质不被跨角色污染 |
| CAT-005 | 连续拖动非拓扑参数 | 不重复创建几何体和材质 |
| CAT-006 | 更新尾巴等需重建部件 | 旧 geometry/material 被释放，节点数稳定 |
| CAT-007 | 正面与背面检查脚掌 | 正面不误显脚垫，背面脚垫可辨认 |
| CAT-008 | 恢复默认姿势 | 所有关节回到规范有限变换 |

## 8. 动画与输入测试

| ID | 用例 | 预期结果 |
|---|---|---|
| MOV-001 | W/S/A/D 及对角输入 | 帧输入归一化，移动方向正确 |
| MOV-002 | Shift、Ctrl、Space | 奔跑、潜行、单次跳跃请求正确 |
| MOV-003 | 键盘与虚拟按键同时输入 | 合并后仍限制在 [-1,1]，松开后归零 |
| MOV-004 | 页面失焦、组件销毁时仍按键 | 键状态清空，不发生持续移动 |
| MOV-005 | 全部动作 × 全部形态边界 | 变换有限、脚部合理、无永久姿势污染 |
| MOV-006 | 快速切换动作 100 次 | 最终动作唯一，旧道具和轨道不残留 |
| MOV-007 | 带道具动作导出 | 手腕/道具轨道可回读，动作名称稳定 |
| MOV-008 | reduced-motion 开启 | 非必要相机与环境动画减少或关闭 |

## 9. 装备测试

| ID | 用例 | 预期结果 |
|---|---|---|
| EQP-001 | 逐一装备全部 10 种 gear | 每项位于注册 socket，节点命名和 metadata 完整 |
| EQP-002 | 头部/身体/手脚比例极值装备 | 跟随对应 socket 和 scale，无明显漂浮 |
| EQP-003 | 快速切换装备 100 次 | 只有最终装备；对象、材质、纹理数量趋于稳定 |
| EQP-004 | VR/Sunglasses 等冲突组合 | 按显式冲突策略处理，不静默叠加 |
| EQP-005 | Special 禁止普通装备 | UI 与运行时一致；原配置信息仍可恢复 |
| EQP-006 | 拖拽或散落装备 | 位置、冲量、交互状态确定；销毁后无残留 |
| EQP-007 | 独立装备 GLB 导出 | 骨架、动画和材质可回读 |

## 10. 特殊 3D 场景测试矩阵

### 10.1 Token 隔离合同

| Token | Special/场景 | 场景工厂 | 必须独立验证的能力 |
|---|---|---|---|
| 11 | Thunderous Might | `StormWorld11Scene` | 四向地形、分层暴雨、空间闪电、自然边界 |
| 3000 | Galactic Voyage | `CosmicWorld3000Scene` | 六向宇宙、平台、防坠落、行星/月球/彗星/火箭 |
| 3001 | Onsen journey | `SakuraOnsenScene` | 干燥出生点、温泉水面、四向路线、水区阻挡 |
| 9038 | Time Traveler | `SynthwaveWorld9038Scene` | 平坦网格、条纹落日、四向城市、虚空边界 |
| 9066 | Fitness Guru | `GymWorld9066Scene` | 完整房间、四训练区、清晰出生点、大器材碰撞 |

每个场景都执行下列公共用例：

| ID | 步骤 | 预期结果 |
|---|---|---|
| SCN-001 | 打开对应 `/?tokenId=<id>` | 只加载目标场景；只有现有主体猫 |
| SCN-002 | 检查根层级与命名 | 地形、地标、特效、导航组完整且可独立控制 |
| SCN-003 | WASD 从出生点向四面移动 | 起点无阻挡；主路线连续；猫贴地 |
| SCN-004 | 主动撞击大型障碍和边界 | 平滑阻挡或滑开；不穿模、不抖动、不瞬移 |
| SCN-005 | 绕场并旋转相机 360° | 无背景板、空白、接缝或对象突然消失 |
| SCN-006 | 检查猫和装备 | 没有第二只猫；现有猫/装备未被参考环境替换 |
| SCN-007 | 从特殊 token 切换到普通 token | 场景根、灯光、雾、粒子、碰撞和事件全部清除 |
| SCN-008 | 反复进入/离开场景 20 次 | Canvas 和动画循环唯一；renderer.info 回到稳定范围 |
| SCN-009 | desktop/mobile/low 三档 | 画质预算下降但关键层级、碰撞和路线保留 |
| SCN-010 | 隐藏页面再恢复 | 特效暂停/恢复；时间步不导致瞬移或粒子爆发 |

### 10.2 场景专项用例

| ID | Token | 用例 | 预期结果 |
|---|---:|---|---|
| ST-001 | 11 | 调低/调高雨量、风力、闪电频率 | 配置实时生效，闪电不持续全屏白闪 |
| ST-002 | 11 | 开启低闪烁模式 | 闪电亮度/频率降低，移动和碰撞不变 |
| CO-001 | 3000 | 向平台边缘持续移动 | 可见能量边界阻挡，猫不会跌入虚空 |
| CO-002 | 3000 | 环绕观察环形行星 | 圆环有正确前后遮挡，非 Billboard |
| ON-001 | 3001 | 从出生点绕温泉一周 | 路径连续；猫不能进入深水 |
| ON-002 | 3001 | 检查水面、蒸汽、花瓣降级 | 特效可关闭，碰撞和路线不受影响 |
| SY-001 | 9038 | 观察网格远近和移动 | 网格属于世界坐标，无严重摩尔纹或闪烁 |
| SY-002 | 9038 | 从多角度观察条纹太阳 | 有空间视差和城市遮挡，不跟随相机 |
| GY-001 | 9066 | 绕跑步机、沙袋、卧推凳行走 | 大器材阻挡，小装饰不频繁卡住猫 |
| GY-002 | 9066 | 检查中央显示屏 | 不出现第二只猫；动态纹理可暂停和销毁 |

## 11. 场景外的普通背景、天气与画质

| ID | 用例 | 预期结果 |
|---|---|---|
| ENV-001 | 逐一切换普通背景 | scene background 和 fog 同步，光强不累积 |
| ENV-002 | 输入未知背景 | 回退中性色，不崩溃 |
| ENV-003 | 逐一切换天气 | 前一天气资源被替换并销毁 |
| ENV-004 | 雷暴天气结束 | 恢复当前活动背景，而非硬编码颜色 |
| ENV-005 | auto 画质调整视口 | 自动档响应；手动档保持用户选择 |
| ENV-006 | low 档运行特殊场景 | 粒子、阴影和后处理下降，玩法合同不变 |

## 12. UI、响应式与可访问性

| ID | 用例 | 预期结果 |
|---|---|---|
| UI-001 | 1440×900、1366×768、1920×1080 | 猫、主控件和输出入口可见，无关键遮挡 |
| UI-002 | 390×844、375×667、430×932 | 抽屉、移动控制和安全区不重叠 |
| UI-003 | 200% 浏览器缩放 | 核心操作不丢失，面板可滚动 |
| UI-004 | 仅键盘完成载入、编辑和导出 | Tab 顺序合理，焦点清晰，操作可达 |
| UI-005 | 中文/英文/日文文案切换 | 长文本不破坏关键布局；无未解释硬编码文案 |
| UI-006 | 屏幕阅读器检查状态变化 | 加载、导出和错误提示可被感知 |
| UI-007 | 打开参数面板后使用相机 | 面板滚动不带动画布；表单按键不控制猫 |
| UI-008 | 触摸控制按下、移出、松开 | 状态可靠结束，不持续移动 |

## 13. 导出测试

| ID | 用例 | 预期结果 |
|---|---|---|
| EXP-001 | 普通 PNG | 内容、背景、视角与当前预览一致 |
| EXP-002 | 透明头像 | 尺寸符合 profile，角落 alpha 透明 |
| EXP-003 | 正/侧/背/3⁄4 四视图 | 命名、构图和角色身份一致 |
| EXP-004 | SVG 角色卡 | 文本转义，token、trait、身份正确 |
| EXP-005 | JSON/分享 URL | 规范化配置可无损往返，不含 UI 临时状态 |
| EXP-006 | 角色 GLB | 只含角色与装备，不含世界、相机、天气和 UI |
| EXP-007 | GLB 回读与 Khronos 校验 | geometry、material、skin、animation、metadata 有效 |
| EXP-008 | morphology/动作/装备组合导出 | 预览与回读结果使用同一配置合同 |
| EXP-009 | 导出失败 | 用户看到具体阶段和可操作错误；页面仍可继续编辑 |

## 14. 生命周期、性能和泄漏测试

### 14.1 资源计数

浏览器测试前后记录：

- `renderer.info.memory.geometries`
- `renderer.info.memory.textures`
- `renderer.info.render.calls`
- 场景对象总数及各世界根节点数量
- Canvas 数量
- 活动的 `requestAnimationFrame`/定时器数量（可通过测试注入统计）
- JS heap（浏览器支持时）

| ID | 压力步骤 | 通过标准 |
|---|---|---|
| PERF-001 | 装备切换 100 次 | geometry/texture 在预热后趋于稳定 |
| PERF-002 | token 连续切换 200 次 | 无持续线性内存增长、无错配 |
| PERF-003 | 5 个详细场景各进出 20 次 | 每次只有一个世界根；资源回到稳定范围 |
| PERF-004 | 连续运行 30 分钟并持续移动 | 无崩溃、明显 FPS 递减或输入延迟累积 |
| PERF-005 | 页面隐藏 1 分钟后恢复 | 隐藏时停止非必要渲染，恢复无时间步爆炸 |
| PERF-006 | 触发 WebGL context lost/restored | 阻止默认丢失；恢复后 resize、场景和输入可用 |
| PERF-007 | 桌面质量档 | 目标接近 60 FPS，交互不中断 |
| PERF-008 | mobile/low 质量档 | 稳定不低于约 30 FPS，核心场景仍完整 |

性能数字受设备影响。报告必须同时记录设备、浏览器、视口、DPR、质量档、平均 FPS、1% low 和资源计数，不能只写“流畅”。

## 15. 异常与恢复测试

| ID | 注入异常 | 预期结果 |
|---|---|---|
| ERR-001 | 原图或预览资源 404 | 使用合法回退或明确提示，3D 编辑不崩溃 |
| ERR-002 | 场景异步加载延迟并快速切 token | 仅最后请求提交结果 |
| ERR-003 | 导出器抛错 | 进度结束、错误可见、再次导出可用 |
| ERR-004 | WebGL context 丢失 | 暂停并安全恢复，不创建重复 renderer |
| ERR-005 | ResizeObserver 不可用 | 页面仍能显示，使用安全降级 |
| ERR-006 | localStorage/clipboard/download 失败 | 显示可理解错误，不丢当前角色状态 |
| ERR-007 | 非法配置含 NaN/未知枚举 | 规范化或拒绝，不把非法值写入 Three.js |

## 16. AI 修复完成标准

AI 只有在以下条件全部满足时才能声明完成：

1. 先有可复现失败，或清楚证明需求是新增行为。
2. 修改范围与需求一致，没有顺手重构无关区域。
3. 新测试在修改前失败、修改后通过；若是文档/视觉调整，提供等价证据。
4. `npm test` 全绿，且没有 skipped、todo 或 cancelled。
5. `npm run build` 成功。
6. 相关数据/GLB 审计按影响范围通过。
7. 对应浏览器 URL 完成真实交互验证，无控制台 error。
8. Three.js 资源、事件、观察器、定时器和动画循环已验证可销毁。
9. 其他 token，尤其 11、3000、3001、9038、9066，没有交叉污染。
10. 最终报告列出修改文件、执行命令、通过数量、浏览器验证结果、未覆盖风险。

## 17. AI 测试报告模板

```markdown
# 测试报告：<任务名>

- Commit/工作树：
- 日期：
- 浏览器/设备/视口/DPR：
- 涉及的公共缝隙：
- 涉及 token：

## 修改前复现
- 命令或步骤：
- 实际结果：
- 预期结果：
- 证据：

## 自动化结果
- 定向测试：<通过>/<总数>
- npm test：<通过>/<总数>
- npm run build：通过/失败
- audit:data：通过/未运行（原因）
- audit:full：通过/未运行（原因）
- GLB/Blender 验证：通过/未运行（原因）

## 浏览器验证
- URL：
- WASD/触摸：
- 碰撞/边界：
- 相机/响应式：
- 控制台：
- 资源基线 → 结束值：
- 截图/视频：

## 回归检查
- 普通 token：
- 特殊 token：
- 导出：
- 移动端/低画质：

## 未覆盖风险
- 无 / <具体风险与原因>

## 结论
- 通过 / 有条件通过 / 不通过
```

