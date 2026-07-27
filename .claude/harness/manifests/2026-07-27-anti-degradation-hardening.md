# Change Manifest: CLAUDE.md 防退化加固 — 4 项修复

| Field | Value |
|-------|-------|
| Manifest ID | 2026-07-27-anti-degradation-hardening |
| Created | 2026-07-27T17:30:00+08:00 |
| Session | fix/infinite-canvas-refactor |
| Author | claude |
| Status | applied |

---

## Failure Evidence

- **Symptom 1**: CLAUDE.md 状态表写 `6dc6775`，实际 `git log` 显示 `89eb0ef`——接棒时读到过期提交哈希，可能 checkout 错误版本
- **Symptom 2**: 灰度测试命令写在文档里但无强制要求，长会话后 Claude 不主动执行
- **Symptom 3**: 禁止事项 10 条平铺，Claude 记忆衰减后可能只记得前两条忘了后两条
- **Symptom 4**: CLAUDE.md 超 500 行，上下文压缩后摘要可能丢失强制步骤

## Root Cause

- **Primary cause**: 手动维护的元数据（提交哈希）与 git reality 不同步；文档设计未考虑压缩场景的信息丢失
- **Contributing factors**: 缺少自动校验机制；禁止事项无优先级排序
- **File(s) implicated**: `CLAUDE.md`

## Predicted Fix

- **Change 1**: 状态表加 `> 以 git log 为准` 免责声明 + 更新提交哈希为 `89eb0ef`
- **Change 2**: 灰度测试标题加"强制执行"+ 顶部加 🚨 警告："不可跳过，输出贴回复"
- **Change 3**: 禁止事项按 🔴致命/🟠重要/🟡提醒 三级分组
- **Change 4**: 文件顶部插 HTML 注释包裹的 TL;DR 应急卡片（8 行），确保压缩后关键步骤存活
- **Expected outcome**: 接棒时以动态命令为准，禁止事项按严重程度记忆，压缩后核心步骤不丢失
- **Files to modify**: `CLAUDE.md`

## Predicted Regressions

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| TL;DR 卡片与详细步骤描述不一致（未来某次改详细步骤忘了改卡片） | low | 卡片引用步骤编号，不为细节负责—只说"读 X 文件"不说文件内容 |
| 禁止事项分组后 Claude 认为 🟡 类不重要可以忽略 | low | 分组标签用颜色而非"轻微/一般"等可误解词 |

## Files Modified

- `CLAUDE.md`: 4 处编辑 — 状态表更新、灰度测试强制规则、禁止事项分级、TL;DR 应急卡片

---

## Retro

| Date | Session | Verdict | Evidence | Notes |
|------|---------|---------|----------|-------|
| — | — | — | — | pending validation |
