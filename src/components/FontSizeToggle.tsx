import React from 'react';
import { Type } from 'lucide-react';
import { useFontSize, type FontSizePref } from '@/hooks/useFontSize';

const OPTIONS: { value: FontSizePref; label: string; hint: string }[] = [
  { value: 'compact', label: 'Compacto', hint: 'Mais conteúdo na tela' },
  { value: 'default', label: 'Padrão', hint: 'Recomendado' },
  { value: 'comfortable', label: 'Confortável', hint: 'Mais legível' },
];

export const FontSizeToggle: React.FC = () => {
  const [pref, setPref] = useFontSize();
  return (
    <div
      role="radiogroup"
      aria-label="Tamanho da fonte"
      className="px-3 py-2.5 border-b border-blue-bright/10"
    >
      <p className="text-[10px] font-montserrat font-bold uppercase tracking-wider text-gold-light/70 mb-1.5 flex items-center gap-1.5">
        <Type className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
        Tamanho da fonte
      </p>
      <div className="flex gap-1">
        {OPTIONS.map((o) => {
          const active = pref === o.value;
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={active}
              title={o.hint}
              onClick={() => setPref(o.value)}
              className={`flex-1 px-2 py-1.5 rounded text-[10px] font-montserrat font-bold uppercase tracking-wider transition-all ${
                active
                  ? 'bg-gold/20 text-gold-light border border-gold/40'
                  : 'border border-blue-bright/15 text-text-secondary hover:text-foreground hover:border-blue-bright/30'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
