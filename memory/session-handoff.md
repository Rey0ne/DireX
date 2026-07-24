# Session Handoff — 2026-07-25 (空转实验完成)

## 当前项目

**⚠️ 工作焦点: Cognition-Field (`D:\cognition-field`)。** DireX 休眠中。

DireX 状态：
- 分支: `fix/infinite-canvas-refactor`
- 最新提交: `e63b626` — FIRST RESPONSE RULE
- 编译零错误，后端正常

---

## Cognition-Field 当前状态（2026-07-25）

### 空转实验 — 完成

**脚本**: `verify_empty_run.py` (373行, 3 variants × 3 durations × 3 seeds)
**结果文件**: `results_empty_run_full.json`
**耗时**: 31.8分钟

**3 个变体**:
- **Variant A** (纯空转): 无预热, 空转 N ticks → 注入任务 — field 完全惰性, 0自发节点
- **Variant B** (任务迁移): Task A 预热 → 空转 → Task B — 4x加速, 但纯度降
- **Variant C** (自我维持): Task A 预热 → 空转 → 同一 Task A — 4x加速, 但纯度仍降

**核心发现** (详见 `memory/cognition-field-empty-run-results.md`):
1. 纯空转 = 完全惰性 — 无 agent 写入时无自发结构
2. CrystalNode 极度持久 — 16→15 nodes/1h (94% 存活率)
3. 已有节点 = 瞬时脚手架 — t1=0 vs t1=4 (冷启动)
4. **化石效应** — 同一任务重注入纯度从 0.373→0.271

**理论定性**: 持久吸引子介质 + 化石效应 (Persistent Attractor Medium with Fossilization)
- 不是简单"共享内存" — 有瞬时脚手架能力
- 但缺少**节点自适应/更新机制** — 节点是固定记忆印记

### 四层验证 — 全部完成

| 层 | 脚本 | 结果 |
|----|------|------|
| L1 实现验证 | `verify_occupancy.py` | 5/5 PASS |
| L2 消融实验 | `verify_ablation.py` | Occupancy+Crystal=VALUABLE, Inhibition/Cross-Boost=HARMFUL |
| L3 竞争理论 | `verify_l3_alt_hypothesis.py` | Field 赢 11/18 (61%) vs Central Queue |
| L4 不可能实验 | `verify_l4_impossible.py` | 重叠率 5-14× 降低, 4 seeds 一致 |
| **L5 空转实验** | `verify_empty_run.py` | **节点94%持久 + 4x脚手架 + 化石效应** |

### 下一步方向
- [ ] 实现节点自适应/更新机制 — 让已有吸引子能根据新写入调整 pattern
- [ ] 移除 Inhibition + Cross-Boost（L2 证明是反模式）
- [ ] Phase 1: V 通道精度加权（让 Predictor 参与 drive）
- [ ] 最小状态单元实验 — 设计可证伪的子问题

### 待推送
- [ ] Cognition-Field: 空转实验脚本 + README 更新 → push to GitHub
- [ ] README 已更新出租车队 + 空转实验结果

### 关键文件（cognition-field）
- `verify_empty_run.py` — 空转实验脚本（3 变体, CLI: --quick/--full）
- `results_empty_run_full.json` — 完整实验结果
- `README.md` — 已更新出租车队 + 空转实验结果
- `taxi_fleet/` — 出租车队仿真（LightweightField, 4 方法对比）

---

## 核心禁止事项（跨会话不变）
- 不改 DireX 端口号（3001/5173/8888）
- 不改 DireX 认证密钥
- 不在 direx-backup 目录操作 cognition-field
- 不跳过汇报直接写代码
