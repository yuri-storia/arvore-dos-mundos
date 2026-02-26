import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  worldName: string;
  setWorldName: (n: string) => void;
  hasBeenCreated: boolean;
  onCreateWorld: () => void;
}

export const WorldNameInput: React.FC<Props> = ({ worldName, setWorldName, hasBeenCreated, onCreateWorld }) => {
  const [glowing, setGlowing] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!worldName) return;
    setGlowing(true);
    const t = setTimeout(() => setGlowing(false), 800);
    return () => clearTimeout(t);
  }, [worldName]);

  useEffect(() => {
    if (focused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focused]);

  const showCreateButton = worldName.trim().length > 0 && !hasBeenCreated;

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-6 mt-8 flex flex-col items-center text-center">
      <span className="inline-block px-4 py-1 rounded-full bg-gold/20 border border-gold/40 mb-3">
        <span className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-gold">
          ✦ Nome do seu Projeto ✦
        </span>
      </span>

      {worldName && !focused ? (
        <div
          onClick={() => setFocused(true)}
          className="cursor-text w-full max-w-2xl text-center text-[clamp(1.6rem,4.5vw,2.8rem)] font-cinzel font-bold text-foreground leading-tight transition-all duration-500"
          style={{
            textShadow: glowing
              ? '0 0 40px hsl(207 90% 61% / 0.7), 0 0 80px hsl(207 90% 61% / 0.4), 0 0 120px hsl(207 90% 61% / 0.2), 0 2px 4px rgba(0,0,0,0.5)'
              : '0 0 30px hsl(207 90% 61% / 0.25), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {worldName}
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={worldName}
          onChange={e => setWorldName(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Nome do seu Projeto…"
          className="w-full max-w-2xl bg-transparent border-0 text-center text-[clamp(1.6rem,4.5vw,2.8rem)] font-cinzel font-bold text-foreground placeholder:text-text-dim/40 placeholder:text-[clamp(1.1rem,3vw,1.8rem)] placeholder:font-normal focus:outline-none leading-tight transition-all duration-500"
          style={{
            textShadow: glowing
              ? '0 0 40px hsl(207 90% 61% / 0.7), 0 0 80px hsl(207 90% 61% / 0.4), 0 0 120px hsl(207 90% 61% / 0.2), 0 2px 4px rgba(0,0,0,0.5)'
              : '0 0 30px hsl(207 90% 61% / 0.25), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        />
      )}

      <div className="mt-3 w-[80px] h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />

      {showCreateButton && (
        <button
          onClick={onCreateWorld}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full font-montserrat font-bold text-xs uppercase tracking-wider border border-gold/40 bg-gold/[0.12] hover:bg-gold/[0.22] text-gold-light hover:text-gold-light transition-all backdrop-blur-sm shadow-[0_0_20px_rgba(200,146,42,0.15)] hover:shadow-[0_0_30px_rgba(200,146,42,0.25)] animate-fadeUp"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Criar Mundo
        </button>
      )}
    </div>
  );
};
