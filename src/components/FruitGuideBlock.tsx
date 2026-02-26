import React, { useState } from 'react';
import type { FruitGuide } from '@/lib/data';

interface Props {
  guide: FruitGuide;
}

export const FruitGuideBlock: React.FC<Props> = ({ guide }) => {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="mb-6 rounded-r-sm overflow-hidden"
      style={{
        background: 'rgba(4,10,20,0.5)',
        border: '1px solid rgba(33,150,243,0.14)',
        borderLeft: '3px solid rgba(200,146,42,0.5)',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <span
          className="text-[10px] transition-transform duration-200"
          style={{
            color: '#c8922a',
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ▶
        </span>
        <span
          className="font-montserrat font-bold uppercase text-[0.6rem] tracking-[0.12em]"
          style={{ color: '#c8922a' }}
        >
          📖 Orientação do Livro — Mínimo Mundo Viável + Estudo de Caso
        </span>
      </button>

      {open && (
        <div className="animate-fadeUp px-4 pb-4">
          {/* Mínimo Mundo Viável */}
          <p
            className="font-merriweather leading-[1.7]"
            style={{ color: '#64b5f6', fontSize: '0.72rem' }}
          >
            {guide.min}
          </p>

          {/* Separator */}
          <div className="my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Estudo de Caso */}
          <p
            className="font-merriweather italic leading-[1.7] whitespace-pre-line"
            style={{ color: '#b0c8e4', fontSize: '0.72rem' }}
          >
            {guide.ref}
          </p>
        </div>
      )}
    </div>
  );
};
