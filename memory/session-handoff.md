# Session Handoff — DireX

> **最后更新**: 2026-07-25 | **分支**: `fix/infinite-canvas-refactor` | **最新提交**: `6dc6775`
> **压缩次数**: 0 | **最后校验**: 2026-07-25

---

## 当前状态

| 项目 | 值 |
|------|-----|
| 分支 | `fix/infinite-canvas-refactor` |
| 最新提交 | `6dc6775` — docs: session-handoff 更新至 2026-07-25 |
| 当前板块 | Harness 健康修复 — CF/DireX 项目分离完成 |
| 下一个板块 | 前端待办：ShotNode 分镜结果展示 / ImageGenerateNode 分镜元数据 |

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

## 关键文件位置

| 文件 | 用途 |
|------|------|
| `CLAUDE.md` | 主协议 + 强制步骤 + 架构文档 |
| `CLAUDE-backend.md` | 后端工程师角色 |
| `CLAUDE-frontend.md` | 前端工程师角色 |
| `CLAUDE-contract.md` | API 合约 |
| `memory/module-map.md` | 模块依赖 + 坏耦合清单 |
| `memory/canvas-nodes-invisible-debug.md` | 节点不可见 debug 记录 |
