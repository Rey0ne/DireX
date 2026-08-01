# Session Handoff — DireX

> **最后更新**: 2026-08-01 (20:10) | **分支**: `fix/infinite-canvas-refactor` | **最新提交**: `225e9a9`
> **压缩次数**: 3 | **最后校验**: 2026-08-01

---

## 当前状态

| 项目 | 值 |
|------|-----|
| 最后更新 | 2026-08-01 20:10 |
| 分支 | `fix/infinite-canvas-refactor` |
| 最新提交 | `225e9a9` — mount Kimodo v2 at /api/kimodo-v2 |
| 当前板块 | 🔴 **全线模型 API 验证完成 — 25 模型中 23 个已通过验证，2 个待 Kie 账号开通** |
| 下一个板块 | **充值 Kie 账号 → 浏览器验证**；Kling 2.5T/2.1 需联系 Kie 开通对应 pricing operation |

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

1. **充值 Kie 账号** — 当前余额为 0，23 个已验证模型全部返回 "Credits insufficient"
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

## 关键文件位置

| 文件 | 用途 |
|------|------|
| `CLAUDE.md` | 主协议 + 强制步骤 + 架构文档 |
| `CLAUDE-backend.md` | 后端工程师角色 |
| `CLAUDE-frontend.md` | 前端工程师角色 |
| `CLAUDE-contract.md` | API 合约 |
| `memory/module-map.md` | 模块依赖 + 坏耦合清单 |
| `memory/canvas-nodes-invisible-debug.md` | 节点不可见 debug 记录 |
