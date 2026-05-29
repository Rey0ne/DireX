/* === Shared UI Primitives === */
/* Every component follows tokens + icon-first + Apple/HIG style */

import { useState, useRef, type CSSProperties, type ReactNode } from 'react';

// ─── Tooltip ─────────────────────────────────────
export function Tooltip({ label, shortcut, children }: {
  label: string;
  shortcut?: string;
  children: ReactNode;
}) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), 400);
  };
  const onLeave = () => {
    clearTimeout(timeoutRef.current);
    setShow(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(30, 32, 38, 0.96)',
          border: '1px solid var(--tap-border)',
          borderRadius: 'var(--tap-r-sm)',
          padding: '6px 10px',
          fontSize: 'var(--tap-fs-meta)',
          color: 'var(--tap-text-1)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: 'var(--tap-shadow-sm)',
          backdropFilter: 'blur(var(--tap-blur))',
        }}>
          {label}
          {shortcut && (
            <span style={{ color: 'var(--tap-text-3)', fontFamily: 'var(--tap-font-mono)', fontSize: '10px' }}>
              {shortcut}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── IconButton ──────────────────────────────────
export function IconButton({ icon, label, shortcut, active, danger, disabled, onClick }: {
  icon: string;
  label: string;
  shortcut?: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  const bg = danger
    ? (hover ? 'var(--tap-danger-hover)' : 'transparent')
    : active
      ? 'var(--tap-active)'
      : hover
        ? 'var(--tap-hover)'
        : 'transparent';

  const color = danger ? 'var(--tap-danger)' : active ? 'var(--tap-text-1)' : 'var(--tap-text-2)';

  return (
    <Tooltip label={label} shortcut={shortcut}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          width: 'var(--tap-btn-size)',
          height: 'var(--tap-btn-size)',
          borderRadius: 'var(--tap-r-full)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--tap-icon-size)',
          background: bg,
          color,
          transition: `background var(--tap-dur-fast) var(--tap-ease), color var(--tap-dur-fast) var(--tap-ease)`,
          opacity: disabled ? 0.35 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          minWidth: 'var(--tap-hit-min)',
          minHeight: 'var(--tap-hit-min)',
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

// ─── Panel (base floating panel) ─────────────────
export function Panel({ children, style, ...props }: {
  children: ReactNode;
  style?: CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      style={{
        background: 'var(--tap-panel)',
        border: '1px solid var(--tap-border)',
        borderRadius: 'var(--tap-r-xl)',
        boxShadow: 'var(--tap-shadow-lg)',
        backdropFilter: 'blur(var(--tap-blur))',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── MenuItem ────────────────────────────────────
export function MenuItem({ icon, label, shortcut, badge, onClick }: {
  icon: string;
  label: string;
  shortcut?: string;
  badge?: string;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--tap-space-3)',
        height: '36px',
        padding: '0 var(--tap-space-3)',
        borderRadius: 'var(--tap-r-md)',
        background: hover ? 'var(--tap-hover)' : 'transparent',
        cursor: 'pointer',
        transition: `background var(--tap-dur-fast) var(--tap-ease)`,
        fontSize: 'var(--tap-fs-body)',
        color: 'var(--tap-text-1)',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 'var(--tap-icon-size)', width: '20px', textAlign: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span style={{ color: 'var(--tap-text-3)', fontFamily: 'var(--tap-font-mono)', fontSize: '10px' }}>
          {shortcut}
        </span>
      )}
      {badge && (
        <span style={{
          fontSize: '10px',
          fontWeight: 500,
          color: 'var(--tap-text-2)',
          background: 'var(--tap-hover)',
          padding: '1px 6px',
          borderRadius: 'var(--tap-r-full)',
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────
export function Divider() {
  return (
    <div style={{
      height: '1px',
      background: 'var(--tap-divider)',
      margin: 'var(--tap-space-1) var(--tap-space-2)',
    }} />
  );
}

// ─── Badge / Chip ────────────────────────────────
export function Chip({ label, active, onClick, icon }: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  icon?: string;
}) {
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: 'var(--tap-r-sm)',
        fontSize: 'var(--tap-fs-chip)',
        fontWeight: 'var(--tap-fw-chip)',
        lineHeight: 'var(--tap-lh-chip)',
        background: active ? 'var(--tap-active)' : 'var(--tap-hover)',
        border: active ? '1px solid var(--tap-border-light)' : '1px solid transparent',
        color: active ? 'var(--tap-text-1)' : 'var(--tap-text-2)',
        cursor: onClick ? 'pointer' : 'default',
        transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        if (onClick && !active) e.currentTarget.style.color = 'var(--tap-text-1)';
      }}
      onMouseLeave={e => {
        if (onClick && !active) e.currentTarget.style.color = 'var(--tap-text-2)';
      }}
    >
      {icon && <span style={{ fontSize: 'var(--tap-icon-size-sm)' }}>{icon}</span>}
      {label}
    </span>
  );
}

// ─── StatusBadge ──────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; color: string; dot: string }> = {
    idle: { bg: 'rgba(255,255,255,0.06)', color: 'var(--tap-text-3)', dot: 'var(--tap-text-4)' },
    running: { bg: 'rgba(74,158,255,0.12)', color: 'var(--tap-accent)', dot: 'var(--tap-accent)' },
    succeeded: { bg: 'rgba(82,196,26,0.12)', color: 'var(--tap-success)', dot: 'var(--tap-success)' },
    failed: { bg: 'rgba(255,77,79,0.12)', color: 'var(--tap-danger)', dot: 'var(--tap-danger)' },
    blocked: { bg: 'rgba(250,173,20,0.12)', color: 'var(--tap-warning)', dot: 'var(--tap-warning)' },
  };
  const c = colorMap[status] || colorMap.idle;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '2px 8px', borderRadius: 'var(--tap-r-full)',
      background: c.bg, color: c.color,
      fontSize: 'var(--tap-fs-xs)', fontWeight: 500,
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.dot }} />
      {status}
    </span>
  );
}
