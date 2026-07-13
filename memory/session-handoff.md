# Session Handoff — 2026-07-13 (前端: 轮询超时服务端回退 + 启动数据合并)

## 上次会话
- **分支**: `fix/infinite-canvas-refactor`
- **板块**: 前端 — 修复轮询超时后数据取回机制

## 当前状态
- **编译**: `npx tsc --noEmit` — 零错误 ✅
- **后端**: `http://localhost:3001/api/health` — ok ✅
- **前端**: `http://localhost:5173` — ok ✅
- **最新提交**: `c53d11f` — KB_CATALOG补充建筑光线大师条目
- **未提交改动**:
  - `src/App.tsx` — 暴露 `window.__direxStore` + 启动时调用 `mergeServerGenData()`
  - `src/store/persistence.ts` — 新增 `mergeServerGenData()` 启动时从服务端合并 `meta.gen` 数据
  - `src/components/nodes/ShotNode.tsx` — 新增 `checkServerFallback()` + 4个超时点回退逻辑
  - `CLAUDE-contract.md` — 前端待办已完成标记
  - `CLAUDE.md` — 同
  - `memory/session-handoff.md` — 本文件

## 本次改动详情

### 1. ShotNode.tsx — `checkServerFallback()` 服务端回退

**问题**: 后端管道超时（15min）但实际完成了工作，数据写入 `canvas-state.json`。前端轮询也超时（25min），但不知道去服务端找数据。

**修复**: 新增 `checkServerFallback()` 辅助函数：
- 拉取 `GET /api/canvas/state`
- 找到当前节点，对比服务端 `meta.gen` vs 本地 `meta.gen`
- 服务端有、本地没有 → 返回格式化响应给 `applySectionResult`
- 都没有 → 返回 null，照常显示超时错误

**4 个回退点**:
| 位置 | 触发条件 | 回退行为 |
|------|---------|---------|
| `handleScriptAnalysis` 超时 | 50次×30s 后 | 尝试 server fallback → 有数据则静默应用 |
| `resumePoll` 超时 | 刷新页面后继续轮询 50次 | 同上 |
| `handleSoundComposer` 超时 | 40次×15s 后 | 检查 `scriptSunoPrompts`，有则应用 |
| `handleRegenerateSection` 超时 | 40次×15s 后 | 检查全部 gen 字段，有则应用 |

### 2. persistence.ts — `mergeServerGenData()` 启动合并

**问题**: 前端关闭期间后端完成分析 → IndexedDB 有旧快照 → 下次打开看不到新数据。

**修复**: `loadFromDB()` 成功后自动调用 `mergeServerGenData()`：
- 拉取 `GET /api/canvas/state`
- 逐个节点对比 6 个 `meta.gen` 字段（scriptOverview/scriptScenes/scriptSceneArchitecture/scriptSunoPrompts/scriptSoundScenes/scriptCharacters）
- 服务端有、本地没有 → 合并到 Zustand store
- 不覆盖已有数据

### 3. App.tsx — 小改动
- `import mergeServerGenData` + 在 `markInitialized()` 后调用
- `(window as any).__direxStore = useCanvasStore` — 调试/紧急注入用

## 数据现状
- `canvas-state.json`：63 节点，5 个 ShotNode 中 4 个有 `scriptOverview`（21/26/34/27 shots）
- `node-04f72b93-ad`：21 shots + 10 characters ✅
- `script-tasks.json`：2 个任务都超时（"Pipeline master timeout after 15 minutes"），status: "done"
- **用户需要刷新页面**触发 `mergeServerGenData()` 才能看到数据

## 核心禁止事项（跨会话不变）
- 不改端口号（3001/5173/8888）
- 不改认证密钥
- D盘只做备份同步
- 改代码前查 memory/module-map.md 坏耦合清单
- 不跳过汇报直接写代码
- 不混做两个独立板块
