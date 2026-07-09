/* === QPredict — Prediction & Risk Engine === */
import { qMemory, type RecallResult } from './q-memory.js';
import {
  getOrCreateProject,
  getProjectSummary,
  getDeviations,
  type QProject,
} from './q-state.js';
import { push, buildNotification } from './q-notification.js';

// ── Types ────────────────────────────────────────

export interface CompletionEstimate {
  totalShots: number;
  shotsRemaining: number;
  /** Estimated remaining time in seconds */
  estimatedTimeSeconds: number;
  /** Estimated remaining credits */
  estimatedCredits: number;
  /** Average generation time per shot (ms) */
  avgGenTimeMs: number;
  /** Average credits per shot */
  avgCreditsPerShot: number;
  /** Completion percentage (0-1) */
  completionRate: number;
  /** Projected completion timestamp */
  projectedCompletion: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface CostEstimate {
  totalSpent: number;           // credits already spent
  projectedTotal: number;       // estimated total cost
  remainingBudget: number;      // projected - spent
  perShotAvg: number;
  /** Provider cost breakdown */
  byProvider: { providerId: string; shots: number; totalCredits: number; avgPerShot: number }[];
}

export interface Bottleneck {
  type: 'provider' | 'model' | 'shot_type' | 'resolution' | 'time_of_day' | 'input_quality';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string[];           // memory references
  affectedShots: number;
  estimatedDelayMinutes: number;
}

export interface QualityRisk {
  shotNumber: number;
  riskScore: number;            // 0-1, higher = riskier
  riskFactors: string[];
  mitigation: string;
}

export interface PredictionReport {
  projectId: string;
  generatedAt: string;
  completion: CompletionEstimate;
  cost: CostEstimate;
  bottlenecks: Bottleneck[];
  qualityRisks: QualityRisk[];
  summary: string;
}

// ── Prediction Engine ────────────────────────────

/**
 * Generate a full prediction report for a project.
 * Uses historical data from episodic memory to estimate completion.
 */
export function generatePredictions(projectId: string): PredictionReport {
  const project = getOrCreateProject(projectId);
  const summary = getProjectSummary(projectId);

  // 1. Completion estimate
  const completion = estimateCompletion(project, summary);

  // 2. Cost estimate
  const cost = estimateCost(projectId, project);

  // 3. Bottleneck detection
  const bottlenecks = detectBottlenecks(projectId, project);

  // 4. Quality risk assessment
  const qualityRisks = assessQualityRisks(projectId, project);

  const report: PredictionReport = {
    projectId,
    generatedAt: new Date().toISOString(),
    completion,
    cost,
    bottlenecks,
    qualityRisks,
    summary: generateSummary(completion, cost, bottlenecks, qualityRisks),
  };

  // Notify if critical bottlenecks found
  const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
  if (criticalBottlenecks.length > 0) {
    push(buildNotification('SYSTEM_ALERT', {
      title: `⚠️ ${criticalBottlenecks.length}个关键瓶颈`,
      body: criticalBottlenecks.map(b => b.description).join('；'),
      severity: 'error',
      actionable: true,
      actionId: projectId,
      actionLabel: '查看预测报告',
    }));
  }

  return report;
}

// ── Completion Estimation ────────────────────────

function estimateCompletion(
  project: QProject,
  summary: ReturnType<typeof getProjectSummary>,
): CompletionEstimate {
  const totalShots = project.scriptStructure?.shots?.length || 0;
  const shotsGenerated = project.progress.shotsGenerated;
  const shotsRemaining = Math.max(0, totalShots - shotsGenerated);
  const avgGenTimeMs = project.progress.avgGenerationMs || 30_000;
  const avgCreditsPerShot = shotsGenerated > 0
    ? project.progress.totalCreditsSpent / shotsGenerated
    : 18;

  // Estimate remaining time with buffer for deviations (1.3x multiplier)
  const deviationBuffer = summary.openDeviations.total > 0 ? 1.3 : 1.0;
  const estimatedTimeSeconds = Math.round(
    (shotsRemaining * avgGenTimeMs / 1000) * deviationBuffer,
  );

  const estimatedCredits = Math.round(shotsRemaining * avgCreditsPerShot * deviationBuffer);

  let projectedCompletion: string | null = null;
  if (shotsRemaining > 0 && avgGenTimeMs > 0) {
    projectedCompletion = new Date(
      Date.now() + estimatedTimeSeconds * 1000,
    ).toISOString();
  }

  const completionRate = totalShots > 0
    ? shotsGenerated / totalShots
    : 0;

  let confidence: CompletionEstimate['confidence'] = 'medium';
  if (shotsGenerated > 10 && avgGenTimeMs < 60_000) confidence = 'high';
  else if (shotsGenerated < 3 || avgGenTimeMs > 120_000) confidence = 'low';

  return {
    totalShots,
    shotsRemaining,
    estimatedTimeSeconds,
    estimatedCredits,
    avgGenTimeMs,
    avgCreditsPerShot,
    completionRate,
    projectedCompletion,
    confidence,
  };
}

// ── Cost Estimation ──────────────────────────────

function estimateCost(
  projectId: string,
  project: QProject,
): CostEstimate {
  const totalSpent = project.progress.totalCreditsSpent;
  const shotsGenerated = project.progress.shotsGenerated || 1;
  const totalShots = project.scriptStructure?.shots?.length || 0;
  const perShotAvg = totalSpent / Math.max(1, shotsGenerated);

  // Recall provider-specific cost history
  const providerMemories = qMemory.recall('provider credits', { projectId });
  const byProvider: CostEstimate['byProvider'] = [];

  const providerMap = new Map<string, { shots: number; totalCredits: number }>();
  for (const mem of providerMemories) {
    if (mem.layer === 'episodic') {
      const entryDetail = (mem.entry as any).detail || {};
      const providerId = entryDetail.providerId || entryDetail.provider_id || 'unknown';
      const credits = entryDetail.credits || entryDetail.cost || 0;

      const entry = providerMap.get(providerId) || { shots: 0, totalCredits: 0 };
      entry.shots++;
      entry.totalCredits += credits;
      providerMap.set(providerId, entry);
    }
  }

  for (const [providerId, data] of providerMap) {
    byProvider.push({
      providerId,
      shots: data.shots,
      totalCredits: data.totalCredits,
      avgPerShot: Math.round(data.totalCredits / data.shots),
    });
  }

  byProvider.sort((a, b) => b.totalCredits - a.totalCredits);

  const projectedTotal = Math.round(totalShots * perShotAvg);

  return {
    totalSpent,
    projectedTotal,
    remainingBudget: projectedTotal - totalSpent,
    perShotAvg: Math.round(perShotAvg),
    byProvider,
  };
}

// ── Bottleneck Detection ─────────────────────────

function detectBottlenecks(
  projectId: string,
  project: QProject,
): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];
  const memories = qMemory.recall('failed pipeline_run', { projectId });

  // Provider failures
  const providerFails = new Map<string, { count: number; examples: string[] }>();
  for (const mem of memories) {
    const entryDetail = (mem.entry as any).detail || {};
    const providerId = entryDetail.pipelineName || entryDetail.providerId || 'unknown';
    const entryContent = (mem.entry as any).content || '';
    if (entryContent.includes('failed') || entryDetail.status === 'failed') {
      const entry = providerFails.get(providerId) || { count: 0, examples: [] };
      entry.count++;
      if (entry.examples.length < 3) entry.examples.push(entryContent.slice(0, 120));
      providerFails.set(providerId, entry);
    }
  }

  for (const [provider, data] of providerFails) {
    if (data.count >= 3) {
      bottlenecks.push({
        type: 'provider',
        description: `${provider} 失败率偏高：${data.count}次/最近记录`,
        severity: data.count >= 5 ? 'critical' : 'high',
        evidence: data.examples,
        affectedShots: data.count,
        estimatedDelayMinutes: data.count * 2,
      });
    }
  }

  // Shot-type pattern failures
  const shotTypeFails = new Map<string, number>();
  const deviationMemories = qMemory.recall('composition deviation', { projectId });
  for (const mem of deviationMemories) {
    const entryDetail = (mem.entry as any).detail || {};
    const shotType = entryDetail.shotType || entryDetail.expected || '';
    if (shotType) {
      shotTypeFails.set(shotType, (shotTypeFails.get(shotType) || 0) + 1);
    }
  }

  for (const [shotType, count] of shotTypeFails) {
    if (count >= 2) {
      bottlenecks.push({
        type: 'shot_type',
        description: `${shotType} 镜头类型偏差频繁：${count}次`,
        severity: count >= 4 ? 'high' : 'medium',
        evidence: [`${count} deviation records for ${shotType}`],
        affectedShots: count,
        estimatedDelayMinutes: count * 3,
      });
    }
  }

  // Resolution bottlenecks (high-res consistently slow)
  const avgGenMs = project.progress.avgGenerationMs;
  if (avgGenMs > 120_000) {
    bottlenecks.push({
      type: 'resolution',
      description: `平均生成时间 ${Math.round(avgGenMs / 1000)}s — 考虑降低分辨率`,
      severity: avgGenMs > 180_000 ? 'critical' : 'high',
      evidence: [`avgGenerationMs: ${avgGenMs}`],
      affectedShots: project.scriptStructure?.shots?.length || 0,
      estimatedDelayMinutes: Math.round((project.scriptStructure?.shots?.length || 0) * avgGenMs / 60_000),
    });
  }

  // No script structure = planning bottleneck
  if (!project.scriptStructure || !project.scriptStructure.shots?.length) {
    bottlenecks.push({
      type: 'input_quality',
      description: '缺少剧本结构分析 — 无法精确规划',
      severity: 'high',
      evidence: ['No script structure found'],
      affectedShots: 0,
      estimatedDelayMinutes: 0,
    });
  }

  return bottlenecks.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] || 3) - (order[b.severity] || 3);
  });
}

// ── Quality Risk Assessment ──────────────────────

function assessQualityRisks(
  projectId: string,
  project: QProject,
): QualityRisk[] {
  const risks: QualityRisk[] = [];
  const shots = project.scriptStructure?.shots || [];
  const deviations = getDeviations(projectId, 'open');

  // Score each shot by risk factors
  for (const shot of shots) {
    const shotDeviations = deviations.filter(d => d.shotNumber === shot.shotNumber);
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Factor 1: Has unresolved deviations
    if (shotDeviations.length > 0) {
      riskScore += 0.3 * shotDeviations.length;
      riskFactors.push(`${shotDeviations.length} unresolved deviation(s)`);
    }

    // Factor 2: Complex shot type (wide shots harder for AI)
    const complexShots = ['ELS', 'EWS', 'WS', 'LS'];
    if (complexShots.includes(shot.shotType || '')) {
      riskScore += 0.15;
      riskFactors.push(`Complex shot type: ${shot.shotType}`);
    }

    // Factor 3: Multiple characters (recall: >3 chars = 40% success drop)
    const characterMentions = (shot.contentCN || '').match(/[，,]|、/g)?.length || 0;
    if (characterMentions > 3) {
      riskScore += 0.2;
      riskFactors.push(`Multiple characters (${characterMentions + 1})`);
    }

    // Factor 4: Extreme focal lengths
    const focalLength = shot.lens || '';
    const focalNum = parseInt(focalLength);
    if (!isNaN(focalNum) && (focalNum < 14 || focalNum > 200)) {
      riskScore += 0.1;
      riskFactors.push(`Extreme focal length: ${focalLength}`);
    }

    // Factor 5: Camera movement (harder to control)
    if (shot.cameraMovement && shot.cameraMovement !== '固定') {
      riskScore += 0.1;
      riskFactors.push(`Camera movement: ${shot.cameraMovement}`);
    }

    // Factor 6: Very short or very long prompt
    const promptLen = (shot.visualPrompt || '').length;
    if (promptLen < 50) {
      riskScore += 0.1;
      riskFactors.push('Very short prompt (<50 chars)');
    } else if (promptLen > 2000) {
      riskScore += 0.05;
      riskFactors.push('Very long prompt (>2000 chars)');
    }

    // Only include shots with risk
    if (riskScore > 0.1) {
      riskScore = Math.min(1, riskScore);
      risks.push({
        shotNumber: shot.shotNumber,
        riskScore: Math.round(riskScore * 100) / 100,
        riskFactors,
        mitigation: generateMitigation(riskFactors, shotDeviations),
      });
    }
  }

  return risks.sort((a, b) => b.riskScore - a.riskScore).slice(0, 10);
}

function generateMitigation(
  riskFactors: string[],
  deviations: ReturnType<typeof getDeviations>,
): string {
  const parts: string[] = [];

  if (riskFactors.some(f => f.includes('deviation'))) {
    parts.push('优先解决未处理偏差');
  }
  if (riskFactors.some(f => f.includes('characters'))) {
    parts.push('拆分为更少角色的分镜');
  }
  if (riskFactors.some(f => f.includes('Complex shot type'))) {
    parts.push('考虑降低镜头复杂度（ELS→WS）');
  }
  if (riskFactors.some(f => f.includes('focal'))) {
    parts.push('使用标准焦段（24-135mm）');
  }
  if (deviations.length > 0) {
    const strategies = qMemory.recall('autofix succeeded', {});
    const relevantStrategies = strategies
      .filter(s => deviations.some(d => ((s.entry as any).content || '').includes(d.category)))
      .slice(0, 2);
    if (relevantStrategies.length > 0) {
      parts.push(`历史成功策略：${relevantStrategies.map(s => ((s.entry as any).content || '').slice(0, 60)).join('；')}`);
    }
  }

  return parts.join('。') || '无特别缓解措施';
}

// ── Summary Generator ────────────────────────────

function generateSummary(
  completion: CompletionEstimate,
  cost: CostEstimate,
  bottlenecks: Bottleneck[],
  risks: QualityRisk[],
): string {
  const parts: string[] = [];

  if (completion.shotsRemaining > 0) {
    const eta = completion.projectedCompletion
      ? new Date(completion.projectedCompletion).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : '未知';
    parts.push(
      `预计还需 ${Math.round(completion.estimatedTimeSeconds / 60)}分钟完成剩余${completion.shotsRemaining}镜` +
      (completion.projectedCompletion ? `（约${eta}）` : ''),
    );
  } else if (completion.completionRate >= 1) {
    parts.push('项目已完成 ✅');
  } else {
    parts.push('等待剧本分析以生成预测');
  }

  if (cost.remainingBudget > 0) {
    parts.push(`预计还需${cost.remainingBudget}积分`);
  }

  const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
  if (criticalBottlenecks.length > 0) {
    parts.push(`⚠️ ${criticalBottlenecks.length}个关键瓶颈需要处理`);
  }

  const highRisks = risks.filter(r => r.riskScore >= 0.5);
  if (highRisks.length > 0) {
    parts.push(`${highRisks.length}个高风险镜头`);
  }

  return parts.join('。');
}

// ── Quick Stats (for SSE notifications) ─────────

export function getQuickStats(projectId: string): {
  completionRate: number;
  estimatedMinutesLeft: number | null;
  criticalBottlenecks: number;
  highRiskShots: number;
} {
  const project = getOrCreateProject(projectId);
  const summary = getProjectSummary(projectId);
  const completion = estimateCompletion(project, summary);

  return {
    completionRate: completion.completionRate,
    estimatedMinutesLeft: completion.shotsRemaining > 0
      ? Math.round(completion.estimatedTimeSeconds / 60)
      : null,
    criticalBottlenecks: detectBottlenecks(projectId, project)
      .filter(b => b.severity === 'critical').length,
    highRiskShots: assessQualityRisks(projectId, project)
      .filter(r => r.riskScore >= 0.5).length,
  };
}
