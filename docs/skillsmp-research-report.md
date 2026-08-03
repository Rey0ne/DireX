# SkillsMP 优秀 Skill 结构研究报告

> **日期**: 2026-08-03 | **来源**: SkillsMP.com → GitHub 源码
> **分析范围**: MagicCube/agentara (7 skills) + Emily2040/seedance-2.0 v6.7.0 (28 skills) + inspirepan/nano-banana-playground (13 skills) + fancyai-official/skills ⚠️ (仓库已删, 从 skills.rest 镜像恢复元数据)

---

## 一、Skill 文件格式标准

### 1.1 YAML Frontmatter（三家一致）

```yaml
---
name: image-generation          # 小写连字符 slug，等于目录名
description: >                  # 三段式：功能描述 + 触发短语 + 技术约束
  Generate Nano Banana Pro prompts for e-commerce product photography.
  Use this skill whenever the user uploads a product image and wants...
  Trigger phrases include: "ecom shot", "电商图", "产品图"...
---
```

**description 的标准三段式**：
1. **功能描述** — 一句话说清楚产出什么
2. **触发子句** — `Use this skill whenever...` + 触发短语枚举（含中/英/日多语种关键词）
3. **技术约束** — 默认比例、输出路径、行为保证

### 1.2 多语言 Frontmatter（nano-banana 增强）

```yaml
display_name: "电影感场景"
display_description: "创作具有电影质感的宽幅场景图..."
starter_examples:
  zh-CN: "生成一张赛博朋克城市雨夜的电影感场景"
  en: "Generate a cinematic cyberpunk city scene at night in rain"
```

### 1.3 目录结构规范

```
skill-name/
├── SKILL.md              # 主文件（必须）
├── references/           # 领域知识数据（查表、词汇、模板）
│   ├── prompt-templates.md
│   └── vocab/{lang}.md
├── scripts/              # 可执行脚本（可选）
│   └── generate.py
└── templates/            # 输出模板（可选）
    └── doraemon.md
```

---

## 二、Prompt 架构模式（最核心的学习点）

### 2.1 "导演公式" 7 槽位架构（Seedance）

```
Subject + Action + Scene + Camera + Lighting/Style + Audio + Constraints
```

| 槽位 | 角色 | 示例 |
|------|------|------|
| **Subject** | 模型必须跟踪的锚点 | 不能含糊为 "一个人" |
| **Action** | 可见变化 + 时序 | "缓缓转头，3秒后停下" |
| **Scene** | 仅写参考图中没有的 | 参考图已有的省略 |
| **Camera** | 一个主要运动 + 终点 | "推轨向前，停在茶壶特写" |
| **Light/Style** | 物理光源 + 安全视觉语言 | 不写 "电影感"—写 "6500K 主光 + 2:1 补光比" |
| **Audio** | 环境底噪 / 音效 / 对白 | 安静也要声明 |
| **Constraints** | 保留约束 + 排除项 | "保持面部一致；排除AI油滑感" |

### 2.2 9 步 Prompt 组装模板（nano-banana scene-cinematic）

```
1. 角色句         → "A cinematic wide shot of..."
2. 场景描述       → 地点/时间/天气/主体
3. 光             → 从关键词池选 2-3 个
4. 色彩           → 命名色板 + 十六进制值
5. 构图           → 引导线/三分法/前景剪影/30% 留白
6. 渲染细节       → 绘画感/数字感/手绘感
7. 角色处理       → 仅剪影，无面部
8. 标题文字       → 可选，≤12 中文字符
9. 负面约束       → 禁止清单
```

### 2.3 JSON 结构化 Prompt（MagicCube image-generation）

```json
{
  "characters": [{"name": "...", "appearance": "...", "pose": "..."}],
  "negative_prompt": "...",
  "style": "...",
  "composition": "...",
  "lighting": "...",
  "camera": {
    "position": "low angle",
    "angle": "dutch 5°",
    "lens": "85mm",
    "aperture": "f/1.4",
    "shot_type": "extreme close-up"
  }
}
```
→ 每一帧都是机器可解析的，可做自动化 QA 校验。

### 2.4 关键教训：叙事句 vs 关键词列表

> **"Describe the scene, don't just list keywords."**

| ❌ 不要 | ✅ 要 |
|--------|------|
| `20岁，女，杏眼，柳叶眉，青色裙子` | `二十出头的女子，身材纤细，鹅蛋脸上嵌着清澈的杏眼，柳叶眉微蹙时带着几分忧郁。身着淡青色绣花罗裙，腰间系着同色丝带。` |

**原因**：Nano Banana / Gemini 的 text encoder 是 LLM——它会对 prompt 做推理再生成。关键词堆砌让它无从推理。

---

## 三、领域知识编码技术

### 3.1 查表驱动决策（替代 LLM 自由发挥）

**MagicCube ecom-shot 的 5 维查表系统**：

| 维度 | 输入 | 输出 |
|------|------|------|
| 分辨率 | 宽高比 | 1:1→1024×1024, 3:4→1152×1536, 16:9→1920×1080 |
| 打光预设 | 产品表面类型 | 硬反光→高调三点光, 柔软布料→漫射窗光, 透明→逆光+柔光箱 |
| 机位预设 | 产品尺寸 | 小/细节→微距俯拍, 大/服装→中景平视 |
| 角度预设 | 产品类型 | 鞋→45°前侧, 香水→正面微俯, 食品→顶部俯拍 |
| 氛围预设 | 品牌调性 | 奢侈→暗调暖金, 科技→冷调蓝白, 自然→暖调浅棕 |

**nano-banana article-cover 自动推荐表**：

| 内容关键词 | 类型 | 色板 | 渲染 | 文字密度 |
|-----------|------|------|------|---------|
| 产品发布 | hero | cool | digital | title-only |
| 建筑设计 | conceptual | mono | flat-vector | none |
| 增长教程 | typography | vivid | flat-vector | text-rich |

### 3.2 领域参考作为语义锚点

**MagicCube video-plan 的导演参考系统**：
```
王家卫 → 都市疏离感（慢快门步进、霓虹反射、抽帧）
是枝裕和 → 安静日常（固定机位、自然光、长镜头）
Sofia Coppola → 柔软异化（柔焦、粉彩、少女凝视）
```

→ 不是让 LLM 模仿这些导演，而是用他们的名字作为视觉参数的压缩编码。

### 3.3 De-Slop 规则（去油词——Seedance 独创）

| 用户说的 | 物理分解 |
|---------|---------|
| `电影感` | 24fps、浅景深 f/2.8、2.35:1 宽幅、色彩分级暗角 |
| `唯美` | 柔光、暖色温 4500K、低对比度、发丝光 |
| `震撼` | 低角度仰拍、广角 16mm、强烈透视、大光比 |
| `高级` | 克制配色（≤3 主色）、大量留白、精准材质渲染 |
| `ins风` | 正方构图 1:1、高调打光、暖色滤镜、生活感 |

→ **这是多语言系统的核心技术**：每种语言的用户会输入不同的"油词"，skill 必须能把它们分解为物理参数。

### 3.4 连续性别名系统（Character Consistency Token）

**MagicCube video-character-design**:
```
一致性令牌: "[20多岁亚洲女性] [齐肩黑发+碎刘海] [杏眼+柳叶眉] [淡青绣花罗裙+同色丝带] [纤细身型]"
```
→ 后续所有 prompt 都以这个令牌开头，确保同一角色跨镜头一致。

**nano-banana comic-strip 锚点链**：
```
Panel 1 的 image_id → 作为 reference_image_ids 传给 Panel 2-8
锚点永远是 Panel 1（不链式传递，避免累积漂移）
```

---

## 四、质量保障机制

### 4.1 末端 QA 清单（5/7 skill 采用）

```
## Quality Checklist
- [ ] 面板时长相加等于场景总时长？
- [ ] 时间码匹配网格位置？
- [ ] 角色面部在所有面板一致？
- [ ] 服装/道具跨面板不变？
- [ ] 无 AI 油滑皮肤/畸形手指？
- [ ] 无乱码文字/破损品牌字？
- [ ] 无多余 logo/字幕/水印？
- [ ] 语言匹配用户偏好？
```

**设计要点**：每条是可执行验证（不是"质量好吗"这种虚的），且检查的是已知失败模式。

### 4.2 门控工作流（Gated Workflow）

```
Phase 1: 提取参数 → 写 spec 文件 → ⏸️ 等待用户确认
Phase 2: 收到确认 → 执行生成 → 应用 QA 清单 → 输出
```

**关键规则**：
- Phase 1 没有确认前禁止进入 Phase 2
- 任何 spec 变动都重新请求确认
- 只有 "generate" / "确认" / "go ahead" 才算确认

### 4.3 重试协议（Seedance）

```
Keep:   输出可用 → 保留
Fix:   小问题 → 局部修复（不改整体）
Post:  后期可修 → 标记，继续
Re-roll: 方向对但执行差 → 同 prompt 重生成
Rewrite: 方向错 → 改 prompt 重新生成
```

### 4.4 反模式文档

**nano-banana scene-cinematic 的 9 条禁止项**：
1. 不要照片级真实人脸
2. 不要卡通/Q版
3. 不要杂乱构图
4. 不要镜头光晕滥用
5. 不要渲染十六进制色码为可见文字
6. 标题 ≤12 中文字符
7. 只用一个情绪方向
8. 单图输出（非系列）
9. dreamlike-pastel 只能 1:1 比例

---

## 五、多语言系统设计（Seedance 最惊艳的部分）

### 5.1 双层架构

```
SKILL.md (50-60 行)          ← 轻量接口层：意图声明 + 词汇表 + 紧凑模板 + 去油规则
references/vocab/{lang}.md   ← 密集数据层：60-189 行角色绑定表 + 语级规则 + 文化概念
```

### 5.2 每种语言的"灵魂声明"

| 语言 | 灵魂声明 |
|------|---------|
| 中文 | 压缩与文化 — 中文能在 10 个字内承载英文 30 词的信息量 |
| 日语 | 动画传统与本土感 — 尊重手绘动画 100 年词汇积累，不直接翻译英文术语 |
| 韩语 | 物理化 "감성" — 把韩语中最模糊也最核心的 "感性" 分解为光线/质感/节奏 |
| 俄语 | 社区创造力 — 俄语社区用有限工具做出惊艳作品，术语来自实践而非课本 |
| 西班牙语 | 音乐性 — 西班牙语的韵律和节奏本身就是一种方向工具 |

### 5.3 语级/敬语系统

**日语三语级 + 音节预算**：
```
です・ます体 (丁寧)  → 标准礼貌     → 不限音节
だ・である体 (常体)  → 专业/技术    → 每句 ≤ 40 モーラ
タメ口 (カジュアル)  → 朋友间/社区  → 不看音节数，但禁用敬语动词
```

**韩语三语级 + 音节预算**：
```
합쇼체 (합니다)  → 正式        → 不限音节
해요체 (해요)   → 日常礼貌    → 每句 ≤ 35 음절
해체 (반말)     → 亲密/社区   → 禁用敬语词尾
```

**关键设计洞察**：日韩语没有"中性"语级——不指定语级就是把决策权交给模型，可能导致提示词出现在不合适的社交语境中。

### 5.4 审美概念物理分解

```
武侠 → 宽袍大袖/布料飘动/竹影/水墨色调/留白构图/慢动作
間 (Ma) → 停顿/负空间/声音沉默/呼吸节奏/未完成感
恨 (Han) → 低饱和度/冷色调/空旷场景/静态长镜头/单一光源
```

### 5.5 铁律：参考标签永不翻译

```
✅ 所有语言: @Image1, @Video2, @Audio3
❌ 绝对禁止: @图片1, @画像1, @이미지1
```

原因：参考标签是机器标识符，翻译后模型无法匹配。

### 5.6 每种语言专属的"油词"映射表

```json
// zh.md
{"大片感": "变形宽银幕 2.39:1 + 浅景深 f/2.0 + 低角度仰拍 + 冷色调色分级"}
{"仙气": "柔光漫射 + 逆光发丝光 + 白纱飘动 + 浅粉色调 + 雾气"}
{"质感": "微距材质特写 + 侧光 45° + 表面纹理清晰 + 低饱和度"}

// ja.md
{"エモい": "夕暮れ逆光 + 粒子ノイズ + 手持ちカメラ + 褪色フィルム"}
{"キラキラ": "玉ボケ + 逆光ハイライト + 水面反射 + レンズフレア制御"}
```

---

## 六、fancyai-official/skills — 时尚商业摄影专业方法论

> ⚠️ 原仓库 `github.com/fancyai-official/skills` 已被删除/私有化。以下数据来自 skills.rest 镜像。

### 6.1 产品保真度优先（fancyai 最独特的模式）

**每个 skill 的第一步都是分析上传的产品图**，提取可验证的产品细节：

| Skill | 提取内容 |
|-------|---------|
| beauty-photography | 瓶身材质、品牌线索、瓶盖几何、标签位置、颜色、尺寸估算 |
| beverage-photography | 饮料类型/包装识别 → 在线验证真实液体颜色（不能生成橙色可乐） |
| editorial-fashion-six | 面料质感、廓形、颜色、五金件、服装结构 |
| ecom-shoe | 鞋面材质、鞋底结构、品牌标识位置 |

→ 这不是"让 AI 自己看着办"，而是**把产品身份锁定为不可变参数**。

### 6.2 活动量级规划（fashion-campaign-director）

```
输入 1-3 件 → 紧凑套件（6 张：英雄×2 + 编辑×2 + 活动×2）
输入 4+ 件  → 完整套件（9 张）
选 0 模特   → 纯产品方向（无人物剪影/手部）
```

**三种处理方案推介**：
- 安全方向 — 保守商业可用
- 大胆方向 — 编辑级创意
- 概念方向 — 先锋艺术实验

用户选择后展开完整制作简报（选角、团队、风格种子、镜头计划）。

### 6.3 多样性矩阵（自我去重）

多个 skill 内置多样化自检机制：

```
灯光系列: [高调白, 暗调金, 自然窗光, 彩色凝胶]
背景色调: [冷灰, 暖米, 黑, 自然景深]
色彩策略: [单色克制, 互补撞色, 类似色渐变]
```

→ 三个概念方向必须在这三个维度上有实质性差异，否则算重复。

### 6.4 仅 Prompt 输出模式

`fashion-campaign-director` 和 `icon-designer` 的特殊设计：**不调生成 API，只输出 prompt 指令文件**。理由：
- 用户可能用不同模型（MJ/SD/Nano Banana）
- Prompt 文件可版本控制、可分享、可复现
- 降低 skill 的模型耦合度

### 6.5 锚点帧技术（editorial-fashion-six）

```
第 1 帧：从精确正面平铺图生成 → 作为"英雄锚点"
第 2-6 帧：以第 1 帧为 reference_image_ids 生成
```

→ 与 nano-banana comic-strip 的锚点链完全一致的理念，但应用在时装领域。

### 6.6 反 AI 真实感护栏

| 问题 | fancyai 的解法 |
|------|---------------|
| 童装模特塑料感 | 自然姿势（禁止跳跃悬浮）、表情不僵硬、皮肤不 AI 油滑 |
| 饮料飞溅不合理 | 液体飞溅方向 + 重力约束、禁止瓶身悬浮 |
| 微距失真 | 主体保持原始比例不变形，仅背景/边缘做微距虚化 |
| 服装"幽灵化" | 每次镜头的 prompt 都复制完整的服装描述（面料/廓形/颜色/五金） |

### 6.7 可选的视频扩展

`beauty-photography-master` 和 `ecom-shoe-image-shotlist` 在完成图片集后，提供视频子工作流：
- 保持图片工作流中确认的产品身份和灯光行为
- 鞋类视频强制约束："鞋子始终可见"
- 最多 5 段动态片段 → 可选合并为高光集锦 + 背景音乐

---

## 七、社区/分享系统的隐含设计

Skill 系统本身的设计已经为社区分享做了准备：

### 6.1 可组合性
- `video-plan` 产出 → `video-character-design` 消费 → `video-storyboard` 消费
- 文件路径标准化（`characters/` `storyboard/` `posters/` `plans/`）
- 这意味着用户可以**链式组合别人的 skill**

### 6.2 可复现性
- 每个 skill 生成 `.md` / `.json` spec 文件
- spec 脱离生成过程独立存在 → **可版本控制 → 可分享复现**

### 6.3 版本化命名
- `-v2` `-teaser` `-alt-a` 后缀约定
- 不覆盖原则：已有文件未经确认不覆盖

### 6.4 SkillsMP 的社区机制（参考）
- 170,000+ 公开 skill，来自 GitHub 公开仓库
- AI 语义搜索 + 关键词搜索
- 按 800+ 职业分类
- 一键安装命令
- 质量过滤：GitHub ≥2 stars

---

## 八、对 DireX 的直接启示

### 7.1 Skill 文件格式

```yaml
---
name: fashion-lookbook
description: >
  生成时装品牌型录风格的人物图片。
  Use this skill whenever the user wants fashion editorial, lookbook...
  Trigger phrases: "时装型录", "lookbook", "时尚大片", "fashion editorial"...
display_name:
  zh-CN: "时装型录"
  en: "Fashion Lookbook"
  ja: "ファッションルックブック"
tags: [fashion, photography, character, clothing]
difficulty: intermediate
estimated_credits: 15
version: "1.0.0"
author: direx-official
---

# Skill Body（遵循导演公式/叙事句原则）
```

### 7.2 DireX Skill 和现有关卡的映射

| 现有关卡 | 可封装为 Skill | 参考来源 |
|---------|---------------|---------|
| 角色提取管线 | `character-designer` — 从剧本生成角色三视图 | MagicCube video-character-design |
| 场景提取管线 | `scene-cinematic` — 从剧本生成电影感场景 | nano-banana scene-cinematic |
| 分镜管线 | `video-storyboard` — 文本→分镜描述→镜头 Prompts | MagicCube video-storyboard |
| 音乐管线 | `music-composer` — 剧本→音乐情绪→Suno Prompts | (MagicCube 尚无，可自创) |
| 风格决策引擎 | `style-director` — 5 维风格混合 | Seedance style 分层法 |
| — | `fashion-campaign` — 时尚型录/商业摄影 | fancyai fashion-campaign-director |
| — | `product-shot` — 电商产品摄影 | MagicCube ecom-shot |
| — | `poster-design` — 海报/封面生成 | nano-banana editorial-poster |
| — | `character-turnaround` — NPC/角色多角度生成 | MagicCube video-character-design |

### 7.3 多语言改造优先级

| 优先级 | 做什么 | 参考 |
|--------|--------|------|
| P0 | UI 框架 i18n（react-i18next） | 标准方案 |
| P0 | Prompt 组装语言：英文永远作为中间层（生图模型最佳） | Seedance 策略 |
| P1 | 中文→用户本地语言的 UI 层翻译 | Seedance vocab 架构 |
| P1 | 每种语言的"去油词"映射表 | Seedance De-Slop |
| P2 | 日语/韩语敬语系统 + 音节预算 | Seedance ja/ko vocab |
| P2 | 参考标签不翻译 + 区域变体 | Seedance 铁律 |
| P3 | 审美文化概念物理分解（武侠/間/恨…） | Seedance aesthetic registers |

### 7.4 社区系统技术需求

| 功能 | 技术要点 |
|------|---------|
| Skill 上传 | `.md` 文件 + frontmatter 校验 → 存储到 `server/data/skills/` |
| Skill 市场/展示 | 缩略图(用 skill 生成的样图) + prompt 预览 + 使用次数/点赞 |
| 一键使用 | 选 skill → 参数填写(AskUserQuestion 模式) → 注入管线 |
| 互动 | 点赞/收藏/克隆(Remix) |
| 激励 | 点赞返积分(参考 MJ)、优质 Skill 官方推荐、排行榜 |
| 多语言 | Skill frontmatter 含 `display_name.{lang}` → 市场 UI 根据用户语言展示 |

---

## 九、总结：四家 Skill 的设计哲学差异

| 维度 | MagicCube/agentara | Seedance-2.0 | nano-banana | fancyai-official |
|------|-------------------|-------------|-------------|-----------------|
| **定位** | 商业制作流水线 | 专业导演系统 | 创意设计工具包 | 时尚品牌级商业摄影 |
| **复杂度** | 中等（7 步工作流） | 极高（13 步循环 + 9 层权威） | 低-中（3-9 步） | 中等（活动量级规划） |
| **门控** | Phase 1→确认→Phase 2 | 全门控 + 快车道 | AskUserQuestion 一次 | 方案推介→确认→扩展 |
| **用户画像** | 电商/内容运营 | 专业导演/DP | 设计师/自媒体 | 品牌/广告/时尚创意 |
| **最擅长** | 商业参数化 + 查表 | 多语言 + 连续性 + 去油词 | 设计 DNA + 色板 | 产品保真度 + 多样性 |
| **多语言** | 指令英文，交付物本地语言 | 双层架构 + 语级系统 | 双语 frontmatter | (仓库已删，未确认) |
| **QA** | Checklist + 连续性强制 | 重试协议 + 安全门 | 反模式列表 + 自动推荐 | 产品身份验证 + 实体合理性 |
| **特殊能力** | 摄影参数决策树 | 9 层权威等级排序 | 设计学校 DNA 叠加 | 仅 Prompt 输出 + 活动自适应 |

**DireX 应该融合四家**：
- 取 Seedance 的**多语言架构**和**去油词**体系 → 支撑多语言系统
- 取 MagicCube 的**商业模板参数化**和**门控工作流** → 支撑 Skill 核心引擎
- 取 nano-banana 的**设计 DNA**和**用户交互模式** → 支撑 Skill 市场展示
- 取 fancyai 的**产品保真度优先**和**多样性矩阵** → 支撑商业级质量
- 加上 DireX 自己的**8 知识库 + 5 维风格引擎**作为底层差异化壁垒
