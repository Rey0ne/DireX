/* === AgentControlPanel — Backend Agent management === */
/* Three tabs: API Keys, Agent Config, Generation Logs */

import { useState, useEffect, useCallback } from 'react';

interface AgentControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Types ────────────────────────────────────
interface KeyStatus {
  key: string;
  label: string;
  configured: boolean;
  masked: string;
}

interface AgentConfig {
  name: string;
  avatar: string;
  translationStyle: string;
  defaultModel: string;
  defaultResolution: string;
  promptEnhancement: boolean;
  systemPrompt: string;
}

interface GenerationLog {
  id: string;
  timestamp: string;
  providerId: string;
  prompt: string;
  status: 'succeeded' | 'failed';
  assetUrls: string[];
  cost: number;
  durationMs: number;
}

// ─── API helpers ──────────────────────────────
import { BACKEND_URL } from '../api/config';

const API = BACKEND_URL;
const SHARED_KEY = 'tapnow-dev-key';

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${SHARED_KEY}` },
  });
  return res.json();
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SHARED_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Tab definitions ──────────────────────────
type Tab = 'keys' | 'agent' | 'logs';
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'keys', icon: '🔑', label: 'Keys' },
  { id: 'agent', icon: '🤖', label: 'Agent' },
  { id: 'logs', icon: '📋', label: '日志' },
];

const STYLES = ['literal', 'cinematic', 'technical', 'literary'];
const STYLE_LABELS: Record<string, string> = {
  literal: '直译',
  cinematic: '电影感',
  technical: '技术',
  literary: '文学',
};

const MODEL_OPTIONS = ['gpt-image2', 'flux-pro', 'gemini-image', 'kling-video'];

const EMOJI_OPTIONS = ['🤖', '🎬', '🎨', '📷', '🎥', '🎵', '🦊', '🐱', '🌟', '🔥', '💎', '🎯', '🧠', '👁️', '✨', '🚀'];

// ─── Component ────────────────────────────────
export function AgentControlPanel({ isOpen, onClose }: AgentControlPanelProps) {
  const [tab, setTab] = useState<Tab>('keys');
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  // ─── Load data ─────────────────────────────
  const loadKeys = useCallback(async () => {
    const data = await apiGet<{ keys: KeyStatus[] }>('/api/keys');
    setKeys(data.keys || []);
  }, []);

  const loadConfig = useCallback(async () => {
    const data = await apiGet<AgentConfig>('/api/agent/config');
    setConfig(data);
  }, []);

  const loadLogs = useCallback(async () => {
    const data = await apiGet<{ logs: GenerationLog[] }>('/api/agent/logs');
    setLogs(data.logs || []);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadKeys();
    loadConfig();
    loadLogs();
  }, [isOpen, loadKeys, loadConfig, loadLogs]);

  // ─── Save key ──────────────────────────────
  const saveKey = async () => {
    if (!editingKey || !keyInput.trim()) return;
    setSaving(true);
    await apiPut('/api/keys', { [editingKey]: keyInput.trim() });
    setEditingKey(null);
    setKeyInput('');
    setSaving(false);
    loadKeys();
  };

  // ─── Save config field ─────────────────────
  const updateConfig = async (patch: Partial<AgentConfig>) => {
    await apiPut('/api/agent/config', patch);
    loadConfig();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, height: '100vh',
      width: '420px', zIndex: 500,
      background: 'var(--tap-panel)',
      borderLeft: '1px solid var(--tap-border)',
      boxShadow: 'var(--tap-shadow-lg)',
      backdropFilter: 'blur(var(--tap-blur))',
      display: 'flex', flexDirection: 'column',
      animation: 'tap-slide-left var(--tap-dur-slow) var(--tap-ease)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '56px', padding: '0 16px',
        borderBottom: '1px solid var(--tap-divider)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🔧</span>
          <span style={{ fontSize: 'var(--tap-fs-h2)', fontWeight: 600, color: 'var(--tap-text-1)' }}>
            Agent 控制台
          </span>
        </div>
        <button onClick={onClose} style={{
          width: '28px', height: '28px', borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', color: 'var(--tap-text-3)', cursor: 'pointer',
          background: 'transparent', border: 'none',
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-3)'; }}
        >✕</button>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '2px', padding: '8px 12px',
        borderBottom: '1px solid var(--tap-divider)', flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: 'var(--tap-r-sm)',
            fontSize: 'var(--tap-fs-meta)', fontWeight: 500,
            color: tab === t.id ? 'var(--tap-text-1)' : 'var(--tap-text-3)',
            background: tab === t.id ? 'var(--tap-hover)' : 'transparent',
            border: 'none', cursor: 'pointer',
            transition: `all var(--tap-dur-fast) var(--tap-ease)`,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {/* ─── Tab: Keys ─── */}
        {tab === 'keys' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {keys.map(k => (
              <div key={k.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 'var(--tap-r-md)',
                background: 'var(--tap-bg-glass)',
                border: '1px solid var(--tap-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: k.configured ? 'var(--tap-success)' : 'var(--tap-text-4)',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)', fontWeight: 500 }}>
                      {k.label}
                    </div>
                    <div style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)' }}>
                      {k.configured ? k.masked : '未配置'}
                    </div>
                  </div>
                </div>
                <button onClick={() => {
                  setEditingKey(k.key);
                  setKeyInput('');
                }} style={{
                  padding: '4px 10px', borderRadius: 'var(--tap-r-sm)',
                  fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-2)',
                  background: 'transparent', border: '1px solid var(--tap-border)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--tap-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >{k.configured ? '编辑' : '设置'}</button>
              </div>
            ))}

            {/* Key edit modal inline */}
            {editingKey && (
              <div style={{
                padding: '12px', borderRadius: 'var(--tap-r-lg)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--tap-border-light)',
              }}>
                <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-2)', marginBottom: '8px' }}>
                  输入 {keys.find(k => k.key === editingKey)?.label} 的 API Key
                </div>
                <input
                  autoFocus
                  type="password"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveKey(); if (e.key === 'Escape') setEditingKey(null); }}
                  placeholder="sk-..."
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 'var(--tap-r-sm)',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--tap-border)',
                    color: 'var(--tap-text-1)', fontSize: 'var(--tap-fs-body)', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingKey(null)} style={{
                    padding: '5px 12px', borderRadius: 'var(--tap-r-sm)',
                    fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                  }}>取消</button>
                  <button onClick={saveKey} disabled={saving || !keyInput.trim()} style={{
                    padding: '5px 12px', borderRadius: 'var(--tap-r-sm)',
                    fontSize: 'var(--tap-fs-meta)', fontWeight: 500,
                    color: keyInput.trim() ? '#fff' : 'var(--tap-text-4)',
                    background: keyInput.trim() ? 'var(--tap-accent)' : 'rgba(255,255,255,0.06)',
                    border: 'none', cursor: keyInput.trim() ? 'pointer' : 'default',
                  }}>{saving ? '保存中…' : '保存'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Agent ─── */}
        {tab === 'agent' && config && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Name + Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowEmoji(!showEmoji)} style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--tap-border)', cursor: 'pointer',
                }}>
                  {config.avatar}
                </button>
                {showEmoji && (
                  <>
                    <div onClick={() => setShowEmoji(false)} style={{ position: 'fixed', inset: 0, zIndex: 501 }} />
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px',
                      padding: '8px', borderRadius: 'var(--tap-r-lg)',
                      background: 'var(--tap-panel)', border: '1px solid var(--tap-border)',
                      boxShadow: 'var(--tap-shadow-lg)', zIndex: 502,
                    }}>
                      {EMOJI_OPTIONS.map(emoji => (
                        <button key={emoji} onClick={() => {
                          updateConfig({ avatar: emoji });
                          setShowEmoji(false);
                        }} style={{
                          width: '32px', height: '32px', borderRadius: '6px',
                          fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: config.avatar === emoji ? 'var(--tap-hover)' : 'transparent',
                          border: 'none', cursor: 'pointer',
                        }}>{emoji}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <input
                value={config.name}
                onChange={e => {
                  setConfig({ ...config, name: e.target.value });
                }}
                onBlur={() => updateConfig({ name: config.name })}
                style={{
                  flex: 1, fontSize: 'var(--tap-fs-h2)', fontWeight: 600,
                  color: 'var(--tap-text-1)', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-sm)',
                  padding: '8px 10px', outline: 'none',
                }}
              />
            </div>

            {/* Translation style */}
            <ConfigRow label="翻译风格">
              <div style={{ display: 'flex', gap: '4px' }}>
                {STYLES.map(s => (
                  <button key={s} onClick={() => updateConfig({ translationStyle: s })} style={{
                    padding: '5px 10px', borderRadius: 'var(--tap-r-sm)',
                    fontSize: 'var(--tap-fs-meta)',
                    color: config.translationStyle === s ? 'var(--tap-text-1)' : 'var(--tap-text-3)',
                    background: config.translationStyle === s ? 'var(--tap-hover)' : 'transparent',
                    border: config.translationStyle === s ? '1px solid var(--tap-border-light)' : '1px solid transparent',
                    cursor: 'pointer',
                  }}>{STYLE_LABELS[s]}</button>
                ))}
              </div>
            </ConfigRow>

            {/* Default model */}
            <ConfigRow label="默认模型">
              <select value={config.defaultModel} onChange={e => updateConfig({ defaultModel: e.target.value })} style={{
                padding: '6px 10px', borderRadius: 'var(--tap-r-sm)',
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--tap-border)',
                color: 'var(--tap-text-1)', fontSize: 'var(--tap-fs-body)', outline: 'none',
              }}>
                {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </ConfigRow>

            {/* Default resolution */}
            <ConfigRow label="默认分辨率">
              <select value={config.defaultResolution} onChange={e => updateConfig({ defaultResolution: e.target.value })} style={{
                padding: '6px 10px', borderRadius: 'var(--tap-r-sm)',
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--tap-border)',
                color: 'var(--tap-text-1)', fontSize: 'var(--tap-fs-body)', outline: 'none',
              }}>
                {['1K', '2K', '4K', '1080P'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </ConfigRow>

            {/* Prompt enhancement toggle */}
            <ConfigRow label="LLM 润色">
              <button onClick={() => updateConfig({ promptEnhancement: !config.promptEnhancement })} style={{
                width: '44px', height: '24px', borderRadius: '12px',
                background: config.promptEnhancement ? 'var(--tap-success)' : 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.15s',
              }}>
                <span style={{
                  position: 'absolute', top: '2px',
                  left: config.promptEnhancement ? '22px' : '2px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#fff', transition: 'left 0.15s',
                }} />
              </button>
            </ConfigRow>

            {/* System prompt */}
            <ConfigRow label="System Prompt">
              <textarea
                value={config.systemPrompt}
                onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
                onBlur={() => updateConfig({ systemPrompt: config.systemPrompt })}
                rows={4}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 'var(--tap-r-sm)',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--tap-border)',
                  color: 'var(--tap-text-1)', fontSize: 'var(--tap-fs-meta)',
                  resize: 'vertical', outline: 'none', lineHeight: 1.4,
                  fontFamily: 'var(--tap-font-mono)',
                }}
              />
            </ConfigRow>
          </div>
        )}

        {/* ─── Tab: Logs ─── */}
        {tab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--tap-text-4)', fontSize: 'var(--tap-fs-body)' }}>
                暂无生成记录
              </div>
            )}
            {logs.map(log => (
              <div key={log.id} style={{
                padding: '10px 12px', borderRadius: 'var(--tap-r-md)',
                background: 'var(--tap-bg-glass)',
                border: '1px solid var(--tap-border)',
                fontSize: 'var(--tap-fs-meta)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--tap-text-2)', fontWeight: 500 }}>{log.providerId}</span>
                  <span style={{
                    color: log.status === 'succeeded' ? 'var(--tap-success)' : 'var(--tap-danger)',
                  }}>
                    {log.status === 'succeeded' ? '✓' : '✕'} {log.status}
                  </span>
                </div>
                <div style={{ color: 'var(--tap-text-3)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.prompt.slice(0, 80)}
                </div>
                <div style={{ display: 'flex', gap: '12px', color: 'var(--tap-text-4)', fontSize: 'var(--tap-fs-xs)' }}>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span>{log.durationMs}ms</span>
                  <span>${log.cost.toFixed(3)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper component ─────────────────────────
function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', marginBottom: '6px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}
