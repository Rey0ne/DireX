/* === AgentControlButton — opens the Agent Control Panel === */
import { useState } from 'react';
import { Tooltip } from './shared';

interface AgentControlButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function AgentControlButton({ isOpen, onClick }: AgentControlButtonProps) {
  const [hover, setHover] = useState(false);

  return (
    <Tooltip label={isOpen ? '关闭控制台' : 'Agent 控制台'}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          background: isOpen
            ? 'rgba(255,255,255,0.12)'
            : hover
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(22,26,34,0.85)',
          border: '1px solid rgba(255,255,255,0.12)',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
          position: 'fixed',
          bottom: '76px',
          right: '28px',
          zIndex: 400,
        }}
      >
        {isOpen ? '✕' : '🔧'}
      </button>
    </Tooltip>
  );
}
