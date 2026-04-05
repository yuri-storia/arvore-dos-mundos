import React, { useEffect, useRef, useState } from 'react';
import treeWallpaper from '@/assets/tree-wallpaper.webp';
import { UserMenu } from '@/components/UserMenu';
import { FRUITS } from '@/lib/data';
import { Pencil } from 'lucide-react';
import type { MethodType } from '@/lib/data';

interface AppHeaderProps {
  worldName?: string;
  setWorldName?: (name: string) => void;
  onCreateWorld?: () => void;
  method?: MethodType;
  currentSaveId?: string;
  db?: Record<number, Record<string, string>>;
}

const Particles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; r: number; vx: number; vy: number; o: number; vo: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.3,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.15 - 0.03,
        o: Math.random() * 0.5 + 0.15,
        vo: (Math.random() - 0.5) * 0.004,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.o += p.vo;
        if (p.o > 0.7) p.vo = -Math.abs(p.vo);
        if (p.o < 0.08) p.vo = Math.abs(p.vo);
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(144, 202, 249, ${p.o})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(33, 150, 243, 0.5)';
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-[1]" />;
};

/** Calculate how many fruits have at least one field filled */
function calcProgress(db?: Record<number, Record<string, string>>): { filled: number; total: number } {
  const total = FRUITS.length;
  if (!db) return { filled: 0, total };
  let filled = 0;
  for (const fruit of FRUITS) {
    const data = db[fruit.id];
    if (data && Object.values(data).some(v => v && v.trim().length > 0)) {
      filled++;
    }
  }
  return { filled, total };
}

export const AppHeader: React.FC<AppHeaderProps> = ({ worldName, method, currentSaveId, db }) => {
  const hasWorld = !!currentSaveId;
  const progress = calcProgress(db);
  const pct = progress.total > 0 ? Math.round((progress.filled / progress.total) * 100) : 0;

  return (
    <header className="relative text-center pt-4 pb-3 px-4 min-h-[140px] mb-0">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0">
          <img
            src={treeWallpaper}
            alt=""
            className="w-full h-full object-cover object-[center_30%] opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-20% via-[#02070d]/70 via-60% to-[#02070d]" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-[#02070d]" />
        </div>
        <Particles />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        {/* Brand badge */}
        <div className="inline-block px-3 py-1 rounded-full border border-blue-bright/15 bg-blue-bright/[0.04] backdrop-blur-sm">
          <span className="font-cinzel text-[9px] tracking-[0.18em] text-blue-light/60 uppercase">
            ✦ A Árvore dos Mundos ✦
          </span>
        </div>

        {/* World name — hero element */}
        {hasWorld && worldName ? (
          <h1
            className="font-cinzel font-bold text-[clamp(1.3rem,4vw,2.2rem)] leading-tight text-foreground mt-1"
            style={{ textShadow: '0 0 18px hsl(207 90% 61% / 0.5), 0 0 40px hsl(207 90% 61% / 0.2), 0 2px 4px rgba(0,0,0,0.5)' }}
          >
            {worldName}
          </h1>
        ) : (
          <h1
            className="font-cinzel font-bold text-[clamp(1.3rem,4vw,2.2rem)] leading-tight text-foreground mt-1 opacity-40"
            style={{ textShadow: '0 0 18px hsl(207 90% 61% / 0.3), 0 2px 4px rgba(0,0,0,0.5)' }}
          >
            Nenhum mundo selecionado
          </h1>
        )}

        {/* Context row: method + progress + user */}
        <div className="flex items-center justify-center gap-4 mt-1 flex-wrap">
          {hasWorld && (
            <>
              <span className="text-[10px] font-montserrat uppercase tracking-wider text-text-dim">
                {method === 'top-down' ? '⬇ Top-Down' : '⬆ Bottom-Up'}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, hsl(var(--blue-bright)), hsl(var(--gold-light)))',
                    }}
                  />
                </div>
                <span className="text-[10px] font-montserrat text-text-dim">
                  {progress.filled}/{progress.total} frutos
                </span>
              </div>
            </>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
