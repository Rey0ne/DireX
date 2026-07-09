/* === QAssistant — Floating 3D Glass Ball (Water-Caustic Light) === */
import { useState, useCallback, useRef, useEffect } from 'react';

interface QAssistantProps {
  onToggleChat: () => void;
  onPositionChange?: (pos: { x: number; y: number }) => void;
}

export function QAssistant({ onToggleChat, onPositionChange }: QAssistantProps) {
  const [pos, setPos] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 200 });
  const posRef = useRef(pos);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0, active: false, moved: false });

  posRef.current = pos;

  // Report position to parent so chat panel can follow
  useEffect(() => {
    onPositionChange?.(pos);
  }, [pos, onPositionChange]);

  const onDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startPosX: posRef.current.x, startPosY: posRef.current.y,
      active: true, moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    setPos({ x: dragRef.current.startPosX + dx, y: dragRef.current.startPosY + dy });
  }, []);

  const onUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (!dragRef.current.moved) onToggleChat();
  }, [onToggleChat]);

  const SIZE = 72;

  return (
    <>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        style={{
          position: 'fixed',
          left: pos.x, top: pos.y,
          width: SIZE, height: SIZE,
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* ── Ground shadow ── */}
        <div style={{
          position: 'absolute',
          bottom: -8, left: '15%', right: '15%',
          height: 10, borderRadius: '50%',
          background: 'rgba(0,0,0,0.30)',
          filter: 'blur(6px)',
          animation: 'q-shadow 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* ═══════════════════════════════════════════
            3D GLASS SPHERE
            ═══════════════════════════════════════════ */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          /*
            Volumetric shading: subtle blue-gray base.
            Center is lighter (thin glass), edges are slightly darker (fresnel).
          */
          background: `
            radial-gradient(circle at 44% 38%,
              rgba(215,228,242,0.28) 0%,
              rgba(195,212,230,0.32) 28%,
              rgba(168,190,212,0.38) 55%,
              rgba(142,168,195,0.45) 75%,
              rgba(118,148,178,0.52) 90%,
              rgba(95,130,165,0.58) 100%
            )
          `,
          border: '1.5px solid rgba(255,255,255,0.30)',
          boxShadow: `
            inset 0 0 50px rgba(255,255,255,0.08),
            inset 0 0 8px rgba(0,0,0,0.15),
            0 8px 30px rgba(0,0,0,0.30)
          `,
          overflow: 'hidden',
        }}>
          {/* ── Rim light — cyan reflection on right side ── */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `
              radial-gradient(ellipse at 80% 58%,
                rgba(0,207,255,0.22) 0%,
                rgba(16,255,209,0.08) 30%,
                transparent 55%
              )
            `,
            pointerEvents: 'none',
          }} />

          {/* ── Bounce light — green from below ── */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `
              radial-gradient(ellipse at 50% 92%,
                rgba(16,255,209,0.15) 0%,
                transparent 40%
              )
            `,
            pointerEvents: 'none',
          }} />

          {/* ── Fresnel dark edge ring ── */}
          <div style={{
            position: 'absolute', inset: 1, borderRadius: '50%',
            boxShadow: 'inset 0 0 18px rgba(0,0,0,0.20)',
            pointerEvents: 'none',
          }} />

          {/* ═══════════════════════
              Q — behind highlights
              ═══════════════════════ */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
          }}>
            <span style={{
              fontSize: 34,
              fontWeight: 800,
              fontFamily: '"Georgia","Noto Serif SC","Palatino",serif',
              color: '#111',
              textShadow: `
                0 0 14px rgba(0,207,255,0.25),
                0 2px 4px rgba(0,0,0,0.45)
              `,
              letterSpacing: '-0.03em',
              opacity: 0.88,
            }}>Q</span>
          </div>

          {/* ═════════════════════════════════════════
             WATER CAUSTICS — above Q (z-index: 2)
             Organic drifting motion, no rotation.
             Like light patterns on a pool floor.
             ═════════════════════════════════════════ */}

          {/* Caustic patch ① — bright white, slow figure-8 drift */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            zIndex: 2, pointerEvents: 'none',
            animation: 'q-caustic-1 6s ease-in-out infinite',
          }}>
            <div style={{
              position: 'absolute',
              top: '20%', left: '25%',
              width: '42%', height: '28%',
              background: `
                radial-gradient(ellipse at 45% 35%,
                  rgba(255,255,255,0.95) 0%,
                  rgba(255,255,255,0.50) 25%,
                  rgba(255,255,255,0.06) 60%,
                  transparent 100%
                )
              `,
              borderRadius: '50%',
              filter: 'blur(1.5px)',
            }} />
          </div>

          {/* Caustic patch ② — cyan tint, different drift timing */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            zIndex: 2, pointerEvents: 'none',
            animation: 'q-caustic-2 7s ease-in-out infinite',
          }}>
            <div style={{
              position: 'absolute',
              top: '45%', left: '50%',
              width: '32%', height: '20%',
              background: `
                radial-gradient(ellipse at center,
                  rgba(0,207,255,0.55) 0%,
                  rgba(0,207,255,0.20) 30%,
                  rgba(16,255,209,0.06) 55%,
                  transparent 100%
                )
              `,
              borderRadius: '50%',
              filter: 'blur(2px)',
            }} />
          </div>

          {/* Caustic band ③ — elongated bright stripe, crosses the sphere */}
          <div style={{
            position: 'absolute', inset: -8, borderRadius: '50%',
            zIndex: 2, pointerEvents: 'none',
            background: `
              radial-gradient(ellipse 100% 26% at 50% 50%,
                rgba(255,255,255,0.60) 0%,
                rgba(0,207,255,0.22) 30%,
                rgba(16,255,209,0.06) 55%,
                transparent 80%
              )
            `,
            animation: 'q-caustic-band 5s ease-in-out infinite',
          }} />

          {/* Caustic spot ④ — small bright speck, lazy drift */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            zIndex: 2, pointerEvents: 'none',
            animation: 'q-caustic-3 8s ease-in-out infinite',
          }}>
            <div style={{
              position: 'absolute',
              top: '55%', left: '20%',
              width: '18%', height: '12%',
              background: `
                radial-gradient(ellipse at center,
                  rgba(255,255,255,0.80) 0%,
                  rgba(255,255,255,0.30) 40%,
                  transparent 80%
                )
              `,
              borderRadius: '50%',
              filter: 'blur(1px)',
            }} />
          </div>

          {/* ── Bottom crescent reflection (static) ── */}
          <div style={{
            position: 'absolute',
            bottom: '12%', left: '18%',
            width: '44%', height: '18%',
            zIndex: 2, pointerEvents: 'none',
            background: `
              radial-gradient(ellipse at center,
                rgba(255,255,255,0.30) 0%,
                rgba(255,255,255,0.06) 50%,
                transparent 100%
              )
            `,
            borderRadius: '50%',
            transform: 'rotate(-8deg)',
          }} />
        </div>
      </div>

      {/* ── Keyframes: water-caustic drift (translate only, no rotate) ── */}
      <style>{`
        /*
          水纹光斑 — 模拟水面下光斑漂移的效果。
          每个光斑沿不同的弧形路径漂移，之间互相交错，
          产生类似游泳池底/浅溪水面的动态光影。
        */

        /* 主高光 — 围绕上半球做椭圆漂移 */
        @keyframes q-caustic-1 {
          0%   { transform: translate(0, 0); }
          13%  { transform: translate(3px, -2px); }
          30%  { transform: translate(7px, -5px); }
          50%  { transform: translate(5px, 1px); }
          68%  { transform: translate(-2px, -4px); }
          85%  { transform: translate(-4px, -1px); }
          100% { transform: translate(0, 0); }
        }

        /* 青色光斑 — 中下半球漂移，与光斑①错开节奏 */
        @keyframes q-caustic-2 {
          0%   { transform: translate(0, 0); }
          22%  { transform: translate(-5px, -3px); }
          48%  { transform: translate(-2px, -7px); }
          72%  { transform: translate(5px, -2px); }
          100% { transform: translate(0, 0); }
        }

        /* 光带 — 横跨球体来回扫过，像水面波纹在球面的投影 */
        @keyframes q-caustic-band {
          0%   { transform: translate(-20%, -8%); opacity: 0.30; }
          28%  { transform: translate(8%, -4%); opacity: 0.85; }
          52%  { transform: translate(16%, 6%); opacity: 0.35; }
          76%  { transform: translate(-10%, 8%); opacity: 0.75; }
          100% { transform: translate(-20%, -8%); opacity: 0.30; }
        }

        /* 小光点 — 缓慢慵懒漂移 */
        @keyframes q-caustic-3 {
          0%   { transform: translate(0, 0); }
          35%  { transform: translate(-3px, -5px); }
          65%  { transform: translate(4px, -2px); }
          100% { transform: translate(0, 0); }
        }

        /* 地面阴影呼吸 */
        @keyframes q-shadow {
          0%, 100% { opacity: 0.35; transform: scaleX(1); }
          50%      { opacity: 0.60; transform: scaleX(0.82); }
        }
      `}</style>
    </>
  );
}
