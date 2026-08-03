/* === LoginPage — Register / Login / Delete Account === */
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { LangSwitcher } from '../i18n/LangSwitcher';
import type { IdType } from '../../shared/api-types.js';

const CRED_KEY = 'direx_remembered';

interface LoginPageProps {
  onEnter: () => void;
}

export function LoginPage({ onEnter }: LoginPageProps) {
  const { t } = useTranslation();
  const { login, register, deleteAccount, loading, error } = useAuthStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [msg, setMsg] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  // ── 登录字段 ──
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  // ── 注册字段 ──
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
  const [regMethod, setRegMethod] = useState<'email' | 'phone'>('email');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('+86');
  const [regPassword, setRegPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [idType, setIdType] = useState<IdType>('cn-id');
  const [idNumber, setIdNumber] = useState('');
  const [realName, setRealName] = useState('');
  const [address, setAddress] = useState('');
  const [companyCode, setCompanyCode] = useState('');

  // ── 注销字段 ──
  const [delAccount, setDelAccount] = useState('');
  const [delPassword, setDelPassword] = useState('');
  const [delConfirm, setDelConfirm] = useState('');

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!account.trim() || !password.trim()) {
      setMsg(t('login.errAccountRequired'));
      return;
    }
    const ok = await login(account, password);
    if (ok) {
      if (remember) {
        localStorage.setItem(CRED_KEY, JSON.stringify({ email: account, password }));
      } else {
        localStorage.removeItem(CRED_KEY);
      }
      onEnter();
    } else {
      setMsg(useAuthStore.getState().error || t('login.errLoginFailed'));
    }
  };

  // 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');

    if (!nickname.trim()) { setMsg(t('login.errNickname')); return; }
    if (!regPassword || regPassword.length < 6) { setMsg(t('login.errPasswordShort')); return; }

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
    });
    if (ok) {
      onEnter();
    } else {
      setMsg(useAuthStore.getState().error || t('login.errRegisterFailed'));
    }
  };

  // 注销
  const handleDelete = async () => {
    setMsg('');
    if (!delAccount.trim() || !delPassword.trim()) {
      setMsg(t('login.errAccountRequired'));
      return;
    }
    if (delConfirm !== 'DELETE') {
      setMsg(t('login.errDeleteConfirm'));
      return;
    }
    const result = await deleteAccount(delAccount, delPassword);
    if (result.success) {
      setMsg(t('login.deleteSuccess'));
      setShowDelete(false);
      setDelAccount(''); setDelPassword(''); setDelConfirm('');
    } else {
      setMsg(result.error || t('login.errDeleteFailed'));
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
      {/* ── 语言切换器 ── */}
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
        <LangSwitcher />
      </div>

      {/* ── 背景 ── */}
      <video ref={videoRef} src="/演示demo.mp4" autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25, pointerEvents: 'none' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(252,252,252,0.3) 0%, rgba(240,240,242,0.80) 100%)', pointerEvents: 'none' }} />

      {/* ── 表单容器 ── */}
      <div style={{
        width: 440, maxHeight: '90vh', overflowY: 'auto',
        padding: 36,
        background: 'var(--tap-panel)',
        border: '1px solid var(--tap-border)',
        borderRadius: 16,
        display: 'flex', flexDirection: 'column', gap: 20,
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--tap-shadow-xl)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--tap-text-1)', letterSpacing: '-0.02em' }}>
            Dire<span style={{ color: 'var(--tap-accent)' }}>X</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--tap-text-3)', marginTop: 4 }}>
            {t('login.subtitle')}
          </div>
        </div>

        {/* ── Tabs: 登录 / 注册 ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--tap-divider)' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setMsg(''); setShowDelete(false); }}
              style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: mode === m ? 'var(--tap-accent)' : 'var(--tap-text-3)',
                fontSize: 14, fontWeight: 600,
                borderBottom: mode === m ? '2px solid var(--tap-accent)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >{m === 'login' ? t('login.tabLogin') : t('login.tabRegister')}</button>
          ))}
        </div>

        {/* ═══════════════════════════════════ */}
        {/* ── 登录表单 ── */}
        {/* ═══════════════════════════════════ */}
        {mode === 'login' && !showDelete && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input value={account} onChange={e => setAccount(e.target.value)}
              placeholder={t('login.placeholderAccount')} style={inputStyle} autoComplete="username" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={t('login.placeholderPassword')} style={inputStyle} autoComplete="current-password" />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--tap-text-3)' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ accentColor: 'var(--tap-accent)', cursor: 'pointer' }} />
              {t('login.rememberPassword')}
            </label>

            {(msg || error) && <div style={{ fontSize: 12, color: '#ff6b6b', textAlign: 'center' }}>{msg || error}</div>}

            <button type="submit" disabled={loading} style={btnPrimaryStyle(loading)}>
              {loading ? t('login.btnProcessing') : t('login.btnLogin')}
            </button>

            {/* ── 免登录 + 注销账号 ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--tap-divider)' }} />
              <span style={{ fontSize: 11, color: 'var(--tap-text-4)' }}>{t('login.orDivider')}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--tap-divider)' }} />
            </div>
            <button type="button" onClick={onEnter} style={btnGhostStyle}>
              {t('login.btnSkip')}</button>

            <button type="button" onClick={() => setShowDelete(true)}
              style={{ fontSize: 11, color: 'var(--tap-text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {t('login.deleteAccountLink')}</button>
          </form>
        )}

        {/* ═══════════════════════════════════ */}
        {/* ── 注销账号 ── */}
        {/* ═══════════════════════════════════ */}
        {mode === 'login' && showDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ff6b6b', textAlign: 'center' }}>
              {t('login.deleteTitle')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--tap-text-3)', textAlign: 'center' }}>
              {t('login.deleteWarning')}
            </div>
            <input value={delAccount} onChange={e => setDelAccount(e.target.value)}
              placeholder={t('login.placeholderAccount')} style={inputStyle} />
            <input type="password" value={delPassword} onChange={e => setDelPassword(e.target.value)}
              placeholder={t('login.placeholderPassword')} style={inputStyle} />
            <input value={delConfirm} onChange={e => setDelConfirm(e.target.value)}
              placeholder={t('login.deleteConfirmPlaceholder')} style={{ ...inputStyle, borderColor: delConfirm === 'DELETE' ? '#ff6b6b' : 'var(--tap-border-light)' }} />

            {msg && <div style={{ fontSize: 12, color: msg.includes('成功') ? 'var(--tap-accent)' : '#ff6b6b', textAlign: 'center' }}>{msg}</div>}

            <button onClick={handleDelete} style={{ ...btnPrimaryStyle(false), background: '#ff6b6b' }}>
              {t('login.deleteConfirmBtn')}</button>
            <button onClick={() => { setShowDelete(false); setMsg(''); }} style={btnGhostStyle}>
              {t('login.deleteCancel')}</button>
          </div>
        )}

        {/* ═══════════════════════════════════ */}
        {/* ── 注册表单 ── */}
        {/* ═══════════════════════════════════ */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 账户类型 */}
            <div style={sectionLabelStyle}>{t('login.accountTypeLabel')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['individual', 'company'] as const).map(tp => (
                <button key={tp} type="button" onClick={() => setAccountType(tp)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    border: accountType === tp ? '2px solid var(--tap-accent)' : '1px solid var(--tap-border-light)',
                    background: accountType === tp ? 'rgba(14,168,138,0.08)' : 'var(--tap-bg2)',
                    color: accountType === tp ? 'var(--tap-accent)' : 'var(--tap-text-2)',
                  }}
                >{tp === 'individual' ? t('login.accountIndividual') : t('login.accountCompany')}</button>
              ))}
            </div>

            {/* 注册方式 */}
            <div style={sectionLabelStyle}>{t('login.regMethodLabel')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['email', 'phone'] as const).map(m => (
                <button key={m} type="button" onClick={() => setRegMethod(m)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    border: regMethod === m ? '2px solid var(--tap-accent)' : '1px solid var(--tap-border-light)',
                    background: regMethod === m ? 'rgba(14,168,138,0.08)' : 'var(--tap-bg2)',
                    color: regMethod === m ? 'var(--tap-accent)' : 'var(--tap-text-2)',
                  }}
                >{m === 'email' ? t('login.placeholderEmail') : t('login.placeholderPhone')}</button>
              ))}
            </div>

            {/* 邮箱 */}
            {regMethod === 'email' && (
              <input value={regEmail} onChange={e => setRegEmail(e.target.value)}
                placeholder={t('login.placeholderEmail')} style={inputStyle} autoComplete="email" />
            )}

            {/* 手机号 */}
            {regMethod === 'phone' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={phoneCountry} onChange={e => setPhoneCountry(e.target.value)}
                  style={{ ...inputStyle, width: 100, flexShrink: 0, cursor: 'pointer' }}>
                  <option value="+86">+86 🇨🇳</option>
                  <option value="+1">+1 🇺🇸</option>
                  <option value="+81">+81 🇯🇵</option>
                  <option value="+49">+49 🇩🇪</option>
                  <option value="+33">+33 🇫🇷</option>
                  <option value="+39">+39 🇮🇹</option>
                </select>
                <input value={regPhone} onChange={e => setRegPhone(e.target.value)}
                  placeholder={t('login.placeholderPhoneNumber')} style={inputStyle} autoComplete="tel" />
              </div>
            )}

            {/* 密码 */}
            <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
              placeholder={t('login.placeholderNewPassword')} style={inputStyle} autoComplete="new-password" />

            {/* 昵称 — 必填 */}
            <div style={sectionLabelStyle}>{t('login.nicknameLabel')} <span style={{ color: '#ff6b6b' }}>*</span></div>
            <input value={nickname} onChange={e => setNickname(e.target.value)}
              placeholder={t('login.nicknamePlaceholder')} style={inputStyle} />

            {/* ── 个人用户：身份证 ── */}
            {accountType === 'individual' && (
              <>
                <div style={{ ...sectionLabelStyle, marginTop: 4 }}>{t('login.idSectionTitle')}</div>

                {/* 证件类型 */}
                <select value={idType} onChange={e => setIdType(e.target.value as IdType)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="cn-id">{t('login.idCnId')}</option>
                  <option value="us-ssn">{t('login.idUsSsn')}</option>
                  <option value="ja-mynumber">{t('login.idJaMynumber')}</option>
                  <option value="de-pa">{t('login.idDePa')}</option>
                  <option value="fr-cni">{t('login.idFrCni')}</option>
                  <option value="it-ci">{t('login.idItCi')}</option>
                  <option value="passport">{t('login.idPassport')}</option>
                </select>

                <input value={realName} onChange={e => setRealName(e.target.value)}
                  placeholder={t('login.realNamePlaceholder')} style={inputStyle} />
                <input value={idNumber} onChange={e => setIdNumber(e.target.value)}
                  placeholder={t('login.idNumberPlaceholder')} style={inputStyle} />
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder={t('login.addressPlaceholder')} style={inputStyle} />
              </>
            )}

            {/* ── 公司用户：公司代码 ── */}
            {accountType === 'company' && (
              <>
                <div style={sectionLabelStyle}>{t('login.companySectionTitle')}</div>
                <input value={companyCode} onChange={e => setCompanyCode(e.target.value)}
                  placeholder={t('login.companyCodePlaceholder')} style={inputStyle} />
                {/* 公司用户也需手机 */}
                <input value={regPhone} onChange={e => setRegPhone(e.target.value)}
                  placeholder={t('login.placeholderPhone')} style={inputStyle} autoComplete="tel" />
              </>
            )}

            {(msg || error) && <div style={{ fontSize: 12, color: '#ff6b6b', textAlign: 'center' }}>{msg || error}</div>}

            <button type="submit" disabled={loading} style={btnPrimaryStyle(loading)}>
              {loading ? t('login.btnProcessing') : t('login.btnRegister')}
            </button>

            <div style={{ fontSize: 11, color: 'var(--tap-text-4)', textAlign: 'center' }}>
              {t('login.termsFooter')}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '11px 14px', borderRadius: 10, border: '1px solid var(--tap-border-light)',
  background: 'var(--tap-bg2)', color: 'var(--tap-text-1)', fontSize: 14, outline: 'none',
  width: '100%', boxSizing: 'border-box',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--tap-text-2)', marginBottom: -6,
};

const btnPrimaryStyle = (loading: boolean): React.CSSProperties => ({
  padding: '12px', borderRadius: 10, border: 'none',
  cursor: loading ? 'wait' : 'pointer',
  background: loading ? 'rgba(14,168,138,0.4)' : 'var(--tap-accent)',
  color: '#fff', fontSize: 15, fontWeight: 600, transition: 'all 0.15s',
});

const btnGhostStyle: React.CSSProperties = {
  padding: '12px', borderRadius: 10, border: '1px solid var(--tap-border-light)',
  cursor: 'pointer', background: 'transparent',
  color: 'var(--tap-text-2)', fontSize: 14, fontWeight: 500,
};
