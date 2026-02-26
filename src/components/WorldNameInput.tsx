import React, { useState, useEffect, useRef } from 'react';

interface Props {
  worldName: string;
  setWorldName: (n: string) => void;
}

export const WorldNameInput: React.FC<Props> = ({ worldName, setWorldName }) => {
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

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-6 mt-8 text-center">
      <span className="inline-block px-4 py-1 rounded-full bg-gold/20 border border-gold/40 mb-3">
        <span className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-gold">
          ✦ Nome do seu Projeto ✦
        </span>
      </span>

      {/* Display styled name with diamonds when has value and not focused */}
      {worldName && !focused ? (
        <div
          onClick={() => setFocused(true)}
          className="cursor-text w-full max-w-2xl mx-auto text-center text-[clamp(1.6rem,4.5vw,2.8rem)] font-cinzel font-bold text-foreground leading-tight transition-all duration-500"
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
          className="w-full max-w-2xl mx-auto bg-transparent border-0 text-center text-[clamp(1.6rem,4.5vw,2.8rem)] font-cinzel font-bold text-foreground placeholder:text-text-dim/40 placeholder:text-[clamp(1.1rem,3vw,1.8rem)] placeholder:font-normal focus:outline-none leading-tight transition-all duration-500"
          style={{
            textShadow: glowing
              ? '0 0 40px hsl(207 90% 61% / 0.7), 0 0 80px hsl(207 90% 61% / 0.4), 0 0 120px hsl(207 90% 61% / 0.2), 0 2px 4px rgba(0,0,0,0.5)'
              : '0 0 30px hsl(207 90% 61% / 0.25), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        />
      )}

      <div className="mx-auto mt-3 w-[80px] h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
    </div>
  );
};
