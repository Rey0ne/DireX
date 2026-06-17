/* === AgentPanel — right-side AI agent chat === */
/* Real AI backend integration + canvas-aware actions */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { NodeType } from '../types/graph';
import { useCanvasStore } from '../store/useCanvasStore';
import { analyzeText } from '../api/gateway';

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
  onAddNode?: (type: NodeType, pos: { x: number; y: number }, title?: string) => string;
}

export function AgentPanel({ isOpen, onClose, onAddNode }: AgentPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: '你好！我是 AI 创作助手。\n\n**试试这些：**\n• `/analyze` — 分析选中节点的内容\n• `/compile` — 为选中节点编译提示词\n• `/suggest` — 建议下一步操作\n• 直接输入需求，我会帮你创建节点',
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

  const addSystemMsg = useCallback((content: string) => {
    const sysMsg: AgentMessage = {
      id: `sys-${Date.now()}`,
      role: 'system',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, sysMsg]);
  }, []);

  const addAgentMsg = useCallback((content: string, actions?: AgentMessage['actions']) => {
    const agentMsg: AgentMessage = {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content,
      actions,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, agentMsg]);
  }, []);

  const getCanvasContext = useCallback(() => {
    const store = useCanvasStore.getState();
    const selectedNodes = store.selectedNodeIds.map(id => store.nodes.get(id)).filter(Boolean);
    let context = '';
    if (selectedNodes.length === 0) {
      context = '画布上没有选中的节点。';
    } else {
      context = `当前选中了 ${selectedNodes.length} 个节点:\n`;
      selectedNodes.forEach((node, i) => {
        if (!node) return;
        const gen = (node.meta?.gen || {}) as Record<string, unknown>;
        const shot = (node.meta?.shot || {}) as Record<string, unknown>;
        context += `\n${i + 1}. **${node.title || node.type}** (${node.type})\n`;
        if (gen.prompt) context += `   Prompt: ${(gen.prompt as string).slice(0, 100)}${(gen.prompt as string).length > 100 ? '...' : ''}\n`;
        if (gen.compiledPrompt) context += `   Compiled: ${(gen.compiledPrompt as string).slice(0, 100)}...\n`;
        if (gen.imageUrl) context += `   已有生成图片\n`;
        if (shot.intent_cn) context += `   分镜内容: ${(shot.intent_cn as string).slice(0, 100)}...\n`;
        if (gen.model) context += `   模型: ${gen.model}\n`;
      });
    }
    return context;
  }, []);

  const handleSlashCommand = useCallback(async (cmd: string, rest: string) => {
    const store = useCanvasStore.getState();
    const selectedIds = store.selectedNodeIds;

    switch (cmd) {
      case 'analyze': {
        if (selectedIds.length === 0) {
          addAgentMsg('请先在画布上选中一个节点，我才能分析它的内容。');
          return;
        }
        const node = store.nodes.get(selectedIds[0]);
        if (!node) { addAgentMsg('未找到选中的节点。'); return; }
        const gen = (node.meta?.gen || {}) as Record<string, unknown>;
        addSystemMsg(`正在分析节点「${node.title}」...`);
        try {
          const result = await analyzeText({
            providerId: 'text',
            mode: 'text-analysis' as any,
            rawText: (gen.prompt as string) || (gen.compiledPrompt as string) || node.title || '',
            referenceUrls: (gen as any).referenceUrls,
          } as any);
          const analysis = result.compiled?.en || '分析完成，但未能生成详细内容。';
          addAgentMsg(`**节点「${node.title}」分析结果：**\n\n${analysis}`);
        } catch (err) {
          addAgentMsg(`分析失败：${String(err).slice(0, 200)}`);
        }
        break;
      }

      case 'compile': {
        if (selectedIds.length === 0) {
          addAgentMsg('请先选中一个镜头节点，我来帮你编译提示词。');
          return;
        }
        const node = store.nodes.get(selectedIds[0]);
        if (!node) { addAgentMsg('未找到选中的节点。'); return; }
        const gen = (node.meta?.gen || {}) as Record<string, unknown>;
        const prompt = rest || (gen.prompt as string) || '';
        if (!prompt) {
          addAgentMsg('这个节点没有 Prompt 内容。请先在节点中输入需求文字，或使用 `/compile 你的需求`。');
          return;
        }
        addSystemMsg(`正在为「${node.title}」编译提示词...`);
        try {
          const result = await analyzeText({
            providerId: 'text',
            mode: 'text-analysis' as any,
            rawText: prompt,
            referenceUrls: (gen as any).referenceUrls,
          } as any);
          const compiled = result.compiled?.en || prompt;
          store.updateNode(node.id, {
            meta: {
              ...node.meta,
              gen: { ...gen, compiledPrompt: compiled, compiledPromptCn: result.compiled?.cn || '' },
            },
          });
          store.triggerSync();
          addAgentMsg(`**编译完成！** 已更新节点「${node.title}」：\n\n${compiled.slice(0, 500)}${compiled.length > 500 ? '...' : ''}`,
            [
              { label: '🎬 查看节点', onClick: () => { store.setSelectedNodes([node.id]); onClose?.(); } },
            ]
          );
        } catch (err) {
          addAgentMsg(`编译失败：${String(err).slice(0, 200)}`);
        }
        break;
      }

      case 'suggest': {
        const ctx = getCanvasContext();
        addSystemMsg('正在基于画布状态生成建议...');
        try {
          const result = await analyzeText({
            providerId: 'text',
            mode: 'text-analysis' as any,
            rawText: `基于以下画布状态，给出创作建议（3-5条，每条一行）：\n\n${ctx}`,
          } as any);
          const suggestions = result.compiled?.en || '暂无具体建议。';
          addAgentMsg(`**创作建议：**\n\n${suggestions}`);
        } catch (err) {
          addAgentMsg(`建议生成失败：${String(err).slice(0, 200)}`);
        }
        break;
      }

      default:
        addAgentMsg(`未知命令 \`/${cmd}\`。支持的命令：\n• \`/analyze\` — 分析节点\n• \`/compile\` — 编译提示词\n• \`/suggest\` — 创作建议`);
    }
  }, [addAgentMsg, addSystemMsg, getCanvasContext, onClose]);

  const createNodesOnCanvas = useCallback((type: NodeType, title: string) => {
    const store = useCanvasStore.getState();
    const vp = store.viewport;
    const x = (window.innerWidth / 2 - vp.x) / vp.zoom - (type === 'shot' ? 140 : 190);
    const y = (window.innerHeight / 2 - vp.y) / vp.zoom - 100;
    if (onAddNode) {
      const newId = onAddNode(type, { x, y }, title);
      store.setSelectedNodes([newId]);
    }
  }, [onAddNode]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      // Check for slash commands
      const slashMatch = text.match(/^\/(\w+)\s*(.*)/);
      if (slashMatch) {
        await handleSlashCommand(slashMatch[1], slashMatch[2].trim());
        setIsProcessing(false);
        return;
      }

      // Natural language — use Agent API with canvas context
      const ctx = getCanvasContext();
      const store = useCanvasStore.getState();

      const result = await analyzeText({
        providerId: 'text',
        mode: 'text-analysis' as any,
        rawText: `用户消息: ${text}\n\n当前画布状态:\n${ctx}\n\n请回复用户。如果用户想创建节点，在回复中明确说明节点类型和标题。回复简洁有用。`,
      } as any);

      const reply = result.compiled?.en || `收到你的消息。不过我现在无法完整处理，请稍后重试。`;

      // Check if Agent suggests creating a node
      const hasCreateImage = reply.includes('图片生成') || reply.includes('image.generate');
      const hasCreateShot = reply.includes('镜头') || reply.includes('shot');
      const actions: AgentMessage['actions'] = [];

      if (hasCreateImage) {
        actions.push({
          label: '🖼️ 创建图片生成节点',
          onClick: () => createNodesOnCanvas('image.generate', 'AI 图片生成'),
        });
      }
      if (hasCreateShot) {
        actions.push({
          label: '🎬 创建镜头节点',
          onClick: () => createNodesOnCanvas('shot', 'AI 镜头'),
        });
      }

      // Always offer quick actions
      if (actions.length === 0 && store.selectedNodeIds.length > 0) {
        actions.push({
          label: '📝 编译选中节点',
          onClick: () => handleSlashCommand('compile', ''),
        });
        actions.push({
          label: '💡 生成建议',
          onClick: () => handleSlashCommand('suggest', ''),
        });
      } else if (actions.length === 0) {
        actions.push(
          { label: '🎬 创建镜头节点', onClick: () => createNodesOnCanvas('shot', '新镜头') },
          { label: '🖼️ 创建图片生成', onClick: () => createNodesOnCanvas('image.generate', '图片生成') },
        );
      }

      addAgentMsg(reply, actions);
    } catch (err) {
      addAgentMsg(`抱歉，处理你的消息时出错了：${String(err).slice(0, 200)}。请稍后重试。`);
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, handleSlashCommand, getCanvasContext, addAgentMsg, createNodesOnCanvas]);

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
            width: '32px', height: '32px', borderRadius: 'var(--tap-r-md)',
            background: 'var(--tap-grad-agent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
              在线 · DeepSeek
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 'var(--tap-btn-size-sm)', height: 'var(--tap-btn-size-sm)',
          borderRadius: 'var(--tap-r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--tap-text-3)', fontSize: '18px', cursor: 'pointer',
          transition: `all var(--tap-dur-fast) var(--tap-ease)`, border: 'none', background: 'transparent',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-3)'; }}
        >✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            animation: 'tap-fade-up var(--tap-dur-normal) var(--tap-ease)',
          }}>
            <div style={{
              maxWidth: '90%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? 'var(--tap-r-lg) var(--tap-r-lg) 4px var(--tap-r-lg)'
                : msg.role === 'system' ? 'var(--tap-r-md)'
                : 'var(--tap-r-lg) var(--tap-r-lg) var(--tap-r-lg) 4px',
              background: msg.role === 'user' ? 'var(--tap-accent-bg)'
                : msg.role === 'system' ? 'rgba(250,173,20,0.08)'
                : 'rgba(255,255,255,0.06)',
              border: msg.role === 'user' ? '1px solid var(--tap-accent-border)'
                : msg.role === 'system' ? '1px solid rgba(250,173,20,0.15)'
                : '1px solid var(--tap-border)',
              fontSize: msg.role === 'system' ? 'var(--tap-fs-meta)' : 'var(--tap-fs-body)',
              color: msg.role === 'system' ? 'var(--tap-text-3)' : 'var(--tap-text-1)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {/* Parse **bold** and • bullets for simple markdown */}
              {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
            </div>

            {/* Action buttons */}
            {msg.actions && msg.actions.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {msg.actions.map((action, i) => (
                  <button key={i} onClick={action.onClick} style={{
                    padding: '6px 14px', borderRadius: 'var(--tap-r-md)',
                    background: 'var(--tap-accent-bg)', border: '1px solid var(--tap-accent-border)',
                    color: 'var(--tap-accent)', fontSize: 'var(--tap-fs-meta)',
                    fontWeight: 500, cursor: 'pointer',
                    transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-accent)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--tap-accent-bg)'; e.currentTarget.style.color = 'var(--tap-accent)'; }}
                  >{action.label}</button>
                ))}
              </div>
            )}

            {msg.role !== 'system' && (
              <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)', marginTop: '4px', padding: '0 4px' }}>
                {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', animation: 'tap-fade-up var(--tap-dur-fast) var(--tap-ease)',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--tap-accent)', animation: 'tap-pulse-glow 1.2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)' }}>
              AI 正在思考…
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input zone */}
      <div style={{
        padding: '14px', borderTop: '1px solid var(--tap-divider)',
        background: 'rgba(18, 18, 22, 0.9)', flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="输入消息… (Enter 发送, Shift+Enter 换行)"
          rows={2}
          style={{
            width: '100%', background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-lg)',
            padding: '10px 12px', fontSize: 'var(--tap-fs-body)',
            color: 'var(--tap-text-1)', resize: 'none', outline: 'none', lineHeight: 1.5,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['/analyze', '/compile', '/suggest'].map(cmd => (
              <span key={cmd}
                onClick={() => { setInput(cmd + ' '); inputRef.current?.focus(); }}
                style={{
                  fontSize: '11px', color: 'var(--tap-text-4)', padding: '3px 7px',
                  borderRadius: 'var(--tap-r-sm)', cursor: 'pointer',
                  background: 'transparent',
                  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-4)'; }}
              >{cmd}</span>
            ))}
          </div>
          <button onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: input.trim() && !isProcessing ? 'var(--tap-accent)' : 'var(--tap-hover)',
              color: input.trim() && !isProcessing ? '#fff' : 'var(--tap-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', cursor: input.trim() && !isProcessing ? 'pointer' : 'default',
              transition: `all var(--tap-dur-fast) var(--tap-ease)`, flexShrink: 0, border: 'none',
            }}
          >↑</button>
        </div>
      </div>
    </div>
  );
}
