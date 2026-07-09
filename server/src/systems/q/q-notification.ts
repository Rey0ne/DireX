/* === QNotification — SSE Real-time Notification System === */
import type { Response } from 'express';
import { v4 as uuid } from 'uuid';

// ── Types ────────────────────────────────────────

export type NotificationType =
  | 'GENERATION_COMPLETE'
  | 'GENERATION_FAILED'
  | 'DEVIATION_DETECTED'
  | 'PROGRESS_UPDATE'
  | 'PIPELINE_COMPLETE'
  | 'SYSTEM_ALERT'
  | 'SUGGESTION';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface QNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionable: boolean;
  actionId: string | null;     // deviationId, shotNumber, etc.
  actionLabel: string | null;  // "查看详情", "自动修复", "继续生成"
  sound: string | null;        // 'shutter' | 'warning' | 'alert' | 'ding' | 'complete'
  timestamp: string;
  read: boolean;
}

// ── Connected Clients ────────────────────────────

interface SSEClient {
  id: string;
  res: Response;
  connectedAt: string;
}

const clients: Map<string, SSEClient> = new Map();
const recentNotifications: QNotification[] = [];  // last 100 for late-joining clients

// ── Notification Templates ───────────────────────

export function buildNotification(
  type: NotificationType,
  params: Record<string, unknown> = {},
): Omit<QNotification, 'id' | 'timestamp' | 'read'> {
  switch (type) {
    case 'GENERATION_COMPLETE':
      return {
        type,
        severity: 'success',
        title: params.shotLabel
          ? `${params.shotLabel} 生成完成`
          : '生成完成',
        body: `${params.provider || 'AI'} · ${params.credits || '?'} 积分 · ${params.duration || '?'}`,
        actionable: false,
        actionId: null,
        actionLabel: null,
        sound: 'shutter',
      };

    case 'GENERATION_FAILED':
      return {
        type,
        severity: 'error',
        title: params.shotLabel
          ? `${params.shotLabel} 生成失败`
          : '生成失败',
        body: `原因：${params.reason || '未知错误'}${params.suggestion ? `。建议：${params.suggestion}` : ''}`,
        actionable: !!params.suggestion,
        actionId: params.nodeId as string || null,
        actionLabel: params.retry ? '重试' : null,
        sound: 'warning',
      };

    case 'DEVIATION_DETECTED':
      return {
        type,
        severity: params.severity === 'VIOLATION' ? 'error' :
                  params.severity === 'DEVIATION' ? 'warning' : 'info',
        title: params.shotLabel
          ? `${params.shotLabel} 发现${params.severity === 'VIOLATION' ? '严重偏差' : params.severity === 'DEVIATION' ? '内容偏差' : '微小差异'}`
          : `发现${params.severity === 'VIOLATION' ? '严重偏差' : '内容偏差'}`,
        body: `${params.category || '内容'}：${params.suggestion || '请检查生成结果是否与分镜一致'}`,
        actionable: true,
        actionId: params.deviationId as string || null,
        actionLabel: params.canAutofix ? '自动修复' : '查看详情',
        sound: params.severity === 'VIOLATION' ? 'alert' : 'ding',
      };

    case 'PROGRESS_UPDATE':
      return {
        type,
        severity: 'info',
        title: '项目进度',
        body: `${params.generated || 0}/${params.total || 0} 镜已完成` +
             (params.credits ? ` · 已消耗 ${params.credits} 积分` : ''),
        actionable: false,
        actionId: null,
        actionLabel: null,
        sound: null,
      };

    case 'PIPELINE_COMPLETE':
      return {
        type,
        severity: 'success',
        title: '剧本分析完成',
        body: `${params.characterCount || 0} 个角色 · ${params.sceneCount || 0} 个场景 · ${params.shotCount || 0} 个镜头` +
             (params.credits ? ` · 消耗 ${params.credits} 积分` : ''),
        actionable: true,
        actionId: 'storyboard',
        actionLabel: '查看分镜表',
        sound: 'complete',
      };

    case 'SYSTEM_ALERT':
      return {
        type,
        severity: (params.severity as NotificationSeverity) || 'warning',
        title: (params.title as string) || '系统提示',
        body: (params.body as string) || '',
        actionable: params.actionable as boolean || false,
        actionId: params.actionId as string || null,
        actionLabel: params.actionLabel as string || null,
        sound: params.severity === 'error' ? 'alert' : 'ding',
      };

    case 'SUGGESTION':
      return {
        type,
        severity: 'info',
        title: (params.title as string) || '小Q 建议',
        body: (params.body as string) || '',
        actionable: true,
        actionId: params.actionId as string || null,
        actionLabel: params.actionLabel as string || '采纳',
        sound: 'ding',
      };

    default:
      return {
        type: 'SYSTEM_ALERT',
        severity: 'info',
        title: '通知',
        body: '',
        actionable: false,
        actionId: null,
        actionLabel: null,
        sound: null,
      };
  }
}

// ── Broadcast ────────────────────────────────────

export function push(notification: Omit<QNotification, 'id' | 'timestamp' | 'read'>): QNotification {
  const full: QNotification = {
    ...notification,
    id: uuid(),
    timestamp: new Date().toISOString(),
    read: false,
  };

  // Store for late-joining clients
  recentNotifications.push(full);
  if (recentNotifications.length > 100) {
    recentNotifications.shift();
  }

  // Broadcast to all connected clients
  const data = `data: ${JSON.stringify(full)}\n\n`;
  const deadClients: string[] = [];

  for (const [id, client] of clients) {
    try {
      client.res.write(data);
    } catch {
      deadClients.push(id);
    }
  }

  // Clean up dead clients
  for (const id of deadClients) {
    clients.delete(id);
  }

  console.log(`[q-notify] ${notification.type}: ${notification.title} → ${clients.size} clients`);
  return full;
}

// ── SSE Stream Handler ───────────────────────────

export function sseHandler(res: Response): void {
  const clientId = uuid();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Initial heartbeat
  res.write(`: ok\n\n`);

  const client: SSEClient = { id: clientId, res, connectedAt: new Date().toISOString() };
  clients.set(clientId, client);

  console.log(`[q-notify] Client connected: ${clientId} (total: ${clients.size})`);

  // Replay recent notifications for late-joining clients
  for (const notification of recentNotifications.slice(-20)) {
    try {
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch { break; }
  }

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
      clients.delete(clientId);
    }
  }, 30000);

  // Client disconnect
  res.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
    console.log(`[q-notify] Client disconnected: ${clientId} (total: ${clients.size})`);
  });
}

// ── Convenience Functions ────────────────────────

export function notifyGenerationComplete(params: {
  shotLabel?: string;
  provider?: string;
  credits?: number;
  duration?: string;
}): QNotification {
  return push(buildNotification('GENERATION_COMPLETE', {
    shotLabel: params.shotLabel,
    provider: params.provider,
    credits: params.credits,
    duration: params.duration,
  }));
}

export function notifyGenerationFailed(params: {
  shotLabel?: string;
  reason: string;
  suggestion?: string;
  nodeId?: string;
  retry?: boolean;
}): QNotification {
  return push(buildNotification('GENERATION_FAILED', {
    shotLabel: params.shotLabel,
    reason: params.reason,
    suggestion: params.suggestion,
    nodeId: params.nodeId,
    retry: params.retry,
  }));
}

export function notifyDeviation(params: {
  shotLabel?: string;
  severity: 'DISCREPANCY' | 'DEVIATION' | 'VIOLATION';
  category: string;
  suggestion: string;
  deviationId: string;
  canAutofix?: boolean;
}): QNotification {
  return push(buildNotification('DEVIATION_DETECTED', {
    shotLabel: params.shotLabel,
    severity: params.severity,
    category: params.category,
    suggestion: params.suggestion,
    deviationId: params.deviationId,
    canAutofix: params.canAutofix || false,
  }));
}

export function notifyProgress(params: {
  generated: number;
  total: number;
  credits?: number;
}): QNotification {
  return push(buildNotification('PROGRESS_UPDATE', {
    generated: params.generated,
    total: params.total,
    credits: params.credits,
  }));
}

export function notifyPipelineComplete(params: {
  characterCount: number;
  sceneCount: number;
  shotCount: number;
  credits?: number;
}): QNotification {
  return push(buildNotification('PIPELINE_COMPLETE', {
    characterCount: params.characterCount,
    sceneCount: params.sceneCount,
    shotCount: params.shotCount,
    credits: params.credits,
  }));
}

export function getConnectedClientCount(): number {
  return clients.size;
}
