---
# ═══════════════════════════════════════════════
# DireX Skill Template — 复制此文件开始创建新 Skill
# ═══════════════════════════════════════════════

# ── 必填 ──
name: my-skill-name
description: >
  一句话功能描述。
  Use this skill when the user wants to [use case].
  Trigger: "中文触发词" "English trigger" "日本語" "한국어"
display_name:
  zh-CN: "我的技能"
  en: "My Skill"
  ja: ""                    # 填完或删除空行
  ko: ""
version: "1.0.0"
author:
  name: ""
  url: ""
category: character          # 见分类表
difficulty: beginner         # beginner | intermediate | advanced
estimated_credits: 10
node_type: image.generate    # 见节点类型表

# ── 可选 ──
tags: []
requires:
  knowledge_bases: []
  parent_skill: null
model_preference:
  primary: nano-banana-pro
  fallback: gpt-image-2
aspect_ratio:
  default: "1:1"
  options: ["1:1", "3:4", "16:9"]
resolution:
  default: "2K"
  options: ["1K", "2K", "4K"]
license: MIT
thumbnail: thumbnail.png
---

# {display_name.zh-CN}

## Role

You are a **[Professional Identity]** specializing in **[domain]**.
Your aesthetic references include: **[Reference 1]** (style), **[Reference 2]** (technique).

你同时精通中文领域术语。

## Overview

从用户输入出发，生成 **[产物描述]**。输出格式：**[格式说明]**。

## Inputs

| 参数 | 来源 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `param_1` | 用户文本 | ✅ | — | 说明 |
| `param_2` | 用户选择 | ❌ | "default" | 说明 |

**门控规则**：
- ⏸️ 若 `param_1` 缺失 → 停止，请用户提供

<!-- 图片类 Skill 保留此段；纯文本/音乐类删除 -->
## Anti-Smudge Protocol

本 Skill 自动将以下抗塑料/抗涂抹协议注入所有人物生成 prompt：

### 皮肤微观纹理
```
SKIN PROTOCOL: Render skin as biological topography — stochastic pore structure
with random non-uniform distribution, visible vellus hair (peach fuzz) on jawline
and forehead catching rim light, melanin variance with solar lentigines and
mottling, faint subdermal vascularity (blue/green) at temples and under-eye,
natural T-zone sebaceous sheen contrasting matte cheek areas.
```

### 全局排除
```
plastic skin, waxy appearance, airbrushed skin, over-retouched,
doll-like skin, CGI look, uncanny valley, beauty filter,
flat emotionless eyes, overly smooth skin
```

## Workflow

### Phase 1: 分析与规划

| 步骤 | 动作 | 门控 |
|------|------|------|
| 1.1 | 提取所有 Inputs 参数 | — |
| 1.2 | [如需要] 调用知识库/风格引擎 | — |
| 1.3 | 输出 `spec.json` 展示给用户 | ⏸️ 等待确认 |

### Phase 2: 生成

| 步骤 | 动作 | 门控 |
|------|------|------|
| 2.1 | 生成主输出 | — |
| 2.2 | 应用 QA Checklist | — |
| 2.3 | 展示结果 | ⏸️ 确认/重生成 |

### Phase 3: 输出

| 步骤 | 动作 |
|------|------|
| 3.1 | 创建对应节点类型 |
| 3.2 | 写入 `meta.gen.*` 和 `meta.skill` |
| 3.3 | 触发画布同步 |

## Prompt Template

### 组装模板
```text
[ROLE] [SUBJECT] [SCENE] [LIGHTING] [CAMERA] [TEXTURE_PROTOCOL] [NEGATIVE]
```

### 变量填充

| 变量 | 来源 |
|------|------|
| `{var_1}` | Phase 1 输出 |
| `{var_2}` | 查表：条件A→值X, 条件B→值Y |

## Output Contract

- [ ] `spec.json` — 完整参数记录
- [ ] N 个产出物
- [ ] 1 个 {node_type} 节点添加到画布
- [ ] `meta.skill` 已写入

## Quality Checklist

- [ ] 产物符合 spec 参数
- [ ] 无 AI 油滑感（图片类）
- [ ] 无畸形/乱码/水印
- [ ] 所有产物风格一致

## Failure Modes

| 症状 | 可能原因 | 修复方案 |
|------|---------|---------|
| 待补充 | — | — |


# ═══════════════════════════════════════════════
# 附录：分类表、节点类型表
# ═══════════════════════════════════════════════

# category 可选值:
#   character, scene, fashion, product, storyboard, cinematic,
#   poster, music, beauty, food, architectural, conceptual, abstract, utility

# node_type 可选值:
#   image.generate   → ImageGenerateNode
#   video.generate   → VideoGenerateNode
#   audio.generate   → AudioGenerateNode
#   scene.3d         → Scene3DNode
#   shot             → ShotNode
#   multiple         → 多种节点
