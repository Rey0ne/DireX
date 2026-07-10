/* === Q Template Advisor — Genre-aware Dynamic Prompt Templates ===
 *
 * 小Q 分析剧本流派/背景/角色职能 → 决定角色设计模板包含哪些板块。
 *
 * 权力级别：用户显式指定 > 小Q 建议 > 默认模板
 * 小Q 只在用户没说话时自动判断。用户说了算时小Q闭嘴。
 */

import { deepseekChat } from '../ai/deepseek.js';

// ── Types ──────────────────────────────────────────

export interface ScriptContext {
  genre: string;              // "war" | "romance" | "scifi" | "fantasy" | "modern" | "historical" | "crime" | "other"
  hasWeapons: boolean;       // Should weapons/tools section be included?
  hasMeaningfulProps: boolean; // Are props central to the story (not just set dressing)?
  characterEmphasis: string[]; // Which aspects to emphasize: clothing, expressions, body, accessories, weapons, props
  reasoning: string;         // Human-readable explanation of analysis
  confidence: number;        // 0-1
  source: 'deepseek' | 'rules' | 'user-override' | 'default';
}

// ── DeepSeek Analysis Prompt ────────────────────────

const GENRE_ANALYSIS_PROMPT = `你是影视前期策划专家。分析剧本，输出角色设计的模板配置。

## 分析维度
1. 流派/类型（战争/爱情/科幻/奇幻/现代/历史/犯罪/其他）
2. 武器是否核心叙事元素（战争片→是，爱情片→否）
3. 道具是否关键叙事载体（谍战片的窃听器→是，日常对话→否）
4. 角色设计应该强调哪些方面

## 输出格式（仅输出合法JSON，不要markdown，不要额外文字）
{
  "genre": "war",
  "hasWeapons": true,
  "hasMeaningfulProps": false,
  "characterEmphasis": ["clothing", "body", "weapons"],
  "reasoning": "战争题材，武器是角色身份的核心体现"
}`;

// ── User Override Detection ─────────────────────────

interface UserOverrides {
  forceWeapons?: boolean;     // User explicitly mentioned weapons/war
  forceNoWeapons?: boolean;   // User explicitly said modern/romance/office
  forceProps?: boolean;       // User mentioned specific props
}

function detectUserOverrides(visualStyle?: string): UserOverrides {
  if (!visualStyle) return {};
  const s = visualStyle.toLowerCase();

  const weaponKeywords = /战争|战斗|军事|武器|枪|剑|刀|弓|士兵|军人|战场|格斗|武侠|功夫|警匪|黑帮|犯罪/;
  const noWeaponKeywords = /现代|爱情|办公室|日常|校园|职场|恋爱|甜宠|都市|青春|喜剧|生活/;
  const propKeywords = /道具|关键物品|信物|法宝|圣物|魔戒|宝物|神器/;

  return {
    forceWeapons: weaponKeywords.test(s) || undefined,
    forceNoWeapons: !weaponKeywords.test(s) && noWeaponKeywords.test(s) || undefined,
    forceProps: propKeywords.test(s) || undefined,
  };
}

// ── Rule-based Fallback Analysis ────────────────────

function ruleBasedAnalysis(scriptText: string): Omit<ScriptContext, 'confidence' | 'source'> {
  const s = scriptText;
  const hasWeaponIndicators = /武器|战斗|战争|枪|剑|刀|弓|士兵|军人|战场|格斗|袭击|开火|射击|兵营|军队|敌|攻|防|侵略|守卫/.test(s);
  const hasRomanceIndicators = /爱情|恋爱|婚礼|告白|亲吻|拥抱|约会|情侣|甜|蜜/.test(s);
  const hasOfficeIndicators = /办公室|公司|职场|会议|项目|甲方|老板|经理|同事/.test(s);
  const hasFantasyIndicators = /魔法|龙|精灵|巫师|咒语|异世界|仙境|王国|神|妖|仙|魔/.test(s);
  const hasSciFiIndicators = /太空|飞船|机器人|AI|人工智能|未来|外星|星际|宇宙|殖民|基因|改造/.test(s);
  const hasCrimeIndicators = /犯罪|杀人|警察|侦探|调查|案件|谋杀|凶手|证据|法医|追捕/.test(s);
  const hasHistoricalIndicators = /古代|朝代|皇帝|宫廷|妃|王|历史|民国|古装|江湖/.test(s);

  let genre = 'other';
  if (hasFantasyIndicators) genre = 'fantasy';
  else if (hasSciFiIndicators) genre = 'scifi';
  else if (hasWeaponIndicators && hasCrimeIndicators) genre = 'crime';
  else if (hasWeaponIndicators) genre = 'war';
  else if (hasHistoricalIndicators) genre = 'historical';
  else if (hasRomanceIndicators) genre = 'romance';
  else if (hasOfficeIndicators) genre = 'modern';

  const hasWeapons = hasWeaponIndicators || genre === 'war' || genre === 'crime' || genre === 'fantasy';
  const hasMeaningfulProps = hasFantasyIndicators || hasSciFiIndicators || hasCrimeIndicators;

  const characterEmphasis: string[] = ['clothing', 'expressions', 'body'];
  if (hasWeapons) characterEmphasis.push('weapons');
  if (hasMeaningfulProps) characterEmphasis.push('props');
  if (genre === 'fantasy' || genre === 'scifi') characterEmphasis.push('accessories');

  return {
    genre,
    hasWeapons,
    hasMeaningfulProps,
    characterEmphasis,
    reasoning: `规则分析：${genre}类型，武器${hasWeapons ? '是' : '否'}核心元素`,
  };
}

// ── Main Analysis Function ──────────────────────────

export async function analyzeScriptContext(
  scriptText: string,
  visualStyle?: string,
): Promise<ScriptContext> {
  // ── Step 0: Check user overrides FIRST (human > Q) ──
  const overrides = detectUserOverrides(visualStyle);

  // If user explicitly stated weapons → force include, skip Q
  if (overrides.forceWeapons) {
    return {
      genre: 'other',
      hasWeapons: true,
      hasMeaningfulProps: overrides.forceProps || false,
      characterEmphasis: ['clothing', 'expressions', 'body', 'weapons', 'accessories'],
      reasoning: '用户显式指定武器/战斗元素 → 强制包含武器板块',
      confidence: 1.0,
      source: 'user-override',
    };
  }

  // If user explicitly stated peaceful setting → force exclude weapons
  if (overrides.forceNoWeapons) {
    return {
      genre: 'modern',
      hasWeapons: false,
      hasMeaningfulProps: overrides.forceProps || false,
      characterEmphasis: ['clothing', 'expressions', 'body', 'accessories'],
      reasoning: '用户指定现代/爱情/日常场景 → 跳过武器板块',
      confidence: 1.0,
      source: 'user-override',
    };
  }

  // ── Step 1: Try DeepSeek analysis ──────────────────
  try {
    const llmRaw = await deepseekChat(
      GENRE_ANALYSIS_PROMPT,
      `剧本内容:\n${scriptText.slice(0, 1500)}\n${visualStyle ? `\n用户视觉风格提示: ${visualStyle}` : ''}`,
      300,
    );

    if (llmRaw) {
      const jsonMatch = llmRaw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          genre: parsed.genre || 'other',
          hasWeapons: parsed.hasWeapons ?? false,
          hasMeaningfulProps: parsed.hasMeaningfulProps ?? false,
          characterEmphasis: parsed.characterEmphasis || ['clothing', 'expressions', 'body'],
          reasoning: parsed.reasoning || 'DeepSeek分析结果',
          confidence: 0.8,
          source: 'deepseek',
        };
      }
    }
  } catch (err: any) {
    console.log('[q-template-advisor] DeepSeek unavailable, using rules:', err.message?.slice(0, 60));
  }

  // ── Step 2: Rule-based fallback ────────────────────
  const ruleResult = ruleBasedAnalysis(scriptText);
  // Merge any user-specified props override
  if (overrides.forceProps) ruleResult.hasMeaningfulProps = true;
  console.log('[q-template-advisor]', ruleResult.reasoning);
  return { ...ruleResult, confidence: 0.6, source: 'rules' };
}
