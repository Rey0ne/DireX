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
      background: '#0a0a0f',
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
        background: 'radial-gradient(ellipse at center, rgba(20,20,30,0.5) 0%, rgba(5,5,10,0.85) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── 登录表单 ── */}
      <div style={{
        width: 400, padding: 40,
        background: 'rgba(12,12,20,0.92)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
        display: 'flex', flexDirection: 'column', gap: 24,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Dire<span style={{ color: '#5EEAD4' }}>X</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
            AI 内容制作管线
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setMsg(''); }}
              style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: mode === m ? '#5EEAD4' : 'rgba(255,255,255,0.35)',
                fontSize: 14, fontWeight: 600,
                borderBottom: mode === m ? '2px solid #5EEAD4' : '2px solid transparent',
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ accentColor: '#5EEAD4', cursor: 'pointer' }} />
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
              background: loading ? 'rgba(94,234,212,0.4)' : '#5EEAD4',
              color: '#fff', fontSize: 15, fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            {loading ? '处理中…' : mode === 'login' ? '登录' : '注册（送 200 积分）'}
          </button>
        </form>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
          注册即表示同意服务条款和隐私政策
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
