# Session Handoff — DireX

> **最后更新**: 2026-08-03 | **分支**: `fix/infinite-canvas-refactor` | **最新提交**: `eec7323` (视频 Skill 框架)
> **压缩次数**: 9 | **最后校验**: 2026-08-03

---

## 当前状态

| 项目 | 值 |
|------|-----|
| 最后更新 | 2026-08-03 |
| 分支 | `fix/infinite-canvas-refactor` |
| 最新提交 | `eec7323` — 视频 Skill 框架 v1.0 |
| 当前板块 | ✅ **Skill 社区设计五件套完成** — 研究报告 + 格式标准 + 视频框架 + 多语言 + 社区原型 |
| 下一个板块 | 全部 5 份设计文档提交到 git → 开始实现 MVP |

---

## 🏆 全线模型部署 — 最终状态 (2026-08-01)

### 从原 36 模型 → 最终 25 模型 (14 image + 11 video)

**25 模型状态矩阵：**

| 状态 | 数量 | 模型 |
|------|------|------|
| ✅ 已通过 Kie 验证 | 23 | 除下方 2 个外的全部 |
| ⚠️ 待 Kie 账号开通 | 2 | Kling 2.5 Turbo, Kling 2.1 |
| ❌ 移除（不可用） | 11 | 见下表 |

**11 个移除的模型及原因：**

| 模型 | 移除原因 |
|------|---------|
| Nano Banana 2 Lite | 不在 Kie 定价中（无此模型 ID） |
| Wan 2.7 Image (非 Pro) | 不在 Kie 定价中（仅 Pro 版存在） |
| 4o Image | 不在 Kie 中（所有 ID 变体均返回 "not supported"） |
| Runway Gen-4 | 不在 Kie 定价中 |
| Veo 3.1 | Kie 仅有 `veo/extend`（需 parentTaskId）和 `veo/get-1080p-video`（upscale），无 t2v |
| Veo 3.1 Fast | 不在 Kie 定价中 |
| OmniHuman 1.5 | Lip sync 模型，需 input video + audio，非 t2v |
| Vidu Q2 | 不在 Kie 定价中 |
| Pixverse V5 | 不在 Kie 定价中 |
| Luma Ray3 | 不在 Kie 定价中 |
| Hailuo 2.3 | Kie 仅有 i2v（`image-to-video`），无 t2v 变体 |

### 本轮修复总结

#### 修复 1: 错误 Model ID（7 个，数据源 = `.tmp_kie_pricing.json` anchor URLs）

| 模型 | 旧 ID（错误） | 新 ID（正确） |
|------|-------------|-------------|
| Nano Banana Pro | `google/nano-banana-pro` | `nano-banana-pro` |
| Seedream 4.5 | `seedream/4.5` | `seedream/4.5-text-to-image` |
| Qwen Image 2 | `qwen2/image-edit` | `qwen2/text-to-image` |
| Kling 2.6 | `kling/2-6-text-to-video` | `kling-2.6/text-to-video` |

#### 修复 2: 后端缺失参数（3 个）

| 问题 | 根因 | 修复 |
|------|------|------|
| Seedream 全系 "This field is required" | Kie 要求 `quality` 字段 | 新增 `isSeedreamImageModel()` → 自动加 `quality: 'high'` |
| GPT Image 1.5 "This field is required" | 同上 | 新增 `isGpt15Model()` → 自动加 `quality: 'high'` |
| Wan 2.5 Video "duration must be string" | backend 传 number | 改为传 string `'5'` |
| Wan 2.7 Image Pro "resolution not within range" | `isVideoModel()` 误判为视频模型 | 加 image 检测：`model.includes('image') && !model.includes('video')` → 返回 false |

#### 修复 3: registry.ts 盲区

| 问题 | 修复 |
|------|------|
| `nano-banana-pro` / `omnihuman-1-5` 无 `/` 无法被 `isKieProvider` 识别 | 新增 `KIE_BARE_IDS` 数组 |

### 修改文件清单

| 文件 | 改动类型 |
|------|---------|
| `shared/api-types.ts` | `mapModelNameToProviderId` — 修正 4 个 ID，移除 8 个不可用模型 |
| `src/api/gateway.ts` | `MODEL_PROVIDERS` — 从 40→35 条目，修正 5 个 ID |
| `src/components/nodes/ImageGenerateNode.tsx` | 移除 Nano Banana 2 Lite + 4o Image（14 模型） |
| `src/components/nodes/VideoGenerateNode.tsx` | 移除 6 个不可用模型（11 模型），trim 注释 |
| `server/src/systems/ai/kie-provider.ts` | +`isSeedreamImageModel()`, +`isGpt15Model()`, +`quality: 'high'` 注入, 泛用视频 duration string fix, `isVideoModel()` image 优先检测 |
| `server/src/systems/ai/registry.ts` | +`KIE_BARE_IDS` 数组, +`/^veo\//`, `/^omnihuman/` patterns |

### 编译状态
- ✅ 前端 `npx tsc --noEmit` — **零错误**
- ✅ 后端 `npx tsc --noEmit` — **零错误**（非本轮引入的除外）

### ⚠️ 需要人工操作

1. ~~充值 Kie 账号~~ — 余额不为 0，23 个已验证模型可直接测试
2. **Kling 2.5 Turbo / 2.1** — 联系 Kie 开通 pricing operation `Market_kling_v2-5-turbo-text-to-video-pro_720p_*` 和 `Market_kling_v2-1-master-text-to-video_720p_*`

### 浏览器验证步骤（充值后）

1. 打开 5173 → ImageGenerateNode 模型下拉 → 应 14 选项
2. VideoGenerateNode 模型下拉 → 应 11 选项
3. 逐个选模型生成 → 确认图片/视频成功返回
4. 验证积分扣减（`pricing.ts` 中 1.6× markup）

## CF 实验日产出（2026-07-25~26）

### 已完成实验（D:\cognition-field\boundary_research\experiments\）

| 文件 | 结论 | 状态 |
|------|------|------|
| `batch_validate_dlr.py` | LOS 36% → Field 96%，28,427 车 | ✅ |
| `batch_mixed_traffic.py` | 全交通参与者，100% 渗透率 LOS 41% → Field 94% | ✅ |
| `batch_sustained_observation.py` | 快照模型夸大 relay 3-5x；1% 渗透率下增益≈0 | ✅ |
| `taxi_fleet_experiment.py` | CF 分布式调度 vs 随机巡游 | ✅ 叙事已修正 |
| `taxi_cf_vs_uber.py` | CF 200m = Uber 集中式最优匹配 | ✅ 叙事已修正 |
| `urban_grid_coordination.py` | v3 混合基础设施：红绿灯+停止+让行+视觉错误建模 | ✅ |

### 被推翻的实验

| `autonomous_vehicle_economy.py` | "CF 让车跑网约车赚钱" — 叙事错误，CF 不是 app 层 | ❌ 保留为反面教材 |

### 概念收敛（本次会话最重要的产出）

CF 在自动驾驶中的定位从"更聪明的决策系统"收敛到：

> **感知 → 场域（持续世界状态层） → 规划 → 控制**

CF 不取代任何一层。它解决的是：跨主体、跨时间、跨基础设施的持续世界状态管理。

**与之前叙事的区别**：
- 之前："CF 可以做 X"（功能列表）
- 现在："CF 是架构中的一层，位置在这里"（系统定位）

### 下一步：merge 实验

匝道汇入 = 连续空间协调（vs 今天做的离散规则协调）。直接对应 V2V + World Model。用户优先级高于继续做网约车。

### 实验纪律（用户强调）
- 不断找 CF 的边界，不只是证明它能做什么
- 否定实验比成功实验更有价值
- 诚实报告什么情况下 CF 不适用

## 前端待办（最优先）

详见 CLAUDE.md 底部「前端待办 — 分镜数据滞留问题」：

1. **ShotNode.tsx** — phase 条件渲染 + 分析结果摘要 UI（分镜数/角色数/场景数）
2. **ImageGenerateNode.tsx** — `ImageGenNodeData` 接口加 `shot` 字段 + 标题栏镜头标识 + `createShotNodes` 内 prompt 格式组装

验证步骤：清 IndexedDB → F5 → 选中 ShotNode 看到摘要 → 点分镜按钮创建 21 个节点 → 每个节点显示结构化镜头参数

## 后端待办

- `/api/agent/script/regenerate` 和 `/api/agent/script/music` 当前返回同步格式，建议对齐异步 `{taskId}` 格式

## 运行时数据保护

| 文件 | 说明 |
|------|------|
| `server/server/data/projects/<id>/state.json` | 画布状态（多项目存储） |
| `server/server/data/projects/<id>/backups/` | 自动备份（最近 20 个快照） |
| `server/data/task-logs.json` | 任务历史 |
| `server/data/script-tasks.json` | 异步任务持久化 |

## 核心禁止事项

- 不改端口号（3001/5173/8888）
- 不改认证密钥
- 改代码前查 memory/module-map.md 坏耦合清单
- 不跳过汇报直接写代码
- 不删现有代码 — 修复是「加防护」
- 修改 harness 文件前写变更 manifest

## Kimodo v2 翻译管线（2026-07-30）

### API 分离
- `src/api/kimodo-api.ts` 新建 — 237 行，8 类型 + 6 函数
- `src/api/gateway.ts` — 移除 Kimodo 段（228 行），恢复纯净

### 后端翻译 (`server/src/routes/kimodo-v2.ts`)
- `translatePrompt()` helper — CJK 检测 + GPT-5.4 翻译（复用 v1 system prompt）
- `POST /translate` 端点 — 前端 debounced 预览用
- 4 个生成端点自动翻译：`/generate`、`/generate-variants`、`/generate-timeline`、`/generate-path`

### 前端翻译 (`src/components/KimodoV2Timeline.tsx`)
- 600ms debounced 自动翻译 + teal 色 `EN: xxx` 预览

### CLAUDE.md 防退化补充
- 从桌面 `Claude code 防退化机制.docx` 提取三项缺项并补入：
  1. 前后端工程师启动口令（精确终端命令）
  2. 数据恢复路径（4 层：git history → backups → IndexedDB → 旧路径）
  3. 群体智能防退化机制表（session-handoff / 角色隔离 / 合约同步 / 模块地图 / 压缩恢复）

### 遗留
- Python v2 服务 (`server_v2.py` 端口 8001) 未启动
- DireX 前端待办（ShotNode/ImageGenerateNode 分镜数据展示）未动

---

## Prompt 管线重构完成 (2026-08-03，未提交)

### 问题背景

用户三项投诉：
1. **时代错位** — 3000 年前角色穿现代服饰（style-db.ts 100% 当代时尚，无历史数据）
2. **无真实感** — 生图 AI 感/涂抹感严重，无电影灯光/镜头/皮肤质感
3. **模板僵化** — PROMPT_ARCHITECT 刚性 25 字段模板（每条必填，不管是否相关）

### 已完成的修复

#### A. 历史文明知识库 (`server/src/systems/agent/history-kb.ts` — 新文件)
- 中国历代（商→清）服饰数据库：廓形/面料/色彩/纹样/配饰/鞋履/闭合方式
- 世界文明：埃及/两河/米诺斯/希腊/罗马/拜占庭/中世纪欧洲/文艺复兴
- 亚洲文明：平安日本/江户日本/朝鲜王朝
- 历史武器：中国各朝代/日本/欧洲/希腊罗马
- 历史建筑：中国各朝代/埃及/希腊/罗马/拜占庭/哥特/文艺复兴
- **时代错位守卫** (`ERA_ANACHRONISM_GUARD`): 按时代分组的禁止/允许清单（闭合方式/面料/鞋履/电子产品）

#### B. 真实感增强层 (`server/src/systems/agent/photorealism-kb.ts` — 新文件)
- **Layer 1**: 负面提示词 — 塑料皮肤/CGI/动漫/涂抹感/解剖错误 + 英文 API 级负词
- **Layer 2**: 真实感锚点 — ARRI Alexa 65/Hasselblad X2D 摄影级基准
- **Layer 3**: 电影灯光 — 9 种灯光模式/灯光质量/色温 K 值/光比参考/自然光参考
- **Layer 4**: 镜头模拟 — 14mm-300mm 焦段情感含义/镜片特性/胶片传感器
- **Layer 5**: 材质表面 — 皮肤 SSS/面料 10 种/环境材质细节
- **Layer 6**: 氛围深度 — 大气透视/体积光/景深/散景/运动模糊/天气效果
- **Layer 7**: 构图指南 — 三分法/引导线/框中框 + 真实性优先于完美构图

#### C. 时代检测注入管线 (`pipeline.ts` — 6 个 Agent，12 个注入点)
- `runCharacterExtraction` — first-run + regen → 注入 historyKB + anachronismGuard
- `runScriptAnalysis` — first-run + regen → 同上
- `runSceneExtraction` — first-run + regen → 同上
- `runSceneArchitect` — first-run + regen → 同上
- `runPropDesigner` — first-run → 同上
- `parseShotBlocks` → genPrompt 前置 `buildPhotorealismPrefix(shotType)`

#### D. 风格决策引擎修复 (`style-db.ts`)
- `decideStyle()` fallback 逻辑：非当代时代 → 用时代名代替 'Contemporary'/'Minimalist'/'Streetwear'
- 色彩/灯光/材质均使用时代感知 fallback（如 "唐代天然染料配色"、"日光/烛光/油灯"）

#### E. Photorealism 负面词接入 API (`routes/agent.ts` — **本次关键修复**)
- **发现**: agent.ts 三处硬编码了极简负词 (`'blurry, low quality, distorted...'`)，`buildPhotorealismNegative()` 从未被调用
- **修复**: 三处（视频路径/图像路径/visual-extract 路径）全部改用 `buildPhotorealismNegative()`
- I2I 模式额外追加防幻觉关键词（extra props/weapon/hallucinated item 等）

### 编译状态
- ✅ `npx tsc --noEmit` — **零错误**

### 修改文件清单

| 文件 | 状态 | 改动 |
|------|------|------|
| `server/src/systems/agent/history-kb.ts` | 新文件 | 中国历代+世界文明服饰/武器/建筑 KB |
| `server/src/systems/agent/photorealism-kb.ts` | 新文件 | 8 层真实感增强系统 |
| `server/src/systems/agent/pipeline.ts` | 已修改 | 12 个注入点 + genPrompt 前缀 |
| `server/src/systems/agent/style-db.ts` | 已修改 | 时代感知 fallback 逻辑 |
| `server/src/routes/agent.ts` | 已修改 | 3 处负词接入 buildPhotorealismNegative() |

### 未改动
- `PROMPT_ARCHITECT` — 4-agent 管线不在主流程中（仅 `runAgentPipeline` 侧面路径），SCRIPT_ANALYSIS 已是方法论驱动
- `profiles.ts` SCRIPT_ANALYSIS — 输出格式已包含完整电影摄影字段，不需要改

### 验证步骤
1. 充值 Kie 账号后 → 浏览器打开 5173
2. 创建 ShotNode → 提交带时代背景的剧本（如"商周"）→ 检查角色服饰是否时代正确
3. 生图 → 检查是否消除塑料/AI/CGI 感
4. 对比生图效果 — 检查皮肤质感/光影/材质是否提升

---

## 关键文件位置

| 文件 | 用途 |
|------|------|
| `CLAUDE.md` | 主协议 + 强制步骤 + 架构文档 |
| `CLAUDE-backend.md` | 后端工程师角色 |
| `CLAUDE-frontend.md` | 前端工程师角色 |
| `CLAUDE-contract.md` | API 合约 |
| `memory/module-map.md` | 模块依赖 + 坏耦合清单 |
| `memory/canvas-nodes-invisible-debug.md` | 节点不可见 debug 记录 |

---

## PLY/3DGS 综合方案 (2026-08-02，未提交)

### 完成的功能

#### 1. PLY 类型自动检测 (`plyCompression.ts`)
- `detectPlyType()` — 检查 `geometry.index`（mesh）、3DGS 属性（`f_dc_*`, `opacity`, `scale_*`, `rot_*`），否则为 pointcloud
- `extractGaussianSplatData()` — 提取 3DGS 数据（scale exp、opacity sigmoid、SH DC→RGB）
- 压缩三档：≤100K 跳过 / 100K-500K(30%) / 500K-2M(60%) / >2M(90%)
- `SIMPLIFY_MAX_VERTS = 200K` — QSlim 跳过阈值，防浏览器冻结

#### 2. 3DGS 渲染器 (`GaussianSplatRenderer.tsx` — 新文件)
- 自定义 vertex/fragment shader：四元数→旋转矩阵→3D协方差→Jacobian投影→2D协方差→conic逆矩阵
- SH DC → RGB 颜色，sigmoid opacity 激活
- `GaussianSplatModel` 组件：加载 PLY → 提取 3DGS → 自动下采样至 300K → Points+ShaderMaterial
- CustomBlending (One/OneMinusSrcAlpha) 近似 OIT

#### 3. 点云渲染修复 (`Scene3DNode.tsx` PLYModel)
- 圆形点精灵纹理（`getRoundSpriteTex()` Canvas 2D）
- 自适应点尺寸：`maxDim / sqrt(vertexCount) * 0.6`
- 使用 `detectPlyType()` → mesh/pointcloud/3dgs 三分支
- 3DGS 自动委托给 `GaussianSplatModel`

#### 4. 地面/天空 PLY 替换 (`Scene3DNode.tsx`)
- **数据模型**: `node.meta.scene3d.groundPlySrc` / `skyPlySrc`（blob URL）
- **导入分流**: PLY 拖入/点击+号 → 弹出 3 选 1 对话框（地面/天空/模型）
- **GroundPlyModel**: PLY 放置 y=-0.05，40x40 缩放上限，receiveShadow
- **SkyPlyDome**: PLY 放置 y=25，renderOrder=-1，depthWrite=false，50x50 缩放上限
- **SceneContent**: 条件渲染 — ground/sky PLY 替换 CheckerGround/ProcSky/CloudLayer
- **环境 UI 面板**: 侧边栏显示地面/天空状态 + 清除按钮
- **持久化**: groundPlySrc/skyPlySrc 随 canvas-state.json 保存/恢复

### 修改文件 (4 文件，均未提交)

| 文件 | 改动 |
|------|------|
| `src/utils/plyCompression.ts` | +`detectPlyType()`, +`extractGaussianSplatData()`, +`PlyType` |
| `src/components/nodes/GaussianSplatRenderer.tsx` | **新文件** — 3DGS ShaderMaterial + `GaussianSplatModel` |
| `src/components/nodes/Scene3DNode.tsx` | PLYModel 重写 + GroundPlyModel/SkyPlyDome + SceneContent 条件渲染 + importFile PLY 分流 + 环境面板 + 持久化 |
| `memory/session-handoff.md` | 本次更新 |

### PLY 编译状态
- ✅ `npx tsc --noEmit` — **零错误**

---

## 8 KB 全线扩充进度 (2026-08-03，未提交)

### 动机
用户要求"所有8个知识库都要扩充"+"光现代的流派都不止"→ 大幅扩充各 KB 条目数，增加非西方/非当代覆盖。

### 完成进度

| # | 知识库 | 状态 | 扩充内容 | 条目变化 |
|---|--------|------|---------|---------|
| 1 | cinematography-kb.ts | ✅ 完成 | 全球摄影55+导演40+美术22+画家25+摄影师17+动画10(双重扩充) | 41→182 |
| 2 | spatial-kb.ts | ✅ 完成 | 中国/韩国/印度/拉美建筑师+室内设计师+景观园林7种 | +60+ |
| 3 | writers-kb.ts | ✅ 完成 | 中国现代9+日本5+韩国3+俄国欧洲10+拉美3+非洲3+中东2+英美8+中国古典7+编剧6+导演叙事3 | 27→86 |
| 4 | style-db.ts | ✅ 完成 | 18历史/传统风格（汉服先秦→清/旗袍/和服/韩服/印度/中东/欧洲中世纪→爱德华/非洲/拉美） | 30→48 |
| 5 | kb-search.ts | ✅ 完成 | UNIFIED_KB_CATALOG 全面更新所有 KB 计数 | — |
| 6 | history-kb.ts | ✅ 完成 | +28文明: 东南亚6+前哥伦布美洲3+非洲8+伊斯兰5+斯拉夫东欧3+太平洋3 | 597→1028行 |
| 7 | composer-kb.ts | ✅ 完成 | Hip-Hop20+K-Pop/C-Pop/J-Pop20+中国戏曲15+中国独立10+游戏配乐8+实验前卫8+去重4 | 200→277 |
| 8 | music-kb.ts | ✅ 完成 | 中国戏曲9剧种+古风·国风电子+抖音短视频6模式+补充4情绪+补充6叙事场景 | 1046→1196行 |
| 9 | photorealism-kb.ts | ✅ 完成 | 人种皮肤7型+年龄6段+恐怖谷10触发器 | 355→402行 |

### 最终编译状态
- ✅ `npx tsc --noEmit` — **零错误**（全部 10 文件）
- **总行数**: 10,791 行（10 文件合计）

### 待提交文件（全部 10 文件，均未提交）
```
server/src/systems/agent/cinematography-kb.ts   (355行, 182条目)
server/src/systems/agent/spatial-kb.ts           (444行)
server/src/systems/agent/writers-kb.ts           (209行, 86条目)
server/src/systems/agent/style-db.ts             (807行, 48风格)
server/src/systems/agent/kb-search.ts            (458行)
server/src/systems/agent/photorealism-kb.ts      (402行)
server/src/systems/agent/music-kb.ts             (1196行)
server/src/systems/agent/composer-kb.ts          (3191行, 277条目)
server/src/systems/agent/history-kb.ts           (1028行, +28文明)
server/src/systems/agent/pipeline.ts             (2701行, KB_CATALOG更新)
```
