import React from 'react';

interface Props {
  worldName: string;
  setWorldName: (n: string) => void;
}

export const WorldNameInput: React.FC<Props> = ({ worldName, setWorldName }) => (
  <div className="mx-auto max-w-[1060px] px-4 mb-4">
    <div className="card-glass rounded-lg p-4">
      <label className="font-cinzel text-xs text-blue-light tracking-wider mb-2 block">
        ✦ Nome do seu mundo
      </label>
      <input
        type="text"
        value={worldName}
        onChange={e => setWorldName(e.target.value)}
        placeholder="Ex: Aetherion, Valdris, Nyrmhael…"
        className="w-full bg-transparent border-0 border-b border-blue-bright/20 px-1 py-2 text-xl font-cinzel text-foreground placeholder:text-text-dim focus:outline-none focus:border-blue-bright/50"
      />
    </div>
  </div>
);
