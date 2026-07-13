# Session Handoff — 2026-07-13 (后端: GPT-5.6 直接看图反推提示词)

## 上次会话
- **分支**: `fix/infinite-canvas-refactor`
- **板块**: 后端 — GPT-5.6 直接看图反推提示词

## 当前状态
- **编译**: `npx tsc --noEmit` — 零错误 ✅
- **后端**: `http://localhost:3001/api/health` — ok ✅
- **最新提交**: `3696676` — GPT-5.6 直接看图反推提示词 + 多项后端修复

## 本次提交内容 (`3696676`)

### 核心：GPT-5.6 直接看图反推提示词
- `pipeline.ts`: 新增 `reversePromptFromImages()` — GPT-5.6 直接看图→提示词，一步到位
- `pipeline.ts`: `runTextPipeline` 优先走直接反推，失败回退旧两步流水线

### 后端修复
- `kie-provider.ts`: 修复 `data.code` 错误检查（kie.ai 永远 HTTP 200），Seedance-2 参数对齐官方 spec
- `index.ts`: `proxyAsset` 改为流式传输，修复下载速度慢
- `gemini.ts`: GPT_MODEL PRIMARY 升级为 `gpt-5-6-sol`

### 数据库/管道增强
- `profiles.ts`: CHARACTER_EXTRACTION 人种默认多样化
- `music-kb.ts`: 音乐知识库大规模补充（+153行）
- `q-chat.ts`/`q-memory.ts`/`q-api.ts`: Q记忆系统增强
- `deepseek.ts`: 改进

### 前端（同一提交，由后端托管）
- `ShotNode.tsx`: `handleGenerate` 互斥分流 — 有参考图→反推，无图→剧本分析
- `ShotNode.tsx`: 反推结果直接写 textarea，零按钮
- `App.tsx`/`persistence.ts`: 轮询超时服务端回退 + 启动数据合并

### 已删除
- `server/src/routes/blender.ts` — 废弃路由

## 数据状况
- `canvas-state.json`: 提交时18节点/13边（可能非完整项目）
- `canvas-state-queen-surli.json`: 63节点项目备份（未跟踪）

## 核心禁止事项（跨会话不变）
- 不改端口号（3001/5173/8888）
- 不改认证密钥
- D盘只做备份同步
- 改代码前查坏耦合
- 不跳过汇报直接写代码
- 不混做两个独立板块
