/* === CreditPanel — 订阅 + 积分充值 === */
import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { UserProfile } from '../../../shared/api-types.js';

interface CreditPanelProps {
  onClose: () => void;
}

// Pro 五档积分选择
const PRO_CREDIT_OPTS = [2800, 4800, 7600, 9200, 16000];
const PRO_PRICES = ['$21.00', '$36.00', '$57.00', '$69.60', '$119.40'];
const PRO_IDS: UserProfile['plan'][] = ['pro_base', 'pro_mid', 'pro_high', 'pro_pro', 'pro_max'];

// 四个大档
interface PlanDef {
  id: UserProfile['plan'];
  name: string;
  tagline: string;
  price: string;
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

const PLANS: PlanDef[] = [
  {
    id: 'creator', name: 'Creator', tagline: '适合初次探索 AI 创作',
    price: '$10.20', annualPrice: '$8.50', annualTotal: '$102',
    credits: 1200, topupRate: '$1=100积分', topupBonus: '—',
    concurrency: '3', features: [
      '解锁画布执行导演 Agent',
      '解锁 Nano Banana 等图像模型',
      '解锁 Kling 等视频模型',
      '3 个并发任务',
      '一键视频分镜解析',
      '一键视频故事板策划',
      '「/」影视快捷键',
    ],
  },
  {
    id: 'pro', name: 'Pro', tagline: '最受欢迎 · 适合高频创作与持续产出',
    price: PRO_PRICES[2], annualPrice: '', annualTotal: '',
    credits: PRO_CREDIT_OPTS[2], topupRate: '$1=105积分', topupBonus: '赠5%',
    concurrency: '30', recommended: true, isPro: true,
    features: [
      '解锁画布执行导演 Agent',
      '解锁 Banana Pro 等全部图像模型',
      '解锁 Kling O3 等全部视频模型',
      '无限并发任务',
      '商业授权可用',
      '账单&形式发票下载',
      '全部工作流可一键套用',
      '一键抠图/扩图',
      '4K视频/1080p图片高清增强',
      '人像修复与美化',
      '一键视频分镜解析',
      '一键视频故事板策划',
      '一键电商组图生成',
      '多角度控制器',
      '专业摄像机库',
      '「/」影视快捷键',
    ],
  },
  {
    id: 'elite', name: 'Elite', tagline: '适合大批量稳定产出与交付',
    price: '$172.80', annualPrice: '$144.00', annualTotal: '$1,728',
    credits: 28800, topupRate: '$1=110积分', topupBonus: '赠10%',
    concurrency: '50', features: [
      '解锁画布执行导演 Agent',
      '解锁 Banana Pro 等全部图像模型',
      '解锁 Kling O3 等全部视频模型',
      '无限并发任务',
      '商业授权可用',
      '账单&形式发票下载',
      '全部工作流可一键套用',
      '一键抠图/扩图',
      '4K视频/1080p图片高清增强',
      '人像修复与美化',
      '一键视频分镜解析',
      '一键视频故事板策划',
      '一键电商组图生成',
      '多角度控制器',
      '专业摄像机库',
      '「/」影视快捷键',
      '优先队列生成',
      '团队协作与席位管理',
      '团队共享积分',
      '团队项目/资产共享',
      '成员用量管控（周/月）',
    ],
  },
  {
    id: 'ultra', name: 'Ultra', tagline: '最佳性价比 · 为极限产出而生',
    price: '$345.60', annualPrice: '$288.00', annualTotal: '$3,456',
    credits: 57600, topupRate: '$1=120积分', topupBonus: '赠20%',
    concurrency: '不限', features: [
      '解锁画布执行导演 Agent',
      '解锁 Banana Pro 等全部图像模型',
      '解锁 Kling O3 等全部视频模型',
      '无限并发任务',
      '商业授权可用',
      '账单&形式发票下载',
      '全部工作流可一键套用',
      '一键抠图/扩图',
      '4K视频/1080p图片高清增强',
      '人像修复与美化',
      '一键视频分镜解析',
      '一键视频故事板策划',
      '一键电商组图生成',
      '多角度控制器',
      '专业摄像机库',
      '「/」影视快捷键',
      '优先队列生成',
      '团队协作与席位管理',
      '团队共享积分',
      '团队项目/资产共享',
      '成员用量管控（日/周/月）',
      '产品教程与社区支持',
      '图片/视频批量导出',
    ],
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
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>选择你的订阅方案</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              当前积分: <span style={{ color: '#5EEAD4', fontWeight: 600 }}>{user.credits}</span>
              {user.plan !== 'free' && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, background: 'rgba(94,234,212,0.12)', color: '#5EEAD4', fontSize: 10 }}>{user.plan}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
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
          <>
            {/* Pro滑块 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Pro 积分档位:</span>
              <input type="range" min={0} max={4} value={proTier}
                onChange={e => setProTier(Number(e.target.value))}
                style={{ width: 200, accentColor: '#5EEAD4', cursor: 'pointer' }} />
              <span style={{ color: '#5EEAD4', fontWeight: 700, fontSize: 16 }}>
                {PRO_CREDIT_OPTS[proTier].toLocaleString()} 积分/月
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
              {PLANS.map(p => {
                const active = isActive(p);
                const credits = p.isPro ? PRO_CREDIT_OPTS[proTier] : p.credits;
                const price = p.isPro ? PRO_PRICES[proTier] : p.price;

                return (
                  <div key={p.id} style={{
                    flex: '1 1 0', minWidth: 230, padding: '24px 18px', borderRadius: 16,
                    border: active ? '2px solid rgba(94,234,212,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    background: active ? 'rgba(94,234,212,0.05)' : 'rgba(255,255,255,0.015)',
                    display: 'flex', flexDirection: 'column', gap: 16,
                    position: 'relative',
                  }}>
                    {p.recommended && (
                      <div style={{
                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                        padding: '2px 14px', borderRadius: 10, background: '#5EEAD4',
                        color: '#fff', fontSize: 10, fontWeight: 700,
                      }}>最受欢迎</div>
                    )}

                    {/* 名称 + 描述 */}
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>{p.tagline}</div>
                    </div>

                    {/* 价格 */}
                    <div>
                      <span style={{ color: '#5EEAD4', fontWeight: 700, fontSize: 28 }}>{price}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>/月</span>
                      {p.annualPrice && (
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>
                          按年支付 {p.annualPrice}/月 · 年付总价 {p.annualTotal}
                        </div>
                      )}
                    </div>

                    {/* 积分 */}
                    <div style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>每月积分</div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{credits.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>积分</span></div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>
                        额外充值 {p.topupRate} {p.topupBonus !== '—' && <span style={{ color: '#4ade80' }}>· {p.topupBonus}</span>}
                      </div>
                    </div>

                    {/* 预估产出 */}
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: 10 }}>
                      <Est label="图像" val={Math.round(credits / 2)} />
                      <Est label="视频" val={Math.round(credits / 8)} />
                    </div>

                    {/* 并发 */}
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center' }}>
                      {p.concurrency} 个并发任务
                    </div>

                    {/* 按钮 */}
                    <button
                      onClick={() => handleUpgrade(p.isPro ? PRO_IDS[proTier] : p.id, credits)}
                      disabled={active}
                      style={{
                        marginTop: 'auto', padding: '12px 0', borderRadius: 10, border: 'none',
                        cursor: active ? 'default' : 'pointer',
                        background: active ? 'rgba(255,255,255,0.06)' : '#5EEAD4',
                        color: active ? 'rgba(255,255,255,0.3)' : '#fff',
                        fontSize: 14, fontWeight: 600, width: '100%',
                      }}
                    >{active ? '当前方案' : '订阅'}</button>

                    {/* 权益清单 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                      {p.features.map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: 'rgba(94,234,212,0.5)', fontSize: 10, flexShrink: 0, marginTop: 1 }}>✦</span>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.5 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Topup tab ── */}
        {tab === 'topup' && (
          <>
            {getPlanDiscount(user.plan) && (
              <div style={{ fontSize: 12, color: '#4ade80', textAlign: 'center', padding: '6px 16px', borderRadius: 8, background: 'rgba(74,222,128,0.06)', alignSelf: 'center' }}>
                你的 {getPlanDiscount(user.plan)!.label} 订阅专享积分充值折扣
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {TOPUP_PACKS.map(p => {
                const d = getPlanDiscount(user.plan);
                const finalPrice = d ? (p.price * d.rate).toFixed(2) : p.price.toFixed(2);
                return (
                  <div key={p.credits} onClick={() => handleTopup(p)} style={{
                    padding: '28px 20px', borderRadius: 14, cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)', textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(94,234,212,0.3)'; e.currentTarget.style.background = 'rgba(94,234,212,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  >
                    <div style={{ color: '#5EEAD4', fontWeight: 700, fontSize: 24 }}>{p.credits.toLocaleString()}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>积分</div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 18, marginTop: 10 }}>${finalPrice}</div>
                    {d && <div style={{ color: '#4ade80', fontSize: 10, marginTop: 4 }}>{d.label}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {msg && (
          <div style={{ fontSize: 13, color: '#4ade80', textAlign: 'center', padding: 4 }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

function Est({ label, val }: { label: string; val: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#fff', fontWeight: 600 }}>{val.toLocaleString()}</div>
      <div style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
    </div>
  );
}
