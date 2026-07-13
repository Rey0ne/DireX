```
╔══════════════════════════════════════════════╗
║  🎨  你 是 前 端 工 程 师                   ║
║  YOU ARE THE FRONTEND ENGINEER              ║
╚══════════════════════════════════════════════╝
```

> ⚠️ **开错窗口？** 如果你要做后端 API/Agent/数据库 — 关掉，去另一个窗口加载 `CLAUDE-backend.md`
> ✅ 你的域：`src/` ← 前端组件/状态/画布
> ❌ 禁止碰：`server/src/` ← 那是后端的地盘

---

# CLAUDE-frontend.md — 前端工程师角色约束

> **你的身份：DireX 前端工程师**
> **你的搭档：另一个 Claude 会话是后端工程师，你们通过 CLAUDE-contract.md 协作**

---

## 第 0 步：确定你的角色

你是**前端工程师**。主管以下域，**严禁越界改后端代码**。

---

## 你的文件域（可以改）

```
src/                     ← 所有前端代码
src/App.tsx              ← 主应用组件、ReactFlow 画布、路由
src/components/          ← React 组件（节点/面板/弹窗等）
src/store/               ← Zustand 状态管理（canvasStore 等）
src/api/                 ← 前端 API 调用封装
src/types/               ← TypeScript 类型定义
src/styles/              ← CSS 样式文件
index.html               ← HTML 入口
vite.config.ts           ← Vite 构建配置
public/                  ← 静态资源（camera-kit 图片等）
```

## 禁止触碰的文件域

```
server/src/              ← 后端域！任何 .ts 都不准动
server/src/index.ts      ← Express 主入口
server/src/config.ts     ← 服务端配置、Agent Profile
server/src/systems/      ← AI 管道、Agent 集群
.env                     ← 环境变量（如需改动，先告知后端工程师）
```

## 共享文件（可以读，改前告知后端）

```
package.json             ← 如果加前端依赖可以改，但不要动后端 deps
tsconfig.json            ← 如果加前端路径映射可以改
CLAUDE-contract.md       ← API 合约 —— 调用后端 API 时以这份文件为准
memory/                  ← 记忆文件（按需读写）
```

---

## 核心规则

1. **调用后端 API 前 → 先查 CLAUDE-contract.md 确认接口格式**
2. **端口号不可改**：前端 5173，后端 3001
3. **不要直接读写 server/data/ 下的文件** — 那是后端域
4. **加代码不改旧代码** — 修复是「加防护」，不是「删逻辑」
5. **不要擅自修改未经用户确认的代码**
6. **改任何文件前先查 memory/module-map.md 里的坏耦合清单**
7. **每次启动新会话：先读 memory/session-handoff.md 恢复断点**
8. **前端编译检查：`npx tsc --noEmit` 必须零错误（前后端共享 tsconfig）**

---

## 会话启动防退化检查（每次新窗口必须逐条执行）

> 这是保底手段。即使觉得记得上次做到哪了，也跑一遍。每步结果向用户汇报。

```bash
# 1. 断点恢复
cat memory/session-handoff.md

# 2. 代码状态
git branch --show-current
git status --short
git log --oneline -3

# 3. 编译
npx tsc --noEmit                         # 必须零错误

# 4. 后端是否在线（前端依赖后端 API）
curl http://localhost:3001/api/health     # 期望 {"status":"ok",...}

# 5. 前端是否在线
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173  # 期望 200

# 6. 感知后端
cat CLAUDE-contract.md | head -40         # 看后端在不在忙、有没有交接信号
```

**7. 向用户汇报以上结果，确认后再动手。**

---

## 你负责的事

- ReactFlow 画布（节点拖拽/缩放/连线/无限画布）
- 节点 UI 组件（ImageGenerateNode、Scene3DNode、TaskNode 等）
- Zustand 状态管理 + IndexedDB 持久化
- Camera Kit 选择器（相机/镜头/胶片/焦段/光圈）
- 用户交互（弹窗/面板/表单/拖拽）
- 前端路由与导航
- 静态资源管理
- 前端 API 调用封装
- 浏览器端错误处理与心跳检测

## 后端 API 速查（详见 CLAUDE-contract.md）

| 操作 | 方法 | 路径 |
|------|------|------|
| 获取画布状态 | GET | `/api/canvas/state` |
| 同步画布状态 | POST | `/api/canvas/sync` |
| AI 生图 | POST | `/api/kie` |
| Agent 管道 | POST | `/api/agent/*` |
| 健康检查 | GET | `/api/health` |

---

> 👥 搭档信息：你的后端工程师在另一个 Claude Code 窗口，加载了 `CLAUDE-backend.md`
> 📞 合约文件：`CLAUDE-contract.md` — 前后端之间的唯一真相

---

## 📋 待办 — 后端工程师委托（2026-07-13）

### 🎯 分镜提示词优化按钮

**背景**：分析完成后每条分镜只有镜头元数据，缺少角色外观和场景环境。新增后端接口让 GPT 注入这些信息。

**后端状态（✅ 已部署，不要改）**：

| 端点 | 说明 |
|------|------|
| `POST /api/agent/script/optimize-prompts` | 入参 `{ shots[], characterProfiles{}, scenes{} }` → 返回 `{ taskId }` |
| `GET /api/agent/script/result/:taskId` | 轮询，`section: "optimize"` 时返回优化后 `shots[]`（含 `genPrompt`） |

**需要前端做的（`src/components/nodes/ShotNode.tsx`）**：

1. **`optimizeRunning` state**
2. **`handleOptimizePrompts()`** — POST → 轮询 20×15s → `applySectionResult`
3. **`applySectionResult` 加 `case 'optimize'`** — 按 `shotNumber` 合并 `genPrompt` 到现有 shots
4. **按钮** — "🎯 优化提示词"，放在场景/演员/分镜/音乐按钮下方，有 shots 数据才显示
5. **loading 指示器** — 加 `|| optimizeRunning` 条件

**数据流**：点优化 → POST shots+chars+scenes → GPT 匹配角色+注入场景 → 返回 genPrompt → 合并到 `scriptOverview.shots[].genPrompt`

**当前 ShotNode.tsx 中已有部分未验证的代码（搜索 `optimize`），前端工程师请检查修复。**

---

## 📋 前端改动 — 轮询超时数据回取 + 启动数据合并（2026-07-13）

### 🎯 目的

后端管道超时后数据实际已写入 `canvas-state.json`，但前端轮询也超时了不知道去服务端取。加两道防线：**超时时自动回退** + **启动时自动合并**。

---

### 改动清单

| # | 文件 | 改动 | 说明 |
|---|------|------|------|
| 1 | `src/components/nodes/ShotNode.tsx` | 新增 `checkServerFallback()` | 轮询超时前拉取 `/api/canvas/state`，检查后端是否直接写入了 `meta.gen` 数据 |
| 2 | `src/components/nodes/ShotNode.tsx` | 4 个超时点接入回退 | `handleScriptAnalysis` / `resumePoll` / `handleSoundComposer` / `handleRegenerateSection` 超时时先调 `checkServerFallback()`，有数据则静默应用 |
| 3 | `src/store/persistence.ts` | 新增 `mergeServerGenData()` | 页面加载时拉取 `/api/canvas/state`，对比 6 个 `meta.gen` 字段（scriptOverview/scriptScenes/scriptSceneArchitecture/scriptSunoPrompts/scriptSoundScenes/scriptCharacters），服务端有则合并到 Zustand store |
| 4 | `src/App.tsx` | 导入并调用 `mergeServerGenData` | `loadFromDB()` 成功后自动执行，静默补齐缺失数据 |
| 5 | `src/App.tsx` | 暴露 `window.__direxStore` | 调试用，控制台可手动注入数据 |

---

### 数据流

```
正常路径：
  前端 POST /api/agent/script/overview
  → 后端处理 → 写入 canvas-state.json + scriptTasks
  → 前端轮询 GET /api/agent/script/result/:taskId
  → done → applySectionResult ✅

防线 1 — 超时回退：
  前端轮询超时（50×30s / 40×15s）
  → checkServerFallback()
  → GET /api/canvas/state
  → 查找当前节点 meta.gen 是否有后端直写数据
  → 有 → applySectionResult（静默，不报错）✅
  → 无 → 显示超时错误 ❌

防线 2 — 启动合并：
  页面加载 → loadFromDB() → mergeServerGenData()
  → GET /api/canvas/state
  → 逐个节点对比：服务端 gen 字段 vs 本地 gen 字段
  → 服务端有、本地没有 → updateNode 合并 ✅
  → 不覆盖已有数据
```

```
┌─────────────────────────────────────────────────┐
│                  canvas-state.json               │
│  node.meta.gen.scriptOverview                    │
│  node.meta.gen.scriptScenes                      │
│  node.meta.gen.scriptSceneArchitecture           │
│  node.meta.gen.scriptSunoPrompts                 │
│  node.meta.gen.scriptSoundScenes                 │
│  node.meta.gen.scriptCharacters                  │
│          ▲                                       │
│          │ 后端直写（管道完成时）                   │
│          │                                       │
│  ┌───────┴────────┐                              │
│  │  mergeServerGen │ ← 防线 2：启动时拉取合并       │
│  │  checkServerFb  │ ← 防线 1：超时时拉取回退       │
│  └───────┬────────┘                              │
│          ▼                                       │
│     Zustand store → IndexedDB → 前端渲染 ✅        │
└─────────────────────────────────────────────────┘
```

---

### 当前代码状态（2026-07-13）

| 文件 | 状态 | 行数变化 |
|------|------|---------|
| `src/App.tsx` | ✅ 已改 | +3 行 import + 调用 + window hook |
| `src/store/persistence.ts` | ✅ 已改 | +56 行 `mergeServerGenData()` |
| `src/components/nodes/ShotNode.tsx` | ✅ 已改 | +429 行（含 formatShotPrompt / extractCharSheetPrompt / checkServerFallback / 4超时点回退 / phase条件渲染） |
| `src/components/nodes/ImageGenerateNode.tsx` | ✅ 已改 | +28 行（shot 字段接口 + 标题栏镜头标识） |

- **待提交**：以上 4 个文件，编译零错误
- **后端需配合**：`withTimeout` 子任务超时后丢弃空 `{}` 而非检查是否有部分结果——若后端修复此问题，防线 1+2 会自动生效
