import React, { useState, useEffect } from 'react';

interface Props {
  worldName: string;
  setWorldName: (n: string) => void;
}

export const WorldNameInput: React.FC<Props> = ({ worldName, setWorldName }) => {
  const [glowing, setGlowing] = useState(false);

  useEffect(() => {
    if (!worldName) return;
    setGlowing(true);
    const t = setTimeout(() => setGlowing(false), 800);
    return () => clearTimeout(t);
  }, [worldName]);

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-6 text-center">
      <label className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-gold/60 mb-3 block">
        ✦ Nome do seu mundo ✦
      </label>
      <input
        type="text"
        value={worldName}
        onChange={e => setWorldName(e.target.value)}
        placeholder="Inscreva aqui o nome do seu mundo…"
        className="w-full max-w-2xl mx-auto bg-transparent border-0 text-center text-[clamp(1.8rem,5vw,3.2rem)] font-cinzel font-bold text-foreground placeholder:text-text-dim/40 placeholder:font-normal focus:outline-none leading-tight transition-all duration-500"
        style={{
          textShadow: glowing
            ? '0 0 40px hsl(207 90% 61% / 0.7), 0 0 80px hsl(207 90% 61% / 0.4), 0 0 120px hsl(207 90% 61% / 0.2), 0 2px 4px rgba(0,0,0,0.5)'
            : '0 0 30px hsl(207 90% 61% / 0.25), 0 2px 4px rgba(0,0,0,0.5)',
        }}
      />
      <div className="mx-auto mt-3 w-[80px] h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
    </div>
  );
};
