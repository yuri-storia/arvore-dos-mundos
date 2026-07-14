import React, { useEffect, useState } from 'react';
import { Trees, Sparkles, BookOpen, Palette, type LucideIcon } from 'lucide-react';

interface Props {
  worldName?: string;
  /** true = mostrar overlay */
  active: boolean;
}

// Fases contextuais exibidas durante o carregamento — cada uma ~450ms.
const PHASES: { icon: LucideIcon; label: string }[] = [
  { icon: Trees,     label: 'Despertando a Árvore…' },
  { icon: BookOpen,  label: 'Recuperando o Códex…' },
  { icon: Palette,   label: 'Restaurando a Galeria…' },
  { icon: Sparkles,  label: 'Alinhando as raízes narrativas…' },
];

export const WorldLoadingOverlay: React.FC<Props> = ({ worldName, active }) => {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) { setPhase(0); setProgress(0); return; }
    const startedAt = Date.now();
    const phaseInterval = setInterval(() => {
      setPhase(p => Math.min(p + 1, PHASES.length - 1));
    }, 450);
    // Progresso suave assintótico até 92% — completa quando o overlay fecha.
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(92, Math.round((1 - Math.exp(-elapsed / 900)) * 100));
      setProgress(pct);
    }, 60);
    return () => { clearInterval(phaseInterval); clearInterval(progressInterval); };
  }, [active]);

  if (!active) return null;

  const Current = PHASES[phase];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando mundo"
      className="fixed inset-0 z-[9995] flex items-center justify-center bg-background/85 backdrop-blur-[6px] animate-in fade-in duration-200"
    >
      <div
        className="card-glass rounded-2xl px-8 py-7 w-[92vw] max-w-[420px] text-center border border-gold/25"
        style={{ background: 'linear-gradient(135deg, hsl(214 60% 4% / 0.95) 0%, hsl(38 45% 12% / 0.9) 100%)' }}
      >
        {/* Ícone animado */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'radial-gradient(circle, hsl(38 67% 55% / 0.35) 0%, transparent 70%)' }}
          />
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center border border-gold/40 bg-gold/[0.06]">
            <Current.icon className="w-7 h-7 text-gold-light" strokeWidth={1.5} />
          </div>
        </div>

        {/* Nome do mundo */}
        {worldName && (
          <h3
            className="font-cinzel font-bold text-lg text-foreground mb-1 truncate"
            style={{ textShadow: '0 0 18px hsl(207 90% 61% / 0.35)' }}
          >
            {worldName}
          </h3>
        )}

        {/* Frase da fase atual */}
        <p
          key={phase}
          className="font-merriweather italic text-sm text-text-secondary mb-4 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300"
        >
          {Current.label}
        </p>

        {/* Barra de progresso */}
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, hsl(var(--blue-bright)), hsl(var(--gold-light)))',
              boxShadow: '0 0 12px hsl(38 67% 55% / 0.5)',
            }}
          />
        </div>
        <p className="mt-2 text-[10px] font-montserrat uppercase tracking-[0.2em] text-text-dim">
          {progress}% · {phase + 1} de {PHASES.length}
        </p>
      </div>
    </div>
  );
};
