# Session Handoff — 2026-07-11 (Backend: KB Retrieval Architecture)

## 上次会话
- **分支**: `fix/infinite-canvas-refactor`
- **板块**: 后端风格系统架构升级 — 两轮对话式KB检索 + 角色版式统一 + 负面提示词注入

## 当前状态
- **编译**: `npx tsc --noEmit` — 零错误 ✅
- **服务**: `http://localhost:3001/api/health` — ok ✅
- **最新提交**: `2962cb8` — 两轮对话式KB检索 + 统一角色版式 + 负面提示词注入
- **未提交**: 前端文件(17个) + 运行时数据(canvas-state.json / task-logs.json)
- **D盘备份**: `D:/direx-backup-20260711-1328` (2.7M)

## 已完成的架构改动

### 1. 两轮对话式 KB 检索（pipeline.ts 核心重构）

**改动前**: 40KB 风格知识库作为系统提示词倾倒给 GPT-5.4 → LLM 被噪音淹没，无法有效利用

**改动后**: Agent 自主检索模式
```
Round 1: GPT-5.4 读剧本 + KB_CATALOG → 返回 5-8 个检索关键词
Agent:   searchFashionKB() 按关键词搜 KB → 精准 2-3KB
Round 2: 检索结果 + NEGATIVE_CLOTHING + 剧本 → 设计角色
```

**新增函数**:
- `searchFashionKB(query)` — 关键词匹配搜索引擎（风格表+设计师+搭配法则）
- `searchInteriorKB(query)` — 场景空间搜索引擎
- `buildStyleCard()` — 紧凑风格卡片（~800B），注入 userMessage 最前面
- `KB_CATALOG` — 知识库目录（~1.5KB），让 LLM 知道可检索范围
- `KB_RETRIEVAL_PROMPT` — 引导 LLM 输出检索关键词
- `parseCharacterBlocks()` — 提取的纯函数，首轮/重新生成共用

### 2. injectFeedback 修复（关键 bug）

**bug**: `if (!userFeedback) return systemPrompt;` 导致首次分析完全跳过风格管线
**修复**: 移除短路线，每次调用都执行 `extractScriptTriggers → decideStyle → buildStyleCard`

### 3. 负面提示词硬注入

**NEGATIVE_CLOTHING** (~1KB): 禁止廉价面料/工装/T恤牛仔裤/运动服/邋遢松垮/暴发户堆砌/过时老气 + 替换原则
**NEGATIVE_INTERIOR** (~0.5KB): 禁止裸露混凝土/廉价瓷砖/荧光灯直射/空旷白墙/宜家质感

注入位置: `userMessage`（和剧本同层），非系统提示词 — 确保 LLM 不会漏掉

### 4. 角色版式统一（profiles.ts CHARACTER_EXTRACTION）

- 表情集 4→**3种**（平静/喜悦/愤怒）
- 新增 **细节特写2处**（面料材质 + 标志性道具/配饰）
- 统一版式: 左侧60%三视图（正/侧/背），右侧40%（上排3表情+下排2细节）
- 禁止非洲人种/黑人角色（生图模型拒绝率极高）
- 反廉价服装负面提示词段（末尾，recency effect）

### 5. 提交文件清单（13个后端文件，+2141/-100行）

| 文件 | 改动 |
|------|------|
| `server/src/systems/agent/pipeline.ts` | +620行：两轮检索、搜索引擎、buildStyleCard、负面提示词、injectFeedback修复 |
| `server/src/systems/agent/profiles.ts` | +38行：3+2格式、反廉价/反黑种人规则、版式指令 |
| `server/src/systems/agent/style-db.ts` | +220行：风格知识库扩充 |
| `server/src/systems/agent/music-planner.ts` | 新增：音乐规划器 |
| `server/src/systems/q/q-template-advisor.ts` | 新增：剧本体裁检测 |
| `server/src/systems/q/q-decide.ts` | 新增：Q大脑决策引擎 |
| `server/src/systems/file/asset-cache.ts` | 新增：断网本地资产缓存 |
| `server/src/index.ts` | +124行：选择性重新生成端点、资产缓存路由 |

## 下一步

- [ ] **前端同步**: 前端工程师读取 CLAUDE.md 后端架构更新部分
- [ ] **端到端测试**: 粘贴都市剧剧本 → 观察 Round 1 检索关键词 → Round 2 角色输出 → 检查是否还有工装/廉价感
- [ ] **板块4启动**: T2I分镜模板统一（4a 后端模板对齐 + 4b/4c 前端 ShotNode 改造）

## 禁止做的

- ❌ 不要恢复 `if (!userFeedback) return systemPrompt;` 短路线
- ❌ 不要把 40KB KB 直接倒进 userMessage — 用 searchFashionKB 精准检索
- ❌ 不要把负面提示词移回系统提示词 — 保留在 userMessage 硬注入
- ❌ 不要改端口号(3001/5173/8888)
- ❌ 不要在 direx-backup 目录操作 — 只通过 direx-project 工作
