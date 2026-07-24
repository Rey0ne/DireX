# DireX Harness Component Index

> **Auto-generated**: 2026-07-24 | **Branch**: `fix/infinite-canvas-refactor` | **Commit**: `b6ff498`
> **Purpose**: Single source of truth for all harness components — their roles, dependencies, and modification history.
> **Regenerate**: `git log --oneline -- <path>` for any component's history.

---

## Health Summary

| Status | Count |
|--------|-------|
| ✅ Healthy | 25 |
| ⚠️ Stale/Partial | 3 |
| ❌ Missing (referenced but absent) | 0 |
| 🆕 New (this session) | 6 |

---

## 1. System Prompts (CLAUDE role files)

These are the primary harness files — read by Claude at session start to determine behavior.

| File | Role | Last Modified | Last Commit | Health |
|------|------|--------------|-------------|--------|
| [CLAUDE.md](../CLAUDE.md) | Main session protocol, anti-amnesia, architecture docs, forbidden actions | 2026-07-23 | `b6ff498` | ✅ |
| [CLAUDE-backend.md](../CLAUDE-backend.md) | Backend engineer role — `server/src/` domain | 2026-07-11 | `2962cb8` | ✅ |
| [CLAUDE-frontend.md](../CLAUDE-frontend.md) | Frontend engineer role — `src/` domain | 2026-07-13 | `921d0c5` | ✅ |
| [CLAUDE-contract.md](../CLAUDE-contract.md) | API contract + active work board — shared truth between roles | 2026-07-14 | multiple | ✅ |

### Dependency Graph (System Prompts)

```
CLAUDE.md (root)
├── reads: CLAUDE-backend.md (for role selection)
├── reads: CLAUDE-frontend.md (for role selection)
├── reads: memory/session-handoff.md (Step 1)
├── reads: memory/module-map.md (Step 3 — system memory)
├── reads: MEMORY.md (claimed "auto-loaded" — at system memory path)
└── referenced by: all sessions

CLAUDE-backend.md
├── reads: CLAUDE-contract.md
├── reads: memory/direx-critical-paths.md
└── referenced by: backend Claude windows

CLAUDE-frontend.md
├── reads: CLAUDE-contract.md
├── reads: memory/direx-critical-paths.md
└── referenced by: frontend Claude windows

CLAUDE-contract.md
├── written by: both roles (via Read/Write to disk)
├── contains: API status table, handoff signals, change log, data rules
└── referenced by: CLAUDE-backend.md, CLAUDE-frontend.md
```

---

## 2. Skills (`.claude/skills/`)

Custom Claude Code skills — invoked by name or automatically matched.

| File | Description | Triggers | Health |
|------|-------------|----------|--------|
| [direx-dev-rules.md](../.claude/skills/direx-dev-rules.md) | Project dev rules: safety, UI specs, camera kit KB | Manual invocation | ⚠️ State references `direx-isolated` workspace (stale) |
| [us-micro-drama-export.md](../.claude/skills/us-micro-drama-export.md) | US short drama export acquisition — 100pt scoring system | Manual invocation | ✅ |
| [career-wingman/SKILL.md](../.claude/skills/career-wingman/SKILL.md) | AI career assistant — resume, job search, negotiation | Manual invocation | ⚠️ Not git-tracked (`??`) |

---

## 3. Configuration

| File | Role | Health |
|------|------|--------|
| [.claude/settings.json](../.claude/settings.json) | Hooks, permissions (181 allow rules), auto-compact window | ✅ |
| [.claude/settings.local.json](../.claude/settings.local.json) | Local overrides (50 additional permissions) | ✅ |
| [.claude/scheduled_tasks.json](../.claude/scheduled_tasks.json) | Cron: Cognition-Field learner every 30 min | ✅ |

---

## 4. Hooks (`.cheat-hooks/`)

Referenced by `.claude/settings.json`. Scripts execute on lifecycle events.

| Script | Event | Sync/Async | Purpose | Health |
|--------|-------|------------|---------|--------|
| [session-start.sh](../.cheat-hooks/session-start.sh) | SessionStart | Sync, 5s | Record session metadata → `harness-events.jsonl` | 🆕 |
| [log-event.sh](../.cheat-hooks/log-event.sh) | PostToolUse, UserPromptSubmit, SessionEnd | Async, 5s | Log Edit/Write tool use and prompts → `harness-events.jsonl` | 🆕 |
| [prediction-immutability.sh](../.cheat-hooks/prediction-immutability.sh) | PreToolUse (Edit\|Write) | Sync, 3s | Enforce manifest before harness edits; protect applied predictions | 🆕 |

### Hook Event Flow

```
SessionStart → session-start.sh → creates harness-events.jsonl entry + .current-session pointer
PostToolUse  → log-event.sh tool_use → appends Edit/Write event (file + tool name)
UserPromptSubmit → log-event.sh user_prompt → appends prompt length (never content)
PreToolUse (Edit|Write) → prediction-immutability.sh → check manifest / enforce immutability
SessionEnd → log-event.sh session_end → appends session end + cleans .current-session
```

---

## 5. Memory — Project-level (`memory/`)

| File | Purpose | Health |
|------|---------|--------|
| [session-handoff.md](../memory/session-handoff.md) | Cross-session breakpoint recovery — read first (CLAUDE.md Step 1) | ⚠️ Content is about Cognition-Field, not DireX |
| [canvas-nodes-invisible-debug.md](../memory/canvas-nodes-invisible-debug.md) | Debug diagnosis: nodes invisible but minimap shows 109 nodes | ✅ |

---

## 6. Memory — System-level (`C:\Users\ROG\.claude\projects\...\memory\`)

Auto-loaded by Claude Code as persistent memory. 24 files total.

### Critical Paths & Architecture

| File | Purpose | Health |
|------|---------|--------|
| [MEMORY.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/MEMORY.md) | Memory index (auto-loaded, referenced by CLAUDE.md) | ✅ |
| [module-map.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/module-map.md) | Code module dependency map + bad coupling checklist | ✅ |
| [session-handoff.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/session-handoff.md) | Detailed session state (system-level) | ✅ |
| [direx-critical-paths.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/direx-critical-paths.md) | Ports, directories, auth keys — never modify | ✅ |
| [direx-session-checklist.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/direx-session-checklist.md) | Session start/shutdown checklist | ✅ |
| [direx-tunnel-setup.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/direx-tunnel-setup.md) | Cloudflare Tunnel config | ✅ |
| [direx-module-boundaries.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/direx-module-boundaries.md) | Module boundaries documentation | ✅ |
| [direx-full-verification-20260629.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/direx-full-verification-20260629.md) | Full verification report (2026-06-29) | ✅ |

### Work-in-Progress

| File | Purpose | Health |
|------|---------|--------|
| [wip-20260629.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/wip-20260629.md) | Uncommitted work: Tripo3D + Frontend UX + Persistence | ✅ |
| [tomorrow-adjustments.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/tomorrow-adjustments.md) | Character prompt/ShotNode separation, lens focal length fix | ✅ |
| [tripo3d-tomorrow-features.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/tripo3d-tomorrow-features.md) | ✅ Completed: format select + rigging + animation + post-process | ✅ |
| [node-registration-template.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/node-registration-template.md) | Node registration template | ✅ |
| [infinite-canvas-plan.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/infinite-canvas-plan.md) | Infinite canvas implementation plan | ✅ |

### Pipelines

| File | Purpose | Health |
|------|---------|--------|
| [video-pipeline-state.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/video-pipeline-state.md) | V2V+I2V async polling + Prompt Compiler architecture | ✅ |
| [script-analysis-pipeline.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/script-analysis-pipeline.md) | Script analysis pipeline documentation | ✅ |

### Cognition-Field (separate project, tracked here)

| File | Purpose | Health |
|------|---------|--------|
| [cognition-field-theory-20260722.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/cognition-field-theory-20260722.md) | Prompt relocation, 理+解, Field/Working Cell separation | ✅ |
| [cognition-field-knowledge-assets.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/cognition-field-knowledge-assets.md) | 6 principles + 3 emergences + 6 components | ✅ |
| [cognition-field-viz-port.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/cognition-field-viz-port.md) | Fixed visualization port: localhost:5174 | ✅ |
| [cognition-field-roadmap.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/cognition-field-roadmap.md) | Development roadmap | ✅ |
| [cognition-field-naming.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/cognition-field-naming.md) | Naming conventions | ✅ |
| [field-is-self-cells-are-appendages.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/field-is-self-cells-are-appendages.md) | Theory: Field = self, cells = appendages | ✅ |
| [agent-memory-balance-interval.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/agent-memory-balance-interval.md) | R=0.20/P=0.08/radius=3.0 break-even calibration | ✅ |

### Content

| File | Purpose | Health |
|------|---------|--------|
| [tapnow-content-strategy.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/tapnow-content-strategy.md) | Content strategy for TapNow | ✅ |
| [handoff-protocol.md](file://C:/Users/ROG/.claude/projects/c--Users-ROG-direx-backup-20260613-0205/memory/handoff-protocol.md) | Handoff protocol between sessions | ✅ |

---

## 7. Audit & Health Reports

| File | Purpose | Health |
|------|---------|--------|
| [CODEX_AUDIT.md](../CODEX_AUDIT.md) | Full technical audit for Codex — module inventory, risk ratings, tech debt | ✅ |
| [3D-World-BUG-Audit.md](../3D-World-BUG-Audit.md) | 3D rendering bug audit — 22 bugs (P0=3, P1=5, P2=8, P3=6) | ✅ |
| [HEALTH_REPORT.md](../HEALTH_REPORT.md) | Static health snapshot (2026-06-29) | ⚠️ Outdated |

---

## 8. New AHE Infrastructure (this session)

| File | Purpose | Health |
|------|---------|--------|
| [.cheat-hooks/session-start.sh](../.cheat-hooks/session-start.sh) | Session metadata logging → JSONL | 🆕 |
| [.cheat-hooks/log-event.sh](../.cheat-hooks/log-event.sh) | Tool use / prompt / session-end event logging | 🆕 |
| [.cheat-hooks/prediction-immutability.sh](../.cheat-hooks/prediction-immutability.sh) | Manifest enforcement + prediction immutability | 🆕 |
| [.cheat-hooks/harness-events.jsonl](../.cheat-hooks/harness-events.jsonl) | Structured trajectory log (auto-created, append-only) | 🆕 |
| [.claude/harness/index.md](index.md) | This file — harness component catalog | 🆕 |
| [.claude/harness/manifests/](manifests/) | Change manifest directory (see `_TEMPLATE.md`) | 🆕 |

---

## 9. External Harness Dependencies (not in this repo)

### cheat-* Global Skills (`C:\Users\ROG\.claude\skills\`)

AHE-style harness evolution system for **content creation** (not coding). Read-only reference for AHE patterns.

| Skill | Pattern | Relevance to AHE-for-DireX |
|-------|---------|---------------------------|
| `cheat-predict` | Blind prediction → probability distribution → counterfactuals | Manifest "Predicted Fix" section |
| `cheat-retro` | T+N validation → compare actual vs predicted → verify/falsify | Manifest "Retro" section |
| `cheat-bump` | Systematic bias detection → rubric/scoring upgrade | Future: automatic harness rule evolution |
| `cheat-learn-from` | Competitor analysis → pattern extraction → rubric signals | Future: learn from failed sessions |
| `cheat-score` | Lightweight single-draft scoring | Not applicable to coding harness |
| `cheat-seed` | Brainstorm using learned patterns | Not applicable to coding harness |

---

## Modification Rules

1. **Before editing any file in this index**: create a change manifest in [manifests/](manifests/)
2. **After a harness change settles** (2+ sessions): run retro — validate predictions, fill manifest Retro section
3. **When adding a new harness file**: add it to this index
4. **When deleting a harness file**: mark it `❌ Removed` in this index (never delete the row — preserve history)
5. **Regenerate capability**: every field in this index can be reconstructed from `git log` and file enumeration

---

## Related Documents

- [AHE Bootstrap Manifest](manifests/2026-07-24-ahe-bootstrap.md) — creation of this AHE system itself
- [Manifest Template](manifests/_TEMPLATE.md) — blank template for new manifests
- [harness-evolve Skill](../.claude/skills/harness-evolve.md) — workflow for proposing, validating, and retrospecting harness changes
