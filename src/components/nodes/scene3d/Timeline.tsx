/* === Timeline — camera keyframes + clip block sequencer === */
import React, { useState } from 'react';
import * as THREE from 'three';
import { CameraRig, ClipBlock, AnimationTimeline } from './shared';
import { clipLibrary, getClipLabel } from './ClipLibrary';

interface TimelineProps {
  rig: CameraRig;
  playing: boolean;
  playTime: number;
  zoom: number;
  timelineH: number;
  animTimeline: AnimationTimeline | null;
  setRig: React.Dispatch<React.SetStateAction<CameraRig | null>>;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setPlayTime: React.Dispatch<React.SetStateAction<number>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setTimelineH: React.Dispatch<React.SetStateAction<number>>;
  setAnimTimeline: React.Dispatch<React.SetStateAction<AnimationTimeline | null>>;
  activeCamRef: React.MutableRefAction<THREE.Object3D | null>;
  getTrackCamera: (prog: number) => any;
}

// ─── Track color palette for clip blocks ───
const BLOCK_COLORS = [
  '#5EEAD4', '#FFB347', '#7DD3FC', '#a78bfa',
  '#f472b6', '#34d399', '#fbbf24', '#60a5fa',
];

export function Timeline({
  rig, playing, playTime, zoom, timelineH,
  animTimeline,
  setRig, setPlaying, setPlayTime, setZoom, setTimelineH,
  setAnimTimeline,
  activeCamRef, getTrackCamera,
}: TimelineProps) {
  if (!rig) return null;
  const totalDur = rig.duration;

  // ─── Helpers ───
  const timeToX = (t: number) => (t / totalDur) * 100;
  const xToTime = (clientX: number, rect: DOMRect) =>
    Math.max(0, Math.min(totalDur, ((clientX - rect.left) / rect.width) * totalDur));

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
      background: 'rgba(0,0,0,0.88)', borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '6px 14px 8px', height: timelineH, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Resize handle ── */}
      <div style={{
        position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)',
        width: 40, height: 6, background: 'rgba(255,255,255,0.3)',
        borderRadius: 3, cursor: 'ns-resize', zIndex: 102,
      }} onMouseDown={e => {
        e.preventDefault();
        const sY = e.clientY, sH = timelineH;
        const mv = (me: MouseEvent) => { setTimelineH(Math.max(80, Math.min(300, sH + (sY - me.clientY)))); };
        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
      }} />

      {/* ── Playback controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexShrink: 0 }}>
        <button onClick={() => {
          if (playing) setPlaying(false);
          else { if (playTime >= totalDur) setPlayTime(0); setPlaying(true); }
        }} style={{
          padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer',
          background: playing ? 'rgba(200,160,0,0.15)' : 'rgba(100,255,100,0.1)',
          border: playing ? '1px solid rgba(200,160,0,0.3)' : '1px solid rgba(100,255,100,0.2)',
          color: playing ? '#cc0' : '#0c0',
        }}>{playing ? '⏸' : '▶'}</button>
        <button onClick={() => { setPlaying(false); setPlayTime(0); }} style={{
          padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
          background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#c44',
        }}>⏹</button>
        <button onClick={() => {
          const t = playTime || 0;
          setRig({
            ...rig,
            speedCurve: [...rig.speedCurve.filter(x => Math.abs(x.time - t) > 0.3), { time: t, speed: 1 }].sort((a, b) => a.time - b.time),
            rotationKeys: [...rig.rotationKeys.filter(x => Math.abs(x.time - t) > 0.3), { time: t, pitch: activeCamRef.current?.rotation.x || 0, yaw: activeCamRef.current?.rotation.y || 0 }].sort((a, b) => a.time - b.time),
          });
        }} style={{
          padding: '3px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
          background: 'rgba(100,180,255,0.12)', border: '1px solid rgba(100,180,255,0.25)', color: '#a0c8ff',
        }}>+KF</button>
        <span style={{ fontSize: 10, color: '#ccc', fontWeight: 600, marginLeft: 6 }}>
          {(playTime || 0).toFixed(1)}s / {totalDur}s
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>Z {zoom}%</span>
      </div>

      {/* ── Camera keyframe track ── */}
      <div style={{ flexShrink: 0, marginBottom: 2 }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 1 }}>Camera</div>
        <ScrubTrack
          totalDur={totalDur} playTime={playTime} zoom={zoom}
          onWheel={e => { e.preventDefault(); setZoom(prev => Math.max(10, Math.min(500, prev + (e.deltaY < 0 ? 10 : -10)))); }}
          onClick={e => { if (!playing) setPlayTime(xToTime(e.clientX, (e.target as HTMLElement).getBoundingClientRect())); }}
        >
          {/* Speed key dots */}
          {rig.speedCurve?.map((k, i) => (
            <KeyDot key={'sk' + i} x={timeToX(k.time)} color="#ffcc00" onDrag={(dt) => {
              const u = [...rig.speedCurve]; u[i] = { ...u[i], time: k.time + dt }; setRig({ ...rig, speedCurve: u });
            }} onRemove={() => setRig({ ...rig, speedCurve: rig.speedCurve.filter((_, j) => j !== i) })} totalDur={totalDur} />
          ))}
          {/* Rotation key dots */}
          {rig.rotationKeys?.map((k, i) => (
            <KeyDot key={'rk' + i} x={timeToX(k.time)} color="#44ff44" tall onDrag={(dt) => {
              const u = [...rig.rotationKeys]; u[i] = { ...u[i], time: k.time + dt }; setRig({ ...rig, rotationKeys: u });
            }} onRemove={() => setRig({ ...rig, rotationKeys: rig.rotationKeys.filter((_, j) => j !== i) })} totalDur={totalDur} />
          ))}
        </ScrubTrack>
      </div>

      {/* ── Clip block track ── */}
      <div style={{ flex: 1, minHeight: 20, position: 'relative', marginTop: 2 }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 1 }}>Clips</div>
        <div style={{
          position: 'relative', flex: 1, minHeight: 22,
          background: 'rgba(255,255,255,0.03)', borderRadius: 4, overflow: 'hidden',
        }}>
          {/* Playhead line */}
          <div style={{
            position: 'absolute', left: timeToX(playTime) + '%', top: 0, bottom: 0,
            width: 1, background: '#5EEAD4', zIndex: 3, pointerEvents: 'none',
          }} />
          {animTimeline?.blocks.map((block, i) => {
            const clip = clipLibrary.get(block.clipId);
            if (!clip) return null;
            const blockDur = clip.duration * block.repeatCount * block.timeScale;
            const color = BLOCK_COLORS[i % BLOCK_COLORS.length];
            return (
              <div key={block.id} style={{
                position: 'absolute', left: timeToX(block.startTime) + '%',
                width: timeToX(blockDur) + '%', minWidth: 4,
                top: 3, bottom: 3, background: color, opacity: 0.7,
                borderRadius: 2, cursor: 'grab', zIndex: 2,
                fontSize: 8, color: '#000', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', whiteSpace: 'nowrap',
              }} title={getClipLabel(block.clipId)}
                onMouseDown={ev => {
                  ev.stopPropagation(); ev.preventDefault();
                  const sX = ev.clientX, sT = block.startTime;
                  const r2 = (ev.target as HTMLElement).parentElement!.getBoundingClientRect();
                  const mv = (me: MouseEvent) => {
                    const dt = ((me.clientX - sX) / r2.width) * totalDur;
                    const u = [...animTimeline.blocks];
                    u[i] = { ...u[i], startTime: Math.max(0, sT + dt) };
                    setAnimTimeline({ ...animTimeline, blocks: u });
                  };
                  const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                  window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                }}
              >
                {blockDur > 0.3 ? clip.name : ''}
              </div>
            );
          })}
          {/* Drop zone */}
          <div style={{ width: '100%', height: '100%' }}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDrop={e => {
              e.preventDefault();
              const clipId = e.dataTransfer.getData('text/plain');
              if (!clipId) return;
              const clip = clipLibrary.get(clipId);
              if (!clip) return;
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const dropTime = xToTime(e.clientX, rect);
              const block: ClipBlock = {
                id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                clipId, startTime: dropTime,
                repeatCount: 1, timeScale: 1, crossfadeDuration: 0.25,
                rootOffsetY: 0, rootOffsetX: 0,
              };
              const blocks = animTimeline ? [...animTimeline.blocks, block] : [block];
              setAnimTimeline({ ...animTimeline, blocks, targetFigureId: animTimeline?.targetFigureId || '' } as AnimationTimeline);
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Scrubber sub-component ───
function ScrubTrack({ totalDur, playTime, zoom, onWheel, onClick, children }: {
  totalDur: number; playTime: number; zoom: number;
  onWheel: (e: React.WheelEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}) {
  const fps = 30; const totalFrames = Math.ceil(totalDur * fps);
  const majorEvery = Math.max(1, Math.round(5 * (zoom / 100)));

  return (
    <div style={{
      position: 'relative', height: 22, background: 'rgba(255,255,255,0.04)',
      borderRadius: 4, cursor: 'pointer', overflow: 'hidden',
    }} onWheel={onWheel} onMouseDown={onClick}>
      {/* Ticks */}
      {Array.from({ length: Math.floor(totalFrames / majorEvery) }, (_, i) => {
        const x = (i * majorEvery / totalFrames) * 100;
        return <div key={'t' + i} style={{ position: 'absolute', left: x + '%', top: 0, width: 1, height: 10, background: 'rgba(255,255,255,0.12)' }} />;
      })}
      {/* Playhead */}
      <div style={{
        position: 'absolute', left: 0, top: 0, height: '100%',
        width: Math.max(0, playTime / Math.max(0.1, totalDur)) * 100 + '%',
        background: 'rgba(94,234,212,0.12)', borderRight: '2px solid #5EEAD4', pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}

// ─── Draggable key dot ───
function KeyDot({ x, color, tall, onDrag, onRemove, totalDur }: {
  x: number; color: string; tall?: boolean; onDrag: (dt: number) => void; onRemove: () => void; totalDur: number;
}) {
  return (
    <div style={{
      position: 'absolute', left: x + '%',
      width: tall ? 6 : 8,
      height: tall ? 16 : 8,
      top: tall ? 2 : 'auto', bottom: tall ? 'auto' : 2,
      background: color, border: '1px solid #222',
      borderRadius: tall ? 2 : '50%', transform: 'translate(-50%,0)', cursor: 'grab', zIndex: 2,
    }}
      onMouseDown={ev => {
        ev.stopPropagation(); ev.preventDefault();
        const sX = ev.clientX;
        const r2 = (ev.target as HTMLElement).parentElement!.getBoundingClientRect();
        const mv = (me: MouseEvent) => {
          const dt = ((me.clientX - sX) / r2.width) * totalDur;
          onDrag(dt);
        };
        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
      }}
      onContextMenu={ev => { ev.preventDefault(); onRemove(); }}
    />
  );
}
