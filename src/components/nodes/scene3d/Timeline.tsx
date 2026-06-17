/* === Timeline — playback controls + keyframe scrubber === */
import React from 'react';
import * as THREE from 'three';
import { CameraRig } from './shared';

export function Timeline({ rig, playing, playTime, zoom, timelineH, setRig, setPlaying, setPlayTime, setZoom, setTimelineH, activeCamRef, getTrackCamera }: {
  rig: CameraRig;
  playing: boolean;
  playTime: number;
  zoom: number;
  timelineH: number;
  setRig: React.Dispatch<React.SetStateAction<CameraRig | null>>;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setPlayTime: React.Dispatch<React.SetStateAction<number>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setTimelineH: React.Dispatch<React.SetStateAction<number>>;
  activeCamRef: React.MutableRefObject<THREE.Object3D | null>;
  getTrackCamera: (prog: number) => any;
}) {
  if (!rig) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
      background: 'rgba(0,0,0,0.85)', borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '6px 14px', height: timelineH, overflow: 'hidden',
    }}>
      {/* Resize handle */}
      <div style={{
        position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)',
        width: 40, height: 6, background: 'rgba(255,255,255,0.3)',
        borderRadius: 3, cursor: 'ns-resize', zIndex: 102,
      }} onMouseDown={e => {
        e.preventDefault();
        const sY = e.clientY, sH = timelineH;
        const mv = (me: MouseEvent) => { setTimelineH(Math.max(60, Math.min(300, sH + (sY - me.clientY)))); };
        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
      }} />

      {/* Playback controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <button onClick={() => {
          if (playing) setPlaying(false);
          else { if (playTime >= rig.duration) setPlayTime(0); setPlaying(true); }
        }} style={{
          padding: '4px 10px', borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          background: playing ? 'rgba(200,160,0,0.15)' : 'rgba(100,255,100,0.1)',
          border: playing ? '1px solid rgba(200,160,0,0.3)' : '1px solid rgba(100,255,100,0.2)',
          color: playing ? '#cc0' : '#0c0',
        }}>{playing ? '暂停' : '播放'}</button>
        <button onClick={() => {
          setPlaying(false); setPlayTime(0);
          const cam = getTrackCamera(0);
          if (cam && activeCamRef.current) activeCamRef.current.position.copy(cam.pos);
        }} style={{
          padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer',
          background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#c44',
        }}>停止</button>
        <button onClick={() => {
          const t = playTime || 0;
          const p = activeCamRef.current?.rotation.x || 0;
          const y = activeCamRef.current?.rotation.y || 0;
          const sk = { time: t, speed: 1 };
          const rk = { time: t, pitch: p, yaw: y };
          setRig({
            ...rig,
            speedCurve: [...rig.speedCurve.filter(x => Math.abs(x.time - t) > 0.3), sk].sort((a, b) => a.time - b.time),
            rotationKeys: [...rig.rotationKeys.filter(x => Math.abs(x.time - t) > 0.3), rk].sort((a, b) => a.time - b.time),
          });
        }} style={{
          padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
          background: 'rgba(100,180,255,0.12)', border: '1px solid rgba(100,180,255,0.25)', color: '#a0c8ff',
        }}>+关键帧</button>
        <button onClick={() => setRig(prev => prev ? { ...prev, speedCurve: [], rotationKeys: [] } : prev)} style={{
          padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
          background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)', color: '#f88',
        }}>清除</button>
        <span style={{ fontSize: 11, color: '#ccc', fontWeight: 600, marginLeft: 8 }}>
          {(playTime || 0).toFixed(1)}s / {rig.duration}s
        </span>
      </div>

      {/* Zoom label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>缩放 {zoom}%</span>
      </div>

      {/* Scrubber area */}
      <div style={{
        position: 'relative', height: 26, background: 'rgba(255,255,255,0.05)',
        borderRadius: 4, cursor: 'pointer', overflow: 'hidden',
      }}
        onWheel={e => { e.preventDefault(); setZoom(prev => Math.max(10, Math.min(100, prev + (e.deltaY < 0 ? 10 : -10)))); }}
        onMouseDown={e => {
          if (!rig || playing) return;
          const r = (e.target as HTMLElement).getBoundingClientRect();
          const t = ((e.clientX - r.left) / r.width) * rig.duration;
          setPlayTime(Math.max(0, Math.min(rig.duration, t)));
        }}
      >
        {/* Frame ruler ticks */}
        {(() => {
          const fps = 30;
          const totalFrames = Math.ceil(rig.duration * fps);
          const majorEvery = Math.max(1, Math.round(5 * (zoom / 100)));
          const ticks = [];
          for (let f = 0; f <= totalFrames; f += majorEvery) {
            const x = (f / (totalFrames || 1)) * 100;
            ticks.push(<div key={'t' + f} style={{ position: 'absolute', left: x + '%', top: 0, width: 1, height: 12, background: 'rgba(255,255,255,0.15)' }} />);
          }
          return ticks;
        })()}
        {/* Sub-ticks at high zoom */}
        {zoom >= 80 && (() => {
          const fps = 30;
          const totalFrames = Math.ceil(rig.duration * fps);
          const ticks = [];
          for (let f = 0; f <= totalFrames; f++) {
            const x = (f / (totalFrames || 1)) * 100;
            ticks.push(<div key={'st' + f} style={{ position: 'absolute', left: x + '%', top: 0, width: 1, height: 6, background: 'rgba(255,255,255,0.06)' }} />);
          }
          return ticks;
        })()}

        {/* Playhead */}
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: (playTime / Math.max(0.1, rig.duration)) * 100 + '%',
          background: 'rgba(100,180,255,0.15)', borderRight: '2px solid #60a0ff', pointerEvents: 'none',
        }} />

        {/* Speed key dots (yellow) */}
        {rig.speedCurve && rig.speedCurve.map((k, i) => (
          <div key={'sk' + i} style={{
            position: 'absolute', left: (k.time / rig.duration) * 100 + '%', bottom: 2,
            width: 8, height: 8, background: '#ffcc00', border: '1px solid #222',
            borderRadius: '50%', transform: 'translate(-50%,0)', cursor: 'grab', zIndex: 2,
          }}
            onMouseDown={ev => {
              ev.stopPropagation(); ev.preventDefault();
              const sX = ev.clientX, sT = k.time;
              const mv = (me: MouseEvent) => {
                if (!rig) return;
                const r2 = (ev.target as HTMLElement).parentElement!.getBoundingClientRect();
                const dt = ((me.clientX - sX) / r2.width) * rig.duration;
                const u = [...rig.speedCurve];
                u[i] = { time: Math.max(0, Math.min(rig.duration, sT + dt)), speed: u[i].speed };
                setRig({ ...rig, speedCurve: u.sort((a, b) => a.time - b.time) });
              };
              const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
              window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
            }}
            onContextMenu={ev => { ev.preventDefault(); setRig({ ...rig, speedCurve: rig.speedCurve.filter((_, j) => j !== i) }); }}
          />
        ))}

        {/* Rotation key dots (green) */}
        {rig.rotationKeys && rig.rotationKeys.map((k, i) => (
          <div key={'rk' + i} style={{
            position: 'absolute', left: (k.time / rig.duration) * 100 + '%', top: 2,
            width: 6, height: 20, background: '#44ff44', borderRadius: 2, cursor: 'grab', zIndex: 2,
          }}
            onMouseDown={ev => {
              ev.stopPropagation(); ev.preventDefault();
              const sX = ev.clientX, sT = k.time;
              const mv = (me: MouseEvent) => {
                if (!rig) return;
                const r2 = (ev.target as HTMLElement).parentElement!.getBoundingClientRect();
                const dt = ((me.clientX - sX) / r2.width) * rig.duration;
                const u = [...rig.rotationKeys];
                u[i] = { ...u[i], time: Math.max(0, Math.min(rig.duration, sT + dt)) };
                setRig({ ...rig, rotationKeys: u.sort((a, b) => a.time - b.time) });
              };
              const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
              window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
            }}
            onContextMenu={ev => { ev.preventDefault(); setRig({ ...rig, rotationKeys: rig.rotationKeys.filter((_, j) => j !== i) }); }}
          />
        ))}
      </div>
    </div>
  );
}
