# READ THIS FIRST — 防失忆协议

> **🩺 FIRST RESPONSE RULE：你的第一条回复必须报告 Harness 健康度。**
> 步骤：读 `.claude/harness/index.md` → 统计 ✅/⚠️/❌ 数量和待验证 manifest → 在回复开头汇报。
> **这条规则优先级最高——无论用户问什么，先汇报再回答。**

> **你现在处于"接棒模式"。上一个你崩溃/结束了，你不知道之前聊了什么。**
> **下面这个流程是唯一的记忆恢复途径。跳过任何一步 → 你会误解人类的需求。**

---

## 第 0 步：确定你的角色（多角色工作模式）

**本项目的 3 个角色文件：**

| 文件 | 角色 | 主管域 |
|------|------|--------|
| `CLAUDE-backend.md` | 🔧 后端工程师 | `server/src/` — API、Agent管道、生图、数据库 |
| `CLAUDE-frontend.md` | 🎨 前端工程师 | `src/` — React 组件、画布、状态管理、UI |
| `CLAUDE-contract.md` | 📞 API 合约 | 前后端共享接口定义 |

**如何启动多角色并行工作：**

```
窗口 1 — 后端                      窗口 2 — 前端
─────────────────                  ─────────────────
"你是 DireX 后端工程师，             "你是 DireX 前端工程师，
 读取 CLAUDE-backend.md"             读取 CLAUDE-frontend.md"

✅ 改 server/src/                  ✅ 改 src/
❌ 禁碰 src/                       ❌ 禁碰 server/src/
```

**⚠️ 开错窗口？** 如果 Claude 读了后端文件但你实际要做前端 → 关掉重来。两个角色文件顶部都有醒目提示。


---

## 强制步骤（每一步都必须执行。跳过任何一步 → 你会误解人类的需求。）

### 第 0.3 步：压缩检测 + 记忆校验

> **长会话被压缩后，关键数据可能从上下文中消失。Memory 文件不受压缩影响——它们是从磁盘加载的。**

**如何判断被压缩了？** 如果上下文以 "This session is being continued from a previous conversation..." 或包含 `<summary>` 标签开头，说明这是压缩后的恢复。

**压缩后必须做的事：**

1. 读 `.claude/compression-log.md` → 看这是第几次压缩
2. 读 `memory/session-handoff.md` → 确认当前任务和进度
3. **比对 memory 文件 vs 压缩摘要**：memory 中的关键事实（精确数字、反面证据、实验参数）在摘要中是否还存在？
4. **如果关键数据丢失** → 先报告用户什么丢了，然后从 memory 文件或代码中重新验证，再继续
5. 在 `.claude/compression-log.md` 追加一条压缩记录：
   - 摘要中保留了哪些关键事实
   - 哪些事实丢失/模糊了
   - 采取了什么恢复措施

**快速比对清单（每次压缩后扫一遍）：**

| 检查项 | 方法 |
|--------|------|
| 当前分支和任务是否匹配 memory/session-handoff.md | `git branch --show-current` |
| 关键实验数字是否还在上下文里 | grep 摘要 vs memory/*.md |
| 禁止事项是否完整 | 检查 CLAUDE.md 底部「核心禁止事项」是否在摘要中 |

### 第 0.5 步：检查 harness 健康度（AHE 可观测性）

> **AHE = Agentic Harness Engineering** — harness 自我进化系统。详见 `.claude/skills/harness-evolve.md`

```
打开 .claude/harness/index.md
```
这个文件告诉你：
- 哪些 harness 组件有 ⚠️ 或 ❌ 标记（已知问题/缺失）
- 最近的 manifest 有没有 `Status: applied` 但尚未 retro 的变更
- 如果有待验证的 manifest → 实际确认效果后填写 Retro 部分

**改任何 harness 文件前**（CLAUDE*.md, memory/*.md, .claude/settings.json, .claude/skills/*.md, .cheat-hooks/*.sh）：
1. 读 `.claude/harness/index.md` — 了解组件依赖关系
2. 创建变更 manifest 到 `.claude/harness/manifests/YYYY-MM-DD-<slug>.md`
3. 使用 `_TEMPLATE.md` 模板 — 必须填写：证据、根因、预测修复、预测回归

**Harness 轨迹日志** 自动写入 `.cheat-hooks/harness-events.jsonl`（append-only, JSONL）。
诊断 harness 问题时，先 grep 这个文件找故障模式。

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
**汇报内容必须包含**：分支、最新提交、当前板块、harness 健康度（`.claude/harness/index.md` 中的 ⚠️/❌ 数量和待验证 manifest）。
**不要跳过汇报直接写代码。**

---

## 当前状态（每次结束时更新这里）

| 项目 | 值 |
|------|-----|
| 最后更新 | 2026-07-25 |
| 分支 | `fix/infinite-canvas-refactor` |
| 最新提交 | `6dc6775` — docs: session-handoff 更新至 2026-07-25 |
| 当前板块 | Harness 健康修复 — CF/DireX 项目分离 |
| 下一个板块 | 前端待办：ShotNode 分镜结果展示 / ImageGenerateNode 分镜元数据 |
| 本次压缩 | 0 次 |

---

## 后端架构更新（2026-07-11 已提交 `2962cb8`，供前端工程师同步）

### 角色提取新流程：两轮对话式 KB 检索

```
Round 1: GPT-5.4 读剧本 + KB_CATALOG(知识库目录) → 返回 5-8 个检索关键词
Agent:  searchFashionKB() 按关键词搜索 40KB 知识库 → 返回精准 2-3KB
Round 2: 检索结果 + NEGATIVE_CLOTHING + 剧本 → 设计角色
```

**核心改变：不再把 40KB 风格库一次性倾倒给 LLM**，而是 LLM 自主决定查什么 → Agent 精准检索 → 结果喂回。

### 角色版式统一（profiles.ts CHARACTER_EXTRACTION）

- 表情集：4→**3种**（平静/喜悦/愤怒）
- 新增：**细节特写2处**（面料材质 + 标志性道具/配饰）
- 统一版式：左侧60%三视图（正/侧/背），右侧40%（上排3表情+下排2细节）
- 禁止非洲人种/黑人角色 + 反廉价服装负面提示词

### 关键组件（pipeline.ts）

| 组件 | 作用 |
|------|------|
| `KB_CATALOG` | 知识库目录（~1.5KB），让LLM知道可检索范围 |
| `searchFashionKB(query)` | 关键词搜索引擎，匹配风格表+设计师+搭配法则 |
| `searchInteriorKB(query)` | 场景空间搜索引擎 |
| `buildStyleCard()` | 紧凑风格卡片（~800B），注入userMessage最前面 |
| `NEGATIVE_CLOTHING` | 服装负面提示词（~1KB），注入userMessage |
| `NEGATIVE_INTERIOR` | 场景负面提示词（~0.5KB），注入userMessage |

### injectFeedback 修复

- **修复**：首次分析不再跳过风格管线（`if (!userFeedback) return systemPrompt;` 已移除）
- 每次调用都执行：extractScriptTriggers → decideStyle → buildStyleCard

### 本次提交文件（13个，+2141/-100行）

pipeline.ts(+620) / profiles.ts(+38) / style-db.ts(+220) / music-planner.ts(新) / q-template-advisor.ts(新) / q-decide.ts(新) / asset-cache.ts(新) / kie-provider.ts(+74) / q-api.ts(+28) / q-chat.ts(+131) / q-cognitive-engine.ts(+63) / q-orchestrate.ts(+37) / index.ts(+124)

---

## 前端架构更新（2026-07-11 已提交 `921d0c5`，供后端工程师同步）

### 多图并行生成 + 扑克牌叠放

```
用户选 ×2/×4 → 前端 Promise.all(N个 generateWithAgent) → 收集所有 assetUrls
→ imageUrls[] 存入 meta → 叠放显示（最多5层可见，右下16px偏移）
→ 点击叠放 → createPortal 网格 overlay → 抽卡(点击选图→reorder数组→主图置顶)
```

### 合约变更（graph.ts ImageGenMeta）

| 字段 | 类型 | 说明 |
|------|------|------|
| `imageUrls` | `string[]` | 多图URL，[0]为主显示图 |
| `imgCount` | `number` | 用户选择的生成张数 (1/2/4) |

**后端需支持**: `generateWithAgent` 接收 `imgCount` 参数，一次返回对应数量的 assetUrls；或前端继续用 Promise.all 并行调用（当前方案）。

### 积分消耗预览（ImageGenerateNode）

- `getImageCost(model, resolution, imgCount)` 函数 — 选择模型/分辨率/张数时实时计算
- 定价: 1K=10, 2K=15, 4K=20 积分（单张基准），Nano Banana ×0.8

### Bug 修复

| 修复 | 文件 | 问题 | 方案 |
|------|------|------|------|
| promptRef 闭包 | ImageGenerateNode | Enter发送时prompt状态未更新，onGenerate读到空值提前return | 加 promptRef，onChange 同步写入，handleGenerate 读 ref |
| hasMulti 条件 | ImageGenerateNode | 后端返回3个变体URL触发了"3张"叠放，用户明明选×1 | hasMulti 增加 `genImgCount > 1` 条件 |
| 积分挤压按钮 | ImageGenerateNode | `{genRunning && -10积分}` 在50px容器内挤变形 | 去掉固定宽度，积分始终显示在按钮左侧 |
| ShotNode 文本溢出 | ShotNode | 长文本撑破textarea | boxSizing+overflowWrap+wordBreak+minWidth:0 |

### 本次提交文件（19个，+1101/-517行）

App.tsx(+405) / ImageGenerateNode.tsx(+189) / ShotNode.tsx(+328) / gateway.ts(+99) / QAssistant.tsx(-300) / LeftToolbar.tsx(+69) / persistence.ts(+16) / graph.ts(+3) / 其他11个

---

## 前端架构更新（2026-07-12 已提交 `102a360`，供后端工程师同步）

### ShotNode 异步轮询重构

**核心问题**: 前端轮询只认 `status: 'done'`，遇到 `lost`/`failed` 继续轮询直到25分钟超时。

**修复**: 三种提交入口统一处理全部终止状态

```
handleScriptAnalysis → POST /api/agent/script/overview → taskId → 轮询(50×30s)
handleSoundComposer → POST /api/agent/script/music → taskId → 轮询(20×15s)
handleRegenerateSection → POST /api/agent/script/regenerate → taskId → 轮询(20×15s)
```

### 状态处理矩阵

| 后端返回 | 前端行为 |
|---------|---------|
| `done`/`completed` + `success:true` | `applySectionResult()` 按 section 选择性 patch |
| `done`/`completed` + `success:false` | 显示错误条幅 + 停止轮询 |
| `lost` | 显示"任务丢失，请重试" + 停止轮询 |
| `failed` | 显示错误信息 + 停止轮询 |
| 超时 (50次/25min 或 20次/5min) | 显示超时错误 + 清 taskId |
| `processing` | 继续轮询 |

### applySectionResult — section 选择性 patch

按 CLAUDE-contract.md 规则，避免覆盖无关数据：

| `section` | 写入字段 | 不碰字段 |
|-----------|---------|---------|
| `overview` | shots, characterProfiles, scenes, sceneArchitecture, sunoPrompts, soundScenes | — |
| `characters` | scriptCharacters | shots, scenes, sunoPrompts |
| `scenes` | scriptScenes, scriptSceneArchitecture | shots, characterProfiles |
| `storyboard` | scriptOverview.shots + characterProfiles (合并现有) | scenes, sunoPrompts |
| `music` | scriptSunoPrompts, scriptSoundScenes | shots, characterProfiles, scenes |

### 同步/异步双兼容

后端 `/api/agent/script/regenerate` 和 `/api/agent/script/music` 当前返回同步格式 `{success, data}`，但合约要求异步 `{taskId}`。前端同时兼容：
- 响应有 `success` 字段 → 同步结果，直接 `applySectionResult`
- 响应有 `taskId` 字段 → 异步任务，走轮询

### 其他修复

- `analysisError` state + 红色错误条幅 UI（可关闭）
- resume useEffect 刷新恢复轮询时设 genRunning 显示 loading
- `regenerateRunning` 加入 loading 指示器
- AudioGenerateNode/VideoGenerateNode Handle 统一实心蓝底 #00CFFF + 白色+号
- `index.css` `::selection` 从白色18%透明 → rgba(0,207,255,0.30) 青色

### 本次提交文件（4个，+222/-94行）

ShotNode.tsx / AudioGenerateNode.tsx / VideoGenerateNode.tsx / index.css

### ⚠️ 后端待办

`/api/agent/script/regenerate` 和 `/api/agent/script/music` 当前实际返回同步格式 `{success, section, ...}`（非 taskId），前端已做双兼容但建议后端重启对齐异步格式。

---

## 后端架构更新（2026-07-11 未提交，供前端工程师同步）

### scriptTasks 持久化（index.ts）

**问题**: ShotNode 提交剧本分析 → 后台异步处理 → 前端轮询结果。但 `scriptTasks` 是内存 Map，服务重启后任务丢失，前端永久卡等待。

**修复**:
- `scriptTasks` 从内存 Map → JSON 文件 (`server/data/script-tasks.json`) 持久化
- 服务启动时从磁盘恢复任务
- 启动前状态为 `processing` 的任务自动标记为 `lost`
- 清理定时器同步写盘

### API 合约变更（⚠️ 前端需同步）

`GET /api/agent/script/result/:taskId` 新增一种响应状态：

```json
// 新增：任务因服务中断而丢失
{ "status": "lost", "error": "Server restarted while task was in progress" }
```

**前端需要处理 `status: 'lost'`**（等同于失败，需重新提交），否则界面会一直转圈等待。

### 音乐 KB 大规模补充（music-kb.ts +893→1046行）

| 新增类别 | 数量 | 内容 |
|---------|------|------|
| Fashion/Runway 流派 | 10 子流派 | Runway Deep House, Runway Techno, Runway Hyperpop, Vogue Ballroom 等 |
| Avant-Garde/Experimental 流派 | 14 子流派 | Noise Music, Drone, Musique Concrète, Power Electronics 等 |
| 电子子流派补充 | 22 | Minimal Techno, Dub Techno, UK Garage, Phonk, Amapiano 等 |
| 流行子流派补充 | 10 | Hyperpop, Bedroom Pop, City Pop, Funk Pop 等 |
| 爵士子流派补充 | 12 | Hard Bop, Nu Jazz, Acid Jazz, Jazz-Hop, Spiritual Jazz 等 |
| 嘻哈子流派补充 | 8 | Grime, Gangsta Rap, Latin Trap, Mumble Rap 等 |
| 摇滚/Metal 补充 | 12 | Thrash Metal, Nu Metal, Shoegaze, Grunge, Math Rock 等 |
| 情绪 (EMOTIONS) | +12 | Glamorous, Confident, Edgy, Sleek, Fierce, Seductive + TVC 情绪 |
| 制作风格 | +7 | Runway Ready, Luxury Minimal, Industrial Catwalk, Commercial Clean 等 |
| 叙事场景 | +18 | TVC(8) + Runway(10) |

### KB_CATALOG + KB_RETRIEVAL_PROMPT_MUSIC 更新（pipeline.ts）

目录和检索引导已同步反映新增的音乐流派/情绪/场景，GPT Round 1 现在能自主检索 TVC/Runway/先锋音乐方向。

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
- **修改 harness 文件前必须写变更 manifest（`.claude/harness/manifests/`）— 证据→根因→预测→验证**

---

## 运行时数据保护（每次操作前检查）

这些文件是**用户数据**，不是源代码。git 操作（checkout/stash/rebase）会覆盖它们：

| 文件 | 说明 |
|------|------|
| `server/server/data/projects/<project-id>/state.json` | 画布节点和边的服务端状态（多项目存储） |
| `server/server/data/projects/<project-id>/backups/` | 自动备份（最近 20 个时间戳快照） |
| `server/data/task-logs.json` | 任务执行历史 |
| `server/data/script-tasks.json` | 异步任务持久化 |

> ⚠️ 画布已从旧路径 `server/data/canvas-state.json` 迁移到多项目存储。
> 检查节点数请用 API 而非直接读文件：
> ```bash
> curl http://localhost:3001/api/canvas/state | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('Nodes:',j.nodes?.length,'Edges:',j.edges?.length)})"
> ```

**规则**：
- 提交前确认节点数没有比上次减少
- 如果减少了 → 检查 `server/server/data/projects/<id>/backups/` 和 `server/data/backups/`
- 不要手动编辑这些文件 — 它们由 `/api/canvas/sync` 自动管理

## 已知 Claude 自己会犯的错误（每会话自查）

1. **跳过汇报直接动手** → 违反第 4 步。每次都该先说「我读到了 X，确认是否正确」
2. **没查运行时数据状态** → 第一时间就该通过 `curl localhost:3001/api/canvas/state` 确认数据是否被 git 覆盖
3. **上下文压缩后重查已知道的信息** → 依赖 session-handoff.md 写清楚，而不是靠记忆
4. **擅自修改未授权的代码** → 用户说「先汇报别改」时必须只读不改
5. **忘记 direx-project 是符号链接** → 它就是 direx-backup，同目录，不需要「同步」

---

## 模型 Provider 稳定性与备选路线调研（2026-07，供后端工程师同步）

> 背景：现走 kie.ai 调用全部生成模型，痛点 = **生成数量/限速太紧**。有资深工程师建议走 AWS Bedrock。以下为核实后的完整评估。

### 现状模型栈（kie-provider.ts）

| 模型 | 类型 | 归属 |
|------|------|------|
| `nano-banana-pro` | 图 | Google |
| `gpt-image-2` | 图 | OpenAI |
| `kling-3.0` | 视频 | 快手可灵 |
| `seedance-2` | 视频 | 字节 |
| Suno | 音乐 | Suno |
| Tripo | 3D | Tripo（已直连 `tripo-provider.ts`） |

### 核心结论

1. 这些模型**全是闭源**，无法自托管 → 只能选"用谁的服务器/池子"。
2. **kie.ai 是小聚合器（二道贩子），共享池 = 限速紧、不可控**，这是痛点根因。
3. 解法优先级：**换更大聚合器（止痛最快）→ 核心模型转第一方（最可控）→ 多 provider 并存 + 失败降级（架构最靠谱）**。
4. ⚠️ **AWS Bedrock 不适用本项目生成栈**：你用的模型一个都不在 Bedrock 目录（Bedrock 只有 Claude / Amazon Nova / Stability / Llama 等）。Bedrock 仅适合把**文本/LLM 推理**迁到 Claude（配额高、可提额）。

### 每个模型的推荐第一方路线

| 模型 | 首选第一方 | 靠谱度 | 备注 |
|------|-----------|--------|------|
| Seedance | **火山方舟**（字节自家） | ★★★★★ | 国产模型、国内可直连，**最该先转** |
| Kling | **可灵开放平台**（快手） | ★★★★★ | 同上，国内官方 |
| Nano Banana | Google **Vertex AI** | ★★★★★ | 需海外主体 + 跨境网络 + 美元结算 |
| GPT-image | **Azure OpenAI** | ★★★★ | 海外 |
| Suno | ❌ 无官方 API | — | 只能代理，见下 |
| Tripo | 官方（已直连） | ✅ | 无需改 |

### 聚合器横评（针对本项目模型栈）

| 平台 | 覆盖 | 稳定性 | 容量 | 国内直连 | 迁移成本 |
|------|------|--------|------|---------|---------|
| kie.ai（现状） | 全 | 中 | **低 ← 痛点** | 尚可 | — |
| **302.ai** | 几乎全 | 中上 | 中上 | ✅ 好 | **极低（≈kie）** |
| **fal.ai** | 图/视频强，**无 Suno** | 高 | 高 | 需海外网络 | 低 |
| PiAPI | Suno/MJ/Kling 代理强 | 中上 | 中上 | 需海外网络 | 低 |
| Replicate | 海量偏开源 | 高 | 高（按秒） | 需海外网络 | 中 |

### Suno 特例（合规提醒）

- Suno 至 2026 **无官方开放 API**，所有路径都是**逆向代理**（灰区）。
- 对要融资的产品：① 选运营久 / 有 SLA 的代理（PiAPI / sunoapi.org）；② 代码里做成可一键切换；③ **不要把 Suno 写进对外宣传的"核心技术"**。

### 落地建议（不用重构）

- `kie-provider.ts` 已是抽象层 → 平行加 `fal-provider` / `volcengine-provider`（火山）/ `kling-provider` / `vertex-provider`。
- 按模型分流 + **失败自动降级到备用家**（任何一家挂了不断服务）——多家并存本身就是最大"靠谱"。
- 建议顺序：① kie → **302.ai** 止痛；② Seedance→火山、Kling→可灵 转第一方；③ Nano Banana 有海外主体后转 Vertex；④ Suno 换更稳代理 + fallback。

**调研来源**：Amazon Bedrock 模型目录 2026(hidekazu-konishi.com) / Best AI inference platforms 2026(dev.to) / Seedance 2 API 服务商对比(blog.laozhang.ai) / Suno API Review 2026(aimlapi.com)

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

# 4. 运行时数据完整性（画布已迁移到多项目存储，通过 API 检查）
curl http://localhost:3001/api/canvas/state | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('Nodes:',j.nodes?.length,'Edges:',j.edges?.length)})"

# 5. 浏览器手动验证（不可自动化）
# - 创建节点 → F5 刷新 → 节点还在，位置不变
# - 拖动画布 → F5 刷新 → 视角不变
# - 生成一张图 → F5 刷新 → 图还在
# - 拖拽节点 → F5 刷新 → 位置不变
# - taskkill 杀进程 → 重启 → 数据完整（测试心跳恢复）
```

---

## 前端待办 — 分镜数据滞留问题（2026-07-13，后端工程师委托）

> ⚠️ **这是从后端工程师交棒给前端工程师的工作。后端已完成，前端需要对接。**

### 发生了什么

用户提交剧本分析 → 后端 GPT-5.4 生成 21 镜完整分镜数据 → **数据已到达，但前端 ShotNode 抓不到结果。**

### 后端已完成的改动（`server/src/index.ts`，已部署运行中）

**`POST /api/agent/script/overview`** 现在接收新字段 `nodeId`：

```json
{ "scriptText": "...", "visualStyle": "...", "nodeId": "node-xxx" }
```

分析完成后，后端**直接写入画布节点的 `meta.gen`**，绕开前端轮询依赖：

```js
// 管道完成后自动执行（index.ts 第 896-915 行）
node.meta.gen.scriptOverview = { shots: [...], characterProfiles: {...}, rawOutput: "...", durationMs: ... };
node.meta.gen.scriptScenes = {...};
node.meta.gen.scriptSceneArchitecture = {...};
node.meta.gen.scriptSunoPrompts = {...};
node.meta.gen.scriptSoundScenes = {...};
node.meta.gen.scriptCharacters = {...};
writeJSON(CANVAS_FILE, canvasState); // 即时落盘
```

**轮询端点仍正常工作** (`GET /api/agent/script/result/:taskId`) — 21 shots + 10 角色全部返回。

### 前端需要改的地方

#### 1. ShotNode.tsx — 传 nodeId（已改 ✅）

```diff
- body:JSON.stringify({scriptText:prompt,visualStyle}),
+ body:JSON.stringify({scriptText:prompt,visualStyle,nodeId:id}),
```

#### 2. ShotNode.tsx — 使用 scriptOverview 数据展示结果（❌ 未做）

**当前**：ShotNode 始终显示"点击按键自动生成节点"提示文字，`phase` state 设了但从未用于条件渲染。

**需要**：当 `getOverview()?.shots?.length > 0` 时，展示分析结果摘要：
- X 镜分镜（`ECU#1 WS#2 CU#3 ...`）
- X 名角色
- X 个场景
- 点"分镜"按钮 → 创建 21 个 ImageGenerateNode

`createShotNodes()` 当前已能从 `getOverview()?.shots` 读取并创建节点，问题是用户看不到数据已到达——需要视觉反馈。

#### 3. ImageGenerateNode.tsx — 分镜节点初始提示词（❌ 未做）

**当前**：`createShotNodes()` 创建 ImageGenerateNode 时设置 `meta.gen.prompt` = `s.genPrompt || s.visualPrompt || s.contentCN`。

**问题**：21 个 `meta.shot` 字段（shotFunction/shotType/lens/angle/composition/depthLayers/lighting/color/atmosphere）存储在节点上但**从未在前端 UI 展示**。

**需要**：把 `meta.shot` 的分镜元数据格式化为可读文本，默认填入 ImageGenerateNode 的 textarea（`meta.gen.prompt`）作为初始内容。用户打开节点底部面板就能看到完整的镜头参数 + 画面描述。

**示例格式**（21 个节点的 `canvas-state.json` 已预填此格式，但 IndexedDB 旧数据会覆盖）：
```
【钩子】
景别：ECU | 焦段：85mm | 机位：高角度俯拍 | 拍摄面：局部特写
构图：对角线
深度：前景虚化的键盘边缘→...
主光：显示器柔光，6500K...
色彩：炭黑与冰灰为主...
氛围：被工具拖住的静止感...
────────────────────────────
凌晨的近未来创作工作室，画面紧贴一只骨节清晰的亚洲男性右手...
```

**实现**：在 `createShotNodes()` 里组装这个格式，写入 `meta.gen.prompt`。

#### 4. ImageGenerateNode.tsx — 显示分镜元数据（❌ 未做）

**当前**：ImageGenerateNode 有 `data.shot`（来自 `n.meta.shot`）但 TypeScript 接口没声明它，也没渲染它。

**需要**：在 ImageGenerateNode 的标题栏或节点 body 顶部，显示 `shot.shotType`（如 "ECU"）+ `shot.shotFunction`（如 "钩子"）。小字、不占地方，但用户扫一眼就知道每个节点对应哪个镜头。

**改动点**：
1. `ImageGenNodeData` 接口加 `shot?: Record<string, any>`
2. 节点顶部（标题行）在 `data.shot` 存在时渲染镜头标识

### 验证步骤

1. 清 IndexedDB：`F12 → Application → IndexedDB → direx-canvas → Delete database`
2. 刷新页面
3. 选中任意 ShotNode → 应看到分镜/角色/场景数量
4. 点"分镜"按钮 → 21 个 ImageGenerateNode 出现在画布上
5. 选中任意分镜节点 → 底部 textarea 显示结构化镜头参数 + 画面描述

### 当前数据状态

- `canvas-state.json` 中 4 个 ShotNode 已有 `meta.gen.scriptOverview`（21/26/34/27 shots）
- 21 个 ImageGenerateNode（ECU #1 到 WS #21）已有 `meta.shot` 分镜元数据
- 后端运行中 (`localhost:3001`)，API 正常

### 改动范围

| 文件 | 改动 |
|------|------|
| `src/components/nodes/ShotNode.tsx` | phase 条件渲染 + 结果摘要 UI |
| `src/components/nodes/ImageGenerateNode.tsx` | 接口加 `shot` 字段 + 标题栏镜头标识 + `createShotNodes` 内 prompt 格式组装 |

**不改的文件**：`server/src/` — 后端已完成；

---

## 记忆文件位置
- `memory/session-handoff.md` — 断点（第一个读）
- `memory/module-map.md` — 模块依赖关系（改代码前读）
- `MEMORY.md` — 记忆索引（系统自动加载）
