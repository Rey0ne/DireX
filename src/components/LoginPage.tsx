/* === LoginPage — Register / Login screen === */
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const CRED_KEY = 'direx_remembered';

interface LoginPageProps {
  onEnter: () => void;
}

export function LoginPage({ onEnter }: LoginPageProps) {
  const { login, register, loading, error } = useAuthStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [remember, setRemember] = useState(false);

  // 恢复已保存的账号密码
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CRED_KEY);
      if (saved) {
        const { email: e, password: p } = JSON.parse(saved);
        if (e) setEmail(e);
        if (p) setPassword(p);
        setRemember(true);
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!email.trim() || !password.trim()) {
      setMsg('Email and password required');
      return;
    }
    let ok: boolean;
    if (mode === 'login') {
      ok = await login(email, password);
    } else {
      ok = await register(email, password, name || undefined);
    }
    if (ok) {
      // 记住密码
      if (remember) {
        localStorage.setItem(CRED_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(CRED_KEY);
      }
      onEnter();
    } else {
      setMsg(useAuthStore.getState().error || 'Failed');
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
      background: 'var(--tap-bg)',
    }}>
      {/* ── 背景视频 ── */}
      <video
        ref={videoRef}
        src="/演示demo.mp4"
        autoPlay muted loop playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: 0.25,
          pointerEvents: 'none',
        }}
      />
      {/* ── 灰雾覆盖层 ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(252,252,252,0.3) 0%, rgba(240,240,242,0.80) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── 登录表单 ── */}
      <div style={{
        width: 400, padding: 40,
        background: 'var(--tap-panel)',
        border: '1px solid var(--tap-border)',
        borderRadius: 16,
        display: 'flex', flexDirection: 'column', gap: 24,
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--tap-shadow-xl)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--tap-text-1)', letterSpacing: '-0.02em' }}>
            Dire<span style={{ color: 'var(--tap-accent)' }}>X</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--tap-text-3)', marginTop: 4 }}>
            AI 内容制作管线
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--tap-divider)' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setMsg(''); }}
              style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: mode === m ? 'var(--tap-accent)' : 'var(--tap-text-3)',
                fontSize: 14, fontWeight: 600,
                borderBottom: mode === m ? '2px solid var(--tap-accent)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >{m === 'login' ? '登录' : '注册'}</button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="用户名（选填）"
              style={inputStyle}
            />
          )}
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="邮箱"
            style={inputStyle}
            autoComplete="email"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="密码（至少6位）"
            style={inputStyle}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {mode === 'login' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--tap-text-3)' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ accentColor: 'var(--tap-accent)', cursor: 'pointer' }} />
              记住密码
            </label>
          )}

          {(msg || error) && (
            <div style={{ fontSize: 12, color: '#ff6b6b', textAlign: 'center' }}>
              {msg || error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{
              padding: '12px', borderRadius: 10, border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              background: loading ? 'rgba(14,168,138,0.4)' : 'var(--tap-accent)',
              color: '#fff', fontSize: 15, fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            {loading ? '处理中…' : mode === 'login' ? '登录' : '注册（送 200 积分）'}
          </button>
        </form>

        {/* ── 免登录入口 ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--tap-divider)' }} />
          <span style={{ fontSize: 11, color: 'var(--tap-text-4)' }}>或</span>
          <div style={{ flex: 1, height: 1, background: 'var(--tap-divider)' }} />
        </div>
        <button type="button" onClick={onEnter}
          style={{
            padding: '12px', borderRadius: 10, border: '1px solid var(--tap-border-light)',
            cursor: 'pointer', background: 'transparent',
            color: 'var(--tap-text-2)', fontSize: 14, fontWeight: 500,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--tap-accent-border)';
            e.currentTarget.style.color = 'var(--tap-accent)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--tap-border-light)';
            e.currentTarget.style.color = 'var(--tap-text-2)';
          }}
        >直接进入（免登录）</button>

        <div style={{ fontSize: 11, color: 'var(--tap-text-4)', textAlign: 'center' }}>
          注册即表示同意服务条款和隐私政策
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--tap-border-light)',
  background: 'var(--tap-bg2)',
  color: 'var(--tap-text-1)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
