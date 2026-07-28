## 项目结构

  cat-cenerator/
  ├─ src/                         Vue 3 交互应用
  │  ├─ components/
  │  │  ├─ CatCanvas.vue          3D 渲染、天气、装备物理，约 405 行
  │  │  ├─ ParamPanel.vue         参数控制面板
  │  │  ├─ BottomBar.vue          随机生成、PNG/GLB 导出
  │  │  ├─ CollectionDrawer.vue   预设猫收藏
  │  │  └─ ...
  │  ├─ stores/cat.js             Pinia 状态和前端 trait 配置
  │  └─ three/
  │     ├─ CatModel.js            猫模型，约 586 行
  │     ├─ EquipmentFactory.js    装备建模，约 1054 行
  │     ├─ SdfCatBody.js / sdf.js SDF 身体网格
  │     └─ SceneSetup.js          场景、相机和渲染器
  ├─ scripts/
  │  ├─ config.js                 批量生成 trait 配置
  │  └─ generate.js               Puppeteer 批量渲染
  ├─ public/
  │  ├─ render.html               批量渲染专用 Three.js 页面
  │  ├─ cat-viewer.html           旧版独立查看器
  │  └─ equipment/                装备贴图与实验页面
  ├─ pixel_cat_3d/                原始图片、属性表和参考素材
  ├─ output/                      批量生成结果
  └─ README.md

  ## 主要发现

  1. 配置存在三份，已经出现不一致

  - 前端：src/stores/cat.js
  - 批量脚本：scripts/config.js
  - 独立渲染器：public/render.html

  例如前端眼睛包含 Big Black，批量生成器却包含 VR；前端使用十六进制毛色，批量生成器使
  用 Orange/Golden 等语义名称。同一个 seed 在前端和批量脚本中也使用不同随机算法，无法
  稳定生成同一只猫。

  2. 安全项需要优先处理

  根目录的 .env_CUNAI_API_KEY 当前未被 .gitignore 忽略，存在误提交密钥的风险。我没有
  读取其内容。

  另外，pixel_cat_3d/properties.md 有用户尚未提交的修改，后续应保留并避免覆盖。

  3. 部分界面开关目前只是状态，没有完整功能

  - 语言按钮只改变 language，没有切换文案。
  - 音乐按钮没有音频实现。
  - 加载进度是模拟计时，并不代表贴图或模型真实加载状态。
  - fishAmount、showHints、cycleWeather 等状态目前没有实际消费者。
  - 雨量和云量滑块没有驱动粒子数量或可见度变化。

  4. 3D 生命周期和性能有改进空间

  src/components/CatCanvas.vue 中：

  - ResizeObserver 创建后没有断开。
  - 天气和特殊场景清空对象时，没有完整释放 geometry/material/texture。
  - 每帧调用 updateSize()，可改为只在尺寸变化时执行。
  - 光照强度使用乘法切换，多次切换可能造成强度漂移。
  - 雷电结束后固定恢复成 #1a1a2e，可能覆盖用户选择的背景。
  - 大量职责集中在单个组件中，后续扩展装备或天气会越来越难维护。

  5. 文档已经明显落后于实现

  README 仍引用 src/generate.js、不存在的 generate:all，并主要描述旧版独立渲染架构，
  没有准确覆盖当前 Vue 应用、GLB 导出和交互装备系统。

  6. 工程保障较弱

  目前没有测试、lint、format 或 CI 脚本。项目中还并存 Vue 应用、render.html 和 cat-
  viewer.html 三套实现，维护成本较高。

  ## 建议修改计划

  ### P0：安全和基线保护

  - 将所有 .env* 密钥文件加入忽略规则，仅保留安全的 .env.example。
  - 检查属性说明中的调用示例，确保不包含真实凭证。
  - 明确保留现有 properties.md 修改。
  - 建立一次功能基线：随机生成、预设切换、天气、PNG、GLB、批量生成。

  ### P1：统一 trait 和随机生成逻辑

  - 建立唯一的 trait/schema 配置源，统一毛色、眼睛、表情、装备、背景和 Special。
  - 补齐用户备注中的 Big Black 和壶铃，或明确移除尚未实现的选项。
  - 统一前端和批量脚本的 seed RNG，保证相同 seed 得到相同属性。
  - 统一 URL 参数解析和校验，非法值回退到默认值。
  - 逐步淘汰 render.html 内嵌配置，避免继续维护第三份数据。

  这是最优先的功能性重构，否则后续新增属性需要修改多个位置，而且容易生成前后不一致的
  NFT metadata。

  ### P2：拆分 3D 场景职责并修复资源释放

  建议把 CatCanvas.vue 拆成：

  - 场景生命周期管理
  - 装备散落与点击物理
  - 天气系统
  - Special 场景系统
  - 导出服务

  同时：

  - 断开 ResizeObserver。
  - 统一递归释放 Three.js 资源。
  - 仅在 resize 时更新渲染尺寸。
  - 保存灯光基准值，避免乘法漂移。
  - 雷电闪烁后恢复当前实际背景。
  - 让雨量、云量参数真正影响场景。

  ### P3：整理交互和产品完成度

  - 决定语言、音乐、鱼群、提示功能是正式实现还是先移除。
  - 用真实资源加载进度替换模拟加载。
  - 增加按钮禁用、导出进度和错误提示，减少 alert()。
  - 优化移动端参数面板、收藏抽屉和底部导出栏的遮挡。
  - 补充键盘操作、焦点状态和可访问性标签。

  ### P4：导出与批量生成可靠性

  - GLB 只导出猫和已装备物品，而不是整个灯光、天气和场景。
  - 对程序材质和贴图导出做兼容性验证。
  - 批量生成失败时增加重试、失败清单和最终退出码。
  - 明确覆盖/续号策略，避免图片与 metadata 错位。
  - 将随机 seed、生成版本和 schema 版本写入 metadata，便于复现。

  ### P5：工程化与文档

  - 更新 README 的真实目录、命令和架构说明。
  - 清理或明确标记 cat-viewer.html、装备实验 HTML 等遗留文件。
  - 增加最小测试集：seed 稳定性、trait 校验、metadata、Vue 组件编译。
  - 增加 lint、format、test 脚本。
  - 最后执行构建、浏览器交互和批量生成回归测试。

  建议实施顺序是：安全项 → 配置统一 → 3D 生命周期 → 未完成交互 → 导出/批处理 → 文档测
  试。

 <!-- pixel_cat_3d/sdf/*.png 这里面的所有png你都可以参考，我要用来改造主体猫 -->