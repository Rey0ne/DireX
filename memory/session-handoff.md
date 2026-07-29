# Session Handoff — DireX

> **最后更新**: 2026-07-30 | **分支**: `fix/infinite-canvas-refactor` | **最新提交**: `6ea325b`
> **压缩次数**: 1 | **最后校验**: 2026-07-30

---

## 当前状态

| 项目 | 值 |
|------|-----|
| 最后更新 | 2026-07-30 |
| 分支 | `fix/infinite-canvas-refactor` |
| 最新提交 | `6ea325b` — Kimodo v2 API 分离 + 翻译管线 + 防退化机制补充 |
| 当前板块 | Kimodo v2 翻译管线完成；CLAUDE.md 防退化机制补充 |
| 下一个板块 | 启动 Python v2 服务 (8001端口)；CF merge 实验；DireX 前端待办 |

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
