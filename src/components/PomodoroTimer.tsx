import React, { useState, useEffect, useRef } from 'react';
import { Timer, TimerOff, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/[0.03] border border-blue-bright/10 ${className || ''}`}>
      <button onClick={() => setRunning(!running)} className="text-blue-light hover:text-blue-bright transition-colors">
        {running ? <TimerOff className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
      </button>
      <span className={`font-mono text-xs tabular-nums ${isBreak ? 'text-green-400' : 'text-blue-light'}`}>
        {mm}:{ss}
      </span>
      <span className="text-[9px] text-text-dim uppercase">{isBreak ? 'Pausa' : 'Foco'}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button className="p-0.5 text-text-dim hover:text-foreground transition-colors">
            <Settings2 className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3 space-y-2" align="end">
          <p className="text-[10px] font-montserrat uppercase tracking-widest text-text-dim">Configurar Timer</p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-dim w-14">Foco</label>
            <Input type="number" min={1} max={120} value={focusMin}
              onChange={e => resetTimer(Number(e.target.value) || 25, breakMin)}
              className="h-7 text-xs w-16" />
            <span className="text-[10px] text-text-dim">min</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-dim w-14">Pausa</label>
            <Input type="number" min={1} max={60} value={breakMin}
              onChange={e => resetTimer(focusMin, Number(e.target.value) || 5)}
              className="h-7 text-xs w-16" />
            <span className="text-[10px] text-text-dim">min</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
