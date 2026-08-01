import React, { useEffect, useRef, useState } from 'react';
import heroVideoDesktopMaster from '@/assets/arvore-hero-desktop-master.mp4.asset.json';
import heroVideoMobile from '@/assets/arvore-hero-mobile-master-1080.mp4.asset.json';
import heroPoster from '@/assets/arvore-mundos-hero.webp.asset.json';
import heroMobilePoster from '@/assets/arvore-hero-mobile-master-poster.png.asset.json';
import { UserMenu } from '@/components/UserMenu';

import { Pencil, ChevronDown, FolderOpen, Plus, Trash2, ArrowDown } from 'lucide-react';
import type { MethodType } from '@/lib/data';
import type { WorldRecord } from '@/hooks/useWorlds';
import { useIsMobile } from '@/hooks/use-mobile';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DropsCounterBadge } from '@/components/DropsCounterBadge';

interface AppHeaderProps {
  worldName?: string;
  setWorldName?: (name: string) => void;
  onCreateWorld?: () => void;
  method?: MethodType;
  currentSaveId?: string;
  db?: Record<number, Record<string, string>>;
  // Mobile project switching
  worlds?: WorldRecord[];
  onLoadWorld?: (world: WorldRecord) => void;
  onNewWorld?: () => void;
  onDeleteWorld?: (id: string) => void;
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

    for (let i = 0; i < 20; i++) {
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

const formatDate = (ts: string) => {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const AppHeader: React.FC<AppHeaderProps> = ({ worldName, setWorldName, onCreateWorld, method, currentSaveId, db, worlds, onLoadWorld, onNewWorld, onDeleteWorld }) => {
  const isMobile = useIsMobile();
  const hasWorld = !!currentSaveId;
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  return (
    <header className={`relative text-center px-4 mb-0 flex flex-col ${isMobile ? 'min-h-[390px]' : 'min-h-[300px]'}`}>
      {/* Background: renderizações independentes para preservar a definição em cada formato. */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-background">
          {isMobile ? (
            <>
              <img
                src={heroMobilePoster.url}
                alt=""
                aria-hidden="true"
                className="absolute left-0 top-[-96px] aspect-[9/16] w-full max-w-none object-contain opacity-80"
              />
              <video
                key="mobile-master"
                src={heroVideoMobile.url}
                poster={heroMobilePoster.url}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                disablePictureInPicture
                aria-hidden="true"
                className="absolute left-0 top-[-96px] aspect-[9/16] w-full max-w-none object-contain opacity-80"
              />
            </>
          ) : (
            <>
              <img
                src={heroPoster.url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover object-[center_30%] opacity-60"
              />
              <video
                key="desktop-master"
                src={heroVideoDesktopMaster.url}
                poster={heroPoster.url}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover object-[center_30%] opacity-60"
              />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-20% via-[#02070d]/70 via-60% to-[#02070d]" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-[#02070d]" />
        </div>
        <Particles />
      </div>


      {/* Brand badge - always at the top, independent of header content */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 inline-block px-3 py-1 rounded-full border border-blue-bright/15 bg-blue-bright/[0.04] backdrop-blur-sm">
        <span className="font-cinzel text-[9px] tracking-[0.18em] text-white uppercase">
          A Árvore dos Mundos
        </span>
      </div>

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center ${isMobile ? 'flex-1 justify-center gap-2 py-4' : 'gap-1 pt-12 pb-4'}`}>
        {/* Mobile: project switcher button */}
        {isMobile && worlds && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-gold/[0.10] border border-gold/30 hover:bg-gold/[0.18] hover:border-gold/50 transition-all backdrop-blur-sm mt-0 sm:mt-2 group"
          >
            <FolderOpen className="w-3 h-3 text-gold/70 group-hover:text-gold-light transition-colors" />
            <span className="font-cinzel text-[9px] uppercase tracking-[0.2em] text-gold group-hover:text-gold-light transition-colors">
              Meus Projetos {worlds.length > 0 && `(${worlds.length})`}
            </span>
            <ChevronDown className={`w-3 h-3 text-gold/60 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Mobile: project dropdown */}
        {isMobile && menuOpen && worlds && onLoadWorld && onNewWorld && onDeleteWorld && (
          <div className="w-full max-w-md mt-2 animate-fadeUp rounded-lg border border-gold/20 backdrop-blur-[16px] overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(38 67% 48% / 0.08) 0%, hsl(214 60% 3% / 0.85) 100%)' }}>
            <button
              onClick={() => { onNewWorld(); setMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-montserrat font-bold uppercase tracking-wider text-gold-light/80 hover:text-gold-light hover:bg-gold/[0.08] transition-all border-b border-gold/10"
            >
              <Plus className="w-3 h-3" />
              Criar Novo Mundo
            </button>
            {worlds.length === 0 ? (
              <p className="text-[10px] text-text-dim font-merriweather italic py-3 text-center">
                Nenhum projeto salvo ainda.
              </p>
            ) : (
              <div className="max-h-[200px] overflow-y-auto">
                {worlds.map(s => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-all text-xs border-b border-gold/5 last:border-0 ${
                      s.id === currentSaveId ? 'bg-blue-bright/[0.06]' : 'hover:bg-blue-bright/[0.03]'
                    }`}
                    onClick={() => { onLoadWorld(s); setMenuOpen(false); }}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-cinzel font-bold text-[11px] text-foreground truncate block">
                        {s.name}
                        {s.id === currentSaveId && <span className="text-blue-light text-[9px] ml-1.5">● ativo</span>}
                      </span>
                      <span className="text-[9px] text-text-dim font-montserrat">
                        {s.method === 'top-down' ? 'Cima/Baixo' : 'Baixo/Cima'} · {formatDate(s.updated_at)}
                      </span>
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      <ConfirmDialog
                        trigger={
                          <button className="p-1 rounded text-text-dim hover:text-destructive transition-colors" aria-label="Excluir"><Trash2 className="w-3 h-3" strokeWidth={1.75} /></button>
                        }
                        title="Excluir mundo"
                        description={`Tem certeza que deseja excluir "${s.name}"? Todos os dados serão perdidos permanentemente.`}
                        confirmLabel="Excluir"
                        onConfirm={() => { onDeleteWorld(s.id); }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* World name display / input */}
        <div data-tour="world-name" className="flex items-center justify-center gap-2 mt-0 sm:mt-1 w-full max-w-lg">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={worldName || ''}
              onChange={e => setWorldName?.(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }}
              placeholder="Nome do seu mundo…"
              className="bg-transparent border-b border-blue-bright/30 text-center font-cinzel font-bold text-[clamp(1.3rem,4vw,2.2rem)] leading-tight text-foreground placeholder:text-text-dim/30 focus:outline-none focus:border-blue-bright/60 w-full transition-colors"
              style={{ textShadow: '0 0 18px hsl(207 90% 61% / 0.5), 0 2px 4px rgba(0,0,0,0.5)' }}
            />
          ) : hasWorld && worldName ? (
            <button
              onClick={() => setEditing(true)}
              className="group flex items-center gap-2 cursor-pointer bg-transparent border-none"
            >
              <h1
                className="font-cinzel font-bold text-[clamp(1.3rem,4vw,2.2rem)] leading-tight text-foreground"
                style={{ textShadow: '0 0 18px hsl(207 90% 61% / 0.5), 0 0 40px hsl(207 90% 61% / 0.2), 0 2px 4px rgba(0,0,0,0.5)' }}
              >
                {worldName}
              </h1>
              <Pencil className="w-3.5 h-3.5 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <input
                type="text"
                value={worldName || ''}
                onChange={e => setWorldName?.(e.target.value)}
                placeholder="Nome do seu mundo…"
                className="bg-transparent border-b border-blue-bright/20 text-center font-cinzel font-bold text-[clamp(1.3rem,4vw,2.2rem)] leading-tight text-foreground placeholder:text-text-dim/30 focus:outline-none focus:border-blue-bright/50 w-full max-w-md transition-colors"
                style={{ textShadow: '0 0 18px hsl(207 90% 61% / 0.3), 0 2px 4px rgba(0,0,0,0.5)' }}
              />
              {worldName && !currentSaveId && onCreateWorld && (
                <button
                  data-tour="create-world"
                  onClick={onCreateWorld}
                  className="px-4 py-1.5 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light bg-gold/[0.08] hover:bg-gold/[0.18] transition-all"
                >
                  Criar Mundo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Context row: method + user */}
        <div className="flex items-center justify-center gap-4 mt-0 sm:mt-1 flex-wrap">
          {hasWorld && (
            <span className="text-[10px] font-montserrat uppercase tracking-wider text-text-dim">
              <><ArrowDown className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={2} />{method === 'top-down' ? 'De Cima para Baixo' : 'De Baixo para Cima'}</>
            </span>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
