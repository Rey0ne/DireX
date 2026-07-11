/* === QChatPanel — Interactive Q Assistant Chat === */
import React, { useState, useCallback, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'q' | 'system';
  text: string;
  ts: number;
}

interface QChatPanelProps {
  anchorPos?: { x: number; y: number };
}

const PANEL_W = 320;
const PANEL_H = 420;
const BALL_R = 36;
const GAP = 10;

function formatGapTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function calcPanelPos(anchor: { x: number; y: number }) {
  let x = anchor.x + BALL_R + GAP;
  let y = anchor.y + BALL_R + GAP;
  if (x + PANEL_W > window.innerWidth - 8) {
    x = anchor.x - BALL_R - PANEL_W - GAP;
  }
  if (y + PANEL_H > window.innerHeight - 8) {
    y = anchor.y - BALL_R - PANEL_H - GAP;
  }
  x = Math.max(8, Math.min(window.innerWidth - PANEL_W - 8, x));
  y = Math.max(8, Math.min(window.innerHeight - PANEL_H - 8, y));
  return { x, y };
}

export function QChatPanel({ anchorPos }: QChatPanelProps) {
  const projectId = localStorage.getItem('tapnow-current-project');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', text: '你好，我是小Q ✨ 可以问我关于当前画布项目的任何问题。', ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pos, setPos] = useState(() => {
    if (anchorPos) return calcPanelPos(anchorPos);
    return {
      x: Math.max(20, window.innerWidth - PANEL_W - 40),
      y: Math.max(20, window.innerHeight - PANEL_H - 200),
    };
  });
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (anchorPos) setPos(calcPanelPos(anchorPos));
  }, [anchorPos]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }]);
    setThinking(true);

    try {
      const history = messages
        .filter(m => m.role !== 'system')
        .slice(-10)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));

      const resp = await fetch('/api/q/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          projectId: projectId || undefined,
          history,
        }),
      });

      if (!resp.ok) throw new Error(`Server responded with ${resp.status}`);

      const data = await resp.json();
      setThinking(false);
      setMessages(prev => [...prev, {
        role: 'q',
        text: data.reply || '(小Q沉默了片刻…)',
        ts: Date.now(),
      }]);
    } catch (err) {
      setThinking(false);
      setMessages(prev => [...prev, {
        role: 'system',
        text: '小Q暂时无法回应，请稍后再试。',
        ts: Date.now(),
      }]);
      console.error('[QChat] sendMessage error:', err);
    }
  }, [input, thinking, messages, projectId]);

  return (
    <div
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: PANEL_W, height: PANEL_H,
        zIndex: 10000,
        display: 'flex', flexDirection: 'column',
        borderRadius: 16,
        background: 'rgb(16, 255, 209)',
        boxShadow: '0 0 0 1px #0000000A, 0 4px 24px #00000014',
        fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Messages */}
      <div ref={listRef} style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {messages.map((m, i) => {
          const prev = i > 0 ? messages[i - 1] : null;
          const roleChanged = prev && prev.role !== m.role && prev.role !== 'system' && m.role !== 'system';
          const longGap = prev && (m.ts - prev.ts > 5 * 60 * 1000) && prev.role !== 'system' && m.role !== 'system';

          return (
            <React.Fragment key={i}>
              {longGap && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                }}>
                  <div style={{ flex: 1, height: 1, background: '#00000014' }} />
                  <span style={{ fontSize: 10, color: '#0000004D', whiteSpace: 'nowrap' }}>
                    {formatGapTime(prev!.ts)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#00000014' }} />
                </div>
              )}
              <div style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '4px 0',
                marginTop: roleChanged ? 14 : 0,
                fontSize: 12,
                color: m.role === 'system' ? '#0a6e56' : '#111',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {m.text}
              </div>
            </React.Fragment>
          );
        })}

        {thinking && (
          <div style={{
            alignSelf: 'flex-start', padding: '4px 0',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0a8c6e', animation: 'q-dot-bounce 0.6s ease-in-out infinite' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0a8c6e', animation: 'q-dot-bounce 0.6s ease-in-out 0.15s infinite' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0a8c6e', animation: 'q-dot-bounce 0.6s ease-in-out 0.3s infinite' }} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
      }}>
        <input ref={inputRef} value={input} className="q-chat-input"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          placeholder="问小Q任何问题…"
          style={{
            flex: 1, borderRadius: 20,
            padding: '8px 14px', fontSize: 12,
            color: '#111', background: 'transparent',
            border: '1px solid #0000001A',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button onClick={sendMessage} disabled={thinking || !input.trim()}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#FFF65D',
            border: 'none',
            color: '#111',
            fontSize: 14, fontWeight: 700,
            cursor: input.trim() && !thinking ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            opacity: input.trim() && !thinking ? 1 : 0.45,
            boxShadow: '0 2px 8px #0000002E',
          }}
        >↑</button>
      </div>

      <style>{`
        @keyframes q-dot-bounce {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50%      { opacity: 1;   transform: translateY(-4px); }
        }
        .q-chat-input::placeholder { color: #0000004D; }
      `}</style>
    </div>
  );
}
