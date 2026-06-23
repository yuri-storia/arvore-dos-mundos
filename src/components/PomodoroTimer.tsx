import React, { useState, useEffect, useRef } from 'react';
import { Timer, TimerOff, Settings2, Square, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface Props {
  className?: string;
}

type Phase = 'focus' | 'short' | 'long';

export const PomodoroTimer: React.FC<Props> = ({ className }) => {
  const [running, setRunning] = useState(false);
  const [focusMin, setFocusMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(60);
  const [cyclesUntilLong, setCyclesUntilLong] = useState(4);
  const [phase, setPhase] = useState<Phase>('focus');
  const [cycle, setCycle] = useState(1); // current focus cycle (1..cyclesUntilLong)
  const [seconds, setSeconds] = useState(25 * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lazy-init the audio element
  useEffect(() => {
    audioRef.current = new Audio('/sounds/chime.mp3');
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.6;
  }, []);

  const playChime = () => {
    try {
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = 0;
      void a.play();
    } catch { /* ignore */ }
  };

  const phaseDuration = (p: Phase) => (p === 'focus' ? focusMin : p === 'short' ? shortMin : longMin) * 60;

  const advancePhase = () => {
    setRunning(false);
    playChime();
    if (phase === 'focus') {
      // focus done — decide break type
      const isLast = cycle >= cyclesUntilLong;
      if (isLast) {
        setPhase('long');
        setSeconds(longMin * 60);
        toast.success(`Foco concluído! Pausa longa de ${longMin} min — você merece.`);
      } else {
        setPhase('short');
        setSeconds(shortMin * 60);
        toast.success(`Foco concluído! Pausa curta de ${shortMin} min.`);
      }
    } else {
      // break done — back to focus, advance cycle counter
      const nextCycle = phase === 'long' ? 1 : cycle + 1;
      setCycle(nextCycle);
      setPhase('focus');
      setSeconds(focusMin * 60);
      toast.success(`Pausa terminada! Hora de focar — ciclo ${nextCycle}/${cyclesUntilLong}.`);
    }
  };

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          // run advance on next tick to avoid setState in setState issues
          setTimeout(advancePhase, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, cycle, focusMin, shortMin, longMin, cyclesUntilLong]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const cancelSession = () => {
    setRunning(false);
    setPhase('focus');
    setCycle(1);
    setSeconds(focusMin * 60);
    toast('Sessão cancelada — ciclo reiniciado.');
  };

  const updateConfig = (next: Partial<{ focus: number; short: number; long: number; cycles: number }>) => {
    if (next.focus !== undefined) {
      setFocusMin(next.focus);
      if (phase === 'focus' && !running) setSeconds(next.focus * 60);
    }
    if (next.short !== undefined) {
      setShortMin(next.short);
      if (phase === 'short' && !running) setSeconds(next.short * 60);
    }
    if (next.long !== undefined) {
      setLongMin(next.long);
      if (phase === 'long' && !running) setSeconds(next.long * 60);
    }
    if (next.cycles !== undefined) {
      setCyclesUntilLong(next.cycles);
    }
  };

  const isBreak = phase !== 'focus';
  const phaseLabel = phase === 'focus' ? 'Foco' : phase === 'short' ? 'Pausa' : 'Pausa Longa';

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        running
          ? isBreak
            ? 'bg-green-500/10 border-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
            : 'bg-blue-bright/10 border-blue-bright/30 shadow-[0_0_12px_rgba(33,150,243,0.15)]'
          : 'bg-white/[0.04] border-blue-bright/15 hover:border-blue-bright/25'
      } ${className || ''}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => setRunning(!running)} className={`p-1 rounded transition-colors ${running ? 'text-blue-light hover:text-blue-bright' : 'text-gold-light hover:text-gold'}`}>
              {running ? <TimerOff className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px]">
            <p className="text-xs font-merriweather">
              {running ? 'Pausar o timer' : 'Técnica Pomodoro: foco com pausas curtas e uma pausa longa após vários ciclos.'}
            </p>
          </TooltipContent>
        </Tooltip>

        <div className="flex flex-col leading-tight">
          <span className={`font-mono text-sm font-bold tabular-nums ${isBreak ? 'text-green-400' : running ? 'text-blue-light' : 'text-foreground/80'}`}>
            {mm}:{ss}
          </span>
          <span className={`text-[9px] font-montserrat font-bold uppercase tracking-wider ${isBreak ? 'text-green-400/80' : 'text-text-dim'}`}>
            {phaseLabel} {phase === 'focus' && `· ${cycle}/${cyclesUntilLong}`}
          </span>
        </div>

        {/* Cancel session — only when running or progress mid-cycle */}
        {(running || seconds !== focusMin * 60 || phase !== 'focus' || cycle !== 1) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={cancelSession} aria-label="Cancelar sessão" className="p-1 text-text-dim hover:text-red-alert transition-colors">
                <Square className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">Cancelar sessão</p></TooltipContent>
          </Tooltip>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <button aria-label="Configurações do Pomodoro" className="p-1 text-text-dim hover:text-foreground transition-colors">
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 space-y-3" align="end">
            <div>
              <p className="text-xs font-montserrat font-bold uppercase tracking-widest text-foreground mb-1 inline-flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" strokeWidth={1.75} />Timer Pomodoro</p>
              <p className="text-[10px] text-text-dim font-merriweather leading-relaxed">
                Defina foco, pausas e quantos ciclos antes da pausa longa.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary w-24 font-montserrat">Foco</label>
              <Input type="number" min={1} max={120} value={focusMin}
                onChange={e => updateConfig({ focus: Number(e.target.value) || 25 })}
                className="h-8 text-xs w-16" />
              <span className="text-[10px] text-text-dim">min</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary w-24 font-montserrat">Pausa curta</label>
              <Input type="number" min={1} max={60} value={shortMin}
                onChange={e => updateConfig({ short: Number(e.target.value) || 5 })}
                className="h-8 text-xs w-16" />
              <span className="text-[10px] text-text-dim">min</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary w-24 font-montserrat">Pausa longa</label>
              <Input type="number" min={1} max={180} value={longMin}
                onChange={e => updateConfig({ long: Number(e.target.value) || 60 })}
                className="h-8 text-xs w-16" />
              <span className="text-[10px] text-text-dim">min</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary w-24 font-montserrat">Ciclos</label>
              <Input type="number" min={1} max={10} value={cyclesUntilLong}
                onChange={e => updateConfig({ cycles: Math.max(1, Number(e.target.value) || 4) })}
                className="h-8 text-xs w-16" />
              <span className="text-[10px] text-text-dim">até pausa longa</span>
            </div>
            <button
              onClick={playChime}
              className="w-full text-[10px] font-montserrat text-text-dim hover:text-foreground border border-border rounded py-1 transition-colors"
            >
              <><Bell className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Testar som</>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
};
