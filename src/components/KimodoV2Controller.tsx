/* === KimodoV2Controller — 独立动作生成模块 ===
 *
 * 自包含所有 Kimodo v2 业务逻辑与 UI。不依赖 Scene3DNode 内部实现。
 *
 * 导出:
 *   useKimodoV2(params) → KimodoV2State  状态 + 处理器
 *   KimodoV2CanvasOverlay                 R3F 组件（放入 <Canvas>）
 *   KimodoV2MotionPanel                   底部动作面板
 *   KimodoV2Sidebar                       侧边栏绑定 UI
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { EditLockController, WaypointMarkers, type Waypoint, type EditLockMode } from './EditLockController';
import KimodoV2Timeline from './KimodoV2Timeline';
import {
  generateKimodoPath,
  acceptKimodoVariant,
  rejectKimodoVariant,
  uploadKimodoSkeleton,
  type KimodoVariantItem,
  type UploadSkeletonResult,
} from '../api/kimodo-api';

// ── 公开接口 ─────────────────────────────────────────

export interface KimodoV2State {
  waypoints: Waypoint[];
  handleWaypointPlace: (x: number, z: number) => void;
  handleWaypointDelete: (id: string) => void;
  editLockMode: EditLockMode;
  motionGenerating: boolean;
  motionVariants: KimodoVariantItem[] | undefined;
  motionSessionId: string | undefined;
  handleMotionGenerate: (prompt: string) => void;
  handleAcceptVariant: (variantId: string) => void;
  handleRejectVariant: (variantId: string) => void;
  bvhDataRef: React.MutableRefObject<{ posedJoints: number[][][]; jointNames: string[] } | null>;
  retargetModelId: string | null;
  setRetargetModelId: (id: string | null) => void;
  retargetMode: string;
  retargetReport: string[];
  retargetQuality: number;
  handleRetargetReady: (mode: string, report: string[], quality: number) => void;
  bottomTab: 'model' | 'motion';
  setBottomTab: (tab: 'model' | 'motion') => void;
}

export interface UseKimodoV2Params {
  /** Scene3DNode 回调：BVH 生成完成 → 创建 3D 物件 */
  onBvhGenerated: (b64: string, url: string, posedJoints: number[][][], jointNames: string[]) => void;
  playing: boolean;
  setPlaying: (v: boolean) => void;
  playTime: number;
  setPlayTime: (v: number) => void;
  rigDuration: number;
  selectedId: string | null;
  /** 当前选中的是 figure 类型（可绑定骨骼） */
  selectedIsFigure: boolean;
}

// ── Hook ──────────────────────────────────────────────

export function useKimodoV2(params: UseKimodoV2Params): KimodoV2State {
  const {
    onBvhGenerated, playing:_playing, setPlaying, playTime:_playTime, setPlayTime,
    rigDuration:_rigDuration, selectedId:_selectedId, selectedIsFigure:_selectedIsFigure,
  } = params;

  // Waypoints
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const wpCounterRef = useRef(0);

  // Edit lock
  const [editLockMode, setEditLockMode] = useState<EditLockMode>('none');

  // Motion generation
  const [motionGenerating, setMotionGenerating] = useState(false);
  const [motionVariants, setMotionVariants] = useState<KimodoVariantItem[] | undefined>(undefined);
  const [motionSessionId, setMotionSessionId] = useState<string | undefined>(undefined);

  // Retarget
  const [retargetModelId, setRetargetModelId] = useState<string | null>(null);
  const [retargetMode, setRetargetMode] = useState('');
  const [retargetReport, setRetargetReport] = useState<string[]>([]);
  const [retargetQuality, setRetargetQuality] = useState(0);

  // BVH data ref
  const bvhDataRef = useRef<{ posedJoints: number[][][]; jointNames: string[] } | null>(null);

  // Bottom tab
  const [bottomTab, setBottomTab] = useState<'model' | 'motion'>('model');

  // ── Waypoint handlers ──

  const handleWaypointPlace = useCallback((x: number, z: number) => {
    wpCounterRef.current++;
    setWaypoints(prev => [...prev, { id: `wp_${wpCounterRef.current}`, x, z, frameAllocation: 30 }]);
  }, []);

  const handleWaypointDelete = useCallback((id: string) => {
    setWaypoints(prev => prev.filter(w => w.id !== id));
  }, []);

  // ── Motion generation ──

  const handleMotionGenerate = useCallback(async (prompt: string) => {
    if (motionGenerating || waypoints.length < 2) return;
    setMotionGenerating(true);
    setMotionVariants(undefined);
    setMotionSessionId(undefined);
    try {
      const totalFrames = waypoints.reduce((s, wp) => s + wp.frameAllocation, 0);
      const result = await generateKimodoPath({
        prompt,
        waypoints: waypoints.map(w => ({ x: w.x, z: w.z, frameAllocation: w.frameAllocation })),
        totalFrames,
        blendFrames: 20,
      });
      if (result.error) {
        console.error('[KimodoV2] Path generation failed:', result.error);
        return;
      }
      if (result.blendedBvhBase64) {
        const posedJoints = result.posedJoints || [];
        const jointNames = result.jointNames || [];
        onBvhGenerated(
          result.blendedBvhBase64,
          `/api/kimodo-v2/sessions/${result.sessionId}/bvh/blended.bvh`,
          posedJoints,
          jointNames,
        );
        bvhDataRef.current = { posedJoints, jointNames };
        setPlayTime(0);
        setPlaying(true);
      }
      setMotionSessionId(result.sessionId);
    } catch (e: any) {
      console.error('[KimodoV2] Motion generation error:', e);
    } finally {
      setMotionGenerating(false);
    }
  }, [motionGenerating, waypoints, onBvhGenerated, setPlayTime, setPlaying]);

  // ── Variant handlers ──

  const handleAcceptVariant = useCallback(async (variantId: string) => {
    if (!motionSessionId) return;
    const result = await acceptKimodoVariant(motionSessionId, variantId);
    if (!result.error) {
      console.log('[KimodoV2] Variant accepted:', variantId, result.promotedBvhUrl);
    }
  }, [motionSessionId]);

  const handleRejectVariant = useCallback(async (variantId: string) => {
    if (!motionSessionId) return;
    const result = await rejectKimodoVariant(motionSessionId, variantId);
    if (!result.error) {
      setMotionVariants(prev => prev?.filter(v => v.variantId !== variantId));
    }
  }, [motionSessionId]);

  // ── Retarget ready callback ──

  const handleRetargetReady = useCallback((mode: string, report: string[], quality: number) => {
    setRetargetMode(mode);
    setRetargetReport(report);
    setRetargetQuality(quality);
  }, []);

  // ── P key toggle ──

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'p' || e.key === 'P') {
        e.stopImmediatePropagation();
        setEditLockMode(prev => prev === 'path' ? 'none' : 'path');
      }
      if (e.key === 'Escape' && editLockMode !== 'none') {
        e.stopImmediatePropagation();
        setEditLockMode('none');
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [editLockMode]);

  return {
    waypoints, handleWaypointPlace, handleWaypointDelete,
    editLockMode,
    motionGenerating, motionVariants, motionSessionId,
    handleMotionGenerate, handleAcceptVariant, handleRejectVariant,
    bvhDataRef,
    retargetModelId, setRetargetModelId,
    retargetMode, retargetReport, retargetQuality,
    handleRetargetReady,
    bottomTab, setBottomTab,
  };
}

// ── R3F Canvas Overlay ────────────────────────────────

interface KimodoV2CanvasOverlayProps {
  state: KimodoV2State;
}

/** 放入 <Canvas> 内的 R3F 组件 */
export function KimodoV2CanvasOverlay({ state }: KimodoV2CanvasOverlayProps) {
  const { waypoints, handleWaypointDelete, editLockMode } = state;
  const { gl } = useThree();
  const orbitRef = useRef<any>(null);

  // 获取 OrbitControls 引用
  useEffect(() => {
    const findOrbit = () => {
      // OrbitControls 通常挂在 scene 的 userData 或通过 domElement 查找
      const el = gl.domElement;
      // drei 的 OrbitControls 存储方式：遍历寻找
      const controls = (el as any).__orbitControls;
      if (controls) orbitRef.current = controls;
    };
    findOrbit();
  }, [gl]);

  // 路径模式下禁用左键旋转、切换光标
  useEffect(() => {
    const oc = orbitRef.current;
    if (oc?.mouseButtons) {
      if (editLockMode === 'path') {
        oc.mouseButtons.LEFT = -1;
      } else {
        oc.mouseButtons.LEFT = 0;
      }
    }
    gl.domElement.style.cursor = editLockMode === 'path' ? 'crosshair' : '';
    return () => {
      gl.domElement.style.cursor = '';
      if (oc?.mouseButtons) oc.mouseButtons.LEFT = 0;
    };
  }, [editLockMode, gl]);

  // 持续追踪 Ctrl 键
  const ctrlRef = useRef(false);
  useEffect(() => {
    const d = (e: KeyboardEvent) => { if (e.key === 'Control') ctrlRef.current = true; };
    const u = (e: KeyboardEvent) => { if (e.key === 'Control') ctrlRef.current = false; };
    window.addEventListener('keydown', d);
    window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  }, []);

  useFrame(() => {
    const oc = orbitRef.current;
    if (!oc?.mouseButtons || editLockMode !== 'path') return;
    oc.mouseButtons.LEFT = ctrlRef.current ? 0 : -1;
  });

  return (
    <>
      <WaypointMarkers waypoints={waypoints} onDelete={handleWaypointDelete} />
      <EditLockController mode={editLockMode} />
    </>
  );
}

// ── CSS Animations (injected once) ─────────────────────

let _hudStylesInjected = false;
function injectHudStyles() {
  if (_hudStylesInjected) return;
  _hudStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes kv2-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.75); }
    }
    @keyframes kv2-fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes kv2-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes kv2-crosshair-pulse {
      0%, 100% { border-color: rgba(94,234,212,0.4); }
      50% { border-color: rgba(94,234,212,0.8); }
    }
  `;
  document.head.appendChild(style);
}

// ── HUD Overlay (HTML, rendered over 3D canvas) ────────

interface KimodoV2HUDProps {
  state: KimodoV2State;
}

/**
 * HTML overlay positioned absolutely over the 3D <Canvas>.
 * Place as a sibling of <Canvas> inside a position:relative container.
 *
 * Shows:
 *   - Mode badge (top-left) — path edit mode indicator with pulse
 *   - Waypoint counter (top-right)
 *   - Crosshair (center) — only in path edit mode
 *   - Hint bar (bottom-center) — key bindings and tips
 *   - Generation status toast (bottom-center, transient)
 */
export function KimodoV2HUD({ state }: KimodoV2HUDProps) {
  const {
    editLockMode, waypoints,
    motionGenerating, motionVariants,
    bvhDataRef, retargetModelId,
  } = state;

  // Inject CSS keyframes once
  useEffect(() => { injectHudStyles(); }, []);

  const isPathMode = editLockMode === 'path';
  const hasBVH = !!bvhDataRef.current;
  const hasVariants = motionVariants && motionVariants.length > 0;
  const isBound = !!retargetModelId;

  // Hide entirely when nothing to show
  if (!isPathMode && waypoints.length === 0 && !motionGenerating && !hasBVH) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      pointerEvents: 'none', userSelect: 'none',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* ── Top-left: Mode badge ── */}
      {isPathMode && (
        <div style={{
          position: 'absolute', top: 12, left: 12,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 20,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(94,234,212,0.25)',
          animation: 'kv2-fade-in 0.25s ease',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#5EEAD4',
            animation: 'kv2-pulse 1.8s ease-in-out infinite',
            boxShadow: '0 0 8px rgba(94,234,212,0.6)',
          }} />
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#5EEAD4',
            letterSpacing: '0.04em',
          }}>
            路径编辑
          </span>
        </div>
      )}

      {/* ── Top-right: Waypoint counter + BVH status ── */}
      {waypoints.length > 0 && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 16,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              路径点
            </span>
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: waypoints.length >= 2 ? '#5EEAD4' : '#ffcc44',
            }}>
              {waypoints.length}
            </span>
          </div>
          {hasBVH && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 12,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              border: isBound
                ? '1px solid rgba(94,234,212,0.2)'
                : '1px solid rgba(255,200,100,0.15)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isBound ? '#5EEAD4' : '#ffcc44',
              }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
                {isBound ? '骨骼已绑定' : 'BVH 就绪'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Center: Crosshair (path mode) ── */}
      {isPathMode && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 0,
        }}>
          {/* Outer ring */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '2px solid rgba(94,234,212,0.4)',
            animation: 'kv2-crosshair-pulse 2s ease-in-out infinite',
          }} />
          {/* Center dot */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 4, height: 4, borderRadius: '50%',
            background: '#5EEAD4',
            boxShadow: '0 0 6px rgba(94,234,212,0.8)',
          }} />
        </div>
      )}

      {/* ── Bottom-center: Hint bar ── */}
      {isPathMode && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: 16,
          padding: '6px 16px', borderRadius: 14,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { key: '🖱', label: '左键放置' },
            { key: '🖱➡', label: '右键删除' },
            { key: 'Ctrl+🖱', label: '旋转视角' },
            { key: 'P', label: '退出编辑' },
          ].map(h => (
            <div key={h.label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                fontSize: 9, color: 'rgba(255,255,255,0.25)',
              }}>
                {h.key}
              </span>
              <span style={{
                fontSize: 10, color: 'rgba(255,255,255,0.55)',
              }}>
                {h.label}
              </span>
            </div>
          ))}
          {waypoints.length >= 2 && (
            <span style={{
              fontSize: 9, color: 'rgba(94,234,212,0.5)',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              paddingLeft: 12,
            }}>
              可以生成动作
            </span>
          )}
        </div>
      )}

      {/* ── Generation status toast ── */}
      {motionGenerating && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 20px', borderRadius: 20,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(94,234,212,0.25)',
          animation: 'kv2-fade-in 0.3s ease',
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid rgba(94,234,212,0.2)',
            borderTopColor: '#5EEAD4',
            animation: 'kv2-spin 0.7s linear infinite',
          }} />
          <span style={{
            fontSize: 12, color: '#5EEAD4', fontWeight: 500,
          }}>
            正在生成动作...
          </span>
        </div>
      )}

      {/* ── Variants ready toast ── */}
      {!motionGenerating && hasVariants && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 20px', borderRadius: 20,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(94,234,212,0.2)',
          animation: 'kv2-fade-in 0.3s ease',
        }}>
          <span style={{ fontSize: 14 }}>✓</span>
          <span style={{
            fontSize: 12, color: '#5EEAD4', fontWeight: 500,
          }}>
            生成完成 · {motionVariants!.length} 个变体可选
          </span>
        </div>
      )}
    </div>
  );
}

// ── 侧边栏绑定 UI ────────────────────────────────────

interface KimodoV2SidebarProps {
  state: KimodoV2State;
}

export function KimodoV2Sidebar({ state }: KimodoV2SidebarProps) {
  const {
    bvhDataRef, retargetModelId, setRetargetModelId,
    retargetMode, retargetReport, retargetQuality,
  } = state;

  // ── Skeleton upload state (self-contained) ──
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [skelResult, setSkelResult] = useState<UploadSkeletonResult | null>(null);
  const [skelError, setSkelError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSkelFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.bvh')) {
      setSkelError('仅支持 .bvh 文件');
      return;
    }
    setUploading(true);
    setSkelError(null);
    try {
      const res = await uploadKimodoSkeleton(file, file.name.replace('.bvh', ''));
      if (res.error) {
        setSkelError(res.error);
        setSkelResult(null);
      } else {
        setSkelResult(res);
        setSkelError(null);
      }
    } catch (e: any) {
      setSkelError(String(e));
      setSkelResult(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const compat = skelResult?.somaskel77Compat;
  const bvhData = bvhDataRef.current;
  const hasBVH = !!bvhData;
  const isBound = !!retargetModelId;
  const qualityPct = Math.round(retargetQuality * 100);

  return (
    <div style={{
      width: '100%', marginTop: 8,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* ── Section: BVH Status ── */}
      {hasBVH && (
        <div style={{
          padding: '8px 6px', borderRadius: 8,
          background: 'rgba(94,234,212,0.04)',
          border: '1px solid rgba(94,234,212,0.12)',
          display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
        }}>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            动作数据
          </div>

          {/* Joint count badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 10,
            background: 'rgba(94,234,212,0.08)',
          }}>
            <span style={{ fontSize: 10, color: '#5EEAD4', fontWeight: 600 }}>
              {bvhData.jointNames.length} 关节
            </span>
            <span style={{ fontSize: 9, color: 'rgba(94,234,212,0.5)' }}>
              {bvhData.posedJoints.length} 帧
            </span>
          </div>

          {/* Retarget status */}
          {isBound ? (
            <div style={{
              width: '100%', display: 'flex', flexDirection: 'column', gap: 4,
              padding: '6px 8px', borderRadius: 6,
              background: 'rgba(94,234,212,0.06)',
              border: '1px solid rgba(94,234,212,0.15)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 10, color: '#5EEAD4', fontWeight: 600 }}>
                  已绑定 · {retargetMode === 'full' ? '全身骨骼' : retargetMode === 'root-only' ? '根跟随' : '火柴人'}
                </span>
                <span style={{ fontSize: 9, color: 'rgba(94,234,212,0.5)' }}>
                  {qualityPct}%
                </span>
              </div>
              {/* Quality meter */}
              <div style={{
                height: 3, borderRadius: 2, overflow: 'hidden',
                background: 'rgba(255,255,255,0.08)',
              }}>
                <div style={{
                  height: '100%', width: `${qualityPct}%`,
                  background: qualityPct >= 80 ? '#44ff88' : qualityPct >= 50 ? '#ffcc44' : '#ff6644',
                  borderRadius: 2, transition: 'width 0.3s ease',
                }} />
              </div>
              {retargetReport.map((r, i) => (
                <div key={i} style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                  {r}
                </div>
              ))}
              <button
                onClick={() => setRetargetModelId(null)}
                style={{
                  alignSelf: 'center', padding: '3px 12px', borderRadius: 4,
                  fontSize: 9, cursor: 'pointer', marginTop: 2,
                  background: 'rgba(255,80,80,0.08)',
                  border: '1px solid rgba(255,80,80,0.2)',
                  color: '#c44',
                }}
              >
                解绑
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
              选中 3D 模型以绑定骨骼动画
            </div>
          )}
        </div>
      )}

      {/* ── Section: Skeleton Upload ── */}
      <div style={{
        padding: '8px 6px', borderRadius: 8,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
      }}>
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          骨骼上传
        </div>

        {!skelResult ? (
          <>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleSkelFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 40, borderRadius: 6, cursor: 'pointer',
                border: dragOver
                  ? '1px dashed rgba(94,234,212,0.35)'
                  : '1px dashed rgba(255,255,255,0.08)',
                background: dragOver
                  ? 'rgba(94,234,212,0.06)'
                  : 'rgba(255,255,255,0.01)',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
              }}
            >
              {uploading ? (
                <span style={{ fontSize: 9, color: '#5EEAD4' }}>上传中...</span>
              ) : (
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', textAlign: 'center', padding: '0 4px' }}>
                  拖拽 .bvh 或点击上传
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
                if (file) handleSkelFile(file);
              }}
            />
          </>
        ) : (
          /* Compatibility report */
          <div style={{
            width: '100%', display: 'flex', flexDirection: 'column', gap: 4,
            padding: '6px 8px', borderRadius: 6, boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: compat?.compatible ? '#44ff88' : compat?.canRetarget ? '#ffcc44' : '#ff6644',
              }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                {skelResult.jointCount} 关节
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
                {skelResult.fileSizeBytes > 1024
                  ? `${(skelResult.fileSizeBytes / 1024).toFixed(1)} KB`
                  : `${skelResult.fileSizeBytes} B`}
              </span>
            </div>
            {compat && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', gap: 6, fontSize: 8 }}>
                  <span style={{ color: '#44ff88' }}>匹配: {compat.mappedJoints}</span>
                  <span style={{ color: '#ff6644' }}>未匹配: {compat.unmappedJoints}</span>
                  <span style={{ color: '#ffcc44' }}>缺失: {compat.missingSomaskel77Joints}</span>
                </div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                  {compat.compatible ? '✅ 完全兼容 SOMASKEL77' : compat.canRetarget ? '⚠️ 可重定向' : '❌ 无法重定向'}
                </div>
              </div>
            )}
            <button
              onClick={() => setSkelResult(null)}
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
        {skelError && (
          <div style={{
            width: '100%', fontSize: 8, color: '#ff6644', padding: '3px 6px',
            background: 'rgba(255,80,80,0.06)', borderRadius: 4,
            boxSizing: 'border-box',
          }}>
            {skelError}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 底部动作面板 ──────────────────────────────────────

interface KimodoV2MotionPanelProps {
  state: KimodoV2State;
  playing: boolean;
  setPlaying: (v: boolean) => void;
  playTime: number;
  setPlayTime: (v: number) => void;
  rigDuration: number;
}

export function KimodoV2MotionPanel({
  state, playing, setPlaying, playTime, setPlayTime, rigDuration,
}: KimodoV2MotionPanelProps) {
  const {
    waypoints, handleWaypointDelete,
    motionGenerating, motionVariants, motionSessionId,
    handleMotionGenerate, handleAcceptVariant, handleRejectVariant,
  } = state;

  const duration = waypoints.reduce((s, wp) => s + wp.frameAllocation, 0) || rigDuration * 30 || 300;

  return (
    <KimodoV2Timeline
      waypoints={waypoints}
      onWaypointDelete={handleWaypointDelete}
      playing={playing}
      playTime={playTime}
      duration={duration}
      fps={30}
      onTogglePlay={() => {
        if (playing) setPlaying(false);
        else { if (playTime >= duration / 30) setPlayTime(0); setPlaying(true); }
      }}
      onStop={() => { setPlaying(false); setPlayTime(0); }}
      onGenerate={handleMotionGenerate}
      generating={motionGenerating}
      variants={motionVariants}
      variantSessionId={motionSessionId}
      onAcceptVariant={handleAcceptVariant}
      onRejectVariant={handleRejectVariant}
    />
  );
}
