# DireX Skill 格式标准 v1.0

> **设计日期**: 2026-08-03 | **基于**: SkillsMP 四家 Skill 架构研究 + SKILL.md 开放标准
> **状态**: Draft — 待实现

---

## 一、设计理念

### 1.1 DireX Skill 是什么

DireX Skill 是一个**可组合、可分享的创意工作流包**。用户选择 Skill → 填写参数 → Skill 自动编排 Agent 管线 → 产出画布节点（图片/视频/音乐/3D）。

### 1.2 与标准 SKILL.md 的区别

| 维度 | 标准 SKILL.md | DireX Skill |
|------|-------------|------------|
| **定位** | AI Agent 行为指令 | 创意工作流包 + AI Agent 行为指令 |
| **产物** | 文本/文件 | 画布节点（ImageGenerateNode / VideoGenerateNode / AudioGenerateNode / Scene3DNode） |
| **执行环境** | Claude Code CLI | DireX 画布 + Agent 管线 |
| **知识库** | 无内置 | 可引用 DireX 8 大知识库 |
| **风格引擎** | 无 | 5 维风格决策引擎可前置 |
| **积分消耗** | 无 | `estimated_credits` 声明预估消耗 |
| **多语言** | 可选 | 强制 `display_name.{lang}` |
| **社区** | GitHub 分享 | DireX 内置市场 + 点赞/克隆/激励 |

### 1.3 设计原则

1. **先 Spec 后生成** — 所有 Skill 必须先产出 Spec 文件，用户确认后再执行生成（防浪费积分）
2. **产品保真度优先** — 有参考图时，先锁定产品/角色身份再做创意（fancyai 模式）
3. **门控不可跳过** — 关键决策点必须等待用户确认（MagicCube 模式）
4. **末尾自检** — 所有 Skill 结尾必须有 QA Checklist（nano-banana 模式）
5. **去油词** — 不写"电影感""高级""唯美"，必须分解为物理/光学参数（Seedance 模式）

---

## 二、文件格式

### 2.1 文件命名

```
<skill-name>.skill.md
```

- 小写字母 + 连字符
- 与 `name` 字段一致
- 示例：`fashion-lookbook.skill.md`、`cinematic-scene.skill.md`、`character-turnaround.skill.md`

### 2.2 目录结构

```
skills/
└── fashion-lookbook/
    ├── fashion-lookbook.skill.md    # 主文件（必须）
    ├── thumbnail.png                # 市场展示缩略图（推荐）
    ├── samples/                     # 样图（推荐，用于市场预览）
    │   ├── sample-01.png
    │   └── sample-02.png
    └── references/                  # 领域知识数据（可选）
        ├── style-presets.json
        └── prompt-examples.md
```

---

## 三、Frontmatter 规范

### 3.1 完整 Schema

```yaml
---
# ── 必填字段 ──
name: fashion-lookbook                          # slug，等于文件名前缀
description: >                                  # 三段式：功能 + 触发 + 约束
  生成时装品牌型录风格的人物图片，支持多角度和场景切换。
  Use this skill when user wants fashion editorial lookbook images.
  Trigger: "时装型录" "lookbook" "时尚大片" "fashion editorial"
  "ファッションルックブック" "패션 화보"
display_name:                                   # 多语言展示名
  zh-CN: "时装型录"
  en: "Fashion Lookbook"
  ja: "ファッションルックブック"
  ko: "패션 화보"
version: "1.0.0"                               # semver
author:                                         # 作者信息（社区必须）
  name: "DireX Official"
  url: "https://direx.ai"
category: fashion                               # 见 3.2 分类表
difficulty: intermediate                        # beginner | intermediate | advanced
estimated_credits: 15                           # 预估积分消耗（单次执行）
node_type: image.generate                       # 产出的节点类型

# ── 可选字段 ──
tags: [fashion, photography, character, clothing, editorial]
requires:                                       # 依赖声明
  knowledge_bases: [style-db, photorealism-kb]  # 引用的知识库
  parent_skill: null                            # 如果是 Remix 别人的 skill
model_preference:                               # 推荐模型（可被用户覆盖）
  primary: nano-banana-pro
  fallback: gpt-image-2
  text_density: gpt-image-2                     # 含文字时切换到哪个模型
aspect_ratio:                                   # 默认宽高比
  default: "3:4"
  options: ["1:1", "3:4", "2:3", "9:16", "16:9"]
resolution:
  default: "2K"
  options: ["1K", "2K", "4K"]
license: MIT                                    # 开源协议（社区分享用）
thumbnail: thumbnail.png                        # 市场缩略图
---
```

### 3.2 分类体系 (category)

```
character      — 角色设计（三视图、表情集、服装变化）
scene          — 场景/环境设计
fashion        — 时装/服装设计
product        — 电商产品摄影
storyboard     — 分镜/故事板
cinematic      — 电影感场景/视频
poster         — 海报/封面设计
music          — 音乐/音效生成
beauty         — 美妆/人像摄影
food           — 食品摄影
architectural  — 建筑/室内设计
conceptual     — 概念艺术
abstract       — 抽象/艺术实验
utility        — 工具类（裁切/修复/去背景/放大）
```

### 3.3 difficulty 与积分关系

| difficulty | 预估积分范围 | 典型步骤数 | 门控点数 |
|------------|------------|-----------|---------|
| beginner   | 5-10       | 1-3 步    | 0-1     |
| intermediate | 10-25    | 3-5 步    | 1-2     |
| advanced   | 20-50      | 5-10 步   | 2-4     |

---

## 四、Body 结构规范

### 4.1 标准段落顺序

所有 Skill 的 body 必须按以下顺序组织：

```
1. Role（角色声明）
2. Overview（一句话概述）
3. Inputs（输入参数提取表）
4. Anti-Smudge Protocol（抗塑料皮肤协议 — 图片类 Skill 必须）
5. Workflow（分步工作流 + 门控点标记）
6. Prompt Template（提示词模板）
7. Output Contract（输出约定）
8. Quality Checklist（质量自检清单）
9. Failure Modes（已知失败模式 + 修复建议）
```

### 4.2 各段落的写法规范

#### 4.2.1 Role — 角色声明

```markdown
## Role

You are a **Fashion Creative Director** specializing in editorial lookbook production.
Your aesthetic references include: Paolo Roversi (soft focus + painterly light),
Tim Walker (surreal storytelling), and Fabien Baron (minimalist editorial layout).

你同时精通中文时尚术语，能够根据用户的中文描述精准把握服装材质、廓形和风格走向。
```

**规范**：
- 给 AI 分配具体专业身份
- 引用 2-3 个可验证的领域参考（人名/风格流派）
- 声明语言能力

#### 4.2.2 Overview — 概述

```markdown
## Overview

从用户提供的服装描述或参考图出发，生成一组 6 张具有统一视觉风格的时装型录图片。
输出格式：3:4 竖版，编辑级摄影质感。包含全身造型、半身特写、细节展示三个层次。
```

#### 4.2.3 Inputs — 输入参数

```markdown
## Inputs

从用户输入和上下文中提取以下参数。缺失项使用默认值，关键缺失项必须提问。

| 参数 | 来源 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `garment_description` | 用户文本 | ✅ | — | 服装的文字描述 |
| `reference_images` | 用户上传 | ❌ | null | 服装参考图 |
| `model_gender` | 用户选择 | ❌ | "female" | 模特性别 |
| `model_count` | 用户选择 | ❌ | 1 | 模特数量，0=纯产品 |
| `scene_type` | 查表推荐 | ❌ | "studio" | 场景类型 |
| `color_palette` | 风格引擎 | ❌ | auto | 由 style-decide 自动决策 |
| `mood` | 用户选择 | ❌ | "editorial" | 情绪方向 |
| `shot_count` | 活动量级 | ❌ | 6 | 输入 1-3 件=6 张，4+=9 张 |
| `language` | 上下文检测 | ❌ | auto | 用户界面语言 |

**门控规则**：
- ⏸️ 若 `garment_description` 缺失且无 `reference_images` → 停止，请用户提供
- ⏸️ 若用户未选 `mood` 和 `scene_type` → 推荐默认值 + 提供备选，等待确认
```

**规范**：
- 参数表必须包含：参数名、来源、是否必填、默认值、说明
- 门控规则用 ⏸️ 标记，说明何时停止等待用户

#### 4.2.4 Anti-Smudge Protocol — 抗塑料皮肤协议

> **此段为图片类 Skill 强制包含。** 视频类和人像类也必须包含，纯产品/风景类可选。

```markdown
## Anti-Smudge Protocol

本 Skill 自动将以下抗塑料/抗涂抹协议注入所有人物生成 prompt：

### 皮肤微观纹理（必须逐字注入）
```
SKIN PROTOCOL: Render skin as biological topography — stochastic pore structure
with random non-uniform distribution, visible vellus hair (peach fuzz) on jawline
and forehead catching rim light, melanin variance with solar lentigines and
mottling, faint subdermal vascularity (blue/green) at temples and under-eye,
natural T-zone sebaceous sheen contrasting matte cheek areas.
```

### 眼睛（必须逐字注入）
```
EYE PROTOCOL: Deep fibrous iris striations with crystalline refraction, red
vascular mapping visible in sclera, wet tear film on waterline, natural
micro-shadows in eye socket.
```

### 嘴唇（必须逐字注入）
```
LIP PROTOCOL: Dry/dehydrated lip texture with vertical fissures and micro-cracks,
uneven highlight distribution, no glossy/shiny lip surface.
```

### 全局排除（注入 negative_prompt）
```
plastic skin, waxy appearance, airbrushed skin, over-retouched,
doll-like skin, CGI look, uncanny valley, beauty filter,
flat emotionless eyes, fat face, puffy cheeks, bloated jaw,
overly smooth skin, polished skincare-ad finish, no skin pores
```

### 触发条件
以下情况**强度加倍**（在 positive 和 negative 中各写两遍）：
- 用户 prompt 含 "特写""近景""portrait""close-up"
- model_preference 为 gpt-image-2（该模型油滑倾向更重）
```

#### 4.2.5 Workflow — 工作流

```markdown
## Workflow

### Phase 1: 分析与规划

| 步骤 | 动作 | 门控 |
|------|------|------|
| 1.1 | 提取 `garment_description`、`reference_images` | — |
| 1.2 | 若有参考图：调用 `analyzeGarment()` 锁定产品身份 | — |
| 1.3 | 根据输入量级决定 `shot_count`（1-3件→6张，4+件→9张） | — |
| 1.4 | 调用 `style-decide` 自动推荐色板/灯光/场景 | — |
| 1.5 | **输出 `spec.json`** 并展示给用户 | ⏸️ 等待用户确认或修改 |

### Phase 2: 批量生成

| 步骤 | 动作 | 门控 |
|------|------|------|
| 2.1 | 首先生成第 1 帧（英雄锚点） | — |
| 2.2 | **展示第 1 帧结果** | ⏸️ 确认后继续，或要求重生成 |
| 2.3 | 以第 1 帧为 reference 生成第 2-N 帧 | — |
| 2.4 | 为每帧生成 A/B 变体 | — |
| 2.5 | 应用 QA Checklist | — |
| 2.6 | **展示全部结果，提供策展界面** | ⏸️ 用户选择/替换/重新生成单帧 |

### Phase 3: 输出

| 步骤 | 动作 |
|------|------|
| 3.1 | 创建 ImageGenerateNode（多图叠放） |
| 3.2 | 写入 `meta.gen.imageUrls[]` |
| 3.3 | 写入 `meta.skill` = { skill_name, version, params, spec } |
| 3.4 | 更新画布 + 触发同步 |
```

#### 4.2.6 Prompt Template — 提示词模板

```markdown
## Prompt Template

### 组装顺序
```
[ROLE_SENTENCE] [SCENE_DESCRIPTION] [GARMENT_FIDELITY]
[LIGHTING] [CAMERA] [SKIN_PROTOCOL] [EYE_PROTOCOL] [LIP_PROTOCOL]
[COLOR_PALETTE] [COMPOSITION] [TEXT_OVERLAY] [NEGATIVE_CONSTRAINTS]
```

### 模板
```text
{ROLE_SENTENCE}:
"{mood} fashion editorial photograph, {model_gender} model wearing {garment_fidelity},
standing in {scene_description}, {mood_direction} atmosphere."

{GARMENT_FIDELITY}:
"Wearing exactly the described garment — fabric: {fabric_type}, silhouette: {silhouette},
color: {color_hex}, key details: {garment_details}. Garment must match reference
exactly — no fabric substitution, no color shift, no silhouette change."

{LIGHTING}:
"{lighting_preset} — key light: {key_angle} at {color_temp}K, fill ratio: {fill_ratio}:1,
rim light: {rim_position} revealing vellus hair and fabric texture."

{CAMERA}:
"Shot on {camera_body}, {focal_length}mm lens, f/{aperture}, {shot_type}.
{composition_notes}. {depth_of_field}."

{SKIN_PROTOCOL}: (见 Anti-Smudge Protocol — 逐字注入)

{NEGATIVE_CONSTRAINTS}:
"NO: {negative_list}. NO text overlays, watermarks, logos unless specified."

{ASPECT_RATIO}: {ratio}  {RESOLUTION}: {resolution}
```

### 变量填充规则

| 变量 | 填充来源 |
|------|---------|
| `{garment_fidelity}` | Phase 1.2 产品身份锁定结果 |
| `{lighting_preset}` | Phase 1.4 style-decide 输出 |
| `{color_hex}` | Phase 1.4 style-decide 色板 |
| `{focal_length}` | 查表：全身照→50mm, 半身→85mm, 细节→100mm macro |
```

#### 4.2.7 Output Contract

```markdown
## Output Contract

### 产物清单
- [ ] `spec.json` — 完整参数记录（可复现）
- [ ] `shot_{1..N}.png` — N 张生成图片
- [ ] 1 个 ImageGenerateNode（多图叠放）添加到画布
- [ ] `meta.skill` 已写入节点（skill_name, version, params, spec_hash）

### 文件路径
```
server/data/projects/{project_id}/skills/{skill_name}/{timestamp}/
├── spec.json
├── shot_01.png
├── shot_02.png
...
└── manifest.json
```
```

#### 4.2.8 Quality Checklist

```markdown
## Quality Checklist

生成完成后逐一检查：

- [ ] 服装与参考图/描述一致（面料、颜色、廓形、五金）
- [ ] 面部无 AI 油滑感（毛孔可见、毳毛可见、无美颜滤镜感）
- [ ] 眼睛有纤维状虹膜纹理，非平面死鱼眼
- [ ] 手部无畸形（5 指、关节自然、无多余/缺失手指）
- [ ] 背景无乱码文字/破损 logo
- [ ] 所有帧颜色风格统一
- [ ] 第 1 帧和第 2-N 帧角色样貌一致（reference_image_ids 生效）
- [ ] 宽高比和分辨率符合 spec
- [ ] 无多余水印/字幕/UI 元素
- [ ] 镜头编号正确嵌入 meta

**任一项未通过 → 标记为需要重生成，在 manifest.json 记录失败项。**
```

#### 4.2.9 Failure Modes

```markdown
## Failure Modes

| 症状 | 可能原因 | 修复方案 |
|------|---------|---------|
| 服装颜色偏移 | prompt 中面料描述不够具体 | 加 `exact color: #{hex}` 在 garment_fidelity 段 |
| 皮肤油滑/塑料感 | Anti-Smudge Protocol 被 prompt 其他部分稀释 | 2x 重复 SKIN PROTOCOL，或改用 JSON 结构化 prompt |
| 多帧角色不一致 | reference_image_ids 传递失败 | 检查 API 参数，改锚点为第 1 帧的 asset_id |
| 手指畸形 | 模型固有缺陷 | 加 `hands with exactly 5 fingers, anatomically correct knuckles` |
| 文字乱码 | 模型文字渲染能力差 | 切换到 `gpt-image-2`（文字渲染更强）或把文字做成后期叠加 |
```

---

## 五、DireX 特有的集成注入点

### 5.1 知识库引用

Skill 可以通过 `requires.knowledge_bases` 声明引用哪些 KB，Agent 执行时自动加载：

```yaml
requires:
  knowledge_bases: [style-db, photorealism-kb, fashion-kb]
```

**注入行为**：
- `style-db` → `buildStyleCard()` 注入 userMessage 最前面
- `photorealism-kb` → 加载对应人种/年龄段的皮肤参数
- `fashion-kb` → `searchFashionKB(query)` 返回精准 2-3KB 风格数据

### 5.2 风格引擎前置

Skill 的 Inputs 阶段可以调用 `POST /api/q/style/decide`：

```json
// 请求
{ "scriptText": "...", "visualStyle": "...", "projectId": "..." }

// 返回
{
  "decisions": {
    "era": "contemporary",
    "region": "east-asian",
    "function": "editorial",
    "mood": "moody-luxury",
    "identity": "minimal-avant-garde",
    "mix": { "dominant": "70%", "secondary": "20%", "accent": "10%" }
  },
  "style_card": "紧凑风格卡片 ~800B"
}
```

### 5.3 Agent 管线挂钩

| Skill category | 可挂载管线 |
|---------------|-----------|
| character | character-extract pipeline（角色提取） |
| scene / cinematic | scene-extract pipeline（场景提取） |
| storyboard | storyboard pipeline（分镜管线） |
| music | music pipeline（音乐管线） |
| fashion / product | 独立生图管线（不走角色提取） |
| conceptual / abstract | 独立生图管线 |

### 5.4 积分消耗

```yaml
estimated_credits: 15   # 市场展示的预估值
```

实际消耗在后端计算：
```
实际消耗 = Σ(每帧模型定价 × 分辨率系数 × 张数)
         + 管线调用费（如有）
         + KB 检索费（固定 1 credit）
```

---

## 六、社区系统数据结构

### 6.1 社区版 Skill 的额外元数据

```yaml
# 以下字段仅在发布到社区时使用
publish_info:
  published_at: "2026-08-15T00:00:00Z"
  updated_at: "2026-08-15T00:00:00Z"
  stats:
    uses: 1234           # 使用次数
    likes: 89            # 点赞数
    remixes: 5           # 被 Remix 次数
    avg_rating: 4.7      # 平均评分
  remix_chain:           # Remix 溯源链
    - parent: "original-skill-id"
    - grandparent: null
```

### 6.2 激励积分规则（草案）

| 行为 | 积分奖励 |
|------|---------|
| 首次发布 Skill | +50 |
| Skill 被点赞 | +1 / 10 赞（防刷） |
| Skill 被使用 | +2 / 次（上限 100/天） |
| Skill 被 Remix | +10 / 次 |
| 进入官方推荐 | +100（一次性） |
| 每日登录 | +5 |
| 邀请新用户注册 | +20 / 人 |

---

## 七、迁移路径

### 7.1 将现有管线封装为 Skill

| 现有管线 | Skill 名称 | 工作量 |
|---------|-----------|--------|
| character-extract | `character-designer` | 中 — 已有管线，需加 frontmatter + QA + 抗塑料协议 |
| scene-extract | `scene-cinematic` | 中 — 同上 |
| storyboard | `video-storyboard` | 大 — 需重构为多镜头序列 |
| music pipeline | `music-composer` | 中 — 已有管线 |
| style-decide | `style-director` | 小 — 前端选择界面 + spec 输出 |
| video-analyzer | `video-director` | 大 — 需从零设计导演公式框架 |

### 7.2 新 Skill 的创建流程

```
1. 复制 _template.skill.md
2. 填写 frontmatter
3. 撰写 Role + Overview
4. 定义 Inputs 参数表 + 门控规则
5. 引用知识库（如需要）
6. 编写 Workflow 步骤
7. 设计 Prompt Template（查表 + 变量填充）
8. 添加 Anti-Smudge Protocol（图片类强制）
9. 编写 Output Contract + QA Checklist
10. 测试 3 次，记录 Failure Modes
11. 发布到社区（可选）
```

---

## 附录 A：与标准 SKILL.md 的字段映射

| DireX Skill 字段 | 标准 SKILL.md 字段 | 差异 |
|-----------------|-------------------|------|
| `name` | `name` | 相同 |
| `description` | `description` | DireX 版强制含触发短语 + 多语言触发词 |
| `display_name` | 不存在 | DireX 独有，多语言展示名 |
| `version` | 不存在 | DireX 独有，社区版本管理 |
| `author` | 不存在 | DireX 独有，社区作者归属 |
| `category` | 不存在 | DireX 独有，14 个分类 |
| `difficulty` | 不存在 | DireX 独有 |
| `estimated_credits` | 不存在 | DireX 独有，积分系统 |
| `node_type` | 不存在 | DireX 独有，画布节点类型 |
| `requires` | 不存在 | DireX 独有，KB 和管线依赖 |
| `model_preference` | 不存在 | DireX 独有，模型选择策略 |
| `tags` | `tags` | 相同 |

## 附录 B：_template.skill.md 空白模板

见 `skills/_template.skill.md`
