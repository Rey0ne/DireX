import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage, SUPPORTED_LANGS } from './index';

export function LangSwitcher() {
  const { i18n } = useTranslation();

  const toggle = useCallback(() => {
    const current = i18n.language || 'zh-CN';
    const next = SUPPORTED_LANGS.find(l => l.code !== current) || SUPPORTED_LANGS[0];
    setLanguage(next.code);
  }, [i18n.language]);

  const currentLabel = SUPPORTED_LANGS.find(l => l.code === i18n.language)?.label || '中文';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* 地球图标 + 当前语言标签 */}
      <button
        onClick={toggle}
        title={i18n.language === 'zh-CN' ? 'Switch to English' : '切换到中文'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 20,
          border: '1px solid var(--tap-border-light)',
          background: 'var(--tap-bg2)',
          color: 'var(--tap-text-2)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
          fontFamily: 'system-ui, sans-serif',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--tap-accent-border)';
          e.currentTarget.style.color = 'var(--tap-accent)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--tap-border-light)';
          e.currentTarget.style.color = 'var(--tap-text-2)';
        }}
      >
        {/* 简化的地球 SVG 图标 */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="12" cy="12" rx="4" ry="10" />
          <path d="M2 12h20" />
        </svg>
        {currentLabel}
      </button>
    </div>
  );
}
