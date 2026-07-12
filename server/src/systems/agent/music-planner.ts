/* === Music Planner — Q Brain autonomous music parameter decision ===
 *
 * 替代硬编码的"通常2-4首"规则。Q大脑（DeepSeek）自主分析剧本，
 * 判断内容类型、预估总时长、决定最优曲数和每曲时长。
 *
 * 流程：Script → DeepSeek → MusicPlan → 注入 Sound Composer prompt
 */

import { deepseekChat } from '../ai/deepseek.js';

// ── Types ──────────────────────────────────────────

export interface MusicPlan {
  contentType: 'ad' | 'mv' | 'shortFilm' | 'feature' | 'episodic' | 'game' | 'other';
  contentTypeLabel: string;       // Chinese label for prompt injection
  estimatedTotalDuration: number; // seconds
  trackCount: number;             // optimal number of music pieces
  durationPerTrack: number;       // seconds, suggested per track
  durationHint: string;           // English, injected into Suno prompts
  rationale: string;              // Chinese, explains the decision
}

// ── Prompt ─────────────────────────────────────────

const MUSIC_PLANNER_PROMPT = `你是一位资深影视音乐总监。分析剧本，为配乐制作做参数决策。

## 任务
1. 判断内容类型：
   - ad（广告/宣传片，15-90秒）
   - mv（音乐视频/MV，3-5分钟）
   - shortFilm（短片/微电影，3-30分钟）
   - feature（长片/电影，60-180分钟）
   - episodic（剧集，20-60分钟/集）
   - game（游戏CG/过场）
   - other（其他，请标注）

2. 估算内容总时长（秒）

3. 数一数剧本中有几个关键情绪转折点 → 这就是音乐曲数
   - 一首曲子可以覆盖相邻的情绪相似的场景
   - 情绪发生根本性变化时需要新曲子
   - 不要预设"几个合适"——完全根据剧本内容决定
   - 可能是1首（短片/广告），也可能是10首（长片）

4. 根据内容类型决定每首曲子的建议时长（秒）：
   - 广告/宣传片：30-90秒/首
   - MV：60-180秒/首
   - 短片：90-240秒/首
   - 长片：120-300秒/首
   - 剧集：60-180秒/首
   - 游戏：视场景而定
   - 以上仅为参考范围，根据实际剧本灵活调整

## 输出格式
只输出合法JSON，不要markdown代码块，不要额外文字：

{"contentType":"shortFilm","contentTypeLabel":"短片","estimatedTotalDuration":600,"trackCount":4,"durationPerTrack":150,"durationHint":"Each piece should be approximately 2-3 minutes, concise and emotionally focused","rationale":"剧本有4个明显情绪转折点：开场对峙→冲突升级→高潮决战→悲壮收尾"}`;

// ── Planner ────────────────────────────────────────

export async function planMusic(scriptText: string): Promise<MusicPlan | null> {
  try {
    const raw = await deepseekChat(
      MUSIC_PLANNER_PROMPT,
      `剧本内容:\n${scriptText}`,
      800
    );

    if (!raw) {
      console.log('[music-planner] No DeepSeek response');
      return null;
    }

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[music-planner] No JSON in response:', raw.slice(0, 200));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const plan: MusicPlan = {
      contentType: parsed.contentType || 'shortFilm',
      contentTypeLabel: parsed.contentTypeLabel || '短片',
      estimatedTotalDuration: Math.max(15, Number(parsed.estimatedTotalDuration) || 300),
      trackCount: Math.max(1, Math.min(20, Number(parsed.trackCount) || 3)),
      durationPerTrack: Math.max(15, Math.min(600, Number(parsed.durationPerTrack) || 120)),
      durationHint: parsed.durationHint || '',
      rationale: parsed.rationale || 'Q大脑自主决策',
    };

    console.log('[music-planner] Plan:', {
      type: plan.contentType,
      total: `${plan.estimatedTotalDuration}s`,
      tracks: plan.trackCount,
      perTrack: `${plan.durationPerTrack}s`,
    });

    return plan;
  } catch (err: any) {
    console.log('[music-planner] Failed:', String(err).slice(0, 150));
    return null;
  }
}

// ── Prompt Injection ───────────────────────────────

/**
 * Format the music plan for injection into the Sound Composer system prompt.
 * When plan is null (DeepSeek unavailable), returns empty string —
 * the Sound Composer will use its own judgment without hardcoded limits.
 */
export function formatMusicPlanForPrompt(plan: MusicPlan | null): string {
  if (!plan) return '';

  return `
## 🎬 导演音乐参数（Q大脑分析 — 必须遵守）

**内容类型**: ${plan.contentTypeLabel}
**预估全片时长**: ${Math.round(plan.estimatedTotalDuration / 60)} 分钟 (${plan.estimatedTotalDuration} 秒)
**音乐曲数**: ${plan.trackCount} 首
**每曲目标时长**: 约 ${Math.round(plan.durationPerTrack / 60)} 分钟 (${plan.durationPerTrack} 秒)

${plan.durationHint ? `**Suno 时长提示**: ${plan.durationHint}` : ''}

**决策理由**: ${plan.rationale}

⚠️ 以上参数由导演和音乐总监共同确定。请严格输出恰好 ${plan.trackCount} 个场景的音乐设计。
每个场景的 Suno Prompt 中应自然融入时长提示词（如 "a concise 60-second theme"、"a 3-minute epic orchestral piece"）。`;
}
