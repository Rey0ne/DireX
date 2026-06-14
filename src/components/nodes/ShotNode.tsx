/* === ShotNode — Text generation node === */
/* Agent decides output type (storyboard / image-prompt / etc.) based on user input */

import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useStore } from '@xyflow/react';
import { RefStrip } from '../shared/RefStrip';
import { useMention } from '../shared/useMention';
import { useCanvasStore } from '../../store/useCanvasStore';
import { getSharedApiKey } from '../../api/gateway';

interface ShotNodeData {
  title: string;
  shot?: {
    intent_cn?: string;
    framing?: string;
    movement?: string;
    key?: string;
    lens?: string;
    angle?: string;
    mood?: string;
    color?: string;
  };
  gen?: {
    prompt?: string;
    model?: string;
    [key: string]: unknown;
  };
  imageUrl?: string;
  isConnecting?: boolean;
  isConnectTarget?: boolean;
  multiSelect?: boolean;
  isPickMode?: boolean;
  isPickTarget?: boolean;
  hasConnections?: boolean;
  refUrls?: string[];
  styleImageUrl?: string | null;
  onChange?: (patch: Record<string, unknown>) => void;
  onGenerate?: () => void;
}

export function ShotNode({ id, data, selected }: { id: string; data: ShotNodeData; selected?: boolean }) {
  const shot = data.shot || {};
  const gen = data.gen || {};
  const panelRef = useRef<HTMLDivElement>(null);
  const { showMention, setShowMention, mentionList, detectMention, insertMention } = useMention(data.refUrls, data.styleImageUrl);
  const [hovered, setHovered] = useState(false);
  const [prompt, setPrompt] = useState(gen.prompt || '');
  const [expanded, setExpanded] = useState(false);
  const [genRunning, setGenRunning] = useState(false);
  const [scriptMode, setScriptMode] = useState(false);
  const [scriptResult, setScriptResult] = useState<any>(null);
  const zoom = useStore(s => s.transform[2]);
  const genRunningRef = useRef(false);
  const mentionedUrlsRef = useRef<string[]>([]);
  const canvasStore = useCanvasStore();

  const patch = useCallback((k: string, v: unknown) => {
    data.onChange?.({ [k]: v });
  }, [data]);

  const handleGenerate = () => {
    if (genRunningRef.current) return;
    if (scriptMode) {
      handleScriptAnalysis();
      return;
    }
    // Allow empty prompt when reference images are connected (reverse-prompt mode)
    if (!prompt.trim() && (!(data as any).refUrls || (data as any).refUrls.length === 0)) return;
    genRunningRef.current = true;
    setGenRunning(true);
    patch('prompt', prompt);
    Promise.resolve(data.onGenerate?.()).finally(() => {
      genRunningRef.current = false;
      setGenRunning(false);
    });
  };

  const handleScriptAnalysis = async () => {
    if (!prompt.trim()) return;
    genRunningRef.current = true;
    setGenRunning(true);
    setScriptResult(null);
    try {
      const resp = await fetch('/api/agent/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({ scriptText: prompt }),
      });
      const json = await resp.json();
      if (json.success) {
        setScriptResult(json);
        patch('scriptResult', json);
        // Auto-create shot nodes from result
        if (json.scenes && json.scenes.length > 0) {
          const cx = canvasStore.nodes.get(id);
          if (cx) {
            let yOff = (cx.pos?.y || 0) + 200;
            const xOff = (cx.pos?.x || 0) + 340;
            json.scenes.forEach((scene: any, si: number) => {
              scene.shots.forEach((shot: any, shi: number) => {
                const nid = 'shot_' + Date.now() + '_' + si + '_' + shi;
                canvasStore.addNode('shot', { x: xOff + shi * 320, y: yOff + si * 400 }, shot.visualPrompt?.slice(0, 30) || 'Shot ' + shot.shotNumber);
                canvasStore.updateNode(nid, {
                  meta: {
                    shot: {
                      intent_cn: shot.visualPrompt,
                      framing: shot.shotType,
                      movement: shot.cameraMovement,
                      lens: shot.angle,
                      aperture: shot.aperture,
                    },
                    gen: {
                      prompt: shot.visualPrompt,
                      model: 'GPT Image2',
                      aspect: '16:9',
                    },
                  },
                });
              });
            });
            canvasStore.triggerSync();
          }
        }
      }
    } catch (err) {
      console.error('[script-analysis] Error:', err);
    } finally {
      genRunningRef.current = false;
      setGenRunning(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Card wrapper */}
      <div style={{ position: 'relative' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ position: 'absolute', top: '-20px', left: '8px', zIndex: 10, fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)', letterSpacing: '0.05em' }}>TEXT</div>

        <Handle type="target" position={Position.Left} id="refs-in"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
            left: '-20px', top: '50%', opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>
        <Handle type="source" position={Position.Right} id="shot-out"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
            right: '-20px', top: '50%', opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>

        {/* Main Card */}
        <div style={{
          width: '280px',
          background: 'var(--tap-panel)',
          border: data.isPickTarget
            ? '2px solid rgba(180,180,185,0.55)'
            : data.isPickMode
              ? '1px dashed rgba(180,180,185,0.3)'
              : data.isConnectTarget
                ? '1px solid rgba(180,180,185,0.5)'
                : selected ? '2px solid rgba(180,180,185,0.45)' : '1px solid var(--tap-border)',
          borderRadius: 'var(--tap-r-xl)',
          boxShadow: data.isPickTarget
            ? '0 0 28px rgba(180,180,185,0.25)'
            : data.isConnectTarget
              ? '0 0 28px rgba(180,180,185,0.2)'
              : selected ? '0 0 20px rgba(180,180,185,0.08)' : 'var(--tap-shadow-sm)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        }}>
          {/* Title */}
          <input
            value={data.title || ''}
            onChange={e => { data.onChange?.({ title: e.target.value }); }}
            placeholder="标题…"
            onPointerDownCapture={e => { e.stopPropagation() }}
            onMouseDownCapture={e => { e.stopPropagation() }}
            style={{
              fontSize: 'var(--tap-fs-h2)', fontWeight: 600,
              color: 'var(--tap-text-1)', background: 'transparent',
              border: 'none', outline: 'none', width: '100%',
            }}
          />

          {/* Content — Agent output area */}
          {genRunning ? (
            <div style={{
              minHeight: '80px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.1)',
                borderTopColor: 'var(--tap-accent)',
                animation: 'tap-spin 0.8s linear infinite',
              }} />
              <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-4)' }}>
                Agent 分析中…
              </div>
            </div>
          ) : (shot.intent_cn || (gen.compiledPromptCn as string) || gen.compiledPrompt) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  color: 'var(--tap-accent)',
                  background: 'rgba(74,158,255,0.12)',
                  padding: '2px 8px', borderRadius: 'var(--tap-r-full)',
                }}>
                  {shot.intent_cn ? '分镜解析' : '提示词生成'}
                </span>
              </div>
              <div
                onPointerDownCapture={e => e.stopPropagation()}
                onMouseDownCapture={e => e.stopPropagation()}
                style={{
                  maxHeight: '200px', overflowY: 'auto',
                  fontSize: 'var(--tap-fs-body)',
                  color: 'var(--tap-text-1)', lineHeight: 1.8,
                  whiteSpace: 'pre-wrap', userSelect: 'text',
                  cursor: 'text',
                }}>
                {shot.intent_cn || (gen.compiledPromptCn as string) || (gen.compiledPrompt as string)}
              </div>
            </div>
          ) : (
            <div style={{
              minHeight: '80px', fontSize: 'var(--tap-fs-body)',
              color: 'var(--tap-text-4)', lineHeight: 1.8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              输入需求，Agent 自动分析并输出文本
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Prompt Panel ── */}
      {selected && !data.multiSelect && (
        <div
          ref={panelRef}
          onContextMenu={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: `translateX(-50%) scale(${1.5/zoom})`,
            transformOrigin: 'top center',
            width: '280px',
            marginTop: `${10/zoom}px`,
            zIndex: 50,
            animation: 'tap-fade-in 50ms var(--tap-ease)',
          }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'var(--tap-r-xl)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <RefStrip nodeId={id} refUrls={data.refUrls} />
              <span onClick={() => setExpanded(!expanded)} title={expanded ? '收起' : '展开'}
                style={{ fontSize: '12px', color: 'var(--tap-text-4)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-4)'; }}
              >{expanded ? '↥' : '↧'}</span>
            </div>
            <textarea
              value={prompt}
              onChange={e => {
                const v = e.target.value;
                setPrompt(v);
                detectMention(v, e.target.selectionStart || 0);
              }}
              onPointerDownCapture={e => { e.stopPropagation() }}
              onMouseDownCapture={e => { e.stopPropagation() }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder={scriptMode ? "粘贴完整剧本文本…\n\n例：\n酒吧内景 - 夜\nA一脚踹开大门，大步走进酒吧。所有人转头看向他。\n沉默。\nA走向吧台，坐下。" : "输入需求或场景描述…"}
              maxLength={scriptMode ? 50000 : 5000}
              rows={scriptMode ? 12 : expanded ? 8 : 4}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                padding: '12px 14px', fontSize: 'var(--tap-fs-body)',
                color: 'var(--tap-text-1)', resize: 'none', outline: 'none',
                lineHeight: 1.5,
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)', flex: 1 }}>
                {scriptMode ? '剧本分镜分析' : 'Agent 自动路由'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setScriptMode(!scriptMode); setScriptResult(null); }}
                style={{
                  fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                  background: scriptMode ? 'rgba(255,180,60,0.15)' : 'rgba(255,255,255,0.04)',
                  border: scriptMode ? '1px solid rgba(255,180,60,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: scriptMode ? '#ffaa44' : 'var(--tap-text-4)',
                  borderRadius: 'var(--tap-r-full)', padding: '3px 10px',
                  whiteSpace: 'nowrap',
                }}
              >{scriptMode ? '📜 剧本' : '分镜'}</button>
              {showMention && mentionList.length > 0 && createPortal(
                <div onMouseDown={e => e.preventDefault()} style={{
                  position: 'fixed',
                  bottom: panelRef.current ? window.innerHeight - panelRef.current.getBoundingClientRect().top + 4 : 200,
                  left: panelRef.current ? panelRef.current.getBoundingClientRect().left : '25vw',
                  width: 360, background: 'var(--tap-panel)',
                  border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-lg)',
                  padding: '8px', zIndex: 99999, maxHeight: '180px', overflowY: 'auto',
                  boxShadow: 'var(--tap-shadow-lg)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--tap-text-4)', padding: '2px 6px' }}>选择参考图</div>
                  {mentionList.map((m, i) => (
                    <div key={i} onClick={() => {
                      setPrompt(insertMention(m, prompt));
                      if (!mentionedUrlsRef.current.includes(m.url)) {
                        mentionedUrlsRef.current.push(m.url);
                        patch('referenceUrls', [...mentionedUrlsRef.current]);
                      }
                      setShowMention(false);
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--tap-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6, borderRadius: 'var(--tap-r-sm)', cursor: 'pointer', background: 'transparent' }}>
                      <img src={m.url} style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
                      <div><div style={{ fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)', fontWeight: 500 }}>{m.name}</div></div>
                    </div>
                  ))}
                </div>,
                document.body
              )}
              <button
                onClick={handleGenerate}
                disabled={genRunning}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: genRunning ? 'var(--tap-warning)' : prompt.trim() ? 'var(--tap-accent)' : 'rgba(255,255,255,0.08)',
                  color: (genRunning || prompt.trim()) ? '#fff' : 'var(--tap-text-4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '13px',
                  cursor: genRunning ? 'wait' : 'pointer', border: 'none',
                  flexShrink: 0,
                  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                  animation: genRunning ? 'tap-pulse-glow 1.5s var(--tap-ease) infinite' : 'none',
                }}
                onMouseEnter={e => { if (!genRunning) e.currentTarget.style.transform = 'scale(1.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {genRunning ? '⏳' : '↑'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
