# READ THIS FIRST — 防失忆协议

> **你现在处于"接棒模式"。上一个你崩溃/结束了，你不知道之前聊了什么。**
> **下面这个流程是唯一的记忆恢复途径。跳过任何一步 → 你会误解人类的需求。**

---

## 强制步骤（每一步都必须执行）

### 第 1 步：恢复断点
```
打开 memory/session-handoff.md
```
这个文件告诉你：
- 上一个会话是谁、在做什么任务
- 做到哪一步了
- 下一步是什么
- 哪些事绝对不能做

### 第 2 步：核实当前状态
```bash
git branch --show-current
git status --short
git log --oneline -3
```
对比 session-handoff.md 里的记录，看有没有出入。

### 第 3 步：查模块地图
```
打开 memory/module-map.md
```
如果你要改代码，先查这个文件——它会告诉你改这个文件会崩哪些东西。

### 第 4 步：向人类汇报
告诉用户你读到了什么状态，确认是否正确，然后再动手。
**不要跳过汇报直接写代码。**

---

## 当前状态（每次结束时更新这里）

| 项目 | 值 |
|------|-----|
| 最后更新 | 2026-07-07 |
| 分支 | `fix/infinite-canvas-refactor` |
| 未提交文件 | 5 文件：App.tsx, persistence.ts, .gitignore, server/src/index.ts, CLAUDE.md |
| 当前板块 | 5层数据防丢体系 — 画布平移/崩溃心跳/服务器备份/localStorage紧急兜底/git排除 |
| 下一个板块 | 提交 + D盘同步 → 等用户指令 |

---

## 核心禁止事项
- 不要改端口号（3001/5173/8888）
- 不要改认证密钥
- D盘只做备份同步，不新建文件
- **改任何文件前先查 memory/module-map.md 里的坏耦合清单**
- **不要跳过汇报直接写代码**
- **不要混着做两个独立板块**
- **不要擅自修改未经用户确认的代码**
- **不要在 direx-backup 等备份目录操作 — 只通过 direx-project 工作**
- **不要删除任何现有代码 — 修复是「加防护」，不是「删逻辑」**

---

## 运行时数据保护（每次操作前检查）

这些文件是**用户数据**，不是源代码。git 操作（checkout/stash/rebase）会覆盖它们：

| 文件 | 说明 |
|------|------|
| `server/data/canvas-state.json` | 画布节点和边的唯一服务端状态 |
| `server/data/task-logs.json` | 任务执行历史 |
| `server/data/canvas-state-queen-surli.json` | 从 git 恢复的苏尔里女王项目（63节点） |

**规则**：
- 提交前确认 `canvas-state.json` 节点数没有比上次减少
- 如果减少了 → 检查 `server/data/backups/` 和 `canvas-state.json.bak`
- 不要手动编辑这些文件 — 它们由 `/api/canvas/sync` 自动管理

## 已知 Claude 自己会犯的错误（每会话自查）

1. **跳过汇报直接动手** → 违反第 4 步。每次都该先说「我读到了 X，确认是否正确」
2. **没查 git log canvas-state.json** → 第一时间就该看运行时数据是否被 git 覆盖
3. **上下文压缩后重查已知道的信息** → 依赖 session-handoff.md 写清楚，而不是靠记忆
4. **擅自修改未授权的代码** → 用户说「先汇报别改」时必须只读不改
5. **忘记 direx-project 是符号链接** → 它就是 direx-backup，同目录，不需要「同步」

---

## 全面灰度测试（每次提交前执行）

```bash
# 1. 编译检查
npx tsc --noEmit                          # 必须零错误

# 2. 服务端健康
curl http://localhost:3001/api/health      # 期望 {"status":"ok",...}

# 3. API 面检查
curl http://localhost:3001/api/canvas/state  # 节点数不应比上次少
curl -X POST http://localhost:3001/api/kie   # Suno callback 路径

# 4. 运行时数据完整性
node -e "const d=require('./server/data/canvas-state.json');console.log('Nodes:',d.nodes.length,'Edges:',d.edges.length)"
ls server/data/canvas-state.json.bak 2>/dev/null && echo "BAK exists" || echo "NO BAK"

# 5. 浏览器手动验证（不可自动化）
# - 创建节点 → F5 刷新 → 节点还在，位置不变
# - 拖动画布 → F5 刷新 → 视角不变
# - 生成一张图 → F5 刷新 → 图还在
# - 拖拽节点 → F5 刷新 → 位置不变
# - taskkill 杀进程 → 重启 → 数据完整（测试心跳恢复）
```

---

## 记忆文件位置
- `memory/session-handoff.md` — 断点（第一个读）
- `memory/module-map.md` — 模块依赖关系（改代码前读）
- `MEMORY.md` — 记忆索引（系统自动加载）
