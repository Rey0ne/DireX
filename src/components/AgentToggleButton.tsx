/* === AgentToggleButton — bottom-right animated agent trigger === */
/* Pulses when agent has suggestions, shows status indicator */

import { useState } from 'react';
import { Tooltip } from './shared';

interface AgentToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
  hasSuggestion?: boolean;
}

export function AgentToggleButton({ isOpen, onClick, hasSuggestion = false }: AgentToggleButtonProps) {
  const [hover, setHover] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      bottom: '28px',
      right: '28px',
      zIndex: 400,
    }}>
      <Tooltip label={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}>
        <button
          onClick={onClick}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            background: isOpen
              ? 'var(--tap-accent-bg)'
              : hover
                ? 'var(--tap-panel-light)'
                : 'var(--tap-panel)',
            border: isOpen
              ? '1px solid var(--tap-accent-border)'
              : '1px solid var(--tap-border)',
            boxShadow: hasSuggestion && !isOpen
              ? '0 4px 16px rgba(160, 100, 255, 0.3)'
              : 'var(--tap-shadow-lg)',
            cursor: 'pointer',
            transition: `all var(--tap-dur-fast) var(--tap-ease)`,
            animation: hasSuggestion && !isOpen
              ? 'tap-agent-pulse 2.4s ease-in-out infinite'
              : 'none',
            position: 'relative',
            color: isOpen ? 'var(--tap-accent)' : 'var(--tap-text-1)',
          }}
        >
          {isOpen ? '✕' : '🤖'}

          {/* Suggestion indicator */}
          {hasSuggestion && !isOpen && (
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'var(--tap-accent)',
              border: '2px solid var(--tap-bg)',
              boxShadow: '0 0 8px rgba(74, 158, 255, 0.6)',
            }} />
          )}
        </button>
      </Tooltip>
    </div>
  );
}
