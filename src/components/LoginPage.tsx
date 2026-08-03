/* === LoginPage — Register / Login / Delete Account === */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { LangSwitcher } from '../i18n/LangSwitcher';
import { BACKEND_URL } from '../api/config';
import type { IdType } from '../../shared/api-types.js';

const CRED_KEY = 'direx_remembered';
const TURNSTILE_SITE_KEY = (typeof window !== 'undefined' && (window as any).__TURNSTILE_SITE_KEY__) || '1x00000000000000000000AA'; // dev: always-passes test key

declare global { interface Window { turnstile: any; } }

interface LoginPageProps {
  onEnter: () => void;
}

export function LoginPage({ onEnter }: LoginPageProps) {
  const { t } = useTranslation();
  const { login, register, deleteAccount, loading, error } = useAuthStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [msg, setMsg] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  // ── 登录 ──
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  // ── 注册 ──
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
  const [regMethod, setRegMethod] = useState<'email' | 'phone'>('email');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('+86');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [idType, setIdType] = useState<IdType>('cn-id');
  const [idNumber, setIdNumber] = useState('');
  const [realName, setRealName] = useState('');
  const [address, setAddress] = useState('');
  const [companyCode, setCompanyCode] = useState('');

  // ── 验证码 ──
  const [verifyCode, setVerifyCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [codeTarget, setCodeTarget] = useState(''); // "email:xxx@..." or "sms:+86138..."

  // ── Turnstile ──
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);

  // ── 注销 ──
  const [delAccount, setDelAccount] = useState('');
  const [delPassword, setDelPassword] = useState('');
  const [delConfirm, setDelConfirm] = useState('');

  // ── Turnstile 初始化 ──
  useEffect(() => {
    if (window.turnstile) { setTurnstileReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => setTurnstileReady(true);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  useEffect(() => {
    if (!turnstileReady || !turnstileRef.current || !window.turnstile) return;
    window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'light',
      size: 'normal',
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(''),
    });
  }, [turnstileReady]);

  // ── 验证码倒计时 ──
  useEffect(() => {
    if (codeCountdown <= 0) return;
    const t = setTimeout(() => setCodeCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [codeCountdown]);

  // ── 发送验证码 ──
  const handleSendCode = useCallback(async () => {
    setSendingCode(true);
    try {
      let key: string;
      let url: string;
      let body: any;

      if (regMethod === 'email') {
        const e = regEmail.trim();
        if (!e || !e.includes('@')) { setMsg(t('login.errAccountRequired')); setSendingCode(false); return; }
        key = `email:${e.toLowerCase()}`;
        url = `${BACKEND_URL}/api/auth/send-verify-email`;
        body = { email: e };
      } else {
        const p = regPhone.trim().replace(/[\s\-]/g, '');
        if (!p) { setMsg(t('login.errAccountRequired')); setSendingCode(false); return; }
        key = `sms:${phoneCountry}${p}`;
        url = `${BACKEND_URL}/api/auth/send-verify-sms`;
        body = { phone: p, countryCode: phoneCountry };
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (json.success) {
        setCodeTarget(key);
        setCodeSent(true);
        setCodeCountdown(60);
        setMsg('');
        if (json.mock) setMsg(t('login.verifyCodeSent') + ' (DEV)');
      } else {
        setMsg(json.error || '发送失败');
      }
    } catch {
      setMsg('网络错误');
    }
    setSendingCode(false);
  }, [regMethod, regEmail, regPhone, phoneCountry, t]);

  // ── 登录 ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    if (!account.trim() || !password.trim()) { setMsg(t('login.errAccountRequired')); return; }
    const ok = await login(account, password);
    if (ok) {
      if (remember) localStorage.setItem(CRED_KEY, JSON.stringify({ email: account, password }));
      else localStorage.removeItem(CRED_KEY);
      onEnter();
    } else setMsg(useAuthStore.getState().error || t('login.errLoginFailed'));
  };

  // ── 注册 ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    if (!nickname.trim()) { setMsg(t('login.errNickname')); return; }
    if (!regPassword || regPassword.length < 6) { setMsg(t('login.errPasswordShort')); return; }
    if (regPassword !== regPasswordConfirm) { setMsg(t('login.errPasswordMismatch')); return; }

    const hasEmail = regEmail.trim();
    const hasPhone = regPhone.trim().replace(/[\s\-]/g, '');
    if (!hasEmail && !hasPhone) { setMsg(t('login.errEmailOrPhone')); return; }

    if (accountType === 'individual') {
      if (!idNumber.trim() || !realName.trim()) { setMsg(t('login.errIdRequired')); return; }
      if (!address.trim()) { setMsg(t('login.errAddress')); return; }
    }
    if (accountType === 'company') {
      if (!companyCode.trim()) { setMsg(t('login.errCompanyCode')); return; }
      if (!hasEmail) { setMsg(t('login.errCompanyEmail')); return; }
    }

    if (!turnstileToken) { setMsg(t('login.turnstileRequired')); return; }

    const ok = await register({
      email: hasEmail || undefined,
      phone: hasPhone || undefined,
      phoneCountry: hasPhone ? phoneCountry : undefined,
      password: regPassword,
      nickname: nickname.trim(),
      accountType,
      idType: accountType === 'individual' ? idType : undefined,
      idNumber: accountType === 'individual' ? idNumber.trim() : undefined,
      realName: accountType === 'individual' ? realName.trim() : undefined,
      address: accountType === 'individual' ? address.trim() : undefined,
      companyCode: accountType === 'company' ? companyCode.trim() : undefined,
      turnstileToken,
      verifyCode: verifyCode || undefined,
      codeTarget: codeTarget || undefined,
    } as any);

    if (ok) onEnter();
    else setMsg(useAuthStore.getState().error || t('login.errRegisterFailed'));
  };

  // ── 注销 ──
  const handleDelete = async () => {
    setMsg('');
    if (!delAccount.trim() || !delPassword.trim()) { setMsg(t('login.errAccountRequired')); return; }
    if (delConfirm !== 'DELETE') { setMsg(t('login.errDeleteConfirm')); return; }
    const result = await deleteAccount(delAccount, delPassword);
    if (result.success) { setMsg(t('login.deleteSuccess')); setShowDelete(false); setDelAccount(''); setDelPassword(''); setDelConfirm(''); }
    else setMsg(result.error || t('login.errDeleteFailed'));
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden', background: 'var(--tap-bg)' }}>
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}><LangSwitcher /></div>
      <video ref={videoRef} src="/演示demo.mp4" autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(252,252,252,0.3) 0%, rgba(240,240,242,0.80) 100%)', pointerEvents: 'none' }} />

      <div style={{ width: 440, maxHeight: '90vh', overflowY: 'auto', padding: 36, background: 'var(--tap-panel)', border: '1px solid var(--tap-border)', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 20, backdropFilter: 'blur(20px)', boxShadow: 'var(--tap-shadow-xl)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--tap-text-1)', letterSpacing: '-0.02em' }}>Dire<span style={{ color: 'var(--tap-accent)' }}>X</span></div>
          <div style={{ fontSize: 12, color: 'var(--tap-text-3)', marginTop: 4 }}>{t('login.subtitle')}</div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--tap-divider)' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setMsg(''); setShowDelete(false); }} style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', background: 'transparent', color: mode === m ? 'var(--tap-accent)' : 'var(--tap-text-3)', fontSize: 14, fontWeight: 600, borderBottom: mode === m ? '2px solid var(--tap-accent)' : '2px solid transparent', transition: 'all 0.15s' }}>
              {m === 'login' ? t('login.tabLogin') : t('login.tabRegister')}
            </button>
          ))}
        </div>

        {/* ════ 登录 ════ */}
        {mode === 'login' && !showDelete && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input value={account} onChange={e => setAccount(e.target.value)} placeholder={t('login.placeholderAccount')} style={inputStyle} autoComplete="username" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('login.placeholderPassword')} style={inputStyle} autoComplete="current-password" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--tap-text-3)' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: 'var(--tap-accent)', cursor: 'pointer' }} />{t('login.rememberPassword')}
            </label>
            {(msg || error) && <div style={{ fontSize: 12, color: '#ff6b6b', textAlign: 'center' }}>{msg || error}</div>}
            <button type="submit" disabled={loading} style={btnPrimary(loading)}>{loading ? t('login.btnProcessing') : t('login.btnLogin')}</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ flex: 1, height: 1, background: 'var(--tap-divider)' }} /><span style={{ fontSize: 11, color: 'var(--tap-text-4)' }}>{t('login.orDivider')}</span><div style={{ flex: 1, height: 1, background: 'var(--tap-divider)' }} /></div>
            <button type="button" onClick={onEnter} style={btnGhost}>{t('login.btnSkip')}</button>
            <button type="button" onClick={() => setShowDelete(true)} style={{ fontSize: 11, color: 'var(--tap-text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, textDecoration: 'underline', textUnderlineOffset: 3 }}>{t('login.deleteAccountLink')}</button>
          </form>
        )}

        {/* ════ 注销 ════ */}
        {mode === 'login' && showDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ff6b6b', textAlign: 'center' }}>{t('login.deleteTitle')}</div>
            <div style={{ fontSize: 11, color: 'var(--tap-text-3)', textAlign: 'center' }}>{t('login.deleteWarning')}</div>
            <input value={delAccount} onChange={e => setDelAccount(e.target.value)} placeholder={t('login.placeholderAccount')} style={inputStyle} />
            <input type="password" value={delPassword} onChange={e => setDelPassword(e.target.value)} placeholder={t('login.placeholderPassword')} style={inputStyle} />
            <input value={delConfirm} onChange={e => setDelConfirm(e.target.value)} placeholder={t('login.deleteConfirmPlaceholder')} style={{ ...inputStyle, borderColor: delConfirm === 'DELETE' ? '#ff6b6b' : 'var(--tap-border-light)' }} />
            {msg && <div style={{ fontSize: 12, color: msg.includes('成功') ? 'var(--tap-accent)' : '#ff6b6b', textAlign: 'center' }}>{msg}</div>}
            <button onClick={handleDelete} style={{ ...btnPrimary(false), background: '#ff6b6b' }}>{t('login.deleteConfirmBtn')}</button>
            <button onClick={() => { setShowDelete(false); setMsg(''); }} style={btnGhost}>{t('login.deleteCancel')}</button>
          </div>
        )}

        {/* ════ 注册 ════ */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 账户类型 */}
            <div style={sectLabel}>{t('login.accountTypeLabel')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['individual', 'company'] as const).map(tp => (
                <button key={tp} type="button" onClick={() => setAccountType(tp)} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, border: accountType === tp ? '2px solid var(--tap-accent)' : '1px solid var(--tap-border-light)', background: accountType === tp ? 'rgba(14,168,138,0.08)' : 'var(--tap-bg2)', color: accountType === tp ? 'var(--tap-accent)' : 'var(--tap-text-2)' }}>
                  {tp === 'individual' ? t('login.accountIndividual') : t('login.accountCompany')}
                </button>
              ))}
            </div>

            {/* 注册方式 */}
            <div style={sectLabel}>{t('login.regMethodLabel')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['email', 'phone'] as const).map(m => (
                <button key={m} type="button" onClick={() => setRegMethod(m)} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, border: regMethod === m ? '2px solid var(--tap-accent)' : '1px solid var(--tap-border-light)', background: regMethod === m ? 'rgba(14,168,138,0.08)' : 'var(--tap-bg2)', color: regMethod === m ? 'var(--tap-accent)' : 'var(--tap-text-2)' }}>
                  {m === 'email' ? t('login.placeholderEmail') : t('login.placeholderPhone')}
                </button>
              ))}
            </div>

            {/* 邮箱 / 手机号 + 验证码 */}
            {regMethod === 'email' ? (
              <>
                <input value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder={t('login.placeholderEmail')} style={inputStyle} autoComplete="email" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder={t('login.verifyCodePlaceholder')} style={inputStyle} maxLength={6} />
                  <button type="button" onClick={handleSendCode} disabled={sendingCode || codeCountdown > 0}
                    style={{ ...inputStyle, width: 140, flexShrink: 0, cursor: codeCountdown > 0 ? 'default' : 'pointer', color: codeSent ? 'var(--tap-accent)' : 'var(--tap-text-2)', fontWeight: 500, textAlign: 'center' }}>
                    {sendingCode ? '...' : codeCountdown > 0 ? `${codeCountdown}s` : codeSent ? t('login.verifyCodeSent') : t('login.sendVerifyCode')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={phoneCountry} onChange={e => setPhoneCountry(e.target.value)} style={{ ...inputStyle, width: 100, flexShrink: 0, cursor: 'pointer' }}>
                    <option value="+86">+86 🇨🇳</option><option value="+1">+1 🇺🇸</option><option value="+81">+81 🇯🇵</option><option value="+49">+49 🇩🇪</option><option value="+33">+33 🇫🇷</option><option value="+39">+39 🇮🇹</option>
                  </select>
                  <input value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder={t('login.placeholderPhoneNumber')} style={inputStyle} autoComplete="tel" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder={t('login.verifyCodePlaceholder')} style={inputStyle} maxLength={6} />
                  <button type="button" onClick={handleSendCode} disabled={sendingCode || codeCountdown > 0}
                    style={{ ...inputStyle, width: 140, flexShrink: 0, cursor: codeCountdown > 0 ? 'default' : 'pointer', color: codeSent ? 'var(--tap-accent)' : 'var(--tap-text-2)', fontWeight: 500, textAlign: 'center' }}>
                    {sendingCode ? '...' : codeCountdown > 0 ? `${codeCountdown}s` : codeSent ? t('login.verifyCodeSent') : t('login.sendVerifyCode')}
                  </button>
                </div>
              </>
            )}

            {/* 密码 + 确认 */}
            <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder={t('login.placeholderNewPassword')} style={inputStyle} autoComplete="new-password" />
            <input type="password" value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)} placeholder={t('login.placeholderConfirmPassword')} style={inputStyle} autoComplete="new-password" />

            {/* 昵称 */}
            <div style={sectLabel}>{t('login.nicknameLabel')} <span style={{ color: '#ff6b6b' }}>*</span></div>
            <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder={t('login.nicknamePlaceholder')} style={inputStyle} />

            {/* 个人：身份证 */}
            {accountType === 'individual' && (
              <>
                <div style={{ ...sectLabel, marginTop: 4 }}>{t('login.idSectionTitle')}</div>
                <select value={idType} onChange={e => setIdType(e.target.value as IdType)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="cn-id">{t('login.idCnId')}</option>
                  <option value="us-ssn">{t('login.idUsSsn')}</option>
                  <option value="ja-mynumber">{t('login.idJaMynumber')}</option>
                  <option value="de-pa">{t('login.idDePa')}</option>
                  <option value="fr-cni">{t('login.idFrCni')}</option>
                  <option value="it-ci">{t('login.idItCi')}</option>
                  <option value="passport">{t('login.idPassport')}</option>
                </select>
                <input value={realName} onChange={e => setRealName(e.target.value)} placeholder={t('login.realNamePlaceholder')} style={inputStyle} />
                <input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder={t('login.idNumberPlaceholder')} style={inputStyle} />
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder={t('login.addressPlaceholder')} style={inputStyle} />
              </>
            )}

            {/* 公司 */}
            {accountType === 'company' && (
              <>
                <div style={sectLabel}>{t('login.companySectionTitle')}</div>
                <input value={companyCode} onChange={e => setCompanyCode(e.target.value)} placeholder={t('login.companyCodePlaceholder')} style={inputStyle} />
                <input value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder={t('login.placeholderPhone')} style={inputStyle} autoComplete="tel" />
              </>
            )}

            {/* Turnstile 人机验证 */}
            <div ref={turnstileRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 65 }} />
            {!turnstileReady && <div style={{ fontSize: 11, color: 'var(--tap-text-4)', textAlign: 'center' }}>{t('login.turnstileLoading')}</div>}

            {(msg || error) && <div style={{ fontSize: 12, color: '#ff6b6b', textAlign: 'center' }}>{msg || error}</div>}

            <button type="submit" disabled={loading} style={btnPrimary(loading)}>
              {loading ? t('login.btnProcessing') : t('login.btnRegister')}
            </button>
            <div style={{ fontSize: 11, color: 'var(--tap-text-4)', textAlign: 'center' }}>{t('login.termsFooter')}</div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: '11px 14px', borderRadius: 10, border: '1px solid var(--tap-border-light)', background: 'var(--tap-bg2)', color: 'var(--tap-text-1)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' };
const sectLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--tap-text-2)', marginBottom: -6 };
const btnPrimary = (l: boolean): React.CSSProperties => ({ padding: '12px', borderRadius: 10, border: 'none', cursor: l ? 'wait' : 'pointer', background: l ? 'rgba(14,168,138,0.4)' : 'var(--tap-accent)', color: '#fff', fontSize: 15, fontWeight: 600, transition: 'all 0.15s' });
const btnGhost: React.CSSProperties = { padding: '12px', borderRadius: 10, border: '1px solid var(--tap-border-light)', cursor: 'pointer', background: 'transparent', color: 'var(--tap-text-2)', fontSize: 14, fontWeight: 500 };
