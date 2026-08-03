# DireX 多语言系统改造方案 v1.0

> **设计日期**: 2026-08-03 | **参考**: Seedance-2.0 双层 vocab 架构 + nano-banana 双语 frontmatter
> **现状**: 全中文 — UI/Agent Prompt/知识库均硬编码中文
> **目标**: 支持 zh-CN / en / ja / ko / ru / es 六种语言，架构可扩展到任意语言

---

## 一、现状摸底

### 1.1 需要改造的层

| 层 | 当前状态 | 文件量 | 改造难度 |
|----|---------|--------|---------|
| **UI 界面** | 所有文字硬编码中文 | ~30 个组件文件 | 中 — 提取字符串 + 引入 i18n |
| **Agent 管线 Prompt** | 所有 system prompt / user message 硬编码中文 | ~8 个管线文件 | 大 — 重构为语言感知的模板引擎 |
| **知识库** | 大部分中文，少量英文术语 | ~10 个 KB 文件 | 大 — 每个条目需要多语言版本 |
| **负向提示词** | 中文写入（NEGATIVE_CLOTHING 等） | ~3 个常量 | 中 — 翻译 + 每种语言补充独有负向词 |
| **风格卡片** | buildStyleCard() 中文输出 | 1 个函数 | 小 — 加语言参数 |
| **错误消息/提示** | 后端中文硬编码 | ~5 个路由文件 | 中 — 提取为语言包 |

### 1.2 不能改的

- **发给生图/生视频模型的 Prompt** — 永远英文（Nano Banana/Seedance/Kling 英文表现最佳）
- **代码标识符** — 变量名/函数名/API 路径不变
- **数据存储格式** — state.json / task-logs.json 保持英文 key

---

## 二、架构设计

### 2.1 三层语言模型

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: UI 层 (react-i18next)                      │
│ 用户看得到的文字 → 按用户语言切换                      │
│ 范围: 按钮/标签/提示/错误/市场/帮助文档                  │
├─────────────────────────────────────────────────────┤
│ Layer 2: Agent 思考层 (English Pivot)                │
│ Agent 内部思考永远用英文 → 翻译为用户语言交付             │
│ 范围: System Prompt / 管线逻辑 / QA 清单               │
│ 模式: 指令 = 英文, 用户沟通 = 跟随用户语言              │
├─────────────────────────────────────────────────────┤
│ Layer 3: 模型 Prompt 层 (English Only)               │
│ 发给 Stable Diffusion / Seedance / Kling / Suno      │
│ 永远英文 → 模型训练数据以英文为主                     │
│ 范围: 所有 `prompt` / `negative_prompt` 字段          │
└─────────────────────────────────────────────────────┘
```

**关键规则**：
- Layer 1 跟用户走（检测 `Accept-Language` / 用户设置）
- Layer 2 英文思考 + 本地化交付
- Layer 3 永远英文（参考标签如 `@Image1` 永不翻译）

### 2.2 语言检测与切换

```
优先级:
1. 用户设置 (localStorage 'direx-language' / 数据库 user.language)
2. 浏览器 Accept-Language header
3. 默认: zh-CN (保持向后兼容)
```

### 2.3 支持的语言

| 代码 | 语言 | 优先级 | 理由 |
|------|------|--------|------|
| `zh-CN` | 简体中文 | P0 | 现有用户群 |
| `en` | 英语 | P0 | 最大潜在市场 |
| `ja` | 日语 | P1 | 亚洲核心市场 + 动漫/设计产业 |
| `ko` | 韩语 | P1 | K-pop/时尚产业 + 高付费意愿 |
| `ru` | 俄语 | P2 | 欧洲大市场 + AI 工具活跃社区 |
| `es` | 西班牙语 | P2 | 全球第二大母语 |

---

## 三、Layer 1: UI 国际化

### 3.1 技术选型

```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

### 3.2 翻译文件结构

```
src/i18n/
├── index.ts                    # i18next 初始化 + 配置
├── locales/
│   ├── zh-CN/
│   │   ├── common.json         # 通用: 按钮/标签/提示
│   │   ├── nodes.json          # 节点类型名称和描述
│   │   ├── errors.json         # 错误消息
│   │   ├── market.json         # Skill 市场
│   │   └── help.json           # 帮助/提示文案
│   ├── en/
│   │   ├── common.json
│   │   ├── nodes.json
│   │   ├── errors.json
│   │   ├── market.json
│   │   └── help.json
│   ├── ja/ ...
│   ├── ko/ ...
│   ├── ru/ ...
│   └── es/ ...
└── useTranslation.ts           # 类型安全的 hook 封装
```

### 3.3 翻译 Key 命名规范

```typescript
// ✅ 语义化 key（按功能分组）
"node.shot.title": "分镜节点"
"node.shot.desc": "结构化分镜描述，景别/运镜/打光"
"action.generate": "生成"
"action.cancel": "取消"
"error.network": "网络连接失败，请检查网络后重试"
"skill.market.empty": "暂无 Skill，去创建第一个吧"

// ❌ 避免
"button_1": "确定"
"text_23": "生成"
```

### 3.4 组件改造示例

```tsx
// 改造前
<button>生成</button>
<span>分镜节点</span>

// 改造后
import { useTranslation } from '../i18n/useTranslation';

function MyComponent() {
  const { t } = useTranslation();
  return (
    <button>{t('action.generate')}</button>
    <span>{t('node.shot.title')}</span>
  );
}
```

### 3.5 UI 层翻译覆盖率估算

| 文件 | 待提取字符串数 | 预估工作量 |
|------|-------------|-----------|
| App.tsx | ~50 | 2h |
| ImageGenerateNode.tsx | ~40 | 1.5h |
| ShotNode.tsx | ~35 | 1h |
| VideoGenerateNode.tsx | ~25 | 1h |
| AudioGenerateNode.tsx | ~20 | 1h |
| Scene3DNode.tsx | ~30 | 1h |
| AgentPanel.tsx | ~15 | 0.5h |
| CreditPanel.tsx | ~15 | 0.5h |
| 其他 ~20 个组件 | ~80 | 3h |
| **合计** | **~310** | **~12h** |

---

## 四、Layer 2: Agent 管线多语言

### 4.1 现状问题

当前管线中所有 system prompt 都是中文：

```typescript
// pipeline.ts — 当前写法
const CHARACTER_EXTRACTION = `你是影视角色设计专家。分析剧本...`;
const KB_RETRIEVAL_PROMPT = `你是知识库检索专家。根据用户需求...`;
```

### 4.2 改造方案：Template Engine

```typescript
// 新文件: server/src/systems/i18n/prompt-templates.ts

type SupportedLang = 'zh-CN' | 'en' | 'ja' | 'ko' | 'ru' | 'es';

interface PromptTemplate {
  system: Record<SupportedLang, string>;    // system prompt（每种语言一个版本）
  userTemplate: string;                      // user message 模板（含 {变量}）
  outputLanguage: 'english' | 'follow_user'; // 输出语言策略
}

const CHARACTER_EXTRACTION: PromptTemplate = {
  system: {
    'zh-CN': `你是影视角色设计专家。分析剧本，提取角色信息...`,
    'en': `You are a film/TV character design expert. Analyze the script and extract character information...`,
    'ja': `あなたは映像キャラクターデザインの専門家です。脚本を分析し、キャラクター情報を抽出します...`,
    'ko': `당신은 영상 캐릭터 디자인 전문가입니다. 대본을 분석하고 캐릭터 정보를 추출합니다...`,
    'ru': `Вы эксперт по дизайну персонажей для кино. Проанализируйте сценарий...`,
    'es': `Eres un experto en diseño de personajes para cine/TV. Analiza el guión...`,
  },
  userTemplate: `Script: {scriptText}\nVisual Style: {visualStyle}`,
  outputLanguage: 'follow_user',  // 角色名/描述语言跟随用户语言
};
```

### 4.3 管线执行流程

```typescript
// pipeline.ts — 改造后

async function runAgentPipeline(
  userMessage: string,
  userLanguage: SupportedLang,   // ← 新增参数
  kbResults: KBResults,
) {
  // 1. 获取对应语言的 system prompt
  const template = getPromptTemplate('character-extraction');
  const systemPrompt = template.system[userLanguage] || template.system['en'];

  // 2. Agent 内部思考用英文，但用户交付物用用户语言
  const deliveryRule = template.outputLanguage === 'follow_user'
    ? `Output all descriptions in ${userLanguage}. Character names in original language.`
    : 'Output in English.';

  // 3. 组装最终 system prompt
  const finalSystem = `${systemPrompt}\n\nLANGUAGE RULE: ${deliveryRule}`;

  // 4. 调用 LLM
  const result = await gpt5Chat([
    { role: 'system', content: finalSystem },
    { role: 'user', content: template.userTemplate.replace('{scriptText}', userMessage) },
  ]);

  return result;
}
```

### 4.4 管线语言策略表

| 管线 | 思考语言 | 输出语言 | 给模型的 Prompt |
|------|---------|---------|--------------|
| character-extract | EN | 跟用户 | EN（role descriptions 跟用户语言） |
| scene-extract | EN | 跟用户 | EN |
| storyboard | EN | 跟用户 | EN（shot prompts 永远 EN） |
| music | EN | 跟用户 | EN（Suno 只接受 EN） |
| style-decide | EN | EN | EN（紧凑卡片） |
| video-director | EN | EN（7 槽位）| EN（Seedance/Kling 最佳） |
| KB search | EN | EN | — |
| Q chat | 跟用户 | 跟用户 | — |
| reverse-prompt | EN | EN | EN（模型训练数据以 EN 为主） |

---

## 五、Layer 2.5: 去油词系统（De-Slop per Language）

### 5.1 为什么每种语言需要独立的去油词表

中文用户说 "大片感"，英语用户说 "cinematic"，日语用户说 "映画のような"——
它们指向的是同一个物理结果，但 token 完全不同。

### 5.2 数据结构

```typescript
// server/src/systems/i18n/deslop/

interface DeSlopEntry {
  trigger: string;           // 用户原文（该语言的模糊词）
  decomposition: string;     // 物理分解（英文，注入 prompt）
  explanation: string;       // 给 Agent 的解释（英文）
  examples: string[];        // 替换示例
}

interface DeSlopRegistry {
  [lang: string]: DeSlopEntry[];
}
```

### 5.3 中文去油词（已有基础，从 photorealism-kb 扩展）

```typescript
const ZH_DESLOP: DeSlopEntry[] = [
  {
    trigger: '大片感',
    decomposition: 'anamorphic 2.39:1 aspect ratio, f/2.0 shallow depth of field, low-angle shot, cool color grade, 24fps cinema frame rate',
    explanation: 'User wants blockbuster visual quality. Break into camera + lens + color specs.',
    examples: ['不要用"大片感"→ 写"变形宽银幕 2.39:1 + 冷调色分级"'],
  },
  {
    trigger: '仙气',
    decomposition: 'soft diffused backlight, hair rim light, flowing translucent white fabric, pale pink/mauve color palette, light mist/atmosphere',
    explanation: 'Ethereal, floating, celestial aesthetic. Focus on fabric movement + backlight.',
    examples: [],
  },
  {
    trigger: '高级感',
    decomposition: '≤3 dominant colors, generous negative space, precise material rendering (SSS, specular, roughness maps), restrained lighting ratios ≤4:1',
    explanation: '"Premium feel" through material accuracy and compositional restraint, not through saturation or complexity.',
    examples: [],
  },
  {
    trigger: '质感',
    decomposition: 'macro detail shot, 45° side light revealing surface texture, sharp micro-contrast, low saturation for material focus',
    explanation: '"Texture/quality feel" → macro photography techniques for revealing surface properties.',
    examples: [],
  },
  {
    trigger: '氛围感',
    decomposition: 'atmospheric perspective, volumetric lighting, visible light beams (Tyndall effect), suspended particles (dust/mist), color wash over entire scene',
    explanation: '"Atmosphere/mood" → physical atmospheric effects, not emotional adjectives.',
    examples: [],
  },
  {
    trigger: 'ins风',
    decomposition: '1:1 square format, high-key lighting, warm color filter (~4800K), lifestyle/domestic setting, shallow depth of field f/2.8',
    explanation: 'Instagram aesthetic = square + bright + warm + lifestyle.',
    examples: [],
  },
  {
    trigger: '赛博朋克',
    decomposition: 'neon color palette (magenta/cyan/orange), volumetric fog, wet reflective surfaces, dense urban verticality, holographic projections, high contrast lighting with deep blacks',
    explanation: 'Well-known aesthetic — but still decompose into physical elements for model precision.',
    examples: [],
  },
];
```

### 5.4 英语去油词

```typescript
const EN_DESLOP: DeSlopEntry[] = [
  {
    trigger: 'cinematic',
    decomposition: 'anamorphic lens distortion, 2.39:1 letterbox, 24fps motion cadence, shallow depth of field f/2.8, color-graded shadows, film grain',
    explanation: 'Most overused word in AI prompting. Always decompose.',
    examples: ['NOT "cinematic lighting" → "key light at 45°, fill ratio 4:1, practical motivated sources"'],
  },
  {
    trigger: 'beautiful',
    decomposition: 'symmetrical facial proportions, clear skin with visible pore texture, natural expression, catchlights in eyes, hair with individual strand separation',
    explanation: 'Subjective quality word → physical observable traits.',
    examples: [],
  },
  {
    trigger: 'epic',
    decomposition: 'extreme wide shot, low angle, massive scale contrast (tiny human vs enormous structure), dramatic sky, god rays through clouds',
    explanation: 'Scale + perspective + atmospheric drama.',
    examples: [],
  },
  {
    trigger: 'vibe',
    decomposition: 'consistent color palette across frame, soft ambient lighting, shallow depth of field, relaxed composition, warm color temperature 4000-5000K',
    explanation: 'Gen Z aesthetic descriptor → create through lighting/color not through the word itself.',
    examples: [],
  },
  {
    trigger: 'clean',
    decomposition: 'minimalist composition, no visual clutter, matte surfaces without specular highlights, neutral color palette, even diffuse lighting',
    explanation: '"Clean" look = minimalism + matte + diffuse.',
    examples: [],
  },
  {
    trigger: 'moody',
    decomposition: 'low-key lighting, single light source, deep shadows (≥8:1 ratio), cool color temperature <4000K, high contrast, negative space >40%',
    explanation: 'Moody = dark + single source + cool + empty space.',
    examples: [],
  },
];
```

### 5.5 日语去油词

```typescript
const JA_DESLOP: DeSlopEntry[] = [
  {
    trigger: 'エモい',
    decomposition: 'sunset backlight, film grain noise, handheld camera slight shake, faded/bleached color grade, nostalgic warmth',
    explanation: 'Emotional/nostalgic aesthetic. Sunset + grain + handheld + faded.',
    examples: [],
  },
  {
    trigger: 'キラキラ',
    decomposition: 'bokeh circles, backlight highlights, water surface reflections, controlled lens flare, specular sparkles',
    explanation: 'Sparkling/twinkling — optical effects, not magical particles.',
    examples: [],
  },
  {
    trigger: 'かわいい',
    decomposition: 'soft diffused lighting, pastel color palette, rounded shapes in composition, shallow depth of field, warm color temperature 5000K',
    explanation: '"Cute" aesthetic → soft light + pastel + round + shallow DOF.',
    examples: [],
  },
  {
    trigger: '渋い',
    decomposition: 'muted/desaturated colors, subtle texture emphasis (wood grain, patina, weathered surfaces), low-key lighting, restrained composition, aging/character in materials',
    explanation: 'Understated, refined, mature elegance — wabi-sabi adjacent.',
    examples: [],
  },
  {
    trigger: '幻想的',
    decomposition: 'ethereal backlighting, atmospheric fog, floating particles (dust/spores/light motes), soft focus edges, desaturated color with one accent hue',
    explanation: 'Fantastical/dreamlike — NOT fantasy genre elements (dragons etc).',
    examples: [],
  },
];
```

### 5.6 韩语去油词

```typescript
const KO_DESLOP: DeSlopEntry[] = [
  {
    trigger: '감성적인',
    decomposition: 'warm color temperature 3500-4500K, shallow depth of field f/1.8-f/2.8, soft natural window light, slight desaturation, film-like grain',
    explanation: '"Gam-seong" — the most central and untranslatable Korean aesthetic word. Decompose into warm + shallow + soft + slightly faded.',
    examples: [],
  },
  {
    trigger: '분위기 있는',
    decomposition: 'atmospheric haze, single motivated light source, deep shadows, intentional negative space, mood-focused rather than action-focused',
    explanation: '"Has atmosphere/mood" — prioritize atmosphere over subject clarity.',
    examples: [],
  },
  {
    trigger: '깔끔한',
    decomposition: 'clean geometric composition, matte surfaces, neutral color palette (white/grey/beige), even soft lighting, no visual clutter',
    explanation: 'Clean/tidy aesthetic — similar to minimalist but specifically Korean interpretation.',
    examples: [],
  },
  {
    trigger: '고급스러운',
    decomposition: '≤3 colors, material emphasis (marble, brushed metal, leather grain), restrained lighting ratio ≤3:1, generous whitespace, no ostentatious elements',
    explanation: 'Luxury/premium feel — Korean aesthetic = understated luxury, not flashy.',
    examples: [],
  },
];
```

### 5.7 去油词注入规则

```
规则优先级（从高到低）：
1. 用户显式声明了物理参数 → 不触发去油（用户知道自己在说什么）
2. 用户 prompt 含去油词触发器 → 自动替换为分解后的物理描述
3. 同一 prompt 含多个去油词 → 全部分解，优先保留特异性最强的
4. 去油词之间冲突 → 安全方向优先（若同时要求"柔和"和"高对比" → 保留后者，加注释）
```

---

## 六、审美文化概念物理分解

### 6.1 中文审美概念

```typescript
const ZH_AESTHETIC_CONCEPTS = {
  '武侠': {
    physical: 'flowing wide-sleeve robes, fabric billowing in wind, bamboo forest shadows, ink-wash color palette (black/white/grey with one accent), negative space composition, slow-motion action with visible fabric physics',
    forbidden: 'western armor, modern weapons, neon lights, tight clothing',
  },
  '水墨': {
    physical: 'ink-wash painting aesthetic — black ink gradients on rice paper texture, minimal color (one accent hue max), brushstroke edges, wet-ink bleeding effect at borders, large empty space (留白)',
    forbidden: 'photorealism, 3D rendering, sharp edges, full color spectrum',
  },
  '古风': {
    physical: 'traditional Chinese aesthetic — natural materials (silk, wood, jade, porcelain), flowing fabric, hair ornaments (簪/钗/步摇), muted color palette inspired by dynastic art, soft natural lighting',
    forbidden: 'modern zippers, buttons, synthetic fabrics, modern architecture',
  },
};
```

### 6.2 日语审美概念

```typescript
const JA_AESTHETIC_CONCEPTS = {
  '間 (Ma)': {
    physical: 'intentional pause/emptiness — negative space 40-60%, static camera for 2+ seconds, silence or minimal ambient sound, breathing rhythm in editing, compositional balance through absence',
    forbidden: 'busy frame, rapid cuts, constant motion, filled silence',
  },
  '侘寂 (Wabi-sabi)': {
    physical: 'imperfect/weathered beauty — visible material aging (wood grain, rust patina, crackled glaze), asymmetrical composition, natural uneven light, muted earthy color palette, handcrafted irregularities',
    forbidden: 'perfect symmetry, pristine surfaces, glossy finishes, machine precision',
  },
  'もののあはれ': {
    physical: 'bittersweet transience — cherry blossom petals falling, soft focus edges, golden hour light (magic hour), slight desaturation, contemplative stillness, gentle slow motion',
    forbidden: 'high energy, saturated colors, sharp focus throughout, happy/commercial tone',
  },
};
```

### 6.3 韩语审美概念

```typescript
const KO_AESTHETIC_CONCEPTS = {
  '한 (恨)': {
    physical: 'deep collective sorrow — desaturated cool palette, single isolated figure in wide landscape, static long take, overcast/diffused light, empty space dominating frame, slow contemplative pacing, minimal camera movement',
    forbidden: 'bright colors, multiple characters interacting, fast editing, upbeat music',
  },
  '흥 (興)': {
    physical: 'collective joyful energy — dynamic group movement, warm saturated colors, rhythmic editing matching music beat, handheld camera energy, overlapping action in frame, natural laughter expressions',
    forbidden: 'static poses, solo figure, cool color temperature, formal composition',
  },
};
```

---

## 七、语级/敬语系统（Ja/Ko 专属）

### 7.1 日语三语级 + 音节预算

```typescript
const JA_REGISTER = {
  'です・ます体 (丁寧)': {
    usage: '标准礼貌 — 客服/教学/正式 Skill',
    moraBudget: null,  // 不限
    verbRule: '动词用 ます形, 句尾加 です/ます',
    example: '生成を開始します。設定を確認してください。',
  },
  'だ・である体 (常体)': {
    usage: '专业/技术 — Skill 内部指令',
    moraBudget: 40,    // 每句最大 40 モーラ
    verbRule: '动词用终止形, 句尾加 だ/である',
    example: '生成を開始する。設定を確認せよ。',
  },
  'タメ口 (カジュアル)': {
    usage: '朋友/社区 — 仅限用户明确要求',
    moraBudget: null,  // 不限，但禁用敬语动词
    verbRule: '禁用 です/ます, 禁用敬语动词 (いらっしゃる/召し上がる 等)',
    example: '生成始めるね。設定チェックして。',
  },
};
```

### 7.2 韩语三语级 + 音节预算

```typescript
const KO_REGISTER = {
  '합쇼체 (합니다)': {
    usage: '正式 — 客服/教学/正式 Skill',
    syllableBudget: null,  // 不限
    verbRule: '动词用 ㅂ니다/습니다 结尾',
    example: '생성을 시작합니다. 설정을 확인하십시오.',
  },
  '해요체 (해요)': {
    usage: '日常礼貌 — 默认 UI',
    syllableBudget: 35,    // 每句最大 35 음절
    verbRule: '动词用 아요/어요 结尾',
    example: '생성을 시작해요. 설정을 확인해 주세요.',
  },
  '해체 (반말)': {
    usage: '亲密/社区 — 仅限用户明确要求',
    syllableBudget: null,
    verbRule: '禁用所有敬语词尾，用 반말',
    example: '생성 시작해. 설정 확인해.',
  },
};
```

### 7.3 语级自动选择规则

```
if (user.language === 'ja' || user.language === 'ko') {
  if (skill.category === 'utility' && skill.difficulty === 'advanced') {
    register = '常体 / 해요체';  // 技术 Skill 用中性专业语气
  } else if (context === 'community_sharing') {
    register = 'タメ口 / 해체';  // 社区分享用轻松语气
  } else {
    register = 'です・ます体 / 해요체';  // 默认礼貌
  }
}
```

---

## 八、知识库多语言

### 8.1 改造策略

知识库条目量太大（10,791 行），不可能一次性翻译。分层改造：

| 优先级 | 内容 | 策略 |
|--------|------|------|
| P0 | KB_CATALOG（目录） | 翻译为 6 种语言 — LLM 需要知道可检索范围 |
| P0 | KB_RETRIEVAL_PROMPT（检索引导） | 翻译为 6 种语言 |
| P1 | 高频条目（每个 KB 前 20 条） | 翻译为 6 种语言 |
| P2 | 负向提示词 | 翻译 + 每种语言补充语言特有负向词 |
| P3 | 全量 KB 条目 | 逐步翻译，利用 LLM 辅助 |

### 8.2 KB_CATALOG 多语言示例

```typescript
// server/src/systems/i18n/kb-catalog.ts

export const KB_CATALOG_I18N: Record<SupportedLang, string> = {
  'zh-CN': `## 音乐知识库目录
- 电影配乐大师: John Williams, Hans Zimmer, 久石让, 坂本龙一...
- 电子/实验流派: Ambient, IDM, Noise, Drone...
- 戏曲: 京剧, 昆曲, 越剧, 秦腔...
- 国风电子: 古筝Trap, 琵琶House, 笛子DnB...
...`,

  'en': `## Music Knowledge Base Catalog
- Film Score Composers: John Williams, Hans Zimmer, Joe Hisaishi, Ryuichi Sakamoto...
- Electronic/Experimental: Ambient, IDM, Noise, Drone...
- Chinese Opera: Peking Opera, Kunqu Opera, Yue Opera...
- Guofeng Electronic: Guzheng Trap, Pipa House, Dizi DnB...
...`,

  'ja': `## 音楽知識ベースカタログ
- 映画音楽作曲家: ジョン・ウィリアムズ, ハンス・ジマー, 久石譲, 坂本龍一...
- 電子/実験音楽: アンビエント, IDM, ノイズ, ドローン...
- 中国伝統戲曲: 京劇, 昆曲, 越劇...
...`,

  // ko, ru, es ...
};
```

### 8.3 负向提示词多语言 + 语言特有补充

```typescript
// 每种语言的负向词分两部分：通用 + 语言特有

const NEGATIVE_PROMPTS_I18N: Record<SupportedLang, { universal: string; local: string }> = {
  'zh-CN': {
    universal: 'plastic skin, waxy, airbrushed, doll-like, CGI, uncanny valley, distorted hands, extra fingers, morphing',
    local: '网红脸, 美颜滤镜, 过度磨皮, 蛇精脸, 尖下巴, 大眼特效, 韩式半永久',
  },
  'en': {
    universal: 'plastic skin, waxy, airbrushed, doll-like, CGI, uncanny valley, distorted hands, extra fingers, morphing',
    local: 'Instagram face, lip fillers, buccal fat removal look, facetune, snapchat filter',
  },
  'ja': {
    universal: 'plastic skin, waxy, airbrushed, doll-like, CGI, uncanny valley, distorted hands, extra fingers, morphing',
    local: '加工アプリ顔, 美白フィルター, 小顔補正, 二重整形痕, バーチャルYouTuber風',
  },
  'ko': {
    universal: 'plastic skin, waxy, airbrushed, doll-like, CGI, uncanny valley, distorted hands, extra fingers, morphing',
    local: '성형외과 광고, 과도한 피부보정, 브이앱 필터, 셀카 보정, 강남스타일 얼굴, 뽀샤시',
  },
  'ru': {
    universal: 'plastic skin, waxy, airbrushed, doll-like, CGI, uncanny valley, distorted hands, extra fingers, morphing',
    local: 'инстаграм-фильтр, фотошоп-лицо, кукольная внешность, неестественная ретушь',
  },
  'es': {
    universal: 'plastic skin, waxy, airbrushed, doll-like, CGI, uncanny valley, distorted hands, extra fingers, morphing',
    local: 'filtro de Instagram, cara de photoshop, retoque excesivo, piel de porcelana falsa',
  },
};
```

---

## 九、实现路线图

| 阶段 | 内容 | 交付物 | 预估 |
|------|------|--------|------|
| **Phase 1: UI 框架** | react-i18next 初始化 + 中/英 common.json | `src/i18n/` | ~4h |
| **Phase 2: UI 全量翻译** | 所有组件字符串提取 + 中/英翻译 | 30 个组件改造 | ~12h |
| **Phase 3: Agent 管线** | Prompt Template Engine + 中/英 system prompt | `server/src/systems/i18n/` | ~8h |
| **Phase 4: 去油词系统** | 6 语言 De-Slop 注册表 + 自动注入 | `server/src/systems/i18n/deslop/` | ~6h |
| **Phase 5: 审美概念** | 中日韩审美概念物理分解 | 数据文件 | ~4h |
| **Phase 6: 敬语系统** | Ja/Ko 语级 + 音节预算 | 数据文件 | ~3h |
| **Phase 7: KB 多语言** | KB_CATALOG 6 语言 + 高频条目 | KB 文件 | ~8h |
| **Phase 8: Ja/Ko/Ru/Es** | 其余四种语言补充 | 翻译文件 | ~20h |
| **合计** | | | **~65h** |

### 最小可行版本（MVP — 先支持中/英）

| 阶段 | 内容 | 预估 |
|------|------|------|
| UI 框架 + 中/英 common | react-i18next + 基础翻译 | 4h |
| 10 个核心组件中/英翻译 | ShotNode, ImageGenerateNode, VideoGenerateNode... | 6h |
| Prompt Template Engine | 管线 system prompt 中/英双版 | 4h |
| 中/英去油词表 | 30+ 条中英去油词 | 2h |
| KB_CATALOG 中/英 | 目录双语 | 2h |
| **MVP 合计** | | **~18h** |
