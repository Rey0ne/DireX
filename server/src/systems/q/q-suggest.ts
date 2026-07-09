/* === QSuggest — Proactive Suggestion Engine === */
import { qMemory, type RecallResult } from './q-memory.js';
import {
  getOrCreateProject,
  getProjectSummary,
  getDeviations,
  type QProject,
} from './q-state.js';
import { push, buildNotification } from './q-notification.js';

// ── Types ────────────────────────────────────────

export type SuggestionCategory =
  | 'workflow_optimization'
  | 'style_recommendation'
  | 'prompt_improvement'
  | 'pipeline_shortcut'
  | 'quality_alert'
  | 'resource_optimization'
  | 'learning_share';

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  body: string;
  confidence: number;          // 0-1
  reasoning: string;           // why this suggestion was generated
  source: 'semantic_memory' | 'reflective_memory' | 'pattern_match' | 'rule_based';
  evidence: string[];          // memory IDs supporting this
  actionable: boolean;
  actionId: string | null;
  actionLabel: string | null;
  generatedAt: string;
  /** Key used for deduplication */
  dedupKey: string;
}

// ── Dedup State ─────────────────────────────────

/** In-memory dedup: key → last suggested timestamp */
const recentSuggestions = new Map<string, number>();

/** Minimum interval between same suggestion (30 min) */
const DEDUP_INTERVAL_MS = 30 * 60_000;

/** Maximum recent suggestions to track in memory */
const MAX_RECENT_SUGGESTIONS = 200;

/**
 * Check if a suggestion was recently sent.
 * Cleanup old entries automatically.
 */
function isDeduped(dedupKey: string): boolean {
  const lastSent = recentSuggestions.get(dedupKey);
  if (!lastSent) return false;

  if (Date.now() - lastSent > DEDUP_INTERVAL_MS) {
    recentSuggestions.delete(dedupKey);
    return false;
  }
  return true;
}

/** Record a suggestion as sent */
function recordSuggestion(dedupKey: string): void {
  recentSuggestions.set(dedupKey, Date.now());

  // Prune old entries
  if (recentSuggestions.size > MAX_RECENT_SUGGESTIONS) {
    const cutoff = Date.now() - DEDUP_INTERVAL_MS;
    for (const [key, ts] of recentSuggestions) {
      if (ts < cutoff) recentSuggestions.delete(key);
    }
  }
}

// ── Suggestion Engine ────────────────────────────

/**
 * Generate all active suggestions for a project.
 * Returns suggestions that pass confidence threshold and dedup check.
 */
export function generateSuggestions(projectId: string): Suggestion[] {
  const project = getOrCreateProject(projectId);
  const summary = getProjectSummary(projectId);
  const suggestions: Suggestion[] = [];

  // 1. Workflow optimization suggestions
  suggestions.push(...suggestWorkflowOptimizations(project, summary));

  // 2. Style recommendations
  suggestions.push(...suggestStyleRecommendations(project, summary));

  // 3. Prompt improvements
  suggestions.push(...suggestPromptImprovements(project, summary));

  // 4. Pipeline shortcuts
  suggestions.push(...suggestPipelineShortcuts(project, summary));

  // 5. Quality alerts
  suggestions.push(...suggestQualityAlerts(project, summary));

  // 6. Resource optimization
  suggestions.push(...suggestResourceOptimizations(project, summary));

  // 7. Learning shares
  suggestions.push(...suggestLearningShares(project, summary));

  // Filter: confidence >= min threshold + not recently sent
  const filtered = suggestions
    .filter(s => s.confidence >= 0.4)
    .filter(s => !isDeduped(s.dedupKey));

  return filtered;
}

/**
 * Generate suggestions and send qualifying ones as SSE notifications.
 * Returns suggestions that were actually sent.
 */
export function suggestAndNotify(projectId: string): Suggestion[] {
  const suggestions = generateSuggestions(projectId);

  for (const s of suggestions) {
    // Send as SSE notification
    push(buildNotification('SUGGESTION', {
      title: `💡 ${s.title}`,
      body: s.body,
      severity: 'info',
      actionable: s.actionable,
      actionId: s.actionId || projectId,
      actionLabel: s.actionLabel || '查看详情',
    }));

    // Mark as sent
    recordSuggestion(s.dedupKey);

    // Remember in episodic memory
    qMemory.episodicAdd(
      'system_event',
      `Suggestion generated: ${s.title} — ${s.body}`,
      { category: s.category, confidence: s.confidence, source: s.source, projectId },
      ['suggestion', s.category, projectId],
      s.evidence,
    );
  }

  return suggestions;
}

// ── Category: Workflow Optimization ─────────────

function suggestWorkflowOptimizations(
  project: QProject,
  summary: ReturnType<typeof getProjectSummary>,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Pattern: No script analysis yet but has nodes on canvas
  if (!project.scriptStructure?.shots?.length && project.progress.shotsGenerated > 0) {
    suggestions.push({
      id: `wo-no-script-${project.id}`,
      category: 'workflow_optimization',
      title: '建议先运行剧本分析',
      body: `已生成 ${project.progress.shotsGenerated} 张图但缺少剧本结构，分析后可获得更好的镜头规划`,
      confidence: 0.8,
      reasoning: 'Generating without script analysis → suboptimal shot planning',
      source: 'rule_based',
      evidence: [],
      actionable: true,
      actionId: 'script-analysis',
      actionLabel: '运行剧本分析',
      generatedAt: new Date().toISOString(),
      dedupKey: `no-script-${project.id}`,
    });
  }

  // Pattern: Many open deviations blocking progress
  const openViolations = summary.openDeviations.bySeverity?.VIOLATION ?? 0;
  if (openViolations >= 3) {
    suggestions.push({
      id: `wo-high-deviations-${project.id}`,
      category: 'workflow_optimization',
      title: `${openViolations}个高严重性偏差待处理`,
      body: '大量偏差可能拖慢项目进度，建议暂停生成先解决偏差',
      confidence: 0.75,
      reasoning: `${openViolations} VIOLATION-level deviations → need resolution before continuing`,
      source: 'rule_based',
      evidence: [],
      actionable: true,
      actionId: `deviations-${project.id}`,
      actionLabel: '查看偏差列表',
      generatedAt: new Date().toISOString(),
      dedupKey: `high-deviations-${project.id}`,
    });
  }

  // Recall: similar projects had better results with specific workflow order
  const workflowMemories = qMemory.recall('workflow pattern', { projectId: project.id });
  const semanticWorkflows = workflowMemories.filter(m => m.layer === 'semantic');
  for (const mem of semanticWorkflows.slice(0, 3)) {
    const entry = mem.entry as any;
    const fact = entry.fact || entry.content;
    if (fact && fact.length > 10) {
      suggestions.push({
        id: `wo-semantic-${entry.id}`,
        category: 'workflow_optimization',
        title: '学到的经验',
        body: fact.slice(0, 200),
        confidence: entry.confidence || 0.5,
        reasoning: 'Derived from past project patterns in semantic memory',
        source: 'semantic_memory',
        evidence: [entry.id],
        actionable: false,
        actionId: null,
        actionLabel: null,
        generatedAt: new Date().toISOString(),
        dedupKey: `semantic-wf-${entry.id}`,
      });
    }
  }

  return suggestions;
}

// ── Category: Style Recommendations ─────────────

function suggestStyleRecommendations(
  project: QProject,
  summary: ReturnType<typeof getProjectSummary>,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Recall user style preferences from semantic memory
  const stylePrefs = qMemory.recall('style preference', {});
  const strongPrefs = stylePrefs
    .filter(m => m.layer === 'semantic' && ((m.entry as any).confidence || 0) > 0.6);

  if (strongPrefs.length > 0) {
    const prefs = strongPrefs.slice(0, 3);
    const prefTexts = prefs.map(p => (p.entry as any).fact || (p.entry as any).content).join('；');

    suggestions.push({
      id: `style-pref-${project.id}`,
      category: 'style_recommendation',
      title: '你的风格偏好',
      body: `根据历史记录，你偏好：${prefTexts.slice(0, 200)}`,
      confidence: 0.7,
      reasoning: `${strongPrefs.length} strong style preference entries in semantic memory`,
      source: 'semantic_memory',
      evidence: prefs.map(p => (p.entry as any).id),
      actionable: true,
      actionId: 'apply-style-preferences',
      actionLabel: '应用偏好',
      generatedAt: new Date().toISOString(),
      dedupKey: `style-pref-${project.id}-${prefs.length}`,
    });
  }

  // Pattern: All shots use same film stock — suggest variation
  const shots = project.scriptStructure?.shots || [];
  if (shots.length >= 3) {
    const filmStocks = new Set(shots.map(s => (s as any).filmStock).filter(Boolean));
    if (filmStocks.size === 1 && shots.length > 5) {
      suggestions.push({
        id: `style-variation-${project.id}`,
        category: 'style_recommendation',
        title: '尝试不同的胶片风格',
        body: `所有${shots.length}个镜头使用相同胶片，建议后半段切换风格以增强视觉层次`,
        confidence: 0.5,
        reasoning: 'Visual monotony risk with single film stock across many shots',
        source: 'rule_based',
        evidence: [],
        actionable: true,
        actionId: 'explore-film-stocks',
        actionLabel: '浏览胶片库',
        generatedAt: new Date().toISOString(),
        dedupKey: `single-filmstock-${project.id}`,
      });
    }
  }

  return suggestions;
}

// ── Category: Prompt Improvements ───────────────

function suggestPromptImprovements(
  project: QProject,
  summary: ReturnType<typeof getProjectSummary>,
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const shots = project.scriptStructure?.shots || [];

  // Pattern: Short prompts consistently
  const shortPromptShots = shots.filter(
    s => (s.visualPrompt || '').length < 50,
  );
  if (shortPromptShots.length >= 3) {
    suggestions.push({
      id: `prompt-short-${project.id}`,
      category: 'prompt_improvement',
      title: '提示词过短可能影响质量',
      body: `${shortPromptShots.length}个镜头的提示词少于50字符，建议补充构图、光线、景深等细节`,
      confidence: 0.65,
      reasoning: `${shortPromptShots.length}/${shots.length} shots have very short prompts`,
      source: 'rule_based',
      evidence: [],
      actionable: true,
      actionId: 'enhance-prompts',
      actionLabel: '批量增强提示词',
      generatedAt: new Date().toISOString(),
      dedupKey: `short-prompts-${project.id}`,
    });
  }

  // Recall: what kinds of prompt refinement worked before
  const promptFixes = qMemory.recall('autofix prompt adjustment', { projectId: project.id });
  const successfulAdjustments = promptFixes
    .filter(m => ((m.entry as any).content || '').includes('succeeded') || ((m.entry as any).content || '').includes('resolved'));

  if (successfulAdjustments.length > 0) {
    suggestions.push({
      id: `prompt-fix-pattern-${project.id}`,
      category: 'prompt_improvement',
      title: '有效的提示词调整模式',
      body: `过去的自动修复中，提示词调整解决了 ${successfulAdjustments.length} 个问题。考虑预应用这些调整`,
      confidence: 0.55,
      reasoning: 'Past successful autofix strategies can be pre-applied',
      source: 'pattern_match',
      evidence: successfulAdjustments.map(m => (m.entry as any).id),
      actionable: true,
      actionId: 'pre-apply-fixes',
      actionLabel: '预应用修复',
      generatedAt: new Date().toISOString(),
      dedupKey: `prompt-pattern-${project.id}-${successfulAdjustments.length}`,
    });
  }

  return suggestions;
}

// ── Category: Pipeline Shortcuts ────────────────

function suggestPipelineShortcuts(
  project: QProject,
  summary: ReturnType<typeof getProjectSummary>,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Pattern: Many similar shots → suggest batch generation
  const shots = project.scriptStructure?.shots || [];
  const similarShots = findSimilarShots(shots);
  if (similarShots.length >= 3) {
    suggestions.push({
      id: `batch-gen-${project.id}`,
      category: 'pipeline_shortcut',
      title: '发现相似镜头，建议批量生成',
      body: `${similarShots.length}个镜头在构图/焦段/风格上高度相似，批量生成可节省重复设置`,
      confidence: 0.6,
      reasoning: `${similarShots.length} similar shots detected → batch generation efficient`,
      source: 'rule_based',
      evidence: [],
      actionable: true,
      actionId: 'batch-generate',
      actionLabel: '批量生成',
      generatedAt: new Date().toISOString(),
      dedupKey: `batch-gen-${project.id}`,
    });
  }

  // Pattern: Slow generation → suggest resolution/quality tradeoff
  if (project.progress.avgGenerationMs > 90_000 && project.progress.shotsGenerated > 3) {
    suggestions.push({
      id: `speed-tradeoff-${project.id}`,
      category: 'resource_optimization',
      title: '生成速度较慢，考虑降低分辨率',
      body: `平均每张图 ${Math.round(project.progress.avgGenerationMs / 1000)}s，可临时降低到 1K 加速预览，最后再升到 2K`,
      confidence: 0.5,
      reasoning: 'Long generation times → preview-first workflow more efficient',
      source: 'rule_based',
      evidence: [],
      actionable: true,
      actionId: 'lower-resolution',
      actionLabel: '降低分辨率',
      generatedAt: new Date().toISOString(),
      dedupKey: `slow-gen-${project.id}`,
    });
  }

  return suggestions;
}

/** Find groups of shots with similar camera/lens/film settings */
function findSimilarShots(shots: any[]): any[] {
  const groups = new Map<string, any[]>();

  for (const shot of shots) {
    const key = [
      shot.camera || '',
      shot.lens || '',
      shot.aperture || '',
      shot.filmStock || '',
      shot.shotType || '',
    ].join('|');

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(shot);
  }

  // Return largest group that has ≥3 shots
  let largest: any[] = [];
  for (const group of groups.values()) {
    if (group.length > largest.length) largest = group;
  }

  return largest.length >= 3 ? largest : [];
}

// ── Category: Quality Alerts ─────────────────────

function suggestQualityAlerts(
  project: QProject,
  summary: ReturnType<typeof getProjectSummary>,
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const deviations = getDeviations(project.id, 'open');

  // Pattern: Same type of deviation across multiple shots
  const deviationPatterns = new Map<string, { shots: number[]; first: any }>();
  for (const d of deviations) {
    const key = d.category || 'unknown';
    const entry = deviationPatterns.get(key) || { shots: [], first: d };
    entry.shots.push(d.shotNumber);
    deviationPatterns.set(key, entry);
  }

  for (const [category, data] of deviationPatterns) {
    if (data.shots.length >= 3) {
      suggestions.push({
        id: `qa-pattern-${category}-${project.id}`,
        category: 'quality_alert',
        title: `重复偏差模式：${category}`,
        body: `"${category}" 问题在镜头 ${data.shots.slice(0, 5).join('、')} 中反复出现，可能需要系统性调整`,
        confidence: 0.7,
        reasoning: `Recurring deviation pattern across ${data.shots.length} shots`,
        source: 'pattern_match',
        evidence: [],
        actionable: true,
        actionId: `autofix-${category}`,
        actionLabel: '自动修复',
        generatedAt: new Date().toISOString(),
        dedupKey: `qa-pattern-${category}-${project.id}`,
      });
    }
  }

  // Reflective memory quality heuristics
  const qualityHeuristics = qMemory.recall('quality heuristic', {})
    .filter(m => m.layer === 'reflective');

  for (const h of qualityHeuristics.slice(0, 3)) {
    const entry = h.entry as any;
    const insight = entry.insight || entry.content;
    if (insight && insight.length > 10) {
      suggestions.push({
        id: `qa-heuristic-${entry.id}`,
        category: 'quality_alert',
        title: '质量规律',
        body: insight.slice(0, 200),
        confidence: entry.strength || 0.5,
        reasoning: 'Cross-project quality pattern from reflective memory',
        source: 'reflective_memory',
        evidence: [entry.id],
        actionable: false,
        actionId: null,
        actionLabel: null,
        generatedAt: new Date().toISOString(),
        dedupKey: `qa-heuristic-${h.id}`,
      });
    }
  }

  return suggestions;
}

// ── Category: Resource Optimization ─────────────

function suggestResourceOptimizations(
  project: QProject,
  summary: ReturnType<typeof getProjectSummary>,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Pattern: High credit usage per shot → suggest cheaper provider
  const avgCredits = project.progress.shotsGenerated > 0
    ? project.progress.totalCreditsSpent / project.progress.shotsGenerated
    : 0;

  if (avgCredits > 30 && project.progress.shotsGenerated > 3) {
    suggestions.push({
      id: `resource-expensive-${project.id}`,
      category: 'resource_optimization',
      title: '生成成本偏高',
      body: `平均每张图 ${Math.round(avgCredits)} 积分，考虑切换到成本更低的Provider进行预览`,
      confidence: 0.55,
      reasoning: `High cost per shot (${Math.round(avgCredits)} credits) → preview with cheaper provider`,
      source: 'rule_based',
      evidence: [],
      actionable: true,
      actionId: 'switch-provider',
      actionLabel: '切换Provider',
      generatedAt: new Date().toISOString(),
      dedupKey: `expensive-${project.id}`,
    });
  }

  // Recall: which providers were most cost-effective
  const providerMemories = qMemory.recall('provider credits efficient', {});
  const cheapProviders = providerMemories
    .filter(m => ((m.entry as any).content || '').includes('efficient') || ((m.entry as any).content || '').includes('便宜'));

  if (cheapProviders.length > 0) {
    suggestions.push({
      id: `resource-efficient-${project.id}`,
      category: 'resource_optimization',
      title: '成本效率建议',
      body: `历史数据显示特定Provider在相似场景下性价比更高，检查项目中的Provider选择`,
      confidence: 0.45,
      reasoning: 'Historical cost-efficiency data available',
      source: 'semantic_memory',
      evidence: cheapProviders.map(m => (m.entry as any).id),
      actionable: true,
      actionId: 'review-providers',
      actionLabel: '查看Provider分析',
      generatedAt: new Date().toISOString(),
      dedupKey: `efficient-provider-${project.id}`,
    });
  }

  return suggestions;
}

// ── Category: Learning Shares ───────────────────

function suggestLearningShares(
  _project: QProject,
  _summary: ReturnType<typeof getProjectSummary>,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Share reflective insights that are strong but haven't been surfaced recently
  const insights = qMemory.recall('lesson learned', {})
    .filter(m => m.layer === 'reflective' && ((m.entry as any).strength || 0) > 0.5)
    .slice(0, 3);

  for (const insight of insights) {
    const entry = insight.entry as any;
    const text = entry.insight || entry.content;
    if (text && text.length > 10) {
      suggestions.push({
        id: `learn-${entry.id}`,
        category: 'learning_share',
        title: '小Q学到的',
        body: text.slice(0, 200),
        confidence: entry.strength || 0.5,
        reasoning: 'Cross-project insight from reflective memory',
        source: 'reflective_memory',
        evidence: [entry.id],
        actionable: false,
        actionId: null,
        actionLabel: null,
        generatedAt: new Date().toISOString(),
        dedupKey: `learn-${insight.id}`,
      });
    }
  }

  return suggestions;
}

// ── Quick Check (for periodic use) ──────────────

const lastFullCheck = new Map<string, number>();
const FULL_CHECK_INTERVAL_MS = 5 * 60_000; // 5 min

/**
 * Periodic suggestion check. Only runs if enough time has passed
 * since the last check for this project.
 */
export function periodicSuggest(projectId: string): Suggestion[] {
  const lastCheck = lastFullCheck.get(projectId) || 0;
  if (Date.now() - lastCheck < FULL_CHECK_INTERVAL_MS) {
    return [];
  }

  lastFullCheck.set(projectId, Date.now());
  return suggestAndNotify(projectId);
}

/** Get dedup stats for debugging */
export function getSuggestionStats(): {
  trackedKeys: number;
  oldestTracked: string | null;
} {
  let oldestTs = Infinity;
  for (const ts of recentSuggestions.values()) {
    if (ts < oldestTs) oldestTs = ts;
  }

  return {
    trackedKeys: recentSuggestions.size,
    oldestTracked: oldestTs < Infinity
      ? new Date(oldestTs).toISOString()
      : null,
  };
}
