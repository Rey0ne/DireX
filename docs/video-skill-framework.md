# DireX 视频 Skill 框架 v1.0

> **设计日期**: 2026-08-03 | **参考**: Seedance-2.0 导演公式 + MagicCube 门控工作流
> **现状**: 仅有 `video-analyzer.ts` 单一润色器，无完整框架
> **目标**: 构建从剧本到视频的全链路导演系统

---

## 一、架构总览

### 1.1 从润色器到导演系统

```
现状 (video-analyzer.ts):
  用户中文描述 → GPT 润色 6 维 → 输出一段 prompt → 前端发给 Seedance/Kling

目标 (Video Director Framework):
  用户输入 → 分镜规划 → 镜头序列编排 → 逐镜 Prompt 组装（7 槽位）
  → 风格分层 → 摄像机运动 DSL → 负向提示词注入 → 连续性约束
  → 多镜并行/串行生成 → QA 审查 → 画布节点输出
```

### 1.2 核心模块

```
video-director-framework/
├── director-formula.ts        # 7 槽位 Prompt 组装引擎
├── shot-sequencer.ts          # 多镜头序列编排
├── camera-dsl.ts              # 摄像机运动 DSL + 镜头知识库
├── video-anti-smudge.ts       # 视频专属抗塑料/抗变形协议
├── style-layers.ts            # 5 层风格分层（从 Seedance）
├── audio-layer.ts             # 音频层设计
├── video-vocab/               # 多语言视频词汇表
│   ├── zh.ts                  # 中文（已有基础）
│   ├── en.ts                  # 英语
│   ├── ja.ts                  # 日语
│   └── ko.ts                  # 韩语
└── skills/                    # 基于框架的 Skill
    ├── cinematic-scene.skill.md
    ├── product-showcase.skill.md
    └── character-performance.skill.md
```

### 1.3 与现有系统的关系

| 现有模块 | 在新框架中的角色 |
|---------|---------------|
| `video-analyzer.ts` | 保留，作为 7 槽位中 Scene 槽位的润色器 |
| `kie-provider.ts` | 新增 `compileVideoPrompt()` 接口，对接 Seedance/Kling |
| `kie-pricing.ts` | 新增视频按秒计费逻辑 |
| `VideoGenerateNode.tsx` | 增强：支持多镜头序列展示 + 逐镜预览 |
| `pipeline.ts` | KB_CATALOG 新增视频摄像机词汇条目 |

---

## 二、导演公式：7 槽位 Prompt 架构

### 2.1 槽位定义

```
Subject + Action + Scene + Camera + Lighting/Style + Audio + Constraints
```

| # | 槽位 | 角色 | 错误示例 | 正确示例 |
|---|------|------|---------|---------|
| 1 | **Subject** | 模型必须跟踪的锚点 | "一个人" | "身着藏青中山装的老年男性，银发梳理整齐，左手戴翡翠扳指" |
| 2 | **Action** | 可见变化 + 时序窗口 | "走路" | "缓步前行，步速约 0.5m/s。3 秒时停下，抬头看向画外——眼神从沉思转为坚定。第 5 秒右手缓慢抬起至胸前。" |
| 3 | **Scene** | 仅写参考图中没有的环境 | "一个房间" | "民国书房：红木书架、黄铜台灯(暖黄 2700K)、窗外梧桐树影斑驳。书案上散落泛黄信笺。**参考图已提供角色外观——不在此描述。**" |
| 4 | **Camera** | 一个主要运动 + 终点 | "移动镜头" | "推轨向前(dolly in)，起点全身景→终点面部特写，18mm→85mm 变焦同步，速率均匀，4 秒完成。停在左眼——可见虹膜纹理和眼角细纹。" |
| 5 | **Lighting/Style** | 物理光源 + 风格分层 | "电影感打光" | "主光：窗光模拟(6500K 散射)，逆光位置。补光：暖色钨丝台灯(2700K)，2:1 光比。风格层：Live Action + 16mm 胶片颗粒 + 暗角。" |
| 6 | **Audio** | 环境底噪 + 音效 + 对白 | (省略) | "环境：窗外隐约梧桐叶沙沙声 + 远处钟楼整点报时。音效：第 6 秒纸张翻动声。对白：无。音乐：低音弦乐渐入，G 小调。" |
| 7 | **Constraints** | 保留约束 + 排除项 | (省略) | "KEEP: 角色面部结构/银发/扳指/中山装颜色。NO: 现代物品、电子设备、镜面反射中出现摄像机。" |

### 2.2 槽位组装规则

```
1. 每个槽位独立编写，不跨槽位引用（防止 token 注意力稀释）
2. Subject 必须在第一句（模型最关注开头）
3. Camera 必须声明终点（防止模型自由发挥机位）
4. Constraints 必须包含 KEEP 和 NO 两部分
5. Audio 即使为"无"也要声明（防止模型误生成环境音）
6. 所有时间描述用"X 秒"格式，不用"慢/快"
```

### 2.3 压缩规则（Token 预算管理）

每个模型的 prompt token 上限不同。按优先级压缩：

```
压缩序列（按此顺序裁切，直到满足 token 预算）：
1. 删除 Lighting/Style 中重复的形容词（"柔和的暖色的温馨的" → "暖色 3500K"）
2. 删除 Scene 中在参考图中已可见的环境细节
3. 删除 Action 的次级动作（保留主要动作 + 时机）
4. 删除 Camera 中的次级运动（保留主运动 + 终点）
5. 绝不压缩: Constraints / Action 时机 / Camera 终点 / Subject 身份锚点
```

---

## 三、摄像机运动 DSL

### 3.1 画幅与焦段

```typescript
const SHOT_TYPES = {
  ECU:  { scale: 'extreme close-up',  desc: '局部特写（眼睛/手指/道具细节）', focal: '100mm macro' },
  CU:   { scale: 'close-up',          desc: '面部特写（下巴到额头）',          focal: '85mm' },
  MS:   { scale: 'medium shot',       desc: '中景（腰部以上）',               focal: '50mm' },
  MLS:  { scale: 'medium long shot',  desc: '中全景（膝盖以上）',              focal: '35mm' },
  FS:   { scale: 'full shot',         desc: '全景（全身）',                   focal: '24mm' },
  LS:   { scale: 'long shot',         desc: '远景（人物占画面 1/3）',          focal: '18mm' },
  ELS:  { scale: 'extreme long shot', desc: '极远景（人物为画面点缀）',         focal: '14mm' },
};

const LENS_CHARACTER = {
  '14mm': '极大空间感，边缘畸变，夸张透视',
  '18mm': '强空间感，适合建筑/风景',
  '24mm': '空间能量感，适合动作/街拍',
  '35mm': '自然街拍视角，人眼接近感',
  '50mm': '人像压缩开始，背景初步分离',
  '85mm': '浅景深人像，面部比例最佳',
  '100mm macro': '极致细节，微距材质',
  '135mm': '强压缩感，远距离偷窥视角',
};
```

### 3.2 摄像机运动

```typescript
const CAMERA_MOVES = {
  // ── 固定 ──
  locked:    '机位锁定，无任何运动。适用于：对白、产品展示、精细 VFX。',

  // ── 平移/摇摄 ──
  pan_left:  '水平左摇。终点: {目标}。速率: {速度}。',
  pan_right: '水平右摇。',
  tilt_up:   '垂直上摇。从 {起点} 到 {终点}。',
  tilt_down: '垂直下摇。',

  // ── 推拉 ──
  dolly_in:  '推轨前进。起点景别: {起点}，终点景别: {终点}。持续时间: {秒}秒。',
  dolly_out: '推轨后退。揭示更大空间。',
  zoom_in:   '变焦推进(不移动机位)。压缩空间感渐强。起点: {mm}mm → 终点: {mm}mm。',
  zoom_out:  '变焦拉出。',

  // ── 复合运动 ──
  track:     '跟拍平移。与被摄体保持 {距离}，速度同步。',
  orbit:     '环绕运动。围绕 {目标} 旋转 {角度}°。仅当被摄体从各面都清晰可见时使用。',
  crane_up:  '升降上升。从 {起点高度} 到 {终点高度}。',
  crane_down:'升降下降。',

  // ── 手持 ──
  handheld:  '手持摄影。轻微晃动幅度({级别})。仅当真实感优先于画面精准度时使用。',
};
```

### 3.3 运动冲突解决

```typescript
// 如果用户给出矛盾的运动指令，按此规则裁决
const MOVE_PRIORITY = {
  // 同时要求 dolly_in + orbit → 选 dolly_in，orbit 降级为"在推进同时轻微环绕"
  // 同时要求 handheld + crane → 选 crane（crane 需要设备，handheld 无法实现）
  // 超过 2 个运动的镜头 → 建议拆分为多个独立镜头
};
```

### 3.4 镜头转场

```typescript
const TRANSITIONS = {
  cut:        '硬切。无过渡。适合快节奏。',
  fade_out:   '渐黑。{秒}秒。适合章节结束。',
  fade_in:    '渐亮。{秒}秒。适合章节开始。',
  dissolve:   '叠化。{秒}秒交叉淡入淡出。适合时间流逝/回忆。',
  match_cut:  '匹配剪辑。{元素}在两个镜头中位置/形状一致，无缝切换。',
  whip_pan:   '甩镜头。快速水平摇摄模糊作为转场。',
};
```

---

## 四、多镜头序列格式

### 4.1 ShotList 数据结构

```typescript
interface VideoShotList {
  projectId: string;
  totalDuration: number;        // 总时长（秒）
  aspectRatio: string;          // "16:9" | "9:16" | "1:1" | "4:3"
  styleProfile: StyleLayers;    // 5 层风格（全局应用）
  shots: VideoShot[];
  continuity: ContinuityRules;  // 跨镜连续性约束
}

interface VideoShot {
  id: string;                   // "shot_01"
  duration: number;             // 秒（4-15 秒，Seedance 已验证的稳定区间）
  description: string;          // 中文场景描述
  directorFormula: {
    subject: string;
    action: string;             // 含时序
    scene: string;              // 仅写参考图没有的
    camera: CameraSpec;
    lighting: LightingSpec;
    audio: AudioSpec;
    constraints: Constraints;
  };
  referenceAssets: {            // 此镜头引用的参考素材
    imageIds: string[];         // @Image1 等
    videoIds: string[];         // @Video1 等（R2V 模式）
  };
  transition: TransitionSpec;   // 与下一个镜头的转场
}

interface CameraSpec {
  shotType: keyof typeof SHOT_TYPES;
  movement: string;             // DSL 格式的完整运动描述
  lens: string;                 // 焦段 mm
  aperture: string;             // f/1.4 - f/16
  duration: number;             // 此镜头内的机位运动持续时间
}

interface LightingSpec {
  keyLight: { direction: string; colorTemp: number; type: string };
  fillRatio: string;            // "2:1" "4:1" "无补光"
  rimLight: { direction: string; purpose: string } | null;
  practicalLights: string[];    // 画面内可见光源
  atmosphere: string[];         // 雾气/烟/灰尘/丁达尔
}

interface AudioSpec {
  ambient: string;              // 环境底噪
  sfx: string[];                // 音效队列（含时间点）
  dialogue: string | null;      // 对白
  music: { genre: string; mood: string; startAt: string } | null;
}

interface Constraints {
  keep: string[];               // 跨镜必须保持一致的元素
  avoid: string[];              // 此镜头排除的元素
  safety: string[];             // 安全/合规排除（永远在最高权威）
}

interface ContinuityRules {
  characterIdentity: string;    // 角色一致性令牌（注入每镜 prompt 开头）
  wardrobe: string;             // 服装描述（每镜复制）
  locationGeography: string;    // 空间关系（移动轨迹 → 视线方向 → 地标）
  props: Record<string, string>;// 关键道具的位置和状态
  lightingContinuity: string;   // 光源方向是否随角色移动（通常应不变）
  timeOfDay: string;            // 时间流逝（实时还是跳切）
}
```

### 4.2 镜头编排规则

```
1. 单镜头时长: 4-15 秒（Seedance 验证区间）
2. 总时长: 默认 60 秒，可配置
3. 首镜必须含 Hook（前 3 秒抓住注意力）
4. 相邻镜头景别变化 ≥ 2 级（ECU→MS 可以，ECU→CU 不推荐——跳切感弱）
5. 同场景连续镜头 ≤ 3 个（超过则视觉疲劳）
6. 每个镜头必须有且仅有一个主要摄像机运动
7. 角色首次出场镜头必须是 FS 或 MLS（展示全身+服装）
```

### 4.3 连续性约束令牌

```
// 注入每个镜头的 prompt 开头
CONTINUITY_TOKEN: "[角色名], [年龄] [性别], [发型+颜色],
[面部特征], 身着 [服装完整描述], [体型描述]。
所有镜头中保持不变: 面部结构、发型、服装、道具位置、光源方向。"
```

---

## 五、视频专属抗变形协议

### 5.1 视频特有的 AI 缺陷

| 缺陷 | 表现 | 原因 |
|------|------|------|
| **皮肤时域闪烁** | 同一角色在相邻帧间皮肤纹理跳动 | 模型对每帧独立处理，无时域一致性 |
| **变形扭曲(morphing)** | 人物面部/肢体在不同帧间渐变/扭曲 | 模型对 motion 插值不稳定 |
| **"活照片"综合症** | 画面像加了轻微运镜的静态照片 | 缺少真实的物理动态描述 |
| **背景漂移** | 静止背景出现不应有的移动 | 模型把全局 motion 均匀应用 |
| **肢体融合** | 行动中手指/头发与背景/服装融合 | 模型对细结构的时域跟踪差 |
| **帧间跳闪** | 镜头内出现明显的亮度/色调突变 | 自动曝光模拟失控 |

### 5.2 协议注入

```markdown
## Video Anti-Smudge Protocol

本 Skill 自动将以下协议注入所有视频生成 prompt：

### 时域皮肤一致性（Temporal Skin Consistency）
```
TEMPORAL SKIN: Maintain consistent skin micropore distribution and vellus hair
pattern across ALL frames in this shot. No frame-to-frame texture flickering.
Skin texture must remain stable — pores, blemishes, and subsurface scattering
must NOT shift, fade, or regenerate between frames.
```

### 物理真实性（Physical Motion）
```
PHYSICAL MOTION: Every movement must follow real-world physics.
Clothing fabric must fold and drape with gravity. Hair must have natural inertia
— delayed response to head turns, individual strand separation during motion.
No "living photo" effect: subjects must have genuine 3D motion, not just a
Ken Burns pan over a still image.
```

### 结构稳定性（Structural Integrity）
```
STRUCTURAL INTEGRITY: Hands must maintain exactly 5 fingers per hand across all
frames. Facial features must not morph, shift, or change proportion. Background
elements must remain geometrically stable unless physically moved. No background
swimming, drifting, or texture regeneration.
```

### 全局排除（Global Negatives）
```
morphing, distortion, frame flickering, texture swimming,
background drifting, living photo effect, uncanny motion,
unstable facial features, finger count changing, limb fusion,
sudden brightness jumps, exposure flickering, color temperature shifts
```
```

---

## 六、5 层风格分层

从 Seedance-2.0 完整移植，适配 DireX：

```typescript
interface StyleLayers {
  medium: MediumLayer;        // 媒介
  surface: SurfaceLayer;      // 表面质感
  palette: PaletteLayer;      // 色彩
  camera: CameraLayer;        // 摄影风格
  motion: MotionLayer;        // 运动节奏
}

// Layer 1: 媒介
type MediumLayer =
  | 'live-action'      // 实拍
  | 'stop-motion'      // 定格动画
  | '2d-animation'     // 二维动画
  | '3d-cgi'           // 三维 CGI
  | 'miniature';        // 微缩模型

// Layer 2: 表面质感
type SurfaceLayer =
  | 'clean-digital'    // 干净数字（默认）
  | '16mm-grain'       // 16mm 胶片颗粒
  | '35mm-grain'       // 35mm 胶片颗粒
  | 'vhs-degradation'  // VHS 降级
  | 'phone-cam'        // 手机摄像头质感
  | 'vintage-lens';    // 老镜头（柔焦/暗角/色散）

// Layer 3: 色彩
type PaletteLayer =
  | 'cinematic-teal'   // 青橙调
  | 'bleach-bypass'    // 银盐保留（低饱和高对比）
  | 'pastel-soft'      // 粉彩柔和
  | 'monochrome'       // 单色
  | 'sodium-orange'    // 钠灯橙（街头/赛博）
  | 'natural-neutral'; // 自然中性

// Layer 4: 摄影风格
type CameraLayer =
  | 'studio-locked'    // 影棚固定
  | 'handheld-doc'     // 手持纪录
  | 'steadicam-float'  // 斯坦尼康悬浮
  | 'drone-sweep'      // 无人机掠过大景
  | 'macro-probe'      // 微距探针
  | 'snorricam-body';  // 随身摄像机（主体保持居中，背景旋转）

// Layer 5: 运动节奏
type MotionLayer =
  | 'gentle-float'     // 轻柔飘浮（慢镜头 48fps→24fps）
  | 'natural-weight'   // 自然物理重量（默认）
  | 'staccato-urgent'  // 断奏紧迫（快切+手持+跳剪感）
  | 'elastic-slowmo'   // 弹性慢镜（速度曲线有缓入缓出）
  | 'chaotic-frenzy';  // 混乱狂暴（不规则运动+意外变焦）
```

### 风格安全规则（Seedance 移植）

```
❌ 禁止：使用工作室/IP/在世艺术家的名字
✅ 替代：描述媒介 + 质感 + 色彩 + 灯光 + 构图 + 时代

❌ "像王家卫的风格" → ✅ "慢快门步进 + 霓虹反射 + 抽帧 + 绿调 + 低角度广角"
❌ "像宫崎骏的电影" → ✅ "手绘动画 + 水彩背景 + 自然主题 + 飞行感 + 柔和色板"
❌ "像 Christopher Nolan" → ✅ "IMAX 宽幅 + 实拍特效 + 交叉剪辑节奏 + 冷色调"
```

---

## 七、多语言视频词汇

### 7.1 架构

继承 Seedance 双层架构：
```
video-vocab/SKILL.md (60 行)    → 接口层：意图声明 + 词汇表 + 去油规则
video-vocab/vocab/zh.md (200 行) → 数据层：功能组织词汇 + 紧凑模板 + 语域规则
video-vocab/vocab/en.md
video-vocab/vocab/ja.md
video-vocab/vocab/ko.md
```

### 7.2 中文核心词汇（已有基础，需扩展）

```typescript
const ZH_VIDEO_VOCAB = {
  // ── 镜头 ──
  shotTypes: {
    '大特写': 'extreme close-up, 局部细节',
    '特写': 'close-up, 面部到肩',
    '中景': 'medium shot, 腰部以上',
    '全景': 'full shot, 全身',
    '远景': 'long shot, 人物占 1/3',
  },
  // ── 运镜 ──
  cameraMoves: {
    '推': 'dolly in, 前进',
    '拉': 'dolly out, 后退',
    '摇': 'pan, 水平旋转',
    '移': 'track, 平移跟拍',
    '升': 'crane up, 上升',
    '降': 'crane down, 下降',
    '跟': 'follow, 追踪主体',
    '环绕': 'orbit, 绕主体旋转',
  },
  // ── 光影 ──
  lighting: {
    '侧光': 'side light, 45° angle, reveals texture',
    '逆光': 'backlight, rim light, hair light',
    '顶光': 'top light, dramatic shadows under brows/nose',
    '底光': 'bottom light, unnatural, horror feel',
    '柔光': 'soft diffused light, large source, minimal shadows',
    '硬光': 'hard light, small source, sharp shadows',
    '窗光': 'window light, natural falloff, single direction',
    '体积光': 'volumetric light, visible light beams, Tyndall effect',
  },
  // ── 去油词 ──
  deSlop: {
    '大片感': '宽银幕 2.39:1 + 浅景深 f/2.0 + 冷调色分级 + 24fps 电影格率',
    '电影感': '变形宽银幕拉伸 + 椭圆焦外 + 胶片颗粒 + 暗角 + 24fps',
    '唯美': '柔光漫射 + 暖色 4500K + 低对比度 + 发丝逆光 + 浅景深',
    'ins风': '1:1 正方构图 + 高调打光 + 暖色滤镜 + 生活化场景',
    '高级感': '≤3 主色 + 大量留白 + 精准材质渲染 + 克制灯光比率',
  },
};
```

### 7.3 英语 Prompt 中间层

**原则**：所有发给模型的 prompt 最终必须是英文（Nano Banana/Seedance/Kling 英文表现最佳）。

```
用户输入(中文) → 7 槽位填充(中文思考) → 逐槽翻译(英文 Prompt) → 发给模型
                                                    ↓
                                          保留: 品牌名/角色名/地名(原文)
```

---

## 八、与现有 video-analyzer.ts 的整合

### 8.1 改造方案

`video-analyzer.ts` 当前是独立函数 `compileVideoPrompt()`。改造为框架的一部分：

```typescript
// 新文件: server/src/systems/agent/video-director.ts

import { compileVideoPrompt } from './video-analyzer.js'; // 保留作为 Scene 槽位润色器

export async function assembleVideoPrompt(params: VideoShotParams): Promise<string> {
  // 1. 填充 7 槽位
  const slots = {
    subject: buildSubjectSlot(params),
    action: buildActionSlot(params),
    scene: await compileVideoPrompt(params.userScene), // 现有润色器
    camera: buildCameraSlot(params.camera),
    lighting: buildLightingSlot(params.lighting),
    audio: buildAudioSlot(params.audio),
    constraints: buildConstraints(params.keep, params.avoid),
  };

  // 2. 注入抗变形协议
  const antiSmudge = injectVideoAntiSmudge(params.hasHumanSubject);

  // 3. 注入连续性令牌（多镜序列模式）
  const continuity = params.shotIndex > 0
    ? injectContinuityToken(params.continuityRules)
    : '';

  // 4. 组装 + 压缩
  return assembleSlots(slots, antiSmudge, continuity, params.tokenBudget);
}

export async function planShotSequence(params: ScriptAnalysis): Promise<VideoShotList> {
  // 从剧本分析结果生成完整 VideoShotList
}

export function validateShotList(shotList: VideoShotList): ValidationResult {
  // 检查镜头时长/景别变化/连续性
}
```

### 8.2 API 端点

```
POST /api/agent/video/direct
  → 接收剧本分析结果 + 用户偏好
  → 返回 VideoShotList (JSON) + 组装后的逐镜 prompt
  → 前端展示分镜计划 → 用户确认 → 逐镜调用 Seedance/Kling

POST /api/agent/video/compile
  → 接收单镜参数
  → 返回组装后的完整英文 prompt
```

---

## 九、示例 Skill：Cinematic Scene

基于本框架的第一个完整 Skill：

```yaml
name: cinematic-scene
category: cinematic
difficulty: intermediate
estimated_credits: 25
node_type: video.generate
description: >
  从场景描述生成电影级视频片段。自动应用导演公式 7 槽位 +
  5 层风格分层 + 抗变形协议。
  Trigger: "电影感视频" "cinematic video" "场景拍摄" "短片"
```

**Workflow**：
1. 用户输入场景描述 + 选择风格偏好（5 层界面）
2. 框架填充 7 槽位 → 输出 `VideoShotList` spec
3. ⏸️ 用户确认分镜计划
4. 逐镜生成视频（可并行非连续镜头）
5. ⏸️ 每镜完成后展示 → 确认/重新生成
6. 输出 VideoGenerateNode（多镜头序列播放器）

---

## 十、实现路线图

| 阶段 | 内容 | 预估 |
|------|------|------|
| **Phase 1** | `video-director.ts` — 7 槽位引擎 + Camera DSL + 抗变形协议 | 核心代码 |
| **Phase 2** | `shot-sequencer.ts` — 多镜头序列编排 + 连续性约束 | 核心代码 |
| **Phase 3** | `style-layers.ts` — 5 层风格分层 + 安全规则 | 核心代码 |
| **Phase 4** | `video-vocab/` — 中/英/日/韩 视频词汇表 | 数据文件 |
| **Phase 5** | `cinematic-scene.skill.md` — 第一个完整视频 Skill | Skill 文件 |
| **Phase 6** | `VideoGenerateNode.tsx` 增强 — 多镜头序列播放器 | 前端改造 |
| **Phase 7** | API 端点 + kie-provider 对接 | 后端集成 |
