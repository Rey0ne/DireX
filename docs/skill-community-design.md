# DireX Skill 社区系统设计 v1.0

> **设计日期**: 2026-08-03 | **参考**: Midjourney 点赞返现 / TapNow TapTV / Lovart Skills
> **目标**: 用户上传 → 审核 → 展示 → 互动 → 激励 完整闭环
> **当前状态**: 无社区功能，Skill 由开发团队硬编码在代码中

---

## 一、整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                      Skill 生命周期                           │
│                                                              │
│  创作 ──→ 上传 ──→ 审核 ──→ 发布 ──→ 使用 ──→ 互动 ──→ 迭代  │
│   │                │         │        │        │        │    │
│   │          ❌ 打回      下架      fork     like    update  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 1.1 三条核心约束

| # | 约束 | 原因 |
|---|------|------|
| 1 | Skill 文件在服务端，不在客户端 | 防止逆向工程 / 保护商业 Skill |
| 2 | 所有上传先过沙箱验证 | 防止恶意 prompt 注入 / NSFW 生成 |
| 3 | 用户永远拥有自己 Skill 的数据主权 | 可随时下架/删除，导出 .skill.md 文件 |

---

## 二、数据模型

### 2.1 Skill 存储

```typescript
// server/src/systems/community/skill-store.ts

interface CommunitySkill {
  // ── 身份 ──
  id: string;                    // UUID v4
  slug: string;                  // URL-friendly: "fashion-editorial-lookbook"
  authorId: string;              // 上传者 user ID
  author: SkillAuthor;

  // ── 内容 ──
  skillFile: SkillFrontmatter;   // YAML frontmatter（来自 .skill.md）
  bodyMarkdown: string;          // markdown body（除去 frontmatter）
  originalFilename: string;      // 上传时的文件名

  // ── 预览 ──
  thumbnail: string;             // CDN URL — 用户上传或系统自动生成
  previewImages: string[];       // 最多 5 张示例图（Skill 产出样例）
  previewVideo: string | null;   // 可选的演示视频

  // ── 元数据 ──
  category: SkillCategory;       // 14 种分类
  difficulty: SkillDifficulty;
  nodeType: NodeType;
  tags: string[];                // 搜索标签
  supportedLanguages: string[];  // 该 Skill 支持的语言

  // ── 版本 ──
  version: string;               // semver
  changelog: VersionEntry[];     // 版本历史

  // ── 状态 ──
  status: SkillStatus;           // draft | pending_review | published | rejected | taken_down
  visibility: 'public' | 'unlisted' | 'private';
  rejectionReason?: string;

  // ── 统计（缓存，定期更新） ──
  stats: SkillStats;

  // ── 时间戳 ──
  createdAt: string;             // ISO
  updatedAt: string;
  publishedAt: string | null;
}
```

### 2.2 用户档案

```typescript
interface CommunityUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;

  // ── 积分系统 ──
  points: PointsAccount;

  // ── 统计 ──
  publishedSkills: number;
  totalLikes: number;            // 累计收到点赞
  totalUses: number;             // 累计被使用次数
  totalRemixes: number;          // 累计被 remix 次数

  // ── 偏好 ──
  preferredLanguage: string;
  notificationSettings: NotificationPrefs;

  // ── 时间戳 ──
  joinedAt: string;
}
```

### 2.3 互动记录

```typescript
interface CommunityInteraction {
  id: string;
  type: 'like' | 'use' | 'remix' | 'comment' | 'report';

  userId: string;
  skillId: string;

  // 仅 remix
  remixSourceSkillId?: string;   // 来源 Skill
  remixResultSkillId?: string;   // 产出的新 Skill

  // 仅 comment
  commentText?: string;
  parentCommentId?: string;      // 回复

  createdAt: string;
}
```

---

## 三、上传与审核管线

### 3.1 上传流程

```
用户拖入 .skill.md 文件
        │
        ▼
┌─────────────────────────┐
│ Step 1: 前端预校验       │  ← 即时反馈
│ · YAML 语法检查          │
│ · 必填字段完整性         │
│ · 文件大小 < 64KB       │
│ · 禁止外部 URL 注入      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Step 2: 服务端验证       │  ← API 异步
│ · 同名 skill 查重        │
│ · 内容安全扫描           │
│ · 沙箱生成测试(1 张图)   │
│ · NSFW 检测              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Step 3: 预览生成         │
│ · 自动生成缩略图(4 张)   │
│ · 生成 spec.json        │
│ · 计算预估积分消耗       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Step 4: 人工审核队列(可选)│
│ · 高风险分类强制人工      │
│ · 低风险自动过           │
│ · 审核通过 → published   │
│ · 审核不通过 → 原因返回  │
└─────────────────────────┘
```

### 3.2 审核规则

| 分类 | 审核模式 | 原因 |
|------|---------|------|
| character / fashion / beauty / cinematic / poster | 沙箱自动过 | 成熟领域，低风险 |
| conceptual / abstract | 自动过 | 产出一目了然 |
| product / food / architectural | 自动过 | 商业合规风险低 |
| **NSFW 检测标记** | **强制人工** | 任何 NSFW 标记 |
| 新用户前 3 个 Skill | 自动过 + 样本抽检 | 防批量恶意上传 |

### 3.3 沙箱验证 API

```typescript
// POST /api/skills/validate
// 上传 .skill.md 文件 → 服务端解析 + 试生成 1 张图 → 返回验证结果

interface ValidationResult {
  passed: boolean;
  checks: {
    yaml: boolean;               // YAML 解析成功
    requiredFields: boolean;     // 必填字段齐全
    dedup: boolean;              // 无同名 skill
    contentSafety: boolean;      // 内容安全通过
    sandboxGen: boolean;         // 沙箱生成成功
    nsfwScreen: boolean;        // NSFW 检测通过
  };
  previewThumbnails?: string[];  // 沙箱生成的 4 张缩略图
  estimatedCredits?: number;     // 预估积分
  warnings: string[];            // 非致命警告
  errors: string[];              // 致命错误（原因）
}
```

### 3.4 上传前端

```tsx
// 上传入口：Skill 市场页顶部 "上传 Skill" 按钮 + 拖拽区域
// 上传过程：进度条（预校验 → 验证中 → 生成预览 → 审核结果）

function SkillUploadFlow() {
  const [phase, setPhase] = useState<'upload' | 'validating' | 'preview' | 'result'>('upload');

  // 拖入 .skill.md → 即时 YAML 解析 → 预览 frontmatter 字段 → 确认后提交
  // 提交后 → 轮询 validation result → 显示缩略图 + 通过/打回
}
```

---

## 四、展示与发现（Skill Marketplace UI）

### 4.1 市场首页

```
┌──────────────────────────────────────────────────────┐
│  🔍 [搜索 Skill...]          [+ 上传 Skill]          │
│                                                      │
│  全部分类  ▼   难度  ▼   排序: 热门  ▼   语言  ▼      │
│                                                      │
├──────────────────────────────────────────────────────┤
│  ┌─── 精选推荐 ──────────────────────────────┐       │
│  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│       │
│  │ │ 缩略图  │ │ 缩略图  │ │ 缩略图  │ │ 缩略图  ││       │
│  │ │ Skill名 │ │ Skill名 │ │ Skill名 │ │ Skill名 ││       │
│  │ │ @作者   │ │ @作者   │ │ @作者   │ │ @作者   ││       │
│  │ │ ★4.8 2k│ │ ★4.7 1k│ │ ★4.9 5k│ │ ★4.6 3k││       │
│  │ └────────┘ └────────┘ └────────┘ └────────┘│       │
│  └──────────────────────────────────────────────┘       │
│                                                      │
│  ┌─── 本周热门 ───────────────────────────────┐       │
│  │ ... 6-card grid ...                        │       │
│  └──────────────────────────────────────────────┘       │
│                                                      │
│  ┌─── 新发布 ────────────────────────────────┐       │
│  │ ... 6-card grid ...                        │       │
│  └──────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

### 4.2 Skill 详情页

```
┌──────────────────────────────────────────────────────┐
│  ← 返回市场                                          │
│                                                      │
│  ┌────────────────────┐                              │
│  │                    │  时装型录                      │
│  │   4 张预览轮播      │  Fashion Lookbook              │
│  │                    │  @designer_xia           │
│  │                    │                              │
│  │  ←  →  ○○○○       │  ★ 4.8 (234)   2.1k 使用      │
│  └────────────────────┘  15 积分 · 中级 · 图像生成    │
│                                                      │
│  [♥ 点赞]  [⬇ 使用此 Skill]  [⎘ Remix]  [🔗 分享]   │
│                                                      │
├──────────────────────────────────────────────────────┤
│  描述                                                │
│  生成时装品牌型录风格的人物图片。支持 1K/2K/4K 分辨率...  │
│                                                      │
│  参数                                                │
│  · 默认比例: 3:4   · 推荐模型: nano-banana-pro        │
│  · 分辨率: 2K       · 语言: zh-CN, en, ja              │
│                                                      │
│  评论 (42)                                           │
│  ┌──────────────────────────────────────────────┐    │
│  │ @user1: 效果很好，皮肤质感很棒！  ★★★★☆        │    │
│  │ @user2: 希望能支持更多背景选项                  │    │
│  │ ...                                          │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  版本历史                                            │
│  v1.2.0 — 修复了高分辨率下的皮肤涂抹问题               │
│  v1.1.0 — 新增日语支持                               │
│  v1.0.0 — 初始发布                                  │
└──────────────────────────────────────────────────────┘
```

### 4.3 搜索与发现

```typescript
// GET /api/skills/search?q=fashion&category=character&difficulty=intermediate&lang=en&sort=popular&page=1

interface SkillSearchParams {
  q?: string;                    // 全文搜索
  category?: SkillCategory;
  difficulty?: SkillDifficulty;
  nodeType?: NodeType;
  lang?: string;                 // 按支持语言过滤
  tags?: string[];
  sort?: 'popular' | 'newest' | 'most_used' | 'top_rated';
  page?: number;                 // 分页
  pageSize?: number;             // 默认 24
}

interface SkillSearchResult {
  skills: SkillCard[];           // 卡片数据（不包含完整 body）
  total: number;
  page: number;
  hasMore: boolean;
}

interface SkillCard {
  id: string;
  slug: string;
  name: string;                  // 用户语言对应的 display_name
  author: { username: string; avatar: string; };
  thumbnail: string;
  category: SkillCategory;
  difficulty: SkillDifficulty;
  estimatedCredits: number;
  stats: { likes: number; uses: number; rating: number; };
  tags: string[];                // 前 3 个标签
}
```

---

## 五、互动系统

### 5.1 互动类型与积分

| 互动 | 操作 | 积分（执行者） | 积分（接收者） | 每日上限 | 重复规则 |
|------|------|-------------|-------------|---------|---------|
| **点赞** ♥ | 点击按钮 | 0 | +1/10 赞 | 接收者: 100/天 | 同一 skill 可取消重赞不计分 |
| **使用** ⬇ | 一键套用 Skill 并生成 | +1 | +2 | 执行者: 20/天<br>接收者: 200/天 | 同一 skill 每小时算 1 次 |
| **Remix** ⎘ | Fork + 修改后发布 | +5 | +10 | 无上限 | 需实质性改动(>30% 差异) |
| **评论** 💬 | 提交评论 | +1 | 0 | 执行者: 10/天 | 每 skill 每用户 1 条有效评论/天 |
| **举报** ⚑ | 提交举报（审核通过） | +2 | — | 10/天 | 恶意举报扣分 |
| **官方推荐** ⭐ | 管理员置顶推荐 | — | +100 | — | 每月每个 Skill 最多 1 次 |
| **每日登录** | 打开应用 | +5 | — | 1/天 | — |
| **首次上传** | 发布第一个 Skill | +50 | — | 仅一次 | — |
| **邀请注册** | 邀请码注册成功 | +20 | — | 200/天 | 被邀请者生成前不结算 |

### 5.2 点赞返现模型（Midjourney 参考）

```
用户 A 发布 Skill → 用户 B 点赞 → A 获得 +0.1 积分
                → 用户 C 使用 → A 获得 +2 积分

累积至 1000 积分 → 可提现 1 USD（或兑换生成积分）
月排行榜 Top 10 → 额外奖励 500 积分
```

### 5.3 Remix/Fork 追踪

```typescript
// Skill 的血缘关系图
//
//  原始 Skill A (author: X)
//      ├── Remix B (author: Y, source: A) — 30% 差异
//      │     ├── Remix D (author: W, source: B) — 链式 Remix
//      │     └── ...
//      └── Remix C (author: Z, source: A) — 50% 差异

interface RemixChain {
  skillId: string;
  sourceSkillId: string | null;  // null = 原创
  remixDepth: number;            // 从原创算起的代数
  remixDiffPercent: number;      // 与源 Skill 的差异百分比
}

// 计算差异：对比 YAML frontmatter + markdown body 的 normalized diff
function calcSkillDiff(source: string, target: string): number {
  // 去掉空白/注释 → 逐行 diff → 变动行数 / 总行数
}
```

---

## 六、激励系统

### 6.1 积分账户

```typescript
interface PointsAccount {
  balance: number;               // 当前可用积分
  lifetime: number;              // 累计获得
  spent: number;                 // 累计消费

  // 冻结（待结算）
  pending: number;               // 审核中/未满条件的积分

  // 历史
  transactions: PointsTransaction[];
}

interface PointsTransaction {
  id: string;
  type: 'earn' | 'spend' | 'pending' | 'refund' | 'withdraw';
  source: PointsSource;          // 收入来源
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;           // 关联的 Skill ID / 互动 ID
  note: string;
  createdAt: string;
}

type PointsSource =
  | 'skill_publish_first'        // 首次上传 +50
  | 'skill_receive_like'         // 收到点赞 +0.1
  | 'skill_receive_use'          // 被使用 +2
  | 'skill_remix'                // Remix 他人 +5
  | 'skill_receive_remix'        // 被 Remix +10
  | 'comment_post'               // 发评论 +1
  | 'report_valid'               // 有效举报 +2
  | 'daily_login'                // 每日登录 +5
  | 'referral'                   // 邀请注册 +20
  | 'official_recommendation'    // 官方推荐 +100
  | 'generate_consume'           // 生成消耗
  | 'withdraw_cash'              // 提现
  | 'admin_adjust';              // 管理员调整
```

### 6.2 反欺诈规则

| 规则 | 检测方式 | 处罚 |
|------|---------|------|
| 小号刷赞 | 同一 IP / 设备指纹 短时间内大量点赞 | 冻结积分，警告 |
| 低质量 Remix | 变更 < 10% 视为复制 | 不计 Remix 积分 |
| 恶意举报 | 连续举报同一作者 N 次且均不成立 | 每次扣 5 分 |
| 自买自卖 | 同 IP 注册多个号互相点赞/使用 | 封号 |
| 脚本刷量 | 异常高频操作模式 | 封号 + IP 黑名单 |

### 6.3 排行榜

```typescript
// GET /api/community/leaderboard?period=monthly&type=earners

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  score: number;               // 当期积分
  topSkill: string;            // 当期最受欢迎的 Skill
  trend: 'up' | 'down' | 'same' | 'new';
}

type LeaderboardType = 'earners' | 'creators' | 'skills';
type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';
```

**排行榜类型**：
- **积分王** (earners) — 当期赚分最多的用户
- **创作王** (creators) — 当期发布 Skill 最多的用户
- **技能王** (skills) — 当期使用量最高的 Skill

---

## 七、一键使用 Skill 流程

### 7.1 用户视角

```
用户在市场浏览 → 看到喜欢的 Skill → 点 "使用此 Skill"
    │
    ▼
┌─────────────────────────────────────────────┐
│ Step 1: 创建节点                             │
│ · 根据 node_type 创建对应节点到画布中心        │
│ · 设置 meta.skill = { id, name, author }    │
│ · 设置 meta.gen 的默认参数（比例/分辨率/模型） │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Step 2: 打开节点面板                         │
│ · 自动填入 Skill 的默认参数                   │
│ · 显示 Skill 的描述 + 示例图（参考）          │
│ · textarea 预填 Skill 的提示模板              │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Step 3: 用户修改 + 生成                      │
│ · 用户编辑 textarea 内容                      │
│ · 点 "生成" → 积分扣减（含 Skill 基础分）     │
│ · 管线注入 Skill 的 system prompt + 规则     │
└─────────────────────────────────────────────┘
```

### 7.2 技术实现

```typescript
// gateway.ts — useSkill()

async function useSkill(skillId: string, canvasState: CanvasState): Promise<{
  nodeId: string;
  nodeType: NodeType;
}> {
  // 1. 获取 Skill 详情
  const skill = await fetch(`/api/skills/${skillId}`).then(r => r.json());

  // 2. 创建节点
  const nodeId = addNode(skill.nodeType, {
    meta: {
      skill: {
        id: skill.id,
        name: skill.name,
        author: skill.author,
        version: skill.version,
      },
      gen: {
        prompt: '', // 用户自己填
        model: skill.modelPreference?.primary || 'nano-banana-pro',
        resolution: skill.resolution?.default || '2K',
        aspectRatio: skill.aspectRatio?.default || '1:1',
      },
    },
  });

  // 3. 记录互动
  await fetch(`/api/skills/${skillId}/use`, { method: 'POST' });

  return { nodeId, nodeType: skill.nodeType };
}
```

---

## 八、API 路由设计

```typescript
// ── Skill 管理 ──

POST   /api/skills/upload              // 上传 .skill.md 文件
GET    /api/skills/validate/:taskId    // 查询验证结果
PUT    /api/skills/:id                 // 更新 Skill（作者本人）
DELETE /api/skills/:id                 // 下架 Skill（作者或管理员）
GET    /api/skills/:id                 // Skill 详情（含完整 body）
GET    /api/skills/:id/versions        // 版本历史
GET    /api/skills/:id/remix-chain     // Remix 血缘链

// ── 市场/搜索 ──

GET    /api/skills/search              // 搜索（q, category, difficulty, sort, page）
GET    /api/skills/featured            // 精选推荐
GET    /api/skills/trending            // 本周热门
GET    /api/skills/new                 // 新发布
GET    /api/skills/categories          // 分类列表 + 计数

// ── 互动 ──

POST   /api/skills/:id/like            // 点赞（toggle）
DELETE /api/skills/:id/like            // 取消点赞
POST   /api/skills/:id/use             // 记录一次使用
POST   /api/skills/:id/remix           // 创建 Remix
POST   /api/skills/:id/comment         // 发评论
GET    /api/skills/:id/comments        // 获取评论列表
POST   /api/skills/:id/report          // 举报

// ── 用户/社区 ──

GET    /api/user/profile/:username     // 用户公开档案
GET    /api/user/skills                // 用户发布的 Skill 列表
GET    /api/user/points/history        // 积分历史
POST   /api/user/points/withdraw       // 申请提现

// ── 排行榜 ──

GET    /api/community/leaderboard      // 排行榜（period + type）
GET    /api/community/stats            // 社区总统计
```

---

## 九、存储方案

### 9.1 文件结构

```
server/data/community/
├── skills/
│   ├── index.json                   // 所有 Skill 的索引（id, slug, name, status, stats）
│   ├── {skill-id}/
│   │   ├── skill.json               // 完整 Skill 数据（不含 markdown body）
│   │   ├── body.md                  // markdown body（大文本单独存储）
│   │   ├── versions/                // 历史版本
│   │   │   ├── v1.0.0.json
│   │   │   └── v1.1.0.json
│   │   └── preview/                 // 自动生成的预览图
│   │       ├── thumb_1.png
│   │       └── thumb_4.png
│   └── ...
├── interactions/
│   ├── likes.jsonl                  // append-only log
│   ├── uses.jsonl
│   ├── comments.jsonl
│   └── remixes.jsonl
├── users/
│   ├── index.json
│   └── {user-id}/
│       ├── profile.json
│       └── points.jsonl             // append-only transaction log
├── leaderboard/
│   ├── weekly-earners.json          // 缓存，定时刷新
│   └── monthly-skills.json
└── reports/                         // 举报记录
    └── index.json
```

### 9.2 为什么不放数据库

- **当前架构** 全部使用文件存储（`state.json`, `script-tasks.json`等）
- 社区规模 < 10,000 Skill 时文件存储完全够用
- 后续可迁 SQLite/Postgres，接口抽象层不变

---

## 十、Skill 市场在 DireX 中的入口

### 10.1 入口位置

```
┌─────────────────────────────────────────┐
│  DireX 主界面                            │
│                                         │
│  ┌── 左侧工具栏 ──┐    ┌── 无限画布 ──┐   │
│  │               │    │             │   │
│  │ [+] 添加节点   │    │   [节点]     │   │
│  │ [🎨] Skill市场 │ ←  │   [节点]    │   │
│  │ [💬] Agent     │    │   [节点]     │   │
│  │ [💰] 积分      │    │             │   │
│  │               │    │             │   │
│  └───────────────┘    └─────────────┘   │
└─────────────────────────────────────────┘
```

### 10.2 两个视图

| 视图 | 入口 | 用途 |
|------|------|------|
| **市场浏览** | 左侧工具栏 Skill 图标 | 全屏浏览/搜索/排行榜/详情 |
| **快速面板** | 右键画布 → "使用 Skill" | 最近使用的 + 推荐 Skill 列表（浮层） |

---

## 十一、实现路线图

| 阶段 | 内容 | 交付物 | 预估 |
|------|------|--------|------|
| **Phase 1: 基础 CRUD** | Skill upload/validate/store/search API + 文件存储 | 后端 8 个 API | ~12h |
| **Phase 2: 市场 UI** | 市场首页 + 详情页 + 搜索 + 分类浏览 | 前端 4 个页面/组件 | ~16h |
| **Phase 3: 一键使用** | 从市场点"使用"→ 创建节点 + 注入 Skill 配置 | 前后端联动 | ~6h |
| **Phase 4: 互动系统** | 点赞/评论/使用记录/Remix 追踪 | API + 前端交互组件 | ~10h |
| **Phase 5: 积分系统** | 积分账户/交易记录/排行榜/反欺诈 | 后端 + 前端积分页 | ~12h |
| **Phase 6: 激励闭环** | 提现/兑换/邀请码/官方推荐 | 后端 + 管理面板 | ~8h |
| **Phase 7: 社区运营** | 通知系统/关注/动态流/审核后台 | 全栈 | ~12h |
| **合计** | | | **~76h** |

### MVP（最小可行社区）

| 内容 | 预估 |
|------|------|
| Skill upload + 自动审核 + 存储 | 8h |
| 市场首页（grid + 搜索 + 分类 filter） | 8h |
| Skill 详情页 + 一键使用按钮 | 6h |
| 点赞 + 使用计数 | 4h |
| 基础积分（上传 + 被赞 + 被用）| 4h |
| **MVP 合计** | **~30h** |

---

## 十二、与现有系统的集成点

### 12.1 Skill 市场 ↔ Agent 管线

当用户通过 Skill 生成时，管线需要知道：
- 这是社区 Skill（从 `meta.skill` 读取）
- Skill 的 system prompt 需要注入（替代默认管线）
- Skill 的 Anti-Smudge Protocol 需要合并到负向词

```typescript
// pipeline.ts — 新增
async function runSkillPipeline(
  userMessage: string,
  skill: CommunitySkill,       // ← 新增参数
  userLanguage: string,
) {
  // 用 Skill 的 bodyMarkdown 作为 system prompt
  // 合并 Skill 的负向词到全局负向词
  // 应用 Skill 的 model/resolution/aspectRatio 偏好
  // 记录互动（use count +1）
}
```

### 12.2 Skill 市场 ↔ 积分系统

使用社区 Skill 生成时，积分计算：
```
总消耗 = Skill 基础消耗 × 分辨率系数 × 张数系数
        + (如果 Skill 标记为 premium) 额外 premium 分（归作者）
```

### 12.3 Skill 市场 ↔ 多语言系统

- Skill 市场 UI 多语言（跟随用户设置）
- Skill 的 `display_name` 按用户语言展示
- 搜索支持跨语言（用 `supportedLanguages` 过滤）
