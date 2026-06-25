/* === CreditPanel — 订阅 + 积分充值 === */
import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { UserProfile } from '../../shared/api-types.js';

interface CreditPanelProps {
  onClose: () => void;
}

// Pro 五档积分选择
const PRO_CREDIT_OPTS = [2800, 4800, 7600, 9200, 16000];
const PRO_PRICES = ['$17.50', '$30.00', '$47.50', '$57.50', '$100.00'];
const PRO_MONTHLY_PRICES = ['$21.00', '$36.00', '$57.00', '$69.60', '$120.00'];
const PRO_CONCURRENCY = [8, 16, 24, 32, 40];
const PRO_IDS: UserProfile['plan'][] = ['pro_base', 'pro_mid', 'pro_high', 'pro_pro', 'pro_max'];

// 四个大档
interface PlanDef {
  id: UserProfile['plan'];
  name: string;
  tagline: string;
  price: string;
  monthlyPrice: string;
  annualPrice: string;
  annualTotal: string;
  credits: number;
  topupRate: string;
  topupBonus: string;
  concurrency: string;
  features: string[];
  recommended?: boolean;
  isPro?: boolean;
}

// 所有付费套餐共享的基础权益
const BASE_FEATURES = [
  '解锁画布执行导演 Agent',
  '解锁全部图像模型',
  '解锁全部视频模型',
  '商业授权可用',
  '账单&形式发票下载',
  '一键抠图/扩图',
  '4K视频/1080p图片高清增强',
  '人像修复与美化',
  '一键视频分镜解析',
  '一键电商组图生成',
  '多角度控制器',
  '专业摄像机库',
  '3D 世界编辑器',
];

const PRO_PLUS_FEATURES = [
  '优先队列生成',
  '团队协作与席位管理',
  '团队共享积分',
  '团队项目/资产共享',
  '成员用量管控（周/月）',
  '一键生成分镜图片节点',
  '产品教程与社区支持',
  '图片/视频批量导出',
];

const PLANS: PlanDef[] = [
  {
    id: 'creator', name: 'Creator', tagline: '适合初次探索 AI 创作',
    price: '$7.50', monthlyPrice: '$9.00', annualPrice: '$6.25', annualTotal: '$75',
    credits: 1200, topupRate: '$1=100积分', topupBonus: '—',
    concurrency: '3', features: BASE_FEATURES,
  },
  {
    id: 'pro', name: 'Pro', tagline: '最受欢迎 · 适合高频创作与持续产出',
    price: PRO_PRICES[2], monthlyPrice: PRO_MONTHLY_PRICES[2], annualPrice: '', annualTotal: '',
    credits: PRO_CREDIT_OPTS[2], topupRate: '$1=105积分', topupBonus: '赠5%',
    concurrency: '30', isPro: true,
    features: [...BASE_FEATURES, '————', ...PRO_PLUS_FEATURES.filter(f => f !== '产品教程与社区支持' && f !== '图片/视频批量导出')],
  },
  {
    id: 'elite', name: 'Elite', tagline: '适合大批量稳定产出与交付',
    price: '$172.80', monthlyPrice: '$198.00', annualPrice: '$144.00', annualTotal: '$1,728',
    credits: 28800, topupRate: '$1=110积分', topupBonus: '赠10%',
    concurrency: '50',
    features: [...BASE_FEATURES, '————', ...PRO_PLUS_FEATURES],
  },
  {
    id: 'ultra', name: 'Ultra', tagline: '最佳性价比 · 为极限产出而生',
    price: '$345.60', monthlyPrice: '$396.00', annualPrice: '$288.00', annualTotal: '$3,456',
    credits: 57600, topupRate: '$1=120积分', topupBonus: '赠20%',
    concurrency: '不限',
    features: [...BASE_FEATURES, '————', ...PRO_PLUS_FEATURES],
  },
];

const TOPUP_PACKS = [
  { credits: 500, price: 5.00 },
  { credits: 1500, price: 12.99 },
  { credits: 5000, price: 39.99 },
  { credits: 15000, price: 99.99 },
];

function getPlanDiscount(plan: string): { rate: number; label: string } | null {
  if (plan.startsWith('pro_') || plan === 'pro') return { rate: 0.90, label: '9折' };
  if (plan === 'creator') return { rate: 0.95, label: '95折' };
  if (plan === 'elite') return { rate: 0.85, label: '85折' };
  if (plan === 'ultra') return { rate: 0.80, label: '8折' };
  return null;
}

const BACKEND = import.meta.env.VITE_API_URL || '';

async function callApi(path: string, body: any) {
  const token = useAuthStore.getState().token;
  const resp = await fetch(`${BACKEND}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return resp.json();
}

export function CreditPanel({ onClose }: CreditPanelProps) {
  const user = useAuthStore(s => s.user)!;
  const [tab, setTab] = useState<'plan' | 'topup'>('plan');
  const [proTier, setProTier] = useState(2); // 默认高级
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');
  const [customDollars, setCustomDollars] = useState(50);
  const [msg, setMsg] = useState('');

  const currentPlanId = user.plan;

  const handleUpgrade = async (planId: UserProfile['plan'], planCredits: number) => {
    setMsg('');
    const json = await callApi('/api/auth/credits/upgrade-plan', { plan: planId, monthlyCredits: planCredits });
    if (json.success) {
      useAuthStore.setState({ user: json.user });
      setMsg('升级成功！');
    } else {
      setMsg(json.error || '升级失败');
    }
  };

  const handleTopup = async (pack: typeof TOPUP_PACKS[number]) => {
    setMsg('');
    const json = await callApi('/api/auth/credits/topup', { amount: pack.credits, description: `积分充值 ${pack.credits}分` });
    if (json.success) {
      useAuthStore.setState({ user: { ...user, credits: json.credits } });
      setMsg(`充值成功！`);
    }
  };

  const isActive = (p: PlanDef) => {
    if (p.isPro) return currentPlanId.startsWith('pro_') || currentPlanId === 'pro';
    return currentPlanId === p.id;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div style={{
        width: '94vw', maxWidth: 1300, maxHeight: '90vh', overflow: 'auto',
        background: 'rgba(14,14,24,0.97)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, padding: '32px 24px',
        display: 'flex', flexDirection: 'column', gap: 24,
        boxShadow: '0 0 100px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{tab === 'topup' ? '充值积分（随用随充）' : '选择你的订阅方案'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              当前积分: <span style={{ color: '#fff', fontWeight: 600 }}>{user.credits}</span>
              {user.plan !== 'free' && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, background: 'rgba(94,234,212,0.12)', color: '#5EEAD4', fontSize: 10 }}>{user.plan}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {tab === 'plan' && (
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginRight: 8 }}>
                <button onClick={() => setBilling('annual')} style={{
                  padding: '5px 14px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: billing === 'annual' ? 'rgba(94,234,212,0.15)' : 'transparent',
                  color: billing === 'annual' ? '#5EEAD4' : 'rgba(255,255,255,0.4)',
                }}>年费</button>
                <button onClick={() => setBilling('monthly')} style={{
                  padding: '5px 14px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: billing === 'monthly' ? 'rgba(94,234,212,0.15)' : 'transparent',
                  color: billing === 'monthly' ? '#5EEAD4' : 'rgba(255,255,255,0.4)',
                }}>连续包月</button>
              </div>
            )}
            <button onClick={() => setTab('plan')} style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === 'plan' ? 'rgba(94,234,212,0.15)' : 'transparent',
              color: tab === 'plan' ? '#5EEAD4' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600,
            }}>订阅套餐</button>
            <button onClick={() => setTab('topup')} style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === 'topup' ? 'rgba(94,234,212,0.15)' : 'transparent',
              color: tab === 'topup' ? '#5EEAD4' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600,
            }}>积分充值</button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        </div>

        {/* ── Plan cards ── */}
        {tab === 'plan' && (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
              {PLANS.map(p => {
                const active = isActive(p);
                const credits = p.isPro ? PRO_CREDIT_OPTS[proTier] : p.credits;
                const price = billing === 'monthly'
                  ? (p.isPro ? PRO_MONTHLY_PRICES[proTier] : p.monthlyPrice)
                  : (p.isPro ? PRO_PRICES[proTier] : p.price);

                return (
                  <div key={p.id} style={{
                    flex: '1 1 0', minWidth: 230, padding: '24px 18px', borderRadius: 16,
                    border: active ? '2px solid rgba(94,234,212,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    background: active ? 'rgba(94,234,212,0.05)' : 'rgba(255,255,255,0.015)',
                    display: 'flex', flexDirection: 'column', gap: 12,
                    position: 'relative',
                  }}>
                    {p.recommended && (
                      <div style={{
                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                        padding: '2px 14px', borderRadius: 10, background: '#5EEAD4',
                        color: '#fff', fontSize: 10, fontWeight: 700,
                      }}>最受欢迎</div>
                    )}

                    <div style={{ minHeight: 52 }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>{p.tagline}</div>
                    </div>

                    <div style={{ minHeight: 56 }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 28 }}>{price}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>/月</span>
                      <div style={{ fontSize: 10, marginTop: 4 }}>
                        {billing === 'monthly' ? (
                          <span style={{ color: 'rgba(255,255,255,0.45)' }}>连续包月 · 随时取消</span>
                        ) : p.isPro ? (() => {
                          const m = parseFloat(price.replace('$',''));
                          const annual = Math.round(m * 10);
                          const monthly = (annual / 12).toFixed(2);
                          return (
                            <>
                              <span style={{ color: 'rgba(255,255,255,0.45)' }}>按年支付 </span>
                              <span style={{ color: '#fff' }}>${monthly}</span>
                              <span style={{ color: 'rgba(255,255,255,0.45)' }}>/月 · 年付总价 </span>
                              <span style={{ color: '#fff' }}>${annual}</span>
                            </>
                          );
                        })() : p.annualPrice ? (
                          <>
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>按年支付 </span>
                            <span style={{ color: '#fff' }}>{p.annualPrice}</span>
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>/月 · 年付总价 </span>
                            <span style={{ color: '#fff' }}>{p.annualTotal}</span>
                          </>
                        ) : null}
                      </div>
                    <div style={{ minHeight: 32, display: 'flex', alignItems: 'center' }}>
                    {p.isPro ? (
                      <input type="range" min={0} max={4} value={proTier}
                        onChange={e => setProTier(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#5EEAD4', cursor: 'pointer', margin: 0 }} />
                    ) : (
                      <div style={{ height: 4 }} />
                    )}
                  </div>

                  </div>

                    {/* 积分 & 充值 */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{
                        flex: 1, padding: '12px 10px', borderRadius: 10, textAlign: 'center',
                        background: 'rgba(255,255,255,0.03)',
                      }}>
                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>每月积分</div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginTop: 2 }}>{credits.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>积分</span></div>
                      </div>
                      <div style={{
                        flex: 1, padding: '12px 10px', borderRadius: 10, textAlign: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      }}>
                        <div style={{ fontSize: 10 }}>
                          <span style={{ color: 'rgba(255,255,255,0.45)' }}>额外充值 </span>
                          <span style={{ color: '#fff' }}>{p.topupRate}</span>
                        </div>
                        {p.topupBonus !== '—' && (
                          <div style={{ fontSize: 10, marginTop: 1 }}>
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>赠</span>
                            <span style={{ color: '#4ade80' }}>{p.topupBonus.replace('赠', '')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 按钮 */}
                    <button
                      onClick={() => handleUpgrade(p.isPro ? PRO_IDS[proTier] : p.id, credits)}
                      disabled={active}
                      style={{
                        padding: '12px 0', borderRadius: 10, border: 'none',
                        cursor: active ? 'default' : 'pointer',
                        background: active ? 'rgba(255,255,255,0.06)' : '#5EEAD4',
                        color: active ? 'rgba(255,255,255,0.3)' : '#fff',
                        fontSize: 14, fontWeight: 600, width: '100%',
                      }}
                    >{active ? '当前方案' : billing === 'monthly' ? '连续包月' : '订阅'}</button>

                    {/* 权益清单 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ color: 'rgba(94,234,212,0.5)', fontSize: 10, flexShrink: 0, marginTop: 1 }}>✦</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.5 }}>约 {Math.round(credits / 2).toLocaleString()} 张图片/月</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ color: 'rgba(94,234,212,0.5)', fontSize: 10, flexShrink: 0, marginTop: 1 }}>✦</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.5 }}>约 {Math.round(credits / 8).toLocaleString()} 段视频/月</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ color: 'rgba(94,234,212,0.5)', fontSize: 10, flexShrink: 0, marginTop: 1 }}>✦</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.5 }}>{p.isPro ? PRO_CONCURRENCY[proTier] : p.concurrency} 个并发任务</span>
                      </div>
                      {p.features.map(f => {
                        if (f === '————') {
                          return (
                            <div key="sep" style={{
                              height: 1, margin: '6px 0',
                              background: 'linear-gradient(to right, transparent, rgba(94,234,212,0.2), rgba(94,234,212,0.2), transparent)',
                            }} />
                          );
                        }
                        return (
                          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <span style={{ color: 'rgba(94,234,212,0.5)', fontSize: 10, flexShrink: 0, marginTop: 1 }}>✦</span>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.5 }}>{f}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
        )}

        {/* ── Topup tab ── */}
        {tab === 'topup' && (() => {
          const discount = getPlanDiscount(user.plan);
          const rate = discount ? discount.rate : 1;
          const customCredits = customDollars * 100;
          const customPrice = (customDollars * rate).toFixed(2);

          return (
            <>
              {discount && (
                <div style={{ fontSize: 12, color: '#4ade80', textAlign: 'center', padding: '6px 16px', borderRadius: 8, background: 'rgba(74,222,128,0.06)', alignSelf: 'center' }}>
                  你的 {discount.label} 订阅专享积分充值折扣
                </div>
              )}

              {/* 自定义充值 */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>
                {/* 左侧：拉杆 + 固定套餐 (2/3) */}
                <div style={{
                  flex: '2', padding: '0 20px',
                  display: 'flex', flexDirection: 'column', gap: 20,
                }}>
                  {/* 拉杆 — 与右侧分割线齐平 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 56 }}>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>选择充值积分数量</div>
                    <input type="range" min={5} max={5000} value={customDollars}
                      onChange={e => setCustomDollars(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#5EEAD4', cursor: 'pointer' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>500 积分</span>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>500,000 积分</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>${customDollars.toLocaleString()}</span>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginLeft: 4 }}>/ {customCredits.toLocaleString()} 积分</span>
                    </div>
                  </div>

                  {/* 固定套餐 — 缩小 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {TOPUP_PACKS.map(p => {
                      const d = getPlanDiscount(user.plan);
                      const finalPrice = d ? (p.price * d.rate).toFixed(2) : p.price.toFixed(2);
                      return (
                        <div key={p.credits} onClick={() => handleTopup(p)} style={{
                          padding: '8px 8px', borderRadius: 8, cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.06)',
                          background: 'rgba(255,255,255,0.02)', textAlign: 'center',
                          transition: 'all 0.15s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(94,234,212,0.3)'; e.currentTarget.style.background = 'rgba(94,234,212,0.05)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                        >
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{p.credits.toLocaleString()}</div>
                          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 1 }}>积分</div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: 12, marginTop: 4 }}>${finalPrice}</div>
                          {d && <div style={{ color: '#4ade80', fontSize: 8, marginTop: 1 }}>{d.label}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 竖分割线 */}
                <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

                {/* 右侧：确认面板 (1/3) */}
                <div style={{
                  flex: '1', padding: '0 20px',
                  display: 'flex', flexDirection: 'column', gap: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>获得积分</span>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>{customCredits.toLocaleString()} <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400, fontSize: 12 }}>积分</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>当前汇率</span>
                    <span style={{ color: '#fff', fontSize: 12 }}>$1=100积分</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>需支付金额</span>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>${customPrice}</span>
                  </div>
                  <button
                    onClick={() => {
                      callApi('/api/auth/credits/topup', { amount: customCredits, description: `自定义充值 ${customCredits}分` }).then(json => {
                        if (json.success) {
                          useAuthStore.setState({ user: { ...user, credits: json.credits } });
                          setMsg('充值成功！');
                        }
                      });
                    }}
                    style={{
                      padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: '#F97316', color: '#fff', fontSize: 15, fontWeight: 600, width: '100%',
                      marginTop: 'auto',
                    }}
                  >立即充值</button>
                </div>
              </div>
            </>
          );
        })()}

        {msg && (
          <div style={{ fontSize: 13, color: '#4ade80', textAlign: 'center', padding: 4 }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
