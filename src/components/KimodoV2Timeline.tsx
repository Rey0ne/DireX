/* === KimodoV2Timeline — 底部 Motion 动作时间线 ===
 * Renders inside the bottom panel (408px) when "动作" tab is active.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 左侧路径点列表 (148px) │ 时间线轨道 + 控制 + 变体预览      │
 * └─────────────────────────────────────────────────────────────┘
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Waypoint } from './EditLockController';
import type { KimodoVariantItem } from '../api/kimodo-api';
import { uploadKimodoSkeleton, type UploadSkeletonResult } from '../api/kimodo-api';
import { BACKEND_URL } from '../api/config';

// ── Types ────────────────────────────────────────

export interface MotionSegment {
  id: string;
  prompt: string;
  startFrame: number;
  frameCount: number;
  color: string;
}

interface KimodoV2TimelineProps {
  waypoints: Waypoint[];
  onWaypointDelete?: (id: string) => void;
  playing: boolean;
  playTime: number;
  duration: number;         // total motion duration in frames
  fps: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onGenerate?: (prompt: string) => void;
  generating?: boolean;
  /** Variants from the last API response */
  variants?: KimodoVariantItem[];
  /** The session ID for accept/reject calls */
  variantSessionId?: string;
  onAcceptVariant?: (variantId: string) => void;
  onRejectVariant?: (variantId: string) => void;
}

// ── Segment colors ───────────────────────────────

const SEG_COLORS = ['#5EEAD4', '#ffcc44', '#ff6644', '#44aaff', '#aa66ff', '#ff88aa'];

// ── Main Component ───────────────────────────────

export default function KimodoV2Timeline({
  waypoints,
  onWaypointDelete,
  playing,
  playTime,
  duration,
  fps,
  onTogglePlay,
  onStop,
  onGenerate,
  generating = false,
  variants,
  variantSessionId,
  onAcceptVariant,
  onRejectVariant,
}: KimodoV2TimelineProps) {
  const [prompt, setPrompt] = useState('');
  const [translated, setTranslated] = useState('');
  const [translating, setTranslating] = useState(false);
  const promptRef = useRef(prompt);
  promptRef.current = prompt;
  const translateTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Auto-translate on prompt change (debounced 600ms) ──
  useEffect(() => {
    if (!prompt.trim()) { setTranslated(''); return; }
    clearTimeout(translateTimer.current);
    translateTimer.current = setTimeout(async () => {
      setTranslating(true);
      try {
        const url = BACKEND_URL ? `${BACKEND_URL}/api/kimodo-v2/translate` : '/api/kimodo-v2/translate';
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt.trim() }),
        });
        const data = await resp.json();
        setTranslated(data.wasTranslated ? data.translated : '');
      } catch { setTranslated(''); }
      setTranslating(false);
    }, 600);
    return () => clearTimeout(translateTimer.current);
  }, [prompt]);

  // Auto-derive segments from waypoints
  const segments: MotionSegment[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const wp = waypoints[i];
    segments.push({
      id: `seg_${i}`,
      prompt: `段${i + 1}`,
      startFrame: i === 0 ? 0 : segments[i - 1].startFrame + segments[i - 1].frameCount,
      frameCount: wp.frameAllocation || 30,
      color: SEG_COLORS[i % SEG_COLORS.length],
    });
  }

  const totalFrames = segments.reduce((s, seg) => s + seg.frameCount, 0) || duration;

  // Progress position on timeline
  const progressPct = duration > 0 ? Math.min(100, (playTime / (duration / fps)) * 100) : 0;

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* ── 左侧: 路径点列表 (148px) ── */}
      <div style={{
        width: 148, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
        padding: '8px 6px', gap: 6, overflowY: 'auto',
      }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          路径点 {waypoints.length}
        </div>

        {waypoints.length === 0 ? (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', textAlign: 'center', padding: 16 }}>
            按 P 进入路径编辑模式<br/>左键地面放置路径点
          </div>
        ) : (
          waypoints.map((wp, i) => {
            const color = i === 0 ? '#44ff88' : i === waypoints.length - 1 ? '#ff6644' : '#ffcc44';
            return (
              <div key={wp.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', borderRadius: 6,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22`,
                fontSize: 9, color: 'rgba(255,255,255,0.5)',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: color, flexShrink: 0,
                }} />
                <span style={{ flex: 1, color: color, fontWeight: 600 }}>#{i + 1}</span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 8 }}>
                  ({wp.x.toFixed(1)}, {wp.z.toFixed(1)})
                </span>
                <span style={{
                  cursor: 'pointer', color: 'rgba(255,80,80,0.3)',
                  fontSize: 11, lineHeight: 1, padding: '0 2px',
                }} onClick={() => onWaypointDelete?.(wp.id)}>×</span>
              </div>
            );
          })
        )}

        {/* Prompt input */}
        <input
          type="text"
          placeholder="动作描述（如: 行走、跑步）"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !generating) {
              e.preventDefault();
              onGenerate?.(promptRef.current || '行走');
            }
          }}
          style={{
            width: '100%', padding: '5px 8px', borderRadius: 6,
            fontSize: 9, background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#ccc', outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* Translation preview */}
        {translating && (
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>翻译中...</div>
        )}
        {!translating && translated && (
          <div style={{
            fontSize: 8, color: 'rgba(94,234,212,0.6)',
            padding: '4px 6px', background: 'rgba(94,234,212,0.04)',
            borderRadius: 4, border: '1px solid rgba(94,234,212,0.1)',
            wordBreak: 'break-word', lineHeight: 1.4,
          }}>
            EN: {translated}
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ActionBtn
            label={generating ? '生成中...' : '生成动作'}
            primary
            onClick={() => onGenerate?.(promptRef.current || '行走')}
            disabled={generating || waypoints.length < 2}
          />
        </div>
      </div>

      {/* ── 右侧: 时间线 + 控制 ── */}
      <div style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
        padding: '8px 10px', gap: 6,
      }}>
        {/* ── Segment 轨道 ── */}
        <div style={{
          flex: 1, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8,
          background: 'rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden',
          minHeight: 120,
        }}>
          {/* Segment bars */}
          <div style={{
            position: 'absolute', top: 8, left: 12, right: 12, bottom: 40,
            display: 'flex', gap: 2,
          }}>
            {segments.map((seg) => {
              const wPct = totalFrames > 0 ? (seg.frameCount / totalFrames) * 100 : 25;
              return (
                <div key={seg.id} style={{
                  width: `${wPct}%`, background: seg.color + '22',
                  border: `1px solid ${seg.color}44`, borderRadius: 6,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative',
                  minWidth: 40,
                }}>
                  <span style={{ fontSize: 10, color: seg.color, fontWeight: 600 }}>
                    {seg.prompt}
                  </span>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>
                    {seg.startFrame}–{seg.startFrame + seg.frameCount}f
                  </span>
                </div>
              );
            })}
            {segments.length === 0 && (
              <div style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.12)', fontSize: 10,
              }}>
                暂无动作段 — 添加路径点后自动生成
              </div>
            )}
          </div>

          {/* Playhead */}
          <div style={{
            position: 'absolute', top: 6, bottom: 38,
            left: `calc(12px + ${progressPct}% * ((100% - 24px) / 100))`,
            width: 2, background: '#ff4444', zIndex: 2,
            pointerEvents: 'none', transition: 'left 0.05s linear',
          }}>
            <div style={{
              width: 0, height: 0, borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent', borderTop: '6px solid #ff4444',
              position: 'absolute', top: -6, left: -4,
            }} />
          </div>

          {/* Time ruler */}
          <div style={{
            position: 'absolute', bottom: 6, left: 12, right: 12,
            height: 30, borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', paddingTop: 4,
          }}>
            {Array.from({ length: 5 }, (_, i) => {
              const f = Math.round((totalFrames / 4) * i);
              return (
                <span key={i} style={{ fontSize: 7, color: 'rgba(255,255,255,0.15)' }}>
                  {f}f
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Transport Controls ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
        }}>
          {/* Play */}
          <button onClick={onTogglePlay} style={{
            width: 32, height: 32, borderRadius: 8,
            background: playing ? 'rgba(94,234,212,0.15)' : 'rgba(255,255,255,0.06)',
            border: playing ? '1px solid rgba(94,234,212,0.3)' : '1px solid rgba(255,255,255,0.08)',
            color: playing ? '#5EEAD4' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12,
          }}>
            {playing ? '⏸' : '▶'}
          </button>

          {/* Stop */}
          <button onClick={onStop} style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
            fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            ⏹
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Generating spinner */}
          {generating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                border: '2px solid rgba(94,234,212,0.2)',
                borderTopColor: '#5EEAD4',
                animation: 'tap-spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 9, color: '#5EEAD4' }}>生成中...</span>
            </div>
          )}

          {/* Info */}
          <div style={{
            display: 'flex', gap: 10, fontSize: 9,
            color: 'rgba(255,255,255,0.3)',
          }}>
            <span>段: {segments.length}</span>
            <span>帧: {totalFrames}</span>
            <span>时长: {(totalFrames / fps).toFixed(1)}s</span>
          </div>
        </div>

        {/* ── Variant Preview Strip ── */}
        <VariantsStrip
          variants={variants}
          sessionId={variantSessionId}
          generating={generating}
          onAccept={onAcceptVariant}
          onReject={onRejectVariant}
        />

        {/* ── Skeleton Upload ── */}
        <SkeletonUpload />
      </div>
    </div>
  );
}

// ── Variant Preview Strip ─────────────────────────

function VariantsStrip({
  variants,
  generating,
  onAccept,
  onReject,
}: {
  variants?: KimodoVariantItem[];
  sessionId?: string;
  generating?: boolean;
  onAccept?: (variantId: string) => void;
  onReject?: (variantId: string) => void;
}) {
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

  const handleAccept = (variantId: string) => {
    setAcceptedId(variantId);
    onAccept?.(variantId);
  };

  const handleReject = (variantId: string) => {
    setRejectedIds(prev => new Set(prev).add(variantId));
    onReject?.(variantId);
  };

  const visibleVariants = (variants || []).filter(v => !rejectedIds.has(v.variantId));

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8,
      background: 'rgba(0,0,0,0.15)', padding: '8px 10px',
      minHeight: 80,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 9, color: 'rgba(255,255,255,0.2)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          变体预览
        </span>
        {variants && variants.length > 0 && (
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.15)' }}>
            {variants.length} 个变体
          </span>
        )}
      </div>

      {generating && (!variants || variants.length === 0) ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 48, color: 'rgba(94,234,212,0.3)', fontSize: 9,
          border: '1px dashed rgba(94,234,212,0.06)', borderRadius: 6,
        }}>
          生成中...
        </div>
      ) : visibleVariants.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 48, color: 'rgba(255,255,255,0.08)', fontSize: 9,
          border: '1px dashed rgba(255,255,255,0.04)', borderRadius: 6,
        }}>
          生成动作后显示变体预览
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {visibleVariants.map(v => {
            const isAccepted = acceptedId === v.variantId;
            return (
              <div key={v.variantId} style={{
                width: 100, minWidth: 100, borderRadius: 8,
                border: isAccepted
                  ? '1px solid rgba(94,234,212,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: isAccepted
                  ? 'rgba(94,234,212,0.08)'
                  : 'rgba(255,255,255,0.03)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}>
                {/* Preview area */}
                <div style={{
                  height: 50, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', background: 'rgba(0,0,0,0.2)',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
                    变体 {v.variantId.replace('v', '')}
                  </span>
                </div>
                {/* Info + actions */}
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  padding: '4px 6px', gap: 3,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>
                    <span>{v.numFrames}f</span>
                    <span>{v.generationTimeS?.toFixed(1)}s</span>
                  </div>
                  {!acceptedId && (
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button
                        onClick={() => handleAccept(v.variantId)}
                        style={{
                          flex: 1, padding: '2px 0', borderRadius: 4,
                          fontSize: 8, fontWeight: 600, cursor: 'pointer',
                          background: 'rgba(94,234,212,0.12)',
                          border: '1px solid rgba(94,234,212,0.2)',
                          color: '#5EEAD4',
                        }}
                      >
                        采用
                      </button>
                      <button
                        onClick={() => handleReject(v.variantId)}
                        style={{
                          flex: 1, padding: '2px 0', borderRadius: 4,
                          fontSize: 8, cursor: 'pointer',
                          background: 'rgba(255,80,80,0.06)',
                          border: '1px solid rgba(255,80,80,0.15)',
                          color: 'rgba(255,100,100,0.5)',
                        }}
                      >
                        放弃
                      </button>
                    </div>
                  )}
                  {isAccepted && (
                    <div style={{ textAlign: 'center', fontSize: 8, color: '#5EEAD4', fontWeight: 600 }}>
                      已采用 ✓
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Skeleton Upload ──────────────────────────────

function SkeletonUpload() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadSkeletonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.bvh')) {
      setError('仅支持 .bvh 文件');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await uploadKimodoSkeleton(file, file.name.replace('.bvh', ''));
      if (res.error) {
        setError(res.error);
        setResult(null);
      } else {
        setResult(res);
        setError(null);
      }
    } catch (e: any) {
      setError(String(e));
      setResult(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const compat = result?.somaskel77Compat;

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8,
      background: 'rgba(0,0,0,0.15)', padding: '8px 10px',
      minHeight: 72, display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 9, color: 'rgba(255,255,255,0.2)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          骨骼
        </span>
        {result && (
          <span style={{ fontSize: 8, color: '#5EEAD4', fontWeight: 600 }}>
            {result.label}
          </span>
        )}
      </div>

      {!result ? (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 40, borderRadius: 6, cursor: 'pointer',
              border: dragOver
                ? '1px dashed rgba(94,234,212,0.3)'
                : '1px dashed rgba(255,255,255,0.06)',
              background: dragOver
                ? 'rgba(94,234,212,0.04)'
                : 'rgba(255,255,255,0.02)',
              transition: 'all 0.15s ease',
            }}
          >
            {uploading ? (
              <span style={{ fontSize: 9, color: '#5EEAD4' }}>上传中...</span>
            ) : (
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)' }}>
                拖拽 .bvh 骨骼文件到此处，或点击选择
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".bvh"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </>
      ) : (
        /* Compatibility report */
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          padding: '6px 8px', borderRadius: 6,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          {/* Status badge row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: compat?.compatible ? '#44ff88' : compat?.canRetarget ? '#ffcc44' : '#ff6644',
            }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              {result.jointCount} 关节
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
              {result.fileSizeBytes > 1024
                ? `${(result.fileSizeBytes / 1024).toFixed(1)} KB`
                : `${result.fileSizeBytes} B`}
            </span>
          </div>

          {/* Compatibility details */}
          {compat && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', gap: 8, fontSize: 8 }}>
                <span style={{ color: '#44ff88' }}>已映射: {compat.mappedJoints}</span>
                <span style={{ color: '#ff6644' }}>未映射: {compat.unmappedJoints}</span>
                <span style={{ color: '#ffcc44' }}>缺失: {compat.missingSomaskel77Joints}</span>
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', display: 'flex', gap: 8 }}>
                <span>{compat.compatible ? '✅ 完全兼容' : compat.canRetarget ? '⚠️ 可重定向' : '❌ 无法重定向'}</span>
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>SOMASKEL77</span>
              </div>
            </div>
          )}

          {/* Dismiss button */}
          <button
            onClick={() => setResult(null)}
            style={{
              alignSelf: 'flex-end', padding: '1px 8px', borderRadius: 4,
              fontSize: 8, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            清除
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          fontSize: 8, color: '#ff6644', padding: '2px 6px',
          background: 'rgba(255,80,80,0.06)', borderRadius: 4,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────

function ActionBtn({ label, primary, onClick, disabled }: {
  label: string;
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '6px 0', borderRadius: 6,
      fontSize: 10, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
      border: primary
        ? '1px solid rgba(94,234,212,0.25)'
        : '1px solid rgba(255,255,255,0.06)',
      background: primary
        ? 'rgba(94,234,212,0.12)'
        : 'rgba(255,255,255,0.03)',
      color: primary ? '#5EEAD4' : 'rgba(255,255,255,0.4)',
      opacity: disabled ? 0.35 : 1,
      transition: 'all 0.12s ease',
    }}>
      {label}
    </button>
  );
}
