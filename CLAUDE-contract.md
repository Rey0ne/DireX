# CLAUDE-contract.md — 前后端合约层

> **这是前后端之间的唯一真相。**
> **两个窗口的 Claude 都读写这个文件来感知对方。不靠粘贴，靠工具 Read/Write 磁盘文件。**

---

## ⚡ 活跃工作板（Active Work Board）

> 每个角色开始新任务前，先在这里登记。完成后标记 ✅。另一个窗口看到就知道对方在干嘛。

| 状态 | 谁 | 在做什么 | 涉及 API/文件 | 开始时间 |
|------|-----|---------|-------------|---------|
| ⬜ 空闲 | 后端 | — | — | — |
| ⬜ 空闲 | 前端 | — | — | — |

**状态符号**：🟡 进行中 | ✅ 已完成 | ⏳ 等待对方 | ❌ 阻塞 | ⬜ 空闲

---

## 🔄 交接信号（Handoff Signals）

> 当一方完成任务需要另一方接棒时，在这里留信号。另一方下次读合约时就能看到。

| 时间 | 从 | 到 | 消息 |
|------|-----|-----|------|
| — | — | — | 暂无交接 |

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

**状态符号**：🟢 stable（稳定可用）| 🟡 changing（正在改）| 🔴 breaking（破坏性变更中）| 🆕 new（新增，前端尚未接入）| ⚫ deprecated（已废弃）

---

## 📜 变更日志（Change Log）

| 日期 | 谁 | 做了什么 | 影响前端？ |
|------|-----|---------|-----------|
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

> 📅 最后更新：2026-07-08
> 👥 维护者：后端 + 前端 Claude（通过本文件的 Read/Write 协作）
