import React from 'react';
import { Droplet, Check } from 'lucide-react';
import { qualityOptions, type GenSurface, type QualityTier } from '@/lib/imageQuality';

interface Props {
  surface: GenSurface;
  value: QualityTier;
  onChange: (tier: QualityTier) => void;
  disabled?: boolean;
  className?: string;
}

/** Escolha obrigatória de qualidade antes de qualquer geração visual. */
export const QualitySelector: React.FC<Props> = ({ surface, value, onChange, disabled, className }) => (
  <div className={className}>
    <div className="flex items-center justify-between mb-2">
      <span className="font-cinzel text-xs text-gold-light inline-flex items-center gap-2">
        <span className="w-1 h-3.5 bg-gradient-to-b from-gold to-transparent rounded-full" />
        Qualidade da geração
      </span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {qualityOptions(surface).map(opt => {
        const active = value === opt.tier;
        return (
          <button
            key={opt.tier}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.tier)}
            aria-pressed={active}
            className={`text-left rounded-xl border p-3 transition-all disabled:opacity-40 ${
              active
                ? 'border-gold/60 bg-gold/[0.07] shadow-[0_0_20px_rgba(218,165,32,0.18)]'
                : 'border-gold/15 bg-[rgba(4,12,24,0.5)] hover:border-gold/35'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`font-cinzel text-xs font-bold ${active ? 'text-gold-light' : 'text-foreground/85'}`}>
                {opt.label}
              </span>
              {active && <Check className="w-3.5 h-3.5 text-gold" strokeWidth={2.5} />}
            </div>
            <p className="font-merriweather italic text-[10px] text-text-dim leading-snug mb-2">{opt.description}</p>
            <span className="inline-flex items-center gap-1 font-montserrat text-[10px] font-semibold text-gold-champagne">
              <Droplet className="w-3 h-3" strokeWidth={1.75} />
              {opt.cost} gotas
            </span>
          </button>
        );
      })}
    </div>
  </div>
);
