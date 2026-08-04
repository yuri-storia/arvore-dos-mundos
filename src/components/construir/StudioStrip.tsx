import React from 'react';
import { METHOD_DESCRIPTIONS, type MethodType } from '@/lib/data';
import { DropsCounterBadge } from '@/components/DropsCounterBadge';

interface Props {
  worldName: string;
  method: MethodType;
  setMethod: (m: MethodType) => void;
}

/**
 * Faixa horizontal única do Estúdio de Criação:
 * título do mundo · seletor de abordagem · Elixir dos Mundos.
 * Recupera espaço vertical unindo três blocos que antes eram empilhados.
 */
export const StudioStrip: React.FC<Props> = ({ worldName, method, setMethod }) => (
  <div className="mb-3">
    <h1 className="font-cinzel font-bold text-lg sm:text-xl text-center text-gold-light uppercase tracking-[0.18em] truncate mb-2">
      {worldName || 'Mundo sem nome'}
    </h1>

    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-xl border border-gold/15 bg-[rgba(4,10,20,0.6)] backdrop-blur-md px-3 py-2.5">
      <div data-tour="method-selector" className="flex items-center gap-1 p-0.5 rounded-full border border-blue-bright/20 bg-blue-main/10 shrink-0 self-start sm:self-auto">
        {(['top-down', 'bottom-up'] as const).map(m => (
          <button
            key={m}
            data-tour={m === 'bottom-up' ? 'method-bottom-up' : undefined}
            onClick={() => setMethod(m)}
            title={METHOD_DESCRIPTIONS[m].desc}
            className={`px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              method === m
                ? 'bg-blue-main/40 text-blue-light shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                : 'text-text-dim hover:text-text-secondary'
            }`}
          >
            {METHOD_DESCRIPTIONS[m].title}
          </button>
        ))}
      </div>

      <div className="hidden sm:block w-px h-7 bg-gold/15 shrink-0" />

      <DropsCounterBadge inline />
    </div>
  </div>
);
