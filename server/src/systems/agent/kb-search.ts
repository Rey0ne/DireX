/* === Unified Knowledge Base Search Engine ===
 * Purpose: Fast cross-KB lookup for the two-round retrieval pipeline.
 *   Round 1: GPT reads KB_CATALOG → outputs keywords
 *   Round 2: quickLookup(keywords, filters) → aggregated results from all 8 KBs
 *
 * Performance: Pure code, ~0ms per search. No LLM calls.
 * Architecture: Each KB exposes a search function → quickLookup fans out.
 */

import { searchWritersKB, WRITERS_KB_FULL } from './writers-kb.js';
import { searchVisualKB, VISUAL_KB_FULL } from './cinematography-kb.js';
import { searchComposers, formatComposerContext, type ComposerProfile } from './composer-kb.js';
import {
  searchGenres, searchEthnicStyles, searchEmotions, searchInstruments,
  matchNarrativeScene, formatKBContext, queryMusicKB,
  type MusicMetadata, type MusicPrescription,
} from './music-kb.js';
import { getHistoricalKBForEra, searchHistoryKB } from './history-kb.js';
import { buildPhotorealismLayer, buildPhotorealismLayerCompact } from './photorealism-kb.js';
import { searchSpatialKB } from './spatial-kb.js';
import { searchStyleKB } from './style-db.js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type KBCategory =
  | 'music'           // composer + genre
  | 'visual'          // cinematographer + director + painter + photographer
  | 'spatial'         // architect + interior designer
  | 'narrative'       // writer + narrative theory
  | 'costume'         // historical costume + style
  | 'photorealism'    // photorealism layers
  | 'all';

export interface SearchFilters {
  /** Limit to specific KB categories */
  categories?: KBCategory[];
  /** Era filter: 'ancient' | 'medieval' | 'early-modern' | 'modern' | 'contemporary' */
  era?: string;
  /** Region filter: 'China' | 'Japan' | 'Europe' | 'USA' | 'India' | 'Middle-East' | 'Global' etc. */
  region?: string;
  /** Max results per KB */
  topN?: number;
}

export interface KBResult {
  /** Which KB this result came from */
  kb: KBCategory;
  /** Category within the KB (e.g. 'cinematographer', 'painter') */
  subCategory: string;
  /** Display name */
  name: string;
  /** Key techniques / signature */
  signature: string;
  /** Best use cases */
  bestFor: string;
  /** Tags for downstream use */
  tags: string;
  /** Relevance score (higher = better) */
  score: number;
  /** Raw entry for advanced use */
  raw: unknown;
}

export interface QuickLookupResult {
  query: string;
  filters: SearchFilters;
  results: KBResult[];
  /** Aggregated keywords suitable for prompt injection */
  promptHints: string;
  /** Aggregated instrument/technique lists */
  aggregatedTags: string[];
  /** Elapsed time (diagnostic) */
  elapsedMs: number;
}

// ═══════════════════════════════════════════════════════════════
// UNIFIED CATALOG (for GPT Round 1)
// ═══════════════════════════════════════════════════════════════

export const UNIFIED_KB_CATALOG = `# DireX 知识库总目录 (Unified Knowledge Base Catalog)

你可以在以下 8 个知识库中检索。每个知识库覆盖一个创作维度。

## 🎵 音乐 (Music)
- **作曲家数据库 (200位)** — 电影配乐/古典/电子/游戏/世界/爵士/摇滚/先锋。按情绪/场景/乐器/Suno关键词检索。
- **音乐流派数据库** — 200+ 流派 / 800+ 子流派 / 150+ 民族风格 / 100+ 情绪 / 500+ 乐器 / 100+ 制作风格 / 300+ 叙事场景。

## 🎬 视觉风格 (Visual)
- **摄影指导数据库 (55人)** — 全球覆盖(欧美+中/日/韩/印) — Roger Deakins自然主义 / Chivo Lubezki全自然光 / Bradford Young暗肤曝光 / Gordon Willis暗调教父 / Gregg Toland深焦 / 宫川一夫黑泽明 / Christopher Doyle霓虹香港 / 赵小丁张艺谋色彩。
- **导演视觉数据库 (40人)** — 全球覆盖(欧美+中/日/韩/印/东南亚) — Kubrick单点透视 / Hitchcock悬疑 / 黑泽明天气即戏剧 / 小津安二郎榻榻米机位 / 张艺谋单色专制 / 朴赞郁巴洛克暴力 / 奉俊昊对称构图。
- **美术指导数据库 (22人)** — 叶锦添东方奇幻 / 张叔平花样年华 / Dante Ferretti黑暗美学 / Rick Carter阿凡达 / Sarah Greenwood赎罪 / Eugenio Caballero潘神的迷宫。
- **画家数据库 (25人)** — 全球覆盖(中/韩/日/印/欧美) — 张大千泼墨 / 齐白石写意 / Turner光溶解 / 梵高旋涡 / Rothko色域 / 伊藤若冲 / 金弘道朝鲜风俗 / Frida Kahlo。
- **摄影师数据库 (17人)** — Cartier-Bresson决定性瞬间 / 森山大道高反差 / 何藩几何光影 / Nan Goldin私摄影 / William Eggleston色彩 / 荒木经惟 / 杉本博司。
- **动画师数据库 (10人)** — 宫崎骏 / 高畑勋 / 今敏 / Tex Avery / Jan Svankmajer / Don Hertzfeldt。

## 🏛️ 空间设计 (Spatial)
- **室内设计师数据库 (60+)** — 法国/北欧/荷兰/比利时/美国/英国/澳洲/中国/日本/韩国/印度。Christian Liaigre低调奢华 / Kelly Wearstler加州折中 / 如恩设计中国当代。
- **建筑大师数据库 (80+)** — 日本20+ / 法国 / 瑞士 / 德国 / 英国 / 西班牙 / 意大利 / 丹麦 / 荷兰 / 葡萄牙 / 芬兰 / 中国 / 韩国 / 印度 / 拉美 / 中东。安藤忠雄光之教堂 / 隈研吾粒子化 / Zaha Hadid流体 / 王澍乡土现代。
- **景观/园林** — 日式禅园/中式文人园/英式自然园/法式几何园。

## 📝 叙事 (Narrative)
- **作家数据库 (86+)** — 中国古典(四大名著/聊斋/金瓶梅/三国演义新解/水浒/西游/红楼梦7篇) / 中国现代(鲁迅/老舍/张爱玲/金庸/余华/莫言/刘慈欣/王安忆/苏童/贾平凹/陈忠实/王小波/钱钟书/沈从文/巴金15位) / 日本(川端/村上/三岛/夏目漱石/大江健三郎/太宰治/芥川龙之介) / 韩国(韩江/金英夏/申京淑) / 俄国欧洲(陀思妥/托尔斯泰/契诃夫/普希金/果戈理/布尔加科夫/昆德拉/卡尔维诺/波拉尼奥) / 英美(莎士比亚/海明威/福克纳/阿加莎/狄更斯/王尔德/奥威尔/伍尔夫) / 拉美(马尔克斯/博尔赫斯/略萨/富恩特斯) / 非洲(阿契贝/提安哥/索因卡) / 中东(帕慕克/马哈福兹)。
- **叙事理论 (16+)** — Save the Cat! / 英雄之旅 / McKee故事 / Truby解剖故事 / 五幕剧 / 三幕剧 / 英雄之旅变形 / 關子书 / 金圣叹批评 / 李渔闲情偶寄 / 普罗普形态学 / 坎贝尔神话 / 中国编剧理论6条目 / 导演叙事大师3位。

## 👘 时代服饰 (Costume)
- **中国历代服饰** — 商/西周/春秋战国/秦/汉/魏晋/唐/宋/元/明/清/民国 — 每代廓形/面料/配色/纹样/配饰/鞋履/闭合方式。
- **世界文明服饰** — 埃及/美索不达米亚/米诺斯/希腊/罗马/拜占庭/中世纪/文艺复兴/平安/江户/朝鲜/莫卧儿/奥斯曼/阿兹特克/印加/马里/贝宁 + **新增28文明**: 东南亚6(高棉/泰/越/缅/印尼/菲律宾) / 前哥伦布美洲3(阿兹特克/玛雅/印加) / 非洲8(库施/津巴布韦/马里/贝宁/阿克苏姆/斯瓦希里/祖鲁/阿散蒂) / 伊斯兰5(阿拔斯/法蒂玛/奥斯曼/萨法维/莫卧儿) / 斯拉夫东欧3(基辅罗斯/波兰立陶宛/巴尔干) / 太平洋岛民3(毛利/夏威夷/萨摩亚)。
- **时代错位守卫** — 按时代的禁止元素（闭合方式/面料/鞋履/电子设备等）。

## 📷 真实感 (Photorealism)
- 负面提示词(消除塑料/CGI/动漫感) / 真实感锚点(ARRI Alexa 65/Hasselblad) / 电影灯光(9种模式/色温K值/光比) / 镜头模拟(14-300mm) / 材质表面(皮肤SSS/10种面料) / 氛围深度(大气透视/体积光/景深) / 构图指南。

## 🎨 时尚风格 (Style)
- FASHION_STYLE_DB — 30+ 当代风格 + 18 历史/传统风格（汉服先秦/唐/宋/明/清旗装/旗袍民国/和服平安/江户/韩服朝鲜/印度古典/莫卧儿/中东伊斯兰/欧洲中世纪/文艺复兴/维多利亚/爱德华/非洲传统/拉美传统）。
- ERA_MAP (13时代) / REGION_MAP (16区域) / FUNCTION_MAP (17功能) / MOOD_MAP (10情绪) / IDENTITY_MAP (17身份) — 5维风格决策引擎。
- 由 `lookupEraCostume(era)` 自动匹配历史风格，非当代时代自动注入。

---

请在分析创作需求后，选择 5-10 个需要检索的方向。
输出格式（每行一个）：
KB类别：关键词——简短说明用途

例如对于一部"盛唐长安宫廷爱情与武侠"的剧本：
视觉-摄影师：赵小丁张艺谋式色彩——盛唐华彩视觉
视觉-美术指导：叶锦添东方奇幻——宫廷场景设计
空间-建筑：中国唐代建筑佛光寺大明宫——场景参考
服饰-中国历代：唐代服饰廓形面料配色——角色设计
叙事-作家：金庸武侠史诗——叙事结构
音乐-作曲家：谭盾卧虎藏龙民乐+管弦——配乐风格
视觉-灯光：Rembrandt明暗法——宫廷内景
空间-园林：中式文人园——园林场景`;

// ═══════════════════════════════════════════════════════════════
// SEARCH ENGINE
// ═══════════════════════════════════════════════════════════════

function tokenize(query: string): string[] {
  return query.toLowerCase()
    .split(/[\s,，、/\-—|]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
}

function scoreMatch(haystack: string, tokens: string[]): number {
  const h = haystack.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (h.includes(t)) score += t.length >= 4 ? 3 : 2;
    // Partial match (substring of 2+ chars)
    for (let i = 0; i <= t.length - 2; i++) {
      if (h.includes(t.substring(i, i + 2))) score += 0.5;
    }
  }
  return score;
}

/**
 * Quick lookup across all knowledge bases.
 * @param query - Keywords to search for (space/comma/Chinese-separated)
 * @param filters - Optional category/era/region filters
 * @returns Aggregated, scored results from all matching KBs
 */
export function quickLookup(query: string, filters: SearchFilters = {}): QuickLookupResult {
  const t0 = Date.now();
  const tokens = tokenize(query);
  const categories = filters.categories || ['all'];
  const topN = filters.topN || 5;
  const results: KBResult[] = [];

  const want = (cat: KBCategory): boolean =>
    categories.includes('all') || categories.includes(cat);

  // ── 1. Music KBs ──
  if (want('music')) {
    // Composers
    try {
      const composers = searchComposers(query, topN);
      for (const c of composers.slice(0, topN)) {
        results.push({
          kb: 'music', subCategory: c.type || 'composer',
          name: `${c.name} (${c.nameCN})`,
          signature: c.stylesCN?.join('/') || c.styles?.join('/') || '',
          bestFor: c.scenesCN?.join(', ') || '',
          tags: (c.tags || []).join(', '),
          score: 10 + (c.influence === 'SSS' ? 5 : c.influence === 'SS' ? 3 : c.influence === 'S' ? 1 : 0),
          raw: c,
        });
      }
    } catch { /* KB not loaded */ }

    // Music genres
    try {
      const genres = searchGenres(query, topN);
      for (const g of genres.slice(0, 3)) {
        results.push({
          kb: 'music', subCategory: 'genre',
          name: `${g.name} (${g.nameCN})`,
          signature: g.tags?.join(', ') || '',
          bestFor: g.mood?.join(', ') || '',
          tags: (g.tags || []).join(', '),
          score: 8,
          raw: g,
        });
      }
    } catch { /* KB not loaded */ }

    // Ethnic styles
    try {
      const ethnic = searchEthnicStyles(query, 3);
      for (const e of ethnic) {
        results.push({
          kb: 'music', subCategory: 'ethnic',
          name: `${e.name} (${e.nameCN}) — ${e.regionCN}`,
          signature: e.instrumentsCN?.join(', ') || '',
          bestFor: e.tags?.join(', ') || '',
          tags: (e.tags || []).join(', '),
          score: 8,
          raw: e,
        });
      }
    } catch { /* KB not loaded */ }

    // Instruments
    try {
      const instruments = searchInstruments(query, undefined, 5);
      for (const inst of instruments.slice(0, 3)) {
        results.push({
          kb: 'music', subCategory: 'instrument',
          name: `${inst.name} (${inst.nameCN}) — ${inst.family}`,
          signature: inst.emotions?.join(', ') || '',
          bestFor: '',
          tags: (inst.emotions || []).join(', '),
          score: 7,
          raw: inst,
        });
      }
    } catch { /* KB not loaded */ }
  }

  // ── 2. Visual KB — Cinematographers, Directors, Painters, Photographers ──
  if (want('visual')) {
    try {
      const visualText = searchVisualKB(query);
      // Parse the formatted text results into structured entries
      const blocks = visualText.split('\n\n---\n\n');
      for (const block of blocks.slice(0, topN)) {
        const nameMatch = block.match(/^### (.+?) \(/m);
        const catMatch = block.match(/\((.+?) \//);
        const tagsMatch = block.match(/tags: (.+)/);
        const techMatch = block.match(/\*\*Technique\*\*: (.+)/);
        const bestMatch = block.match(/\*\*Best for\*\*: (.+)/);
        if (nameMatch) {
          results.push({
            kb: 'visual',
            subCategory: catMatch?.[1] || '',
            name: nameMatch[1],
            signature: techMatch?.[1] || '',
            bestFor: bestMatch?.[1] || '',
            tags: tagsMatch?.[1] || '',
            score: 9,
            raw: block,
          });
        }
      }
    } catch { /* KB not loaded */ }
  }

  // ── 3. Spatial KB — Architects, Interior Designers ──
  if (want('spatial')) {
    try {
      const spatialText = searchSpatialKB(query);
      // Parse formatted results
      const blocks = spatialText.split('\n\n---\n\n');
      for (const block of blocks.slice(0, topN)) {
        const nameMatch = block.match(/^### (.+)/m);
        const sigMatch = block.match(/\*\*视觉签名\*\*: (.+)/);
        const matMatch = block.match(/\*\*材质\*\*: (.+)/);
        if (nameMatch) {
          results.push({
            kb: 'spatial',
            subCategory: block.includes('建筑师') ? 'architect' : 'interior-designer',
            name: nameMatch[1],
            signature: sigMatch?.[1] || '',
            bestFor: matMatch?.[1] || '',
            tags: '',
            score: 9,
            raw: block,
          });
        }
      }
    } catch { /* KB not loaded */ }
  }

  // ── 4. Narrative KB — Writers ──
  if (want('narrative')) {
    try {
      const writerText = searchWritersKB(query);
      const blocks = writerText.split('\n\n---\n\n');
      for (const block of blocks.slice(0, topN)) {
        const nameMatch = block.match(/^### (.+?) \(/m);
        const tagsMatch = block.match(/tags: (.+)/);
        const techMatch = block.match(/\*\*技法\*\*: (.+)/);
        const bestMatch = block.match(/\*\*最适合\*\*: (.+)/);
        if (nameMatch) {
          results.push({
            kb: 'narrative', subCategory: 'writer',
            name: nameMatch[1],
            signature: techMatch?.[1] || '',
            bestFor: bestMatch?.[1] || '',
            tags: tagsMatch?.[1] || '',
            score: 9,
            raw: block,
          });
        }
      }
    } catch { /* KB not loaded */ }
  }

  // ── 5. Costume KB — History + Style ──
  if (want('costume')) {
    // History KB search
    try {
      const historyText = searchHistoryKB(query);
      if (historyText) {
        const blocks = historyText.split('\n\n---\n\n');
        for (const block of blocks.slice(0, topN)) {
          const nameMatch = block.match(/^### (.+)/m);
          if (nameMatch) {
            results.push({
              kb: 'costume', subCategory: 'historical-costume',
              name: nameMatch[1],
              signature: block.substring(0, 200).replace(/\n/g, ' '),
              bestFor: '角色服装设计 / 时代道具',
              tags: nameMatch[1],
              score: 10,
              raw: block,
            });
          }
        }
      }
    } catch { /* KB not loaded */ }

    // Style KB search
    try {
      const styleText = searchStyleKB(query);
      if (styleText) {
        const lines = styleText.split('\n').filter(l => l.startsWith('|'));
        for (const line of lines.slice(0, 5)) {
          const cols = line.split('|').map(c => c.trim()).filter(Boolean);
          if (cols.length >= 3) {
            results.push({
              kb: 'costume', subCategory: 'fashion-style',
              name: cols[0] || '风格',
              signature: `廓形: ${cols[1] || ''} | 面料: ${cols[2] || ''} | 配色: ${cols[3] || ''}`,
              bestFor: cols[4] || '',
              tags: cols[0] || '',
              score: 7,
              raw: line,
            });
          }
        }
      }
    } catch { /* KB not loaded */ }
  }

  // ── 6. Photorealism KB ──
  if (want('photorealism')) {
    const photoKeywords = ['真实感', '电影质感', 'photorealism', 'cinematic', 'photoreal', '灯光', 'lighting', '镜头', 'lens', '皮肤', 'skin', '材质', 'material', '氛围', 'atmosphere', '构图', 'composition'];
    const hasPhotoKW = tokens.some(t => photoKeywords.some(kw => kw.includes(t) || t.includes(kw)));
    if (hasPhotoKW || categories.includes('all')) {
      results.push({
        kb: 'photorealism',
        subCategory: 'photorealism-layer',
        name: '真实感增强层',
        signature: 'ARRI Alexa 65 / Hasselblad X2D / 8层真实感系统',
        bestFor: '消除AI/CGI/塑料感、电影灯光、镜头模拟、材质真实感',
        tags: 'photorealism,cinematic-lighting,camera-simulation,surface-quality,atmosphere',
        score: hasPhotoKW ? 10 : 5,
        raw: { layers: ['negative', 'anchor', 'lighting', 'lens', 'surface', 'atmosphere', 'composition'] },
      });
    }
  }

  // ── Sort & Deduplicate ──
  results.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const unique = results.filter(r => {
    const key = `${r.kb}:${r.subCategory}:${r.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Build prompt hints ──
  const promptParts: string[] = [];
  const allTags: string[] = [];
  const top = unique.slice(0, 15);
  for (const r of top) {
    if (r.signature) promptParts.push(`[${r.kb}/${r.subCategory}] ${r.name}: ${r.signature}`);
    if (r.tags) allTags.push(...r.tags.split(/[,，]\s*/));
  }

  return {
    query,
    filters,
    results: top,
    promptHints: promptParts.join('\n'),
    aggregatedTags: [...new Set(allTags)].slice(0, 30),
    elapsedMs: Date.now() - t0,
  };
}

/**
 * Format quickLookup results for injection into an LLM prompt.
 * Compact, focused on actionable references.
 */
export function formatLookupContext(result: QuickLookupResult, maxEntries: number = 10): string {
  const lines: string[] = ['## 📚 知识库检索结果 (KB Lookup Results)'];
  const entries = result.results.slice(0, maxEntries);

  // Group by KB
  const grouped: Record<string, KBResult[]> = {};
  for (const r of entries) {
    (grouped[r.kb] ||= []).push(r);
  }

  for (const [kb, items] of Object.entries(grouped)) {
    const label: Record<string, string> = {
      music: '🎵 音乐参考', visual: '🎬 视觉参考', spatial: '🏛️ 空间参考',
      narrative: '📝 叙事参考', costume: '👘 服饰参考', photorealism: '📷 真实感',
    };
    lines.push(`\n### ${label[kb] || kb}`);
    for (const item of items) {
      lines.push(`- **${item.name}** (${item.subCategory}): ${item.signature} | 适合: ${item.bestFor}`);
    }
  }

  if (result.aggregatedTags.length > 0) {
    lines.push(`\n**聚合标签**: ${result.aggregatedTags.join(', ')}`);
  }
  lines.push(`\n查找耗时: ${result.elapsedMs}ms | 总结果数: ${result.results.length}`);

  return lines.join('\n');
}

/**
 * Get full KB text for a specific category — for direct injection (legacy fallback).
 */
export function getKBFullText(category: KBCategory): string {
  switch (category) {
    case 'narrative': return WRITERS_KB_FULL;
    case 'visual': return VISUAL_KB_FULL;
    default: return '';
  }
}
