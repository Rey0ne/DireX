---
name: harness-evolve
description: Propose, validate, and retrospect harness changes using AHE (Agentic Harness Engineering) methodology. Evidence-backed change manifests with blind prediction and retro validation.
---

# Harness Evolve — AHE Self-Evolution for DireX

> **移植自**: `cheat-predict` + `cheat-retro` + `cheat-bump` (内容创作领域 → 编码 harness 领域)
> **核心循环**: 轨迹日志 → 故障检测 → 变更 manifest → 应用修复 → 回溯验证

---

## 触发条件

以下任一情况触发本 skill：
- 用户说 "evolve harness" / "检查 harness" / "改 CLAUDE.md"
- 用户要求修改 harness 文件（CLAUDE*.md, memory/*.md, .claude/settings.json, .claude/skills/*.md）
- Claude 自主检测到 harness 问题并想修复

---

## 强制工作流

### Phase 1: 诊断 (Diagnose)

1. **读 harness 全景图**
   - 打开 `.claude/harness/index.md` — 了解所有组件及其依赖关系
   - 确认目标文件在索引中的位置和"被依赖"列表

2. **查轨迹数据**
   - 读 `.cheat-hooks/harness-events.jsonl` — 最近的 session 日志
   - 找 edit 频率异常、session 失败模式、重复出现的错误

3. **定范围**
   - 这个改动影响哪些文件？（查 index.md 的依赖图）
   - 哪些角色文件会受影响？
   - 有没有已有的 manifest 提到这个问题？

### Phase 2: 预言 (Predict)

4. **写变更 manifest**
   - 使用 `.claude/harness/manifests/_TEMPLATE.md` 模板
   - 保存为 `.claude/harness/manifests/YYYY-MM-DD-<slug>.md`
   - 必须填写：Failure Evidence, Root Cause, Predicted Fix, Predicted Regressions
   - 证据必须具体 — 引用轨迹时间戳，不要模糊印象

5. **盲预测规则**（继承自 cheat-predict）
   - 预测必须在应用修改**之前**写定
   - 预测一旦写定，应用后不可修改（由 `prediction-immutability.sh` 强制执行）
   - 预测必须可证伪 — "这个修复会减少 X 类错误" 比 "这个修复会改善系统" 更好

### Phase 3: 应用 (Apply)

6. **执行修改**
   - `prediction-immutability.sh` hook 会验证 manifest 存在
   - 修改只限于 Predicted Fix 中列出的文件
   - 改完后更新 manifest 的 `## Files Modified` 部分

7. **更新 status**
   - 修改完成后，将 manifest `Status` 从 `proposed` 改为 `applied`
   - 更新 `.claude/harness/index.md` 中受影响组件的 "Last Modified" 信息

### Phase 4: 回溯 (Retro)

8. **等待验证期**
   - 至少 2 个会话后再做 retro
   - 或者在用户明确要求时做 retro

9. **执行回溯**
   - 读 manifest 的预测
   - 读 `.cheat-hooks/harness-events.jsonl` 中验证期内的轨迹
   - 确认/证伪每个预测

10. **填写 Retro**
    - 在 manifest 的 `## Retro` 部分**追加**新行（不修改已有行）
    - Verdict: `confirmed` | `refuted` | `inconclusive`
    - 每个 verdict 必须有证据支撑

### Phase 5: 进化 (Evolve)

11. **检测系统模式**
    - 如果一个类型的 manifest 出现了 3+ 次
    - → 考虑升级 harness 规则本身（例如更新 CLAUDE.md 的禁止事项）
    - 升级本身也需要一个 manifest

---

## Manifest 格式要求

每个 manifest 必须包含以下六个部分：

```markdown
# Change Manifest: <一句话描述>

| Field | Value |
|-------|-------|
| Status | proposed → applied → verified / refuted |

## Failure Evidence    ← 具体症状、证据、影响
## Root Cause          ← 直接原因 + 深层原因 + 涉及文件
## Predicted Fix       ← 具体改动 + 预期效果（应用后不可修改！）
## Predicted Regressions ← 可能崩什么 + 可能性 + 缓解措施（应用后不可修改！）
## Files Modified      ← 实际改了什么
## Retro               ← 验证结果（只追加，不修改！）
```

---

## 与现有协议的整合

### 与 session-handoff.md 的关系

会话交接时，检查是否有 `Status: applied` 但尚未 retro 的 manifest:
```bash
grep -r "Status.*applied" .claude/harness/manifests/*.md
```
在 handoff 中注明待验证的 manifest 数量。

### 与 CLAUDE-contract.md 的关系

如果 harness 变更影响前后端合约（例如改了 API 状态），在合约的 Active Work Board 中登记。

### 与 direx-dev-rules.md 的关系

本条规则应加入 direx-dev-rules:
> **修改 harness 文件前必须写 manifest** — 使用 harness-evolve skill

---

## 当前限制（MVP）

1. **Advisory 模式**: `prediction-immutability.sh` 当前对无 manifest 的 harness 编辑只警告不阻止（Phase 2 将变为强制）
2. **手动 retro**: 回溯验证需要 Claude 或用户主动执行，不自动触发
3. **无自动进化**: 系统模式检测和 harness 规则自动升级是 Phase 3+ 的内容
4. **单项目范围**: 仅限 DireX 项目 — 跨项目 harness 迁移是 Phase 5

---

## 示例：完整的变更周期

```
Session N:
  1. 用户报告: "每次新会话 Claude 都说 MEMORY.md 不存在"
  2. → 打开 harness/index.md → 确认 MEMORY.md 在系统级路径存在但 CLAUDE.md 引用错误
  3. → 写 manifest: 2026-07-24-fix-memory-reference.md
     - Evidence: 3 sessions 中观察到 "MEMORY.md not found" 警告
     - Root Cause: CLAUDE.md 引用项目级 MEMORY.md，实际在系统 memory/ 中
     - Predicted Fix: 修正 CLAUDE.md 中的路径引用
     - Predicted Regressions: 低风险，路径修改不影响功能
  4. → 执行修改 → 更新 manifest Status=applied
  5. → 更新 harness/index.md 中 CLAUDE.md 的修改历史

Session N+2:
  6. → 回溯检查: 最近 2 个 session 没有 "MEMORY.md not found" 警告
  7. → 填写 Retro: Verdict=confirmed, Evidence=2 sessions clean
  8. → 更新 manifest Status=verified
```

---

## 相关文件

| 文件 | 用途 |
|------|------|
| `.claude/harness/index.md` | Harness 组件全景图 — 先读这个 |
| `.claude/harness/manifests/_TEMPLATE.md` | Manifest 模板 — 复制后填写 |
| `.claude/harness/manifests/*.md` | 所有变更 manifest |
| `.cheat-hooks/harness-events.jsonl` | 轨迹日志 — 证据来源 |
| `.cheat-hooks/prediction-immutability.sh` | Hook — 强制 manifest 纪律 |
| `cheat-predict` / `cheat-retro` / `cheat-bump` | 本 skill 的蓝图（只读参考） |
