/* === EBtn — Editor button === */
export function EBtn({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{
    padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer',
    border: active ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
    whiteSpace: 'nowrap', transition: 'all 0.12s ease',
  }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
    onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(255,255,255,0.12)' : 'transparent'; e.currentTarget.style.color = active ? '#fff' : 'rgba(255,255,255,0.5)'; }}>
    {label}
  </button>;
}
