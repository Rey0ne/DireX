/* === KimodoMotionPanel — AI 动作生成面板 === */
// @ts-nocheck
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { bvhToGlb } from './bvhToGlb';

const KIMODO_URL = '/api/kimodo';

interface KimodoMotionPanelProps {
  onBvhGenerated?: (bvhBase64: string, bvhUrl: string, prompt: string, posedJoints: number[][][], jointNames: string[]) => void;
  onTogglePlay?: () => void;
  onStop?: () => void;
  isPlaying?: boolean;
}

export function KimodoMotionPanel({ onBvhGenerated, onTogglePlay, onStop, isPlaying }: KimodoMotionPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [translated, setTranslated] = useState('');
  const [translating, setTranslating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [durationSec, setDurationSec] = useState(3.0);  // seconds, 1–10
  const [seed, setSeed] = useState(-1);
  const [generated, setGenerated] = useState<string | null>(null);
  const [generatedB64, setGeneratedB64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Array<{ prompt: string; bvhUrl: string; time: string }>>([]);
  const translateTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Auto-translate on prompt change (debounced) ──
  useEffect(() => {
    if (!prompt.trim()) { setTranslated(''); return; }
    clearTimeout(translateTimer.current);
    translateTimer.current = setTimeout(async () => {
      setTranslating(true);
      try {
        const resp = await fetch(`${KIMODO_URL}/translate`, {
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

  // ── Generate ──
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setGenerated(null);
    setGeneratedB64(null);
    try {
      const resp = await fetch(`${KIMODO_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          numFrames: Math.round(durationSec * 30),
          seed: seed < 0 ? null : seed,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setGenerated(data.bvhUrl);
        setGeneratedB64(data.bvhBase64);
        const newEntry = {
          prompt: prompt.trim().slice(0, 40),
          bvhUrl: data.bvhUrl,
          time: new Date().toLocaleTimeString(),
        };
        setHistory(prev => [newEntry, ...prev].slice(0, 10));
        onBvhGenerated?.(data.bvhBase64, data.bvhUrl, data.promptUsed, data.posedJoints, data.jointNames);
      } else {
        alert('生成失败: ' + (data.error || '未知错误'));
      }
    } catch (e) {
      alert('Kimodo 服务不可用，请确保 D:/kimodo-project 的 server.py 正在运行');
    }
    setGenerating(false);
  }, [prompt, durationSec, seed, generating, onBvhGenerated]);

  const handleSeedRoll = useCallback(() => {
    setSeed(Math.floor(Math.random() * 2_147_483_647));
  }, []);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      {/* Header */}
      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        textAlign: 'center',
      }}>
        动作生成
      </div>

      {/* Prompt input */}
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="描述动作... (支持中文)"
        rows={3}
        style={{
          width: '100%', resize: 'vertical',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6, padding: '7px 9px',
          color: '#ddd', fontSize: 12,
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />

      {/* Seed */}
      <button
        onClick={handleSeedRoll}
        style={{
          padding: '4px 12px', borderRadius: 4, fontSize: 10,
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        种子 {seed < 0 ? '随机' : seed.toString(36).slice(-4)}
      </button>

      {translating && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>翻译中...</div>
      )}
      {!translating && translated && (
        <div style={{
          width: '100%', fontSize: 10, color: 'rgba(94,234,212,0.65)',
          padding: '5px 8px', background: 'rgba(94,234,212,0.04)',
          borderRadius: 4, border: '1px solid rgba(94,234,212,0.1)',
          wordBreak: 'break-word', textAlign: 'center',
        }}>
          EN: {translated}
        </div>
      )}

      {/* Duration slider */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <input
          type="range"
          min={1} max={10} step={0.1} value={durationSec}
          onChange={e => setDurationSec(Number(e.target.value))}
          style={{ width: '100%', height: 4, accentColor: '#5EEAD4' }}
        />
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
          时长 {durationSec.toFixed(1)}s
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || generating}
        style={{
          width: '100%', padding: '8px 0', borderRadius: 6,
          fontSize: 12, fontWeight: 700, cursor: !prompt.trim() ? 'default' : 'pointer',
          background: generating
            ? 'rgba(94,234,212,0.12)'
            : 'rgba(94,234,212,0.18)',
          border: '1px solid rgba(94,234,212,0.3)',
          color: generating ? 'rgba(255,255,255,0.4)' : '#5EEAD4',
          opacity: !prompt.trim() ? 0.3 : 1,
          transition: 'all 0.2s',
        }}
      >
        {generating ? '生成中...' : '生成动作'}
      </button>

      {/* Playback controls */}
      {generated && (
        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
          <button
            onClick={onTogglePlay}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 5,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: isPlaying ? 'rgba(200,160,0,0.15)' : 'rgba(94,234,212,0.12)',
              border: isPlaying ? '1px solid rgba(200,160,0,0.3)' : '1px solid rgba(94,234,212,0.25)',
              color: isPlaying ? '#cc0' : '#5EEAD4',
            }}
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button
            onClick={onStop}
            style={{
              padding: '5px 10px', borderRadius: 5,
              fontSize: 10, cursor: 'pointer',
              background: 'rgba(255,80,80,0.08)',
              border: '1px solid rgba(255,80,80,0.2)',
              color: '#c44',
            }}
          >
            停止
          </button>
          <button
            onClick={async () => {
              if (!generatedB64 || saving) return;
              setSaving(true);
              try {
                const glbBuf = await bvhToGlb(generatedB64);
                const glbBase64 = btoa(String.fromCharCode(...new Uint8Array(glbBuf)));
                const resp = await fetch(`${KIMODO_URL}/save`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ glbBase64, prompt }),
                });
                const data = await resp.json();
                if (data.success) {
                  alert(`已保存: ${data.name}`);
                } else {
                  alert('保存失败: ' + (data.error || '未知错误'));
                }
              } catch (e: any) {
                alert('保存失败: ' + (e?.message || '转换错误'));
              }
              setSaving(false);
            }}
            disabled={saving}
            style={{
              padding: '5px 10px', borderRadius: 5,
              fontSize: 10, cursor: saving ? 'default' : 'pointer',
              background: saving ? 'rgba(94,234,212,0.04)' : 'rgba(94,234,212,0.08)',
              border: '1px solid rgba(94,234,212,0.2)',
              color: saving ? 'rgba(94,234,212,0.3)' : '#5EEAD4',
              opacity: saving ? 0.5 : 1,
            }}
            title="保存为 GLB 模型"
          >
            {saving ? '...' : '保存'}
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>
            历史
          </div>
          {history.map((h, i) => (
            <div
              key={i}
              style={{
                alignSelf: 'stretch', fontSize: 9, color: 'rgba(255,255,255,0.35)',
                padding: '4px 6px', background: 'rgba(255,255,255,0.02)',
                borderRadius: 3, cursor: 'pointer', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
              title={`${h.prompt} · ${h.time}`}
            >
              {h.prompt} <span style={{ color: 'rgba(255,255,255,0.18)' }}>{h.time}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
