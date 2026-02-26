import React from 'react';

interface Props {
  worldName: string;
  setWorldName: (n: string) => void;
}

export const WorldNameInput: React.FC<Props> = ({ worldName, setWorldName }) => (
  <div className="mx-auto max-w-[1060px] px-4 mb-6 text-center">
    <label className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-gold/60 mb-3 block">
      ✦ Nome do seu mundo ✦
    </label>
    <input
      type="text"
      value={worldName}
      onChange={e => setWorldName(e.target.value)}
      placeholder="Inscreva aqui o nome do seu mundo…"
      className="w-full max-w-2xl mx-auto bg-transparent border-0 text-center text-[clamp(1.8rem,5vw,3.2rem)] font-cinzel font-bold text-foreground placeholder:text-text-dim/40 placeholder:font-normal focus:outline-none leading-tight"
      style={{
        textShadow: '0 0 30px hsl(207 90% 61% / 0.25), 0 2px 4px rgba(0,0,0,0.5)',
      }}
    />
    <div className="mx-auto mt-3 w-[80px] h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
  </div>
);
