import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage, SUPPORTED_LANGS } from './index';

export function LangSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LANGS.find(l => l.code === i18n.language) || SUPPORTED_LANGS[0];

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const select = useCallback((code: string) => {
    setLanguage(code as 'zh-CN' | 'en');
    setOpen(false);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ── 触发器 ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px',
          borderRadius: 20,
          border: `1px solid ${open ? 'var(--tap-accent-border)' : 'var(--tap-border-light)'}`,
          background: open ? 'var(--tap-bg3)' : 'var(--tap-bg2)',
          color: open ? 'var(--tap-accent)' : 'var(--tap-text-2)',
          fontSize: 13, fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* 地球图标 */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="12" cy="12" rx="4" ry="10" />
          <path d="M2 12h20" />
        </svg>
        {current.label}
        {/* 下拉箭头 */}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── 下拉列表 ── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          minWidth: 160,
          background: 'var(--tap-panel)',
          border: '1px solid var(--tap-border)',
          borderRadius: 12,
          boxShadow: 'var(--tap-shadow-lg)',
          overflow: 'hidden',
          zIndex: 1000,
          animation: 'langFadeIn 0.12s ease',
        }}>
          {SUPPORTED_LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => select(lang.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 16px',
                border: 'none', cursor: 'pointer',
                background: lang.code === current.code ? 'var(--tap-bg3)' : 'transparent',
                color: lang.code === current.code ? 'var(--tap-accent)' : 'var(--tap-text-2)',
                fontSize: 13, fontWeight: lang.code === current.code ? 600 : 400,
                transition: 'background 0.1s',
                fontFamily: 'system-ui, sans-serif',
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                if (lang.code !== current.code) {
                  e.currentTarget.style.background = 'var(--tap-bg2)';
                }
              }}
              onMouseLeave={e => {
                if (lang.code !== current.code) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {/* 勾选标记 */}
              <span style={{ width: 16, fontSize: 12, textAlign: 'center', flexShrink: 0 }}>
                {lang.code === current.code ? '✓' : ''}
              </span>
              <span>{lang.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tap-text-4)' }}>{lang.code}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── fadeIn keyframe ── */}
      <style>{`
        @keyframes langFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
