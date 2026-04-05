import React, { useState, useEffect, useRef } from 'react';
import { Timer, TimerOff, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  className?: string;
}

export const PomodoroTimer: React.FC<Props> = ({ className }) => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [isBreak, setIsBreak] = useState(false);
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          setRunning(false);
          setIsBreak(b => !b);
          return isBreak ? focusMin * 60 : breakMin * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, isBreak, focusMin, breakMin]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const resetTimer = (focus: number, brk: number) => {
    setFocusMin(focus);
    setBreakMin(brk);
    setRunning(false);
    setIsBreak(false);
    setSeconds(focus * 60);
  };

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
          <TooltipContent side="bottom" className="max-w-[200px]">
            <p className="text-xs font-merriweather">
              {running ? 'Pausar o timer' : 'Técnica Pomodoro: escreva com foco por um período, depois faça uma pausa curta. Clique para iniciar!'}
            </p>
          </TooltipContent>
        </Tooltip>

        <span className={`font-mono text-sm font-bold tabular-nums ${isBreak ? 'text-green-400' : running ? 'text-blue-light' : 'text-foreground/80'}`}>
          {mm}:{ss}
        </span>
        <span className={`text-[10px] font-montserrat font-bold uppercase ${isBreak ? 'text-green-400/80' : 'text-text-dim'}`}>
          {isBreak ? '☕ Pausa' : '✍️ Foco'}
        </span>

        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1 text-text-dim hover:text-foreground transition-colors">
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-4 space-y-3" align="end">
            <div>
              <p className="text-xs font-montserrat font-bold uppercase tracking-widest text-foreground mb-1">⏱️ Timer Pomodoro</p>
              <p className="text-[10px] text-text-dim font-merriweather leading-relaxed">
                Defina quanto tempo quer escrever sem parar e quanto tempo de descanso entre sessões.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary w-16 font-montserrat">Foco</label>
              <Input type="number" min={1} max={120} value={focusMin}
                onChange={e => resetTimer(Number(e.target.value) || 25, breakMin)}
                className="h-8 text-xs w-16" />
              <span className="text-[10px] text-text-dim">min</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary w-16 font-montserrat">Pausa</label>
              <Input type="number" min={1} max={60} value={breakMin}
                onChange={e => resetTimer(focusMin, Number(e.target.value) || 5)}
                className="h-8 text-xs w-16" />
              <span className="text-[10px] text-text-dim">min</span>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
};
