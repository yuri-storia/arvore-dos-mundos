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
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-blue-bright/[0.03] transition-colors"
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
          📖 Orientação | Mínimo Mundo Viável + Estudo de Caso
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

          {/* Passo a Passo */}
          {guide.steps && guide.steps.length > 0 && (
            <div className="mt-3">
              <span
                className="font-montserrat font-bold uppercase text-[0.58rem] tracking-[0.1em] block mb-2"
                style={{ color: '#c8922a' }}
              >
                🗺 Passo a Passo
              </span>
              <ol className="space-y-1.5 pl-1">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span
                      className="font-montserrat font-bold text-[0.65rem] mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(200,146,42,0.15)', color: '#c8922a' }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="font-merriweather leading-[1.65]"
                      style={{ color: '#b0c8e4', fontSize: '0.7rem' }}
                    >
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Separator */}
          <div className="my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Estudo de Caso */}
          <p
            className="font-merriweather italic leading-[1.7] whitespace-pre-line"
            style={{ color: '#b0c8e4', fontSize: '0.72rem' }}
          >
            {guide.ref}
          </p>

          {/* Closing quote */}
          {guide.closing && (
            <>
              <div className="my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
              <p
                className="font-cinzel italic text-center leading-[1.7]"
                style={{ color: '#c8922a', fontSize: '0.7rem' }}
              >
                "{guide.closing}"
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
