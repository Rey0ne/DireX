/* === ProjectSelector — 3D Ring ↔ Horizontal Spread === */
import { useState, useEffect, useCallback, useRef } from 'react';
import { db, type DBProject } from '../store/db';

interface ProjectCard {
  project: DBProject;
  nodeCount: number;
  thumbnail?: string;
}

interface ProjectSelectorProps {
  onSelectProject: (projectId: string) => void;
  onCreateNew: () => void;
  onLogout: () => void;
}

const CARD_W = 260;
const CARD_H = 180;
const SPREAD_GAP = 32;

export function ProjectSelector({ onSelectProject, onCreateNew, onLogout }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [ringAngle, setRingAngle] = useState(0);
  const [spread, setSpread] = useState(false);
  const [spreadOffset, setSpreadOffset] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const ringAngleRef = useRef(0);
  const spreadOffsetRef = useRef(0);
  const dragRef = useRef({ startX: 0, startAngle: 0, startOffset: 0, active: false, moved: false });
  const momentumRef = useRef({ v: 0, lx: 0, lt: 0 });
  const springRef = useRef(0);

  useEffect(() => { loadProjects().then(setProjects).finally(() => setLoading(false)); }, []);

  const N = Math.max(1, projects.length);
  const cardAngle = 360 / N;
  const radius = Math.max(320, (CARD_W + 40) * N / (2 * Math.PI));
  // Which card faces the viewer in ring mode — becomes center in spread mode
  const activeIdx = N > 0 ? (((Math.round(((ringAngle % 360) + 360) % 360 / cardAngle) % N) + N) % N) : 0;

  ringAngleRef.current = ringAngle;
  spreadOffsetRef.current = spreadOffset;

  // Ring spring
  const springTo = useCallback((from: number, iv: number, target: number) => {
    if (springRef.current) cancelAnimationFrame(springRef.current);
    let p = from, v = iv * 16;
    const step = () => {
      v += (target - p) * 0.018; v *= 0.74; p += v;
      setRingAngle(p);
      if (Math.abs(v) < 0.1 && Math.abs(target - p) < 0.3) { setRingAngle(target); springRef.current = 0; return; }
      springRef.current = requestAnimationFrame(step);
    };
    springRef.current = requestAnimationFrame(step);
  }, []);

  // Spread pan spring (separate from ring spring)
  const spreadSpringRef = useRef(0);
  const springSpreadTo = useCallback((from: number, iv: number, target: number) => {
    if (spreadSpringRef.current) cancelAnimationFrame(spreadSpringRef.current);
    let p = from, v = iv * 16;
    const step = () => {
      v += (target - p) * 0.022; v *= 0.72; p += v;
      setSpreadOffset(p);
      if (Math.abs(v) < 0.15 && Math.abs(target - p) < 0.5) { setSpreadOffset(target); spreadSpringRef.current = 0; return; }
      spreadSpringRef.current = requestAnimationFrame(step);
    };
    spreadSpringRef.current = requestAnimationFrame(step);
  }, []);

  // Drag — dual-mode: ring rotation vs spread pan
  const onDown = useCallback((e: React.PointerEvent) => {
    if (editingId) return;
    if (springRef.current) { cancelAnimationFrame(springRef.current); springRef.current = 0; }
    if (spreadSpringRef.current) { cancelAnimationFrame(spreadSpringRef.current); spreadSpringRef.current = 0; }
    dragRef.current = {
      startX: e.clientX,
      startAngle: ringAngleRef.current,
      startOffset: spreadOffsetRef.current,
      active: true,
      moved: false,
    };
    momentumRef.current = { v: 0, lx: e.clientX, lt: Date.now() };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [editingId]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    const now = Date.now(), dt = now - momentumRef.current.lt;
    if (dt > 0) momentumRef.current.v = (e.clientX - momentumRef.current.lx) / dt;
    momentumRef.current.lx = e.clientX; momentumRef.current.lt = now;

    if (spread) {
      // Spread mode: horizontal pan
      const newOffset = dragRef.current.startOffset + dx;
      spreadOffsetRef.current = newOffset;
      setSpreadOffset(newOffset);
    } else {
      // Ring mode: rotate ring
      const newAngle = dragRef.current.startAngle - dx * 0.22;
      ringAngleRef.current = newAngle;
      setRingAngle(newAngle);
    }
  }, [spread]);

  const onUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const step = CARD_W + SPREAD_GAP;
    if (spread) {
      // Spread: snap to nearest card center
      const target = Math.round(spreadOffsetRef.current / step) * step;
      springSpreadTo(spreadOffsetRef.current, momentumRef.current.v * 0.6, target);
    } else {
      // Ring: snap to nearest card angle
      const target = Math.round(ringAngleRef.current / cardAngle) * cardAngle;
      springTo(ringAngleRef.current, momentumRef.current.v * 0.6, target);
    }
  }, [spread, cardAngle, springTo, springSpreadTo]);

  // Toggle ring ↔ spread (click on container background, not cards)
  const onBgClick = useCallback(() => {
    if (dragRef.current.moved) return;
    setSpread(s => {
      if (!s) setSpreadOffset(0); // entering spread: reset offset
      return !s;
    });
  }, []);

  const onClickCard = useCallback((e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (dragRef.current.moved) return;
    if (editingId) return;
    if (!spread) {
      // Ring mode: click any card → spread first, reset pan offset
      setSpreadOffset(0);
      setSpread(true);
    } else {
      // Spread mode: click card → enter canvas
      onSelectProject(projectId);
    }
  }, [spread, editingId, onSelectProject]);

  const onDelete = useCallback(async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm('确定删除？')) return;
    try {
      const canvases = await db.canvases.where({ projectId }).toArray();
      for (const c of canvases) { await db.nodes.where({ canvasId: c.id }).delete(); await db.edges.where({ canvasId: c.id }).delete(); }
      await db.canvases.where({ projectId }).delete(); await db.assets.where({ projectId }).delete();
      await db.jobs.where({ projectId }).delete(); await db.projects.delete(projectId);
      setProjects(p => p.filter(c => c.project.id !== projectId));
    } catch (err) { console.error(err); }
  }, []);

  const onDblClick = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); setEditingId(id); setEditName(name);
    setTimeout(() => inputRef.current?.select(), 50);
  }, []);

  const onSubmitRename = useCallback(async () => {
    if (!editingId) return;
    const t = editName.trim();
    if (t && t !== projects.find(p => p.project.id === editingId)?.project.name) {
      await db.projects.update(editingId, { name: t, updatedAt: new Date().toISOString() });
      setProjects(p => p.map(c => c.project.id === editingId ? { ...c, project: { ...c.project, name: t, updatedAt: new Date().toISOString() } } : c));
    }
    setEditingId(null);
  }, [editingId, editName, projects]);

  // ── Card content (used in both modes) ──
  const renderCard = (card: ProjectCard, i: number) => {
    const angle = i * cardAngle;
    const imgUrl = card.thumbnail;
    const facingAngle = ((ringAngle + angle) % 360 + 360) % 360;
    const frontness = Math.cos(facingAngle * Math.PI / 180);
    const arcDip = Math.abs(Math.sin(facingAngle * Math.PI / 180)) * 30;

    // Spread mode: horizontal row, centered on active card + pan offset
    const spreadX = (i - activeIdx) * (CARD_W + SPREAD_GAP) + spreadOffset;

    const transform = spread
      ? `translateX(${spreadX.toFixed(1)}px)`   // flat horizontal
      : `rotateY(${angle}deg) translateZ(${radius}px) translateY(${arcDip.toFixed(1)}px)`; // 3D ring

    const opacity = spread ? 1 : Math.max(0.12, (frontness + 1) / 2);
    const shadow = !spread && frontness > 0.2
      ? `0 ${8 + frontness * 12}px ${24 + frontness * 24}px rgba(0,0,0,${0.10 + frontness * 0.14})`
      : (spread ? '0 2px 12px rgba(0,0,0,0.08)' : 'none');

    return (
      <div
        key={card.project.id}
        onClick={e => onClickCard(e, card.project.id)}
        style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: CARD_W, height: CARD_H,
          marginLeft: -CARD_W / 2,
          marginTop: -CARD_H / 2,
          borderRadius: 10,
          overflow: 'hidden',
          cursor: 'pointer',
          transform,
          opacity,
          boxShadow: shadow,
          transition: spread
            ? 'transform 0.7s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.5s ease, box-shadow 0.5s ease'
            : 'transform 0.7s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.5s ease, box-shadow 0.5s ease',
        }}
      >
        {/* Image / fallback */}
        <div style={{
          position: 'absolute', inset: 0,
          background: imgUrl ? `url(${imgUrl}) center/cover no-repeat` : '#faf7f2',
        }} />

        {/* Bottom gradient for text */}
        {imgUrl && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%',
            background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))',
            pointerEvents: 'none',
          }} />
        )}

        {/* Text */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 18px', zIndex: 2 }}>
          {editingId === card.project.id ? (
            <input ref={inputRef} value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={onSubmitRename}
              onKeyDown={e => { if (e.key === 'Enter') onSubmitRename(); if (e.key === 'Escape') setEditingId(null); }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontSize: 14, color: '#3d3226',
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid #c9a9a6',
                borderRadius: 6, padding: '4px 8px', outline: 'none',
                fontFamily: 'inherit',
              }} />
          ) : (
            <span onDoubleClick={e => onDblClick(e, card.project.id, card.project.name)}
              style={{
                fontSize: 14, fontWeight: 500,
                color: imgUrl ? '#fff' : '#4a3f32',
                cursor: 'text',
                textShadow: imgUrl ? '0 1px 4px rgba(0,0,0,0.6)' : 'none',
                fontFamily: '"Georgia","Noto Serif SC",serif',
                letterSpacing: '0.04em',
              }} title="双击改名">
              {card.project.name}
            </span>
          )}
          <p style={{
            margin: '3px 0 0', fontSize: 10,
            color: imgUrl ? 'rgba(255,255,255,0.6)' : '#b0a595',
            letterSpacing: '0.03em',
          }}>
            {card.nodeCount} 节点 · {formatDate(card.project.updatedAt)}
          </p>
        </div>

        {/* Delete */}
        <button onClick={e => onDelete(e, card.project.id)}
          style={{
            position: 'absolute', top: 8, right: 10, zIndex: 10,
            width: 26, height: 26, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.25)', border: 'none',
            color: imgUrl ? 'rgba(255,255,255,0.55)' : '#c8c0b5',
            cursor: 'pointer', fontSize: 12, transition: 'all 0.2s',
          }}
          onMouseEnter={t => { t.currentTarget.style.background = 'rgba(220,50,50,0.7)'; t.currentTarget.style.color = '#fff'; }}
          onMouseLeave={t => { t.currentTarget.style.background = 'rgba(0,0,0,0.25)'; t.currentTarget.style.color = imgUrl ? 'rgba(255,255,255,0.55)' : '#c8c0b5'; }}
        >✕</button>
      </div>
    );
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#f9f7f3',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
      userSelect: 'none',
      position: 'relative',
    }}>
      {/* Title */}
      <div style={{ position: 'absolute', top: 36, left: 0, right: 0, textAlign: 'center', zIndex: 1 }}>
        <h1 style={{ fontSize: 32, fontWeight: 300, color: '#3d3226', margin: 0, letterSpacing: '0.08em', fontFamily: '"Georgia","Noto Serif SC",serif' }}>DireX Canvas</h1>
        <p style={{ fontSize: 12, color: '#b0a595', marginTop: 4, letterSpacing: '0.08em' }}>MAKE EVERYTHING POETIC</p>
      </div>

      {/* Logout */}
      <button onClick={onLogout} title="退出登录"
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 10,
          padding: '6px 16px', borderRadius: 16,
          background: 'transparent', border: '1px solid rgba(139,125,107,0.25)',
          color: '#b0a595', fontSize: 11, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.04em',
          transition: 'all 0.2s',
        }}
        onMouseEnter={t => { t.currentTarget.style.borderColor = 'rgba(180,80,80,0.4)'; t.currentTarget.style.color = '#b46060'; }}
        onMouseLeave={t => { t.currentTarget.style.borderColor = 'rgba(139,125,107,0.25)'; t.currentTarget.style.color = '#b0a595'; }}
      >退出</button>

      {loading ? (
        <p style={{ color: '#b0a595', fontSize: 13 }}>加载中…</p>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#b0a595', fontSize: 14, margin: 0 }}>还没有项目</p>
          <p style={{ color: '#c8c0b5', fontSize: 12, marginTop: 6 }}>点击下方按钮创建</p>
        </div>
      ) : (
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onClick={onBgClick}
          style={{
            width: '100%', height: `${CARD_H + 120}px`,
            perspective: spread ? 'none' : '900px',
            perspectiveOrigin: '50% 50%',
            cursor: 'grab',
            touchAction: 'none',
            overflow: spread ? 'hidden' : 'visible',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* ── Ring / Spread wrapper ── */}
          <div style={{
            width: spread ? '100%' : 0,
            height: spread ? `${CARD_H}px` : 0,
            margin: 0,
            position: 'relative',
            transformStyle: spread ? 'flat' : 'preserve-3d',
            transform: spread ? 'none' : `rotateY(${ringAngle.toFixed(2)}deg) rotateX(22deg)`,
            transition: 'transform 0.7s cubic-bezier(0.34, 1.3, 0.64, 1)',
          }}>
            {projects.map((card, i) => renderCard(card, i))}
          </div>

          {/* ── Fade edges (spread mode only) ── */}
          {spread && (
            <>
              <div style={{
                position: 'absolute', top: 0, bottom: 0, left: 0, width: 140,
                background: 'linear-gradient(to right, #f9f7f3 0%, transparent 100%)',
                pointerEvents: 'none', zIndex: 5,
                transition: 'opacity 0.5s ease',
              }} />
              <div style={{
                position: 'absolute', top: 0, bottom: 0, right: 0, width: 140,
                background: 'linear-gradient(to left, #f9f7f3 0%, transparent 100%)',
                pointerEvents: 'none', zIndex: 5,
                transition: 'opacity 0.5s ease',
              }} />
            </>
          )}
        </div>
      )}

      {/* Page dots + New canvas */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 1 }}>
        {projects.length > 1 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {projects.map((p, i) => {
              const active = Math.abs(((ringAngle % 360 + 360) % 360 - i * cardAngle) % 360) < cardAngle / 2;
              return (
                <div key={p.project.id} style={{
                  width: active ? 18 : 6, height: 6, borderRadius: 3,
                  background: active ? '#8b7d6b' : '#d5cec2',
                  transition: 'all 0.3s ease',
                }} />
              );
            })}
          </div>
        )}
        <button onClick={onCreateNew} style={{
          padding: '10px 36px', borderRadius: 24,
          background: 'transparent', color: '#8b7d6b',
          fontSize: 13, letterSpacing: '0.06em', cursor: 'pointer',
          border: '1px solid rgba(139,125,107,0.3)',
          transition: 'all 0.3s',
          fontFamily: 'inherit',
        }}
          onMouseEnter={t => { t.currentTarget.style.borderColor = 'rgba(139,125,107,0.5)'; t.currentTarget.style.background = 'rgba(139,125,107,0.06)'; }}
          onMouseLeave={t => { t.currentTarget.style.borderColor = 'rgba(139,125,107,0.3)'; t.currentTarget.style.background = 'transparent'; }}
        >+ 新建画布</button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────
async function loadProjects(): Promise<ProjectCard[]> {
  // 1. Try IndexedDB first
  try {
    const allProjects = await db.projects.orderBy('updatedAt').reverse().toArray();
    if (allProjects.length > 0) {
      const cards: ProjectCard[] = [];
      for (const project of allProjects) {
        const canvases = await db.canvases.where({ projectId: project.id }).toArray();
        let nodeCount = 0;
        let thumbnail: string | undefined;
        for (const c of canvases) {
          const nodes = await db.nodes.where({ canvasId: c.id }).toArray();
          nodeCount += nodes.length;
          if (!thumbnail) {
            for (const n of nodes) {
              try {
                const imgUrl = (n.meta as any)?.gen?.imageUrl;
                if (typeof imgUrl === 'string' && imgUrl.length > 0) { thumbnail = imgUrl; break; }
              } catch { /* skip */ }
            }
          }
        }
        if (!thumbnail) {
          try {
            const assets = await db.assets.where({ projectId: project.id }).toArray();
            const a = assets.find(x => x.type === 'image' && typeof x.uri === 'string' && x.uri.length > 0);
            if (a) thumbnail = a.uri;
          } catch { /* skip */ }
        }
        cards.push({ project, nodeCount, thumbnail });
      }
      return cards;
    }
  } catch { /* fall through to server */ }

  // 2. Fallback: fetch from server API (IndexedDB was cleared or corrupted)
  try {
    const resp = await fetch('/api/canvas/projects');
    const json = await resp.json();
    const serverProjects: any[] = json.projects || [];
    if (serverProjects.length === 0) return [];
    const cards: ProjectCard[] = [];
    for (const p of serverProjects) {
      cards.push({
        project: {
          id: p.id,
          name: p.name || p.id,
          description: '',
          updatedAt: p.updatedAt || new Date().toISOString(),
        },
        nodeCount: p.nodeCount || 0,
        thumbnail: undefined,
      });
    }
    // Report: loaded from server (IndexedDB was empty)
    import('../utils/diagnostics').then(m => m.diag.projectsLoaded('server', cards.length));
    return cards;
  } catch (e) {
    import('../utils/diagnostics').then(m => m.diag.loadFailed('project_list_server', String(e).slice(0, 100)));
    return [];
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso); const now = new Date();
  const hours = Math.floor((now.getTime() - d.getTime()) / 3600000);
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
