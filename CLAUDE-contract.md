# CLAUDE-contract.md — 前后端合约层

> **这是前后端之间的唯一真相。**
> **两个窗口的 Claude 都读写这个文件来感知对方。不靠粘贴，靠工具 Read/Write 磁盘文件。**

---

## ⚡ 活跃工作板（Active Work Board）

> 每个角色开始新任务前，先在这里登记。完成后标记 ✅。另一个窗口看到就知道对方在干嘛。

| 状态 | 谁 | 在做什么 | 涉及 API/文件 | 开始时间 |
|------|-----|---------|-------------|---------|
| ✅ 已完成 | 后端 | 小Q Chat 端点 — POST /api/q/chat | server/src/systems/q/q-chat.ts, q-api.ts | 2026-07-09 |
| ✅ 已完成 | 前端 | 接通 QChatPanel → /api/q/chat + suggestions 追问按钮 | src/components/QChatPanel.tsx | 2026-07-09 |
| ⬜ 待做 | 前端 | 后续迭代 — Markdown 渲染、SSE 通知流 | QChatPanel, SSE | — |

**状态符号**：🟡 进行中 | ✅ 已完成 | ⏳ 等待对方 | ❌ 阻塞 | ⬜ 空闲

---

## 🔄 交接信号（Handoff Signals）

> 当一方完成任务需要另一方接棒时，在这里留信号。另一方下次读合约时就能看到。

| 时间 | 从 | 到 | 消息 |
|------|-----|-----|------|
| — | — | — | 暂无交接 |
| 2026-07-09 | 后端 | 前端 | ⚠️ **小Q 聊天已接通！** QChatPanel 可以接 `/api/q/chat` 了。详情见下方 Chat API 定义。 |

---

## 📋 API 状态表

| 端点 | 状态 | 最后修改 | 修改者 |
|------|------|---------|--------|
| GET `/api/health` | 🟢 stable | — | — |
| GET `/api/canvas/state` | 🟢 stable | — | — |
| POST `/api/canvas/sync` | 🟢 stable | — | — |
| POST `/api/kie` | 🟢 stable | — | — |
| GET `/api/kie/task/:id` | 🟢 stable | — | — |
| POST `/api/agent/character-extract` | 🟢 stable | — | — |
| POST `/api/agent/scene-extract` | 🟢 stable | — | — |
| POST `/api/agent/storyboard` | 🟢 stable | — | — |
| POST `/api/agent/unified` | 🟢 stable | — | — |
| POST `/api/visual-extract` | 🟢 stable | — | — |
| POST `/api/tts` | 🟢 stable | — | — |
| POST `/api/tripo/*` | 🟢 stable | — | — |
| GET `/api/q/state/:projectId` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/progress/:projectId` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/deviations/:projectId` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/deviations/:id/resolve` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/stream` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/memory/recall` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/memory/semantic` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/memory/reflective` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/memory/forget/:id` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/memory/stats` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/detect` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/session/start` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/session/end` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/analyze` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/autofix` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/cycles/active` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/predict` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/predict/quick/:projectId` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/suggest` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/suggest/stats` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/orchestrate` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/orchestrate/execute` | 🆕 new | 2026-07-09 | 后端 |
| GET `/api/q/orchestrate/stats` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/orchestrate/reset/:nodeId` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/style/decide` | 🆕 new | 2026-07-09 | 后端 |
| POST `/api/q/chat` | 🟢 stable | 2026-07-09 | 前后端 |

**状态符号**：🟢 stable（稳定可用）| 🟡 changing（正在改）| 🔴 breaking（破坏性变更中）| 🆕 new（新增，前端尚未接入）| ⚫ deprecated（已废弃）

---

## 📜 变更日志（Change Log）

| 日期 | 谁 | 做了什么 | 影响前端？ |
|------|-----|---------|-----------|
| 2026-07-09 | 后端 | 小Q Phase 2 — 新增认知循环引擎 + AutoFix + API | 是 — `/analyze`/`/autofix`/`/cycles/active` |
| 2026-07-09 | 后端 | 小Q Phase 3 — 预测引擎 + 建议引擎 + 自动编排 + pipeline回调 | 是 — `/predict`/`/suggest`/`/orchestrate` |
| 2026-07-09 | 后端 | 小Q Phase 1 — 新增 `/api/q/*` 14个端点 + SSE通知流 | 是 — 前端可接入 SSE 通知和记忆查询 |
| 2026-07-09 | 后端 | 小Q Chat 端点 — POST /api/q/chat 接通 DeepSeek LLM + 规则引擎双路径 | 是 — QChatPanel 接 `/api/q/chat` 即可 |
| 2026-07-09 | 后端 | 新增 `/api/q/style/decide` — 5维风格决策 API | 否 — 前端可选接入 |
| 2026-07-08 | — | 合约文件初始化 | 否 |

---

## 🔌 API 详细定义

### Canvas Sync

| 方法 | 路径 | 请求体 | 响应 |
|------|------|--------|------|
| GET | `/api/canvas/state` | — | `{ nodes: CanvasNode[], edges: Edge[], viewport: Viewport }` |
| POST | `/api/canvas/sync` | `{ nodes, edges, viewport }` | `{ ok: true }` |

### AI Generation

| 方法 | 路径 | 关键字段 |
|------|------|---------|
| POST | `/api/kie` | `providerId, rawText, camera?, lens?, focalLength?, aperture?, filmStock?, referenceUrls?, imgCount?, aspect?, resolution?, shot?, nodeId?, taskId?` |
| GET | `/api/kie/task/:id` | 返回任务状态与结果 |

### Agent Pipeline

| 方法 | 路径 | 请求体 | 响应 |
|------|------|--------|------|
| POST | `/api/agent/character-extract` | `{ scriptText: string }` | 角色设计方案 |
| POST | `/api/agent/scene-extract` | `{ scriptText: string }` | 场景设计方案 |
| POST | `/api/agent/storyboard` | `{ scriptText, shots }` | 分镜表 |
| POST | `/api/agent/unified` | `{ scriptText, visualStyle? }` | 全部分析结果 |
| POST | `/api/visual-extract` | `{ providerId, rawText, extractMode?, referenceUrls?, shot? }` | 视觉解析结果 |

### Other

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | `{ status: "ok", timestamp }` |
| POST | `/api/tts` | 文字转语音 |
| POST | `/api/tripo/*` | Tripo3D 相关 |

### 小Q Brain API

| 方法 | 路径 | 请求 | 响应 |
|------|------|------|------|
| GET | `/api/q/state/:projectId` | — | `QProjectResponse` |
| GET | `/api/q/progress/:projectId` | — | `QProgressResponse` |
| GET | `/api/q/deviations/:projectId` | `?status=open` | `QDeviationResponse` |
| POST | `/api/q/deviations/:id/resolve` | `{ projectId, status }` | `{ success, deviation }` |
| GET | `/api/q/stream` | — | SSE stream (see below) |
| GET | `/api/q/memory/recall` | `?query=keyword` | `{ query, results, count }` |
| GET | `/api/q/memory/semantic` | — | `{ entries, total }` |
| GET | `/api/q/memory/reflective` | — | `{ entries, total }` |
| POST | `/api/q/memory/forget/:id` | — | `{ success, id }` |
| GET | `/api/q/memory/stats` | — | `QMemoryStats` |
| POST | `/api/q/detect` | `{ projectId, shotNumber, assetUrls, visionAnalysis?, compiledPrompt?, nodeId? }` | `DetectionResult` |
| POST | `/api/q/session/start` | `{ projectId }` | `QSession` |
| POST | `/api/q/session/end` | `{ sessionId }` | `{ success }` |
| POST | `/api/q/analyze` | `{ projectId, trigger?, triggerDetail?, shotNumber? }` | `{ status, projectId, activeCycles }` |
| POST | `/api/q/autofix` | `{ projectId, shotNumber }` | `AutoFixResult` |
| GET | `/api/q/cycles/active` | — | `{ activeCycles }` |
| POST | `/api/q/predict` | `{ projectId }` | `PredictionReport` |
| GET | `/api/q/predict/quick/:projectId` | — | `QuickStats` |
| POST | `/api/q/suggest` | `{ projectId, send? }` | `{ suggestions, count, sent }` |
| GET | `/api/q/suggest/stats` | — | `{ trackedKeys, oldestTracked }` |
| POST | `/api/q/orchestrate` | `{ nodes, projectId }` | `{ decisions, count }` |
| POST | `/api/q/orchestrate/execute` | `{ decision, scriptText?, visualStyle? }` | `{ executed, route?, result? }` |
| GET | `/api/q/orchestrate/stats` | — | `{ trackedNodes, byRoute }` |
| POST | `/api/q/orchestrate/reset/:nodeId` | — | `{ success, nodeId }` |
| POST | `/api/q/style/decide` | `{ era?, region?, sceneFunction?, mood?, identity? }` | `{ decision: StyleDecision, styleInstruction: string }` |
| POST | `/api/q/chat` | `{ message: string, projectId?: string, history?: [...] }` | `ChatResponse` (see below) |

#### Chat (`POST /api/q/chat`) — 🔥 前端优先接这个

小Q 聊天端点。双路径架构：优先走 DeepSeek LLM 智能回复，LLM 不可用时自动降级到规则引擎。

**请求：**
```typescript
POST /api/q/chat
{ message: string, projectId?: string, history?: { role: string, text: string }[] }
```

**响应：**
```typescript
{
  reply: string;                    // 小Q 的中文回复（Markdown 格式）
  suggestions?: string[];           // 2-3 个建议追问
  context?: {
    projectId?: string;
    memoriesRecalled: number;
    projectSummary?: { ... };       // 完整项目状态
    usedLLM: boolean;               // true = DeepSeek, false = 规则引擎
  };
}
```

**意图识别（10种）：** greeting / project_status / deviations / suggestions / predictions / memory / style / help / general

**前端接入示例（QChatPanel.sendMessage 替换）：**
```typescript
const resp = await fetch('/api/q/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: text,
    history: messages.slice(-10),    // 最近 10 条对话
  }),
});
const data = await resp.json();
// 用 data.reply 作为小Q的回复
// 可选：在输入框上方渲染 data.suggestions 作为追问按钮
```

**当前状态：** DeepSeek LLM 已接通，测试通过（问候/项目状态/帮助/空消息 4 场景）。无 projectId 时会自动查找最近活跃项目。

#### Cognitive Cycle (`/api/q/analyze`)

手动触发小Q认知循环。循环在后台异步运行（不阻塞响应），包含5个阶段：
1. **Think** — 回忆相关记忆 + 分析项目状态
2. **Plan** — 引用历史修复策略 → 生成行动计划
3. **Execute** — 执行 AutoFix 或通知用户
4. **Verify** — 偏差检测确认
5. **Reflect** — 对比计划 vs 结果 → 巩固记忆

最多3次重试。循环完成后结果写入 episodic memory。

#### AutoFix (`/api/q/autofix`)

4级自动修复策略，逐级升级：
1. **Prompt调整** — 强化关键词、添加角色聚焦/情绪/构图的 directive
2. **参数覆盖** — 调整分辨率/宽高比/生成数量
3. **Provider切换** — 建议切换生成模式或Provider（需用户确认）
4. **人工介入** — 暂停并通知用户手动处理

成功策略会强化 semantic memory，供未来 Plan 阶段引用。

#### SSE Stream (`/api/q/stream`)

小Q 通知通过 Server-Sent Events 推送到前端。复用 Tripo3D SSE 模式（30s heartbeat）。

**连接：**
```typescript
const es = new EventSource('/api/q/stream');
es.onmessage = (event) => {
  const notification: QNotification = JSON.parse(event.data);
  // notification.type: GENERATION_COMPLETE | GENERATION_FAILED | DEVIATION_DETECTED
  //                  | PROGRESS_UPDATE | PIPELINE_COMPLETE | SYSTEM_ALERT | SUGGESTION
  // notification.sound: 'shutter' | 'warning' | 'alert' | 'ding' | 'complete' | null
};
```

**事件类型：**

| type | severity | sound | 触发时机 | actionLabel |
|------|----------|-------|---------|-------------|
| `GENERATION_COMPLETE` | success | `shutter` | 生图/生视频完成 | — |
| `GENERATION_FAILED` | error | `warning` | 生成失败 | `重试` |
| `DEVIATION_DETECTED` | error/warning/info | `alert`/`ding` | 检测到偏差 | `自动修复`/`查看详情` |
| `PROGRESS_UPDATE` | info | — | 进度更新 | — |
| `PIPELINE_COMPLETE` | success | `complete` | 剧本分析完成 | `查看分镜表` |
| `SYSTEM_ALERT` | error/warning/info | `alert`/`ding` | 系统告警 | 可变 |
| `SUGGESTION` | info | `ding` | 小Q主动建议 | `采纳` |

**通知 JSON 结构：**
```typescript
{
  id: string;                    // UUID
  type: string;                  // see table above
  severity: 'info'|'warning'|'error'|'success';
  title: string;                 // e.g. "Shot 3 生成完成"
  body: string;                  // e.g. "Kie · 18 积分 · 4s"
  actionable: boolean;           // has action button?
  actionId: string | null;       // deviationId, shotNumber, etc.
  actionLabel: string | null;    // button text
  sound: string | null;          // sound to play: 'shutter'|'warning'|'alert'|'ding'|'complete'
  timestamp: string;             // ISO time
  read: boolean;                 // initially false
}
```

#### Prediction (`POST /api/q/predict`, `GET /api/q/predict/quick/:projectId`)

预测引擎利用四层记忆体的历史数据预估项目完成时间/成本、识别瓶颈、评估质量风险。

**`POST /api/q/predict`** — 完整预测报告：
```typescript
// Request: { projectId: string }
// Response: PredictionReport
{
  projectId: string;
  completion: {
    totalShots, shotsRemaining, estimatedTimeSeconds, estimatedCredits,
    avgGenTimeMs, avgCreditsPerShot, completionRate (0-1), projectedCompletion (ISO|null),
    confidence: 'high' | 'medium' | 'low'
  };
  cost: { totalSpent, projectedTotal, remainingBudget, perShotAvg, byProvider[] };
  bottlenecks: { type, description, severity, evidence, affectedShots, estimatedDelayMinutes }[];
  qualityRisks: { shotNumber, riskScore (0-1), riskFactors[], mitigation }[];
  summary: string;  // 自然语言摘要
}
```

**`GET /api/q/predict/quick/:projectId`** — 快速统计（轻量）：
```typescript
{ completionRate, estimatedMinutesLeft, criticalBottlenecks, highRiskShots }
```

#### Suggestion (`POST /api/q/suggest`, `GET /api/q/suggest/stats`)

主动建议引擎，从语义/反思记忆中提炼工作流优化、风格推荐、提示词改进等建议。

**`POST /api/q/suggest`** — 生成建议：
```typescript
// Request: { projectId: string, send?: boolean }  — send=true 时同时推送 SSE 通知
// Response: { suggestions: Suggestion[], count, sent }
```

7类建议：`workflow_optimization` | `style_recommendation` | `prompt_improvement` | `pipeline_shortcut` | `quality_alert` | `resource_optimization` | `learning_share`

**30分钟去重** — 同一 dedupKey 的建议30分钟内不会重复发送。

**`GET /api/q/suggest/stats`** — 建议引擎状态：
```typescript
{ trackedKeys: number, oldestTracked: string | null }
```

#### Orchestration (`POST /api/q/orchestrate`, `/execute`, `/stats`, `/reset`)

自动编排引擎 — 检测画布新节点，根据内容分类路由到合适的管道。

**`POST /api/q/orchestrate`** — 节点分类与路由：
```typescript
// Request: { nodes: CanvasNode[], projectId: string }
// Response: { decisions: OrchestrationDecision[], count }
```

路由：`script_analysis` | `character_extraction` | `scene_extraction` | `scene_architect` | `prop_designer` | `sound_composer` | `full_pipeline` | `text_pipeline` | `unified_pipeline` | `deviation_check` | `none`

**`POST /api/q/orchestrate/execute`** — 执行路由决策：
```typescript
// Request: { decision: OrchestrationDecision, scriptText?: string, visualStyle?: string }
// Response: { executed: boolean, route?, result? }
```

**`GET /api/q/orchestrate/stats`** — 编排统计：
```typescript
{ trackedNodes: number, byRoute: Record<string, number> }
```

**`POST /api/q/orchestrate/reset/:nodeId`** — 重置节点，允许重新路由。

#### Pipeline `onComplete` Callback

`runFullPipeline`、`runTextPipeline`、`runUnifiedPipeline` 新增可选 `onComplete` 回调：
```typescript
type PipelineOnComplete = (result: Record<string, unknown>) => void | Promise<void>;
// 回调在返回前执行，异常被捕获，不影响管道返回
```

---

## 📦 核心数据类型

```typescript
// 生图请求
interface GenerateRequest {
  providerId: string;
  rawText: string;
  camera?: string;          // "Sony Venice" 等
  lens?: string;            // "Zeiss Ultra Prime" 等
  focalLength?: string;     // "50mm"
  aperture?: string;         // "f/1.4"
  filmStock?: string;       // "Kodak 2383"
  referenceUrls?: string[];
  imgCount?: number;
  aspect?: string;          // "16:9"
  resolution?: string;      // "2K"
  shot?: { intent_cn?: string; shot_type?: string; camera_angle?: string; lens?: string };
  nodeId?: string;
  taskId?: string;
}

// 画布节点
interface CanvasNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

// 视口
interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
```

---

## 📐 前后端文件域

```
server/src/  ← 后端域（前端不碰）
src/         ← 前端域（后端不碰）
.env         ← 共享（后端管密钥，前端管 VITE_ 前缀变量）
package.json ← 共享（加了依赖告知对方）
```

---

## 🚦 并行开发规则

1. **开工前 → 在 Active Work Board 登记**（Write 此文件）
2. **改 API → 先写此文件的状态表 + 变更日志 → 再改代码**
3. **完成 → 更新状态 ✅ → 如需交接写 Handoff Signals**
4. **对方工作时 → 查 Active Work Board 避免冲突**
5. **API breaking change → 状态标 🔴 → Handoff Signals 告知前端**
6. **新增端点 → 状态标 🆕 → 前端接入后标 🟢**

---

## 🤖 Claude 窗口操作指南

每个窗口的 Claude 都通过 Read/Write 工具操作此文件：

```
// 后端窗口 — 开工
1. Read CLAUDE-contract.md  → 看前端在不在忙
2. Write 更新 Active Work Board  → 登记 "🟡 后端 | 改 /api/kie 加字段"
3. ... 开发中 ...
4. Write 更新 API 状态 + 变更日志 + 交接信号
5. Write 更新 Active Work Board → "✅ 后端 | 等待前端联调"

// 前端窗口 — 接棒
1. 用户说"看下合约" → Read CLAUDE-contract.md
2. 看到 Handoff: 后端改完 /api/kie，等待前端联调
3. Write 更新 Active Work Board → "🟡 前端 | 适配 /api/kie 新字段"
4. ... 开发中 ...
```

---

> 📅 最后更新：2026-07-09
> 👥 维护者：后端 + 前端 Claude（通过本文件的 Read/Write 协作）
