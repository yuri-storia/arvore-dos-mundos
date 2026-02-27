import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';

export const SubscriptionBanner: React.FC = () => {
  const sub = useSubscription();

  if (sub.loading) return null;

  if (!sub.plan) {
    return (
      <div className="mx-auto max-w-[1060px] px-4 mb-4">
        <div className="card-glass rounded-lg p-3 border-l-[3px] border-l-gold">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <span className="font-montserrat font-bold text-sm text-foreground">Sem plano ativo</span>
              <span className="block text-xs text-text-dim">Assine um plano para usar os recursos de IA.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const textsLeft = sub.textLimit - sub.textUsed;
  const imgsLeft = sub.imageLimit - sub.imageUsed;
  const textColor = textsLeft <= 0 ? 'text-red-alert' : textsLeft <= 5 ? 'text-gold-light' : 'text-blue-light';
  const imgColor = imgsLeft <= 0 ? 'text-red-alert' : imgsLeft <= 2 ? 'text-gold-light' : 'text-blue-light';

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-4">
      <div className="card-glass rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <span className="font-montserrat font-bold text-sm text-foreground">
              Plano <span className="uppercase">{sub.plan}</span>
            </span>
            <span className="block text-xs text-text-dim">Uso mensal de IA</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <span className="text-xs text-text-dim block">Textos</span>
            <span className={`font-montserrat font-bold text-sm ${textColor}`}>{textsLeft}/{sub.textLimit}</span>
          </div>
          <div className="text-center">
            <span className="text-xs text-text-dim block">Imagens</span>
            <span className={`font-montserrat font-bold text-sm ${imgColor}`}>{imgsLeft}/{sub.imageLimit}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
