# DireX 开发进度总览

> 最后更新：2026-07-14 00:45
> 分支：`fix/infinite-canvas-refactor`
> 项目路径：`C:\Users\ROG\direx-backup-20260613-0205`（符号链接 `direx-project`）

---

## 一、项目架构

```
DireX/
├── server/src/           ← 后端 (Express API + AI管线)
│   ├── index.ts          ← 主入口、路由、画布同步
│   ├── systems/
│   │   ├── agent/        ← AI管道 (pipeline, profiles, KB引擎)
│   │   ├── ai/           ← LLM provider (GPT, DeepSeek, Gemini)
│   │   ├── q/            ← 小Q 记忆+编排系统
│   │   ├── db/           ← JSON文件存储
│   │   └── file/         ← 资源缓存
│   └── routes/           ← 路由模块
├── src/                  ← 前端 (React + Zustand + ReactFlow)
│   ├── App.tsx           ← 主组件
│   ├── components/nodes/ ← 节点组件 (Shot, ImageGenerate, Audio, Video, Tripo3D)
│   └── store/            ← 状态管理 + 持久化
├── server/data/          ← 运行时数据
│   ├── projects/         ← ⭐ 多项目存储 (2026-07-14新增)
│   ├── output/           ← 生成资源缓存
│   ├── backups/          ← 画布轮转备份
│   └── models/           ← 3D模型文件
└── CLAUDE-contract.md    ← 前后端API合约
```

## 二、已提交的板块（按时间倒序）

### 板块㉓ — clearAllData 核弹修复 (69c3bb5)
- **问题**：`clearAllData()` 删除 IndexedDB 全部表（projects/canvases/nodes/edges/assets/jobs），用户切换项目时所有项目被清空
- **修复**：改为精确删除 `db.nodes.where({canvasId}).delete()` + `db.edges.where({canvasId}).delete()`，只清当前画布
- **文件**：`src/store/persistence.ts`

### 板块㉒ — IndexedDB 膨胀自动清理 (61dfe73, 89fdb70)
- **问题**：画布状态累积到 7.7MB，包含大量 data: URI 嵌入
- **修复**：
  - `sanitizeMeta()`：过滤 >500KB 的字段（data URL）
  - 加载时跑 `sanitizeMeta`（之前只写时跑）
  - 自动治愈：state >5MB → 跳过 IndexedDB → 从服务端加载
  - `stripDataUrls()`：同步到服务端前剥离 data: 前缀
- **文件**：`src/store/persistence.ts`

### 板块㉑ — GPT-5.6 直接看图反推提示词 (3696676)
- **功能**：`reversePromptFromImages(urls)` — GPT-5.6 多模态直接看图片反推生成提示词，一步到位
- **流程**：下载图片 → base64 → GPT-5.6 Sol 视觉推理 → 返回提示词
- **前端**：ShotNode 双模式 — 有参考图连线 → 反推；无图+有文本 → 剧本分析
- **后端修复**：
  - `kie-provider.ts`：修复 `data.code` 错误检查（kie.ai HTTP 200 永远），Seedance-2 参数对齐官方 spec
  - `index.ts`：`proxyAsset` 改为流式传输
  - `gemini.ts`：GPT_MODEL PRIMARY 升级为 `gpt-5-6-sol`
- **文件**：`pipeline.ts`, `index.ts`, `kie-provider.ts`, `ShotNode.tsx`

### 板块⑳ — 知识库 + 光照架构 (c53d11f, 04efdae, 8215e62, 1452178)
- 新增阿尔瓦·阿尔托等建筑光线大师到 KB_CATALOG
- 场景分析强制自然光优先 — 自然光主导，人工光仅辅助
- 自然光亮度强化 — 自然光=明亮通透，分时段亮度规则

### 板块⑲ — T2I 提示词截断修复 (a6da64c, 8e92e97, 1800578, ce6896d)
- 移除 T2I GPT 翻译步骤，原提示词直达 kie.ai
- 移除所有硬编码提示词截断（MAX_PROMPT_LEN、Vision 3500字符）
- maxOutputTokens 从 4096 → 默认 16000，MAX_PROMPT_LEN 从 3000 → 8000

### 板块⑱ — Character Sheet 角色生图 (02b3d9b, 00d1c54)
- CHARACTER_EXTRACTION 输出新增英文 Character Sheet 生图提示词
- 明确三视图 60% + 表情特写 40% 版式

### 板块⑰ — GPT-5.6-Sol 主力模型 (232a543)
- 新增 `gpt5Chat()` 默认使用 `gpt-5-6-sol`
- 保留 GPT-5.4 作为备选

### 板块⑯ — 后端 4 端点异步化 + instrumental 规则 (3979e04, ec84685)
- `/api/agent/script/overview`、`/api/agent/script/music`、`/api/agent/script/regenerate`、`/api/agent/script/supplement` 全部改为 taskId 异步模式
- 复用 `scriptTasks` 持久化 + 前端轮询
- SOUND_COMPOSER 默认 instrumental，禁用 Rap 流派裸写

### 板块⑮ — 前端 ShotNode 异步轮询 (c1ea740, 102a360)
- 三种提交入口（剧本分析/音乐/局部重生成）统一轮询机制
- 状态处理矩阵：done/lost/failed/processing/timeout
- `applySectionResult()` 按 section 选择性 patch
- 同步/异步双兼容
- Handle 样式统一（实心蓝底 #00CFFF + 白色+号）

### 板块⑭ — 两轮对话式 KB 检索 (2962cb8)
- **核心改变**：不再把 40KB 风格库一次性倾倒给 LLM
- Round 1: GPT 读剧本 + KB_CATALOG → 自主决定检索关键词
- Round 2: Agent 精准检索 → 结果喂回 LLM 设计角色
- 角色版式统一：三视图 60% + 表情 3 种 + 细节特写 2 处
- 新增组件：KB_CATALOG, searchFashionKB, searchInteriorKB, buildStyleCard

### 板块⑬ — 多图并行生成 + 扑克牌叠放 (921d0c5)
- 用户选 ×2/×4 → `Promise.all(N个 generateWithAgent)` → 叠放显示
- 积分消耗实时预览：1K=10, 2K=15, 4K=20 积分，Nano Banana ×0.8
- Bug 修复：promptRef 闭包、hasMulti 条件、积分挤压按钮、ShotNode 文本溢出

### 板块⑫ — 小Q 助手 + Dock 工具栏 (cad0117)
- 小Q 助手替换 Agent
- Dock 式工具栏 + ShotNode 按键显隐
- 暖色画布背景

---

## 三、未提交的改动（当前工作区）

### 1. 多项目服务端存储 ⭐ 核心架构变更
**文件**：`server/src/index.ts` (+152/-7962 行)，`src/store/persistence.ts` (+31 行)

| 改动 | 说明 |
|------|------|
| `server/data/projects/<id>/state.json` | 多项目独立文件存储，不再依赖单一 canvas-state.json |
| `GET /api/canvas/projects` | 新增 — 列出所有项目 |
| `GET /api/canvas/state?project=<id>` | 改动 — 按项目 ID 加载 |
| `POST /api/canvas/sync` | 改动 — body 新增 `projectId`，写入对应项目目录 |
| 自动迁移 | 旧 `canvas-state.json` → `projects/default/state.json` |
| 每项目独立备份 | 20 份轮转备份 + `.bak` |
| 前端 `loadFromDB` | 服务端优先加载，IndexedDB 降级为离线缓存 |
| 前端 `saveNow` | 同步时带 `projectId` |
| 前端 `restoreMissingProjects` | 新增 3 个项目备份条目 |

**恢复的项目**（共 6 个）：
```
default/         89 节点  ← 当前工作项目
project-105/    105 节点
project-59/      59 节点  (含 tripo.3d / scene.3d / video)
queen-surli/     63 节点  ← 苏尔里女王
sync-payload/    74 节点
project-12/      12 节点
```

### 2. 其他未提交改动
- `CLAUDE-contract.md`：合约文档更新
- `App.tsx`：前端加载逻辑调整
- `ShotNode.tsx`：双模式 generate 修复
- `canvas-state.json`：已迁移到 `projects/default/state.json`

---

## 四、数据安全架构

### 防护层级
```
Layer 1: 服务端磁盘 (server/data/projects/<id>/state.json)  ← 主存储
Layer 2: 轮转备份 (backups/ — 每个项目保留 20 份)
Layer 3: .bak 文件 (每次写入前自动备份)
Layer 4: IndexedDB (浏览器端缓存)
Layer 5: localStorage (紧急降落伞 — 仅节点结构，无内容)
```

### 运行时数据文件
| 文件 | 内容 | 风险 |
|------|------|------|
| `server/data/projects/*/state.json` | 画布节点+边 | git 操作会覆盖 |
| `server/data/canvas-state.json.migrated` | 旧版备份 | 迁移后保留 |
| `server/data/output/` | 生成资源缓存 | 可重新生成 |

---

## 五、模型 Provider 栈

| 模型 | 类型 | Provider | 状态 |
|------|------|----------|------|
| `gpt-5-6-sol` | 文本/视觉 | OpenAI (via kie.ai) | ✅ 主力 |
| `gpt-5-4` | 文本 | OpenAI (via kie.ai) | 备选 |
| `nano-banana-pro` | 图像生成 | Google (via kie.ai) | ✅ |
| `gpt-image-2` | 图像生成 | OpenAI (via kie.ai) | ✅ |
| `kling-3.0` | 视频生成 | 快手可灵 (via kie.ai) | ✅ |
| `seedance-2` | 视频生成 | 字节 (via kie.ai) | ✅ |
| `suno-v5` | 音乐生成 | Suno (via 代理) | ✅ |
| `tripo-3d` | 3D 生成 | Tripo (直连) | ✅ |
| `deepseek-v3` | 文本 (小Q) | DeepSeek | ✅ |

### 待迁移路线
- Seedance → 火山方舟（第一方，国内直连）
- Kling → 可灵开放平台（第一方）
- Nano Banana → Google Vertex AI（需海外主体）
- GPT-image → Azure OpenAI

---

## 六、API 端点速查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/canvas/projects` | ⭐ 列出所有项目 |
| GET | `/api/canvas/state?project=<id>` | ⭐ 加载项目画布 |
| POST | `/api/canvas/sync` | 同步画布 (body: `{projectId, nodes, edges}`) |
| POST | `/api/agent/script/overview` | 剧本分析 (异步 taskId) |
| GET | `/api/agent/script/result/:taskId` | 轮询任务结果 |
| POST | `/api/agent/script/regenerate` | 局部板块重生成 |
| POST | `/api/agent/script/music` | 音乐重生成 |
| POST | `/api/agent/script/supplement` | 补充角色+场景+音乐 |
| GET | `/api/output/*` | 生成资源静态文件 |
| POST | `/api/kie` | Suno callback 接收 |
| POST | `/api/tripo/generate` | Tripo3D 生成 |

---

## 七、关键设计决策

1. **数据归属**：服务端磁盘 = 主存储，浏览器 IndexedDB = 离线缓存（2026-07-14 改）
2. **多项目**：一次只能打开一个项目，服务端独立文件互不影响
3. **提示词**：不截断，全量传给生图模型
4. **光照**：自然光优先，人工光辅助
5. **音乐**：默认 instrumental，防止 Suno 生成歌词
6. **角色**：两轮 KB 检索，40KB 知识库不直接喂 LLM

---

## 八、端口与密钥

| 项目 | 值 | 规则 |
|------|-----|------|
| 后端端口 | 3001 | 不可改 |
| 前端端口 | 5173 | 不可改 |
| Kimodo 端口 | 8000 | 不可改 |
| 认证头 | `Authorization: Bearer tapnow-dev-key` | 不可改 |
