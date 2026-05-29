/* === ProjectSelector — home screen with project thumbnails === */
/* Shows saved projects, create-new button, recent thumbnails */

import { useState, useEffect } from 'react';
import { db, type DBProject } from '../store/db';

interface ProjectCard {
  project: DBProject;
  nodeCount: number;
  thumbnail?: string;
}

interface ProjectSelectorProps {
  onSelectProject: (projectId: string) => void;
  onCreateNew: () => void;
}

export function ProjectSelector({ onSelectProject, onCreateNew }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects().then(setProjects).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#0a0b0d',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--tap-font)',
      userSelect: 'none',
    }}>
      {/* Background dots */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(100,160,255,0.08) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '40px',
        maxWidth: '900px', width: '100%',
        padding: '40px',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '28px', fontWeight: 700, color: 'var(--tap-text-1)',
            margin: 0, letterSpacing: '-0.02em',
          }}>
            TapNow Canvas
          </h1>
          <p style={{
            fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-3)',
            marginTop: '8px',
          }}>
            AI + Agent + 无尽画布
          </p>
        </div>

        {/* New canvas button */}
        <button
          onClick={onCreateNew}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 32px',
            borderRadius: 'var(--tap-r-xl)',
            background: 'var(--tap-accent)',
            color: '#fff',
            fontSize: '16px', fontWeight: 600,
            cursor: 'pointer', border: 'none',
            transition: `all var(--tap-dur-fast) var(--tap-ease)`,
            boxShadow: '0 4px 20px rgba(74,158,255,0.3)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(74,158,255,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(74,158,255,0.3)'; }}
        >
          <span style={{ fontSize: '20px' }}>+</span>
          <span>新建画布</span>
        </button>

        {/* Divider */}
        {projects.length > 0 && (
          <div style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-4)', whiteSpace: 'nowrap' }}>
              最近项目
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          </div>
        )}

        {/* Project cards */}
        {loading ? (
          <div style={{ color: 'var(--tap-text-3)', fontSize: 'var(--tap-fs-body)' }}>
            加载中…
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--tap-text-4)', fontSize: 'var(--tap-fs-body)' }}>
            <p>还没有项目</p>
            <p style={{ fontSize: 'var(--tap-fs-meta)', marginTop: '4px' }}>
              点击「新建画布」开始创作
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '14px', width: '100%',
          }}>
            {projects.map(card => (
              <button
                key={card.project.id}
                onClick={() => onSelectProject(card.project.id)}
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: '20px',
                  borderRadius: 'var(--tap-r-xl)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                  gap: '12px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Thumbnail placeholder */}
                <div style={{
                  width: '100%', height: '120px',
                  borderRadius: 'var(--tap-r-lg)',
                  background: card.thumbnail
                    ? `url(${card.thumbnail}) center/cover`
                    : 'linear-gradient(135deg, rgba(100,160,255,0.08) 0%, rgba(160,100,255,0.04) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px', opacity: 0.4,
                }}>
                  {!card.thumbnail && '🎬'}
                </div>

                <div>
                  <div style={{
                    fontSize: 'var(--tap-fs-body)', fontWeight: 600,
                    color: 'var(--tap-text-1)', marginBottom: '4px',
                  }}>
                    {card.project.name}
                  </div>
                  <div style={{
                    display: 'flex', gap: '12px',
                    fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)',
                  }}>
                    <span>{card.nodeCount} 个节点</span>
                    <span>{formatDate(card.project.updatedAt)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────
async function loadProjects(): Promise<ProjectCard[]> {
  try {
    const allProjects = await db.projects.orderBy('updatedAt').reverse().toArray();
    const cards: ProjectCard[] = [];

    for (const project of allProjects) {
      const canvases = await db.canvases.where({ projectId: project.id }).toArray();
      const canvasIds = canvases.map(c => c.id);
      let nodeCount = 0;
      for (const cid of canvasIds) {
        nodeCount += await db.nodes.where({ canvasId: cid }).count();
      }
      cards.push({ project, nodeCount });
    }

    return cards;
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
