import React, { useEffect, useRef } from 'react';
import treeWallpaper from '@/assets/tree-wallpaper.webp';

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

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        o: Math.random() * 0.6 + 0.2,
        vo: (Math.random() - 0.5) * 0.005,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.o += p.vo;
        if (p.o > 0.8) p.vo = -Math.abs(p.vo);
        if (p.o < 0.1) p.vo = Math.abs(p.vo);
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(144, 202, 249, ${p.o})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(33, 150, 243, 0.6)';
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

export const AppHeader: React.FC = () => (
  <header className="relative text-center pt-8 pb-6 px-4 overflow-hidden min-h-[280px]">
    {/* Background image */}
    <div className="absolute inset-0 z-0">
      <img
        src={treeWallpaper}
        alt=""
        className="w-full h-full object-cover object-[center_30%] md:object-[center_40%] opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-b from-transparent to-background" />
    </div>

    {/* Particles */}
    <Particles />

    <div className="relative z-10 pt-4">
      {/* Badge */}
      <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-blue-bright/20 bg-blue-bright/[0.06] backdrop-blur-sm">
        <span className="font-cinzel text-xs tracking-[0.15em] text-blue-light">
          ✦ Universo STORIA · Template Oficial ✦
        </span>
      </div>

      {/* Title */}
      <h1 className="font-cinzel font-bold text-[clamp(1.6rem,5vw,2.8rem)] leading-tight mb-3">
        <span className="text-foreground">A Árvore </span>
        <span className="text-blue-light">dos Mundos</span>
      </h1>

      {/* Subtitle */}
      <p className="font-merriweather italic text-text-secondary text-sm md:text-base max-w-xl mx-auto mb-4">
        Construa universos ricos e sem furos — fruto a fruto — com o auxílio da Inteligência Artificial
      </p>

      {/* Decorative line */}
      <div className="mx-auto w-[60px] h-[2px] bg-gradient-to-r from-transparent via-blue-bright to-transparent" />
    </div>
  </header>
);
