import React from 'react';
import { getDailyUsage } from '@/lib/helpers';

export const DailyLimitBanner: React.FC = () => {
  const usage = getDailyUsage();
  const textsLeft = 15 - usage.text;
  const imgsLeft = 3 - usage.img;

  const textColor = textsLeft <= 0 ? 'text-red-alert' : textsLeft <= 3 ? 'text-gold-light' : 'text-amber-light';
  const imgColor = imgsLeft <= 0 ? 'text-red-alert' : imgsLeft <= 1 ? 'text-gold-light' : 'text-amber-light';

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-4">
      <div className="card-glass rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <span className="font-montserrat font-bold text-sm text-foreground">Uso Diário de IA</span>
            <span className="block text-xs text-text-dim">Resets à meia-noite</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <span className="text-xs text-text-dim block">Textos</span>
            <span className={`font-montserrat font-bold text-sm ${textColor}`}>{textsLeft}/15</span>
          </div>
          <div className="text-center">
            <span className="text-xs text-text-dim block">Imagens</span>
            <span className={`font-montserrat font-bold text-sm ${imgColor}`}>{imgsLeft}/3</span>
          </div>
        </div>
      </div>
    </div>
  );
};
