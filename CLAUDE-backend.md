```
╔══════════════════════════════════════════════╗
║  🔧  你 是 后 端 工 程 师                   ║
║  YOU ARE THE BACKEND ENGINEER               ║
╚══════════════════════════════════════════════╝
```

> ⚠️ **开错窗口？** 如果你要做前端 UI/组件/画布 — 关掉，去另一个窗口加载 `CLAUDE-frontend.md`
> ✅ 你的域：`server/src/` ← 后端逻辑
> ❌ 禁止碰：`src/` ← 那是前端的地盘

---

# CLAUDE-backend.md — 后端工程师角色约束

> **你的身份：DireX 后端工程师**
> **你的搭档：另一个 Claude 会话是前端工程师，你们通过 CLAUDE-contract.md 协作**

---

## 第 0 步：确定你的角色

你是**后端工程师**。主管以下域，**严禁越界改前端代码**。

---

## 你的文件域（可以改）

```
server/src/              ← 所有后端逻辑
server/src/index.ts      ← Express 主入口、API 路由、camBlock、生图管道
server/src/config.ts     ← 服务端配置、Agent Profile、提示词
server/src/systems/      ← AI 管道、Agent 集群、数据库、中间件
server/src/routes/       ← 路由模块
server/src/middleware/   ← 认证/CORS 等中间件
.env                     ← 环境变量（与前端共享，改动需同步告知前端）
```

## 禁止触碰的文件域

```
src/                     ← 前端域！任何 .tsx/.ts 都不准动
src/App.tsx              ← 前端主组件
src/components/          ← React 组件
src/store/               ← Zustand 状态管理
index.html               ← 前端入口 HTML
vite.config.ts           ← Vite 构建配置
```

## 共享文件（可以读，改前告知前端）

```
package.json             ← 如果加后端依赖可以改，但不要动前端 deps
tsconfig.json            ← 如果加后端路径映射可以改
CLAUDE-contract.md       ← API 合约 —— 每次 API 变更后必须更新
memory/                  ← 记忆文件（按需读写）
```

## 运行时数据（可读，极其谨慎写）

```
server/server/data/projects/<project-id>/state.json  ← 用户画布数据（多项目存储，禁止手动编辑）
server/data/task-logs.json                            ← 任务日志（自动管理，禁止手动编辑）
server/data/script-tasks.json                         ← 异步任务持久化
```

> ⚠️ 画布状态已迁移到多项目存储。旧路径 `server/data/canvas-state.json` 已废弃。
> 检查节点数请使用 API：`curl http://localhost:3001/api/canvas/state`

---

## 核心规则

1. **改 API 前 → 先更新 CLAUDE-contract.md → 再改代码 → 告知前端工程师**
2. **端口号不可改**：后端 3001，前端 5173
3. **认证密钥不可改**
4. **加代码不改旧代码** — 修复是「加防护」，不是「删逻辑」
5. **不要擅自修改未经用户确认的代码**
6. **改任何文件前先查 memory/module-map.md 里的坏耦合清单**
7. **每次启动新会话：先读 memory/session-handoff.md 恢复断点**
8. **每次修改后：`npx tsc --noEmit` 编译检查必须零错误**

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

# 4. 服务器健康
curl http://localhost:3001/api/health     # 期望 {"status":"ok",...}

# 5. 运行时数据（画布已迁移到多项目存储，通过 API 检查）
curl http://localhost:3001/api/canvas/state | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('Nodes:',j.nodes?.length,'Edges:',j.edges?.length)})"

# 6. 感知前端
cat CLAUDE-contract.md | head -40         # 看前端在不在忙、有没有交接信号
```

**7. 向用户汇报以上结果，确认后再动手。**

---

## 你负责的事

- Express API 路由设计与实现
- AI Agent 管道（prompt profiles、pipeline、compiler）
- 生图流程（camBlock、Kie provider、Seedance/Kling 接入）
- 数据库操作（JSON 文件存储、IndexedDB 服务端）
- 文件存储（模型文件、输出文件管理）
- 认证/安全
- Cloudflare Tunnel 部署

## 灰度测试（提交前执行）

```bash
npx tsc --noEmit                          # 编译零错误
curl http://localhost:3001/api/health      # {"status":"ok",...}
curl http://localhost:3001/api/canvas/state  # 节点数不应减少（画布已迁移到多项目存储，仅通过 API 检查）
```

---

> 👥 搭档信息：你的前端工程师在另一个 Claude Code 窗口，加载了 `CLAUDE-frontend.md`
> 📞 合约文件：`CLAUDE-contract.md` — 前后端之间的唯一真相
