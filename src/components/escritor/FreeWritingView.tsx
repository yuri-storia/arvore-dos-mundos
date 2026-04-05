import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFreeWritings, type FreeWriting } from '@/hooks/useFreeWritings';
import { type CodexEntry } from '@/hooks/useCodexEntries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Trash2, FileText, Search, Timer, TimerOff,
  BookOpen, PanelRightOpen, PanelRightClose, Settings2
} from 'lucide-react';
import { FRUITS } from '@/lib/data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// ── Customizable Pomodoro ──
const PomodoroTimer: React.FC = () => {
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
          setIsBreak(b => {
            const next = !b;
            return next;
          });
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
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/[0.03] border border-blue-bright/10">
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
            <Input
              type="number" min={1} max={120} value={focusMin}
              onChange={e => resetTimer(Number(e.target.value) || 25, breakMin)}
              className="h-7 text-xs w-16"
            />
            <span className="text-[10px] text-text-dim">min</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-dim w-14">Pausa</label>
            <Input
              type="number" min={1} max={60} value={breakMin}
              onChange={e => resetTimer(focusMin, Number(e.target.value) || 5)}
              className="h-7 text-xs w-16"
            />
            <span className="text-[10px] text-text-dim">min</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ── Reference Panel ──
const RefPanel: React.FC<{ entries: CodexEntry[]; onInsert: (name: string) => void }> = ({ entries, onInsert }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e => e.title.toLowerCase().includes(q) || e.content?.toLowerCase().includes(q));
  }, [entries, search]);
  const fichas = filtered.filter(e => e.entry_type === 'ficha');
  const artigos = filtered.filter(e => e.entry_type === 'artigo');

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-blue-bright/10">
        <h3 className="font-cinzel font-bold text-xs text-blue-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> Referências
        </h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar…" className="h-7 pl-7 text-xs bg-white/[0.03] border-blue-bright/10" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {fichas.length > 0 && (
            <>
              <p className="text-[9px] font-montserrat uppercase tracking-widest text-text-dim px-2 pt-2">Fichas</p>
              {fichas.map(e => {
                const fruit = FRUITS.find(f => f.id === e.fruit_id);
                return (
                  <button key={e.id} onClick={() => onInsert(e.title)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-blue-bright/10 transition-colors group">
                    <span className="text-blue-light group-hover:text-blue-bright">{e.title}</span>
                    {fruit && <span className="text-[9px] text-text-dim ml-1.5">{fruit.icon}</span>}
                  </button>
                );
              })}
            </>
          )}
          {artigos.length > 0 && (
            <>
              <p className="text-[9px] font-montserrat uppercase tracking-widest text-text-dim px-2 pt-2">Artigos</p>
              {artigos.map(e => (
                <button key={e.id} onClick={() => onInsert(e.title)}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-gold/10 transition-colors group">
                  <span className="text-gold-light group-hover:text-gold">{e.title}</span>
                </button>
              ))}
            </>
          )}
          {filtered.length === 0 && <p className="text-xs text-text-dim text-center py-6">Nenhuma entrada.</p>}
        </div>
      </ScrollArea>
    </div>
  );
};

// ── Main ──
interface Props {
  worldId: string;
  entries: CodexEntry[];
}

export const FreeWritingView: React.FC<Props> = ({ worldId, entries }) => {
  const { writings, create, update, remove, totalWords } = useFreeWritings(worldId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [showRef, setShowRef] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = useMemo(() => writings.find(w => w.id === activeId), [writings, activeId]);

  useEffect(() => {
    if (active) { setContent(active.content || ''); setTitle(active.title); }
  }, [activeId]); // eslint-disable-line

  const debouncedSave = useCallback((id: string, c: string) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => update(id, { content: c }), 1500);
  }, [update]);

  const handleChange = (val: string) => {
    setContent(val);
    if (activeId) debouncedSave(activeId, val);
  };

  const handleInsert = (name: string) => {
    if (!editorRef.current || !activeId) return;
    const ta = editorRef.current;
    const pos = ta.selectionStart;
    const nc = content.substring(0, pos) + `@${name} ` + content.substring(pos);
    setContent(nc);
    debouncedSave(activeId, nc);
    setTimeout(() => ta.focus(), 0);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full gap-3">
      {/* Left: block list */}
      <div className="w-[200px] shrink-0 flex flex-col bg-white/[0.02] rounded-lg border border-blue-bright/10">
        <div className="p-2 border-b border-blue-bright/10 flex items-center justify-between">
          <span className="text-[10px] font-montserrat uppercase tracking-widest text-text-dim">Blocos</span>
          <button onClick={async () => { const w = await create(); if (w) setActiveId(w.id); }}
            className="p-1 rounded hover:bg-blue-bright/10 text-blue-light" title="Novo bloco">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {writings.map(w => (
              <div key={w.id} className="flex items-center group">
                <button onClick={() => setActiveId(w.id)}
                  className={`flex-1 min-w-0 text-left px-2 py-1.5 rounded text-[11px] truncate transition-colors ${
                    activeId === w.id ? 'bg-blue-bright/15 text-blue-light' : 'text-text-dim hover:text-foreground hover:bg-white/[0.03]'
                  }`}>
                  <FileText className="w-3 h-3 inline mr-1 opacity-50" />
                  {w.title}
                </button>
                <span className="text-[9px] text-text-dim/40 mr-1">{w.word_count}</span>
                <button onClick={() => { remove(w.id); if (activeId === w.id) setActiveId(null); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-text-dim hover:text-red-alert transition-all">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {writings.length === 0 && <p className="text-xs text-text-dim text-center py-6">Crie seu primeiro bloco.</p>}
          </div>
        </ScrollArea>
      </div>

      {/* Center: editor */}
      <div className="flex-1 min-w-0 flex flex-col bg-white/[0.02] rounded-lg border border-blue-bright/10">
        {active ? (
          <>
            <div className="p-3 border-b border-blue-bright/10 flex items-center gap-2">
              <input value={title} onChange={e => setTitle(e.target.value)}
                onBlur={() => { if (activeId && title.trim()) update(activeId, { title: title.trim() }); }}
                className="bg-transparent font-montserrat font-bold text-sm text-foreground border-none focus:outline-none flex-1"
                placeholder="Título do bloco" />
              <PomodoroTimer />
              <span className="text-[10px] font-mono text-text-dim">{wordCount} palavras</span>
              <button onClick={() => setShowRef(!showRef)}
                className="p-1.5 rounded hover:bg-white/[0.05] text-text-dim hover:text-foreground transition-colors">
                {showRef ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </button>
            </div>
            <textarea ref={editorRef} value={content} onChange={e => handleChange(e.target.value)}
              placeholder="Escreva livremente…&#10;&#10;Use @NomeDoPersonagem para referências."
              className="flex-1 w-full resize-none bg-transparent text-foreground/90 font-merriweather text-sm leading-relaxed p-4 focus:outline-none placeholder:text-text-dim/30" />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <FileText className="w-10 h-10 mx-auto mb-3 text-text-dim/30" />
              <p className="text-sm text-text-dim">Crie um bloco para começar a escrever livremente.</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: refs */}
      {showRef && (
        <div className="w-[220px] shrink-0 bg-white/[0.02] rounded-lg border border-blue-bright/10">
          <RefPanel entries={entries} onInsert={handleInsert} />
        </div>
      )}
    </div>
  );
};
