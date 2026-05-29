/* === AgentPanel — right-side AI agent chat === */
/* Slide-in panel with message history + input zone */

import { useState, useRef, useEffect } from 'react';

interface AgentMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  actions?: { label: string; onClick: () => void }[];
  timestamp: string;
}

interface AgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentPanel({ isOpen, onClose }: AgentPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: '你好！我是你的 AI 创作助手。我可以帮你：\n\n• 分析镜头并编译 Prompt\n• 建议节点连接方式\n• 优化图像生成参数\n• 批量处理工作流\n\n试着拖一条连线，或选择一个节点开始。',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    const userMsg: AgentMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    // Simulate agent response
    setTimeout(() => {
      const agentMsg: AgentMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'agent',
        content: `收到！关于「${text.slice(0, 30)}${text.length > 30 ? '...' : ''}」：\n\n我可以为你生成一个镜头节点，或者创建图片生成工作流。点击下方按钮选择操作。`,
        actions: [
          { label: '🎬 创建镜头节点', onClick: () => { /* handled by parent */ } },
          { label: '🖼️ 创建图片生成', onClick: () => { /* handled by parent */ } },
        ],
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, agentMsg]);
      setIsProcessing(false);
    }, 1200 + Math.random() * 800);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 'var(--tap-agent-width)',
      height: '100vh',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--tap-panel)',
      borderLeft: '1px solid var(--tap-border)',
      boxShadow: 'var(--tap-shadow-xl)',
      backdropFilter: 'blur(var(--tap-blur-heavy))',
      animation: 'tap-slide-left var(--tap-dur-slow) var(--tap-ease)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 'var(--tap-agent-header-h)',
        borderBottom: '1px solid var(--tap-divider)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--tap-r-md)',
            background: 'var(--tap-grad-agent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}>
            🤖
          </div>
          <div>
            <div style={{ fontSize: 'var(--tap-fs-h2)', fontWeight: 'var(--tap-fw-h2)', color: 'var(--tap-text-1)' }}>
              AI 助手
            </div>
            <div style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--tap-success)', display: 'inline-block' }} />
              在线
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 'var(--tap-btn-size-sm)',
            height: 'var(--tap-btn-size-sm)',
            borderRadius: 'var(--tap-r-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--tap-text-3)',
            fontSize: '18px',
            cursor: 'pointer',
            transition: `all var(--tap-dur-fast) var(--tap-ease)`,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-3)'; }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="agent-messages-container" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            animation: 'tap-fade-up var(--tap-dur-normal) var(--tap-ease)',
          }}>
            <div style={{
              maxWidth: '90%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? 'var(--tap-r-lg) var(--tap-r-lg) 4px var(--tap-r-lg)' : 'var(--tap-r-lg) var(--tap-r-lg) var(--tap-r-lg) 4px',
              background: msg.role === 'user' ? 'var(--tap-accent-bg)' : 'rgba(255,255,255,0.06)',
              border: msg.role === 'user' ? '1px solid var(--tap-accent-border)' : '1px solid var(--tap-border)',
              fontSize: 'var(--tap-fs-body)',
              color: 'var(--tap-text-1)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>

            {/* Action buttons */}
            {msg.actions && msg.actions.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {msg.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={action.onClick}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--tap-r-sm)',
                      background: 'var(--tap-hover)',
                      border: '1px solid var(--tap-border)',
                      color: 'var(--tap-text-1)',
                      fontSize: 'var(--tap-fs-meta)',
                      cursor: 'pointer',
                      transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-active)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--tap-hover)'; }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)', marginTop: '4px', padding: '0 4px' }}>
              {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            animation: 'tap-fade-up var(--tap-dur-fast) var(--tap-ease)',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--tap-accent)',
              animation: 'tap-pulse-glow 1.2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)' }}>
              AI 正在思考…
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input zone */}
      <div className="agent-bottom-input-zone" style={{
        padding: '14px',
        borderTop: '1px solid var(--tap-divider)',
        background: 'rgba(18, 18, 22, 0.9)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="输入消息… (Enter 发送, Shift+Enter 换行)"
          rows={2}
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--tap-border)',
            borderRadius: 'var(--tap-r-lg)',
            padding: '10px 12px',
            fontSize: 'var(--tap-fs-body)',
            color: 'var(--tap-text-1)',
            resize: 'none',
            outline: 'none',
            lineHeight: 1.5,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)', padding: '4px 8px' }}>
              / 编译 · / 建议 · / 优化
            </span>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            style={{
              width: 'var(--tap-btn-size-sm)',
              height: 'var(--tap-btn-size-sm)',
              borderRadius: '50%',
              background: input.trim() && !isProcessing ? 'var(--tap-accent)' : 'var(--tap-hover)',
              color: input.trim() && !isProcessing ? '#fff' : 'var(--tap-text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              cursor: input.trim() && !isProcessing ? 'pointer' : 'default',
              transition: `all var(--tap-dur-fast) var(--tap-ease)`,
              flexShrink: 0,
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
