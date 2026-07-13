# DireX — AI 驱动的影视分镜与视觉预演平台

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp server/.env.example .env
# 编辑 .env，填入 API Key

# 3. 启动开发服务器（前后端同时启动）
npm run dev
```

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`
- 管理面板：`http://localhost:3001/admin`

---

## 数据目录结构

所有运行时数据存储在 `server/data/`（已加入 .gitignore，git 不会触碰）：

```
server/data/
├── projects/              ← ⭐ 多项目存储（主存储）
│   ├── default/           ← 默认项目
│   │   ├── state.json     ← 画布状态（节点 + 边）
│   │   ├── state.json.bak ← 写入前自动备份
│   │   └── backups/       ← 最近 20 份轮转备份
│   └── <project-id>/
│       └── state.json
├── output/                ← 生成的图片/视频/音频缓存
├── models/                ← 3D 模型文件
├── backups/               ← 旧版画布备份
├── q-training/            ← 小Q 记忆训练数据
└── q-memory-*.json        ← 小Q 记忆持久化
```

### 新环境初始化

服务端启动时自动执行：
1. 检查 `server/data/projects/` 目录存在
2. 如不存在 → 自动创建 `default` 空项目
3. 如存在旧 `canvas-state.json` → 自动迁移到 `projects/default/state.json`

无需手动操作。

### 数据恢复

如果数据丢失：
1. 检查 `server/data/projects/<id>/backups/` — 最近 20 份轮转备份
2. 检查 `server/data/projects/<id>/state.json.bak` — 最后一次覆盖前备份
3. 检查 `server/data/canvas-state.json.migrated` — 旧版迁移前的数据
4. 检查浏览器 IndexedDB — 可能有离线缓存

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/canvas/projects` | 列出所有项目 + 健康状态 |
| GET | `/api/canvas/state?project=<id>` | 加载项目画布 |
| POST | `/api/canvas/sync` | 同步画布 `{projectId, nodes, edges}` |
| POST | `/api/agent/script/overview` | 剧本全管线分析 |
| POST | `/api/agent/script/regenerate` | 局部板块重生成 |
| POST | `/api/agent/script/music` | 音乐重生成 |
| POST | `/api/agent/script/supplement` | 补充角色+场景+音乐 |
| GET | `/api/agent/script/result/:taskId` | 轮询异步任务结果 |
| POST | `/api/upload` | 上传 data URL → 公共 URL |
| POST | `/api/tripo/generate` | Tripo3D 生成 |
| POST | `/api/kie` | Suno callback 接收 |

---

## 模型栈

| 模型 | 用途 | Provider |
|------|------|----------|
| GPT-5.6 Sol | 文本推理 + 图像反推 | OpenAI (via kie.ai) |
| Nano Banana Pro | 图像生成 | Google (via kie.ai) |
| GPT-Image-2 | 图像生成 | OpenAI (via kie.ai) |
| Kling 3.0 | 视频生成 | 快手可灵 (via kie.ai) |
| Seedance 2 | 视频生成 | 字节 (via kie.ai) |
| Suno V5 | 音乐生成 | Suno (via 代理) |
| Tripo 3D | 3D 生成 | Tripo (直连) |
| DeepSeek V3 | 小Q 记忆/对话 | DeepSeek |

---

## 开发

```bash
# TypeScript 编译检查
npx tsc --noEmit

# 仅启动后端
npx tsx server/src/index.ts

# 仅启动前端
npx vite
```

### 项目结构

```
DireX/
├── server/src/
│   ├── index.ts          ← Express 主入口
│   ├── config.ts         ← 配置 + Key 管理
│   └── systems/
│       ├── agent/        ← AI 管线 (pipeline, KB, profiles)
│       ├── ai/           ← LLM provider 适配
│       ├── q/            ← 小Q 记忆系统
│       └── db/           ← JSON 文件存储
├── src/                  ← React 前端
│   ├── App.tsx
│   ├── components/nodes/ ← 节点组件
│   └── store/            ← Zustand + 持久化
└── CLAUDE-contract.md    ← 前后端 API 合约
```

### 架构决策

- **数据归属**：服务端磁盘 = 主存储，浏览器 IndexedDB = 离线缓存
- **多项目**：一次一个项目，服务端独立文件互不影响
- **提示词**：不截断，全量传给生图模型
- **端口**：后端 3001 / 前端 5173 / Kimodo 8000（不可改）

---

## 安全

- API Key 存储在 `.env`（已 gitignore），不在代码仓库中
- 如需重置 Key：编辑 `.env` → 重启服务
- 密钥模板：`server/.env.example`
- 认证头：`Authorization: Bearer tapnow-dev-key`

---

## 许可证

MIT
