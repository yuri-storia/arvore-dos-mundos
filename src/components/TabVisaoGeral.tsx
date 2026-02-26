import React from 'react';
import { FRUITS } from '@/lib/data';
import { getFruitProgress, getFruitsStarted, getFruitsComplete, getTotalProgress, exportWorldMarkdown } from '@/lib/helpers';
import type { AppState, TabType } from '@/lib/data';

interface Props {
  state: AppState;
  setActiveTab: (t: TabType) => void;
  setCurrentFruit: (id: number) => void;
}

export const TabVisaoGeral: React.FC<Props> = ({ state, setActiveTab, setCurrentFruit }) => {
  const { db, worldName, method, gallery } = state;
  const stats = getTotalProgress(db);
  const started = getFruitsStarted(db);
  const complete = getFruitsComplete(db);

  const summaryFields = [
    { label: 'Regiões', value: db[0]?.continents },
    { label: 'Governo', value: db[1]?.govtype },
    { label: 'Magia', value: db[4]?.magictype || db[4]?.magicrules },
    { label: 'Protagonista', value: db[9]?.protagonist },
    { label: 'Deuses', value: db[8]?.gods },
    { label: 'Tom', value: db[10]?.tone },
  ].filter(f => f.value?.trim());

  const goToFruit = (id: number) => {
    setCurrentFruit(id);
    setActiveTab('construir');
  };

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-4 py-6">
      {/* Header */}
      <h1 className="font-cinzel font-bold text-2xl md:text-3xl text-foreground mb-1">
        {worldName || 'Seu Mundo'}
      </h1>
      <p className="font-merriweather italic text-text-dim text-sm mb-6">Visão geral do seu worldbuilding</p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Frutos Iniciados', value: started },
          { label: 'Completos', value: complete },
          { label: 'Campos Preenchidos', value: stats.filled },
          { label: 'Progresso Total', value: `${stats.pct}%` },
          { label: 'Imagens na Galeria', value: gallery.length },
        ].map(s => (
          <div key={s.label} className="card-glass rounded-lg p-4 text-center">
            <div className="font-cinzel font-bold text-2xl text-blue-bright mb-1">{s.value}</div>
            <div className="text-[11px] text-text-dim font-montserrat uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* World summary */}
      {summaryFields.length > 0 && (
        <div className="card-glass-gold rounded-lg p-5 mb-6">
          <h3 className="font-cinzel font-bold text-sm text-gold-light mb-3">Resumo do Mundo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summaryFields.map(f => (
              <div key={f.label}>
                <span className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">{f.label}</span>
                <p className="text-sm text-foreground font-merriweather line-clamp-2">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fruit progress grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        {FRUITS.map(f => {
          const p = getFruitProgress(db, f.id);
          const status = p.filled === p.total ? 'complete' : p.filled > 0 ? 'partial' : 'empty';
          const borderColor = status === 'complete' ? 'border-l-blue-bright' : status === 'partial' ? 'border-l-gold' : 'border-l-transparent';
          const barColor = status === 'complete' ? 'bg-blue-bright' : status === 'partial' ? 'bg-gold' : 'bg-secondary';
          const barW = p.total ? (p.filled / p.total) * 100 : 0;

          return (
            <button
              key={f.id}
              onClick={() => goToFruit(f.id)}
              className={`relative card-glass rounded-lg p-3 text-left border-l-[3px] ${borderColor} hover:border-blue-bright/50 transition-all group`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-[0.05] rounded-lg`} />
              <span className="font-cinzel text-[10px] text-blue-light">{f.num}</span>
              <h4 className="font-montserrat font-bold text-xs text-foreground mb-2">{f.name}</h4>
              <div className="h-[2px] bg-secondary rounded-full mb-1.5">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${barW}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-text-dim">{p.filled} de {p.total} campos</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  status === 'complete' ? 'bg-blue-bright/20 text-blue-light' :
                  status === 'partial' ? 'bg-gold/20 text-gold-light' :
                  'bg-secondary text-text-dim'
                }`}>
                  {status === 'complete' ? 'Completo' : status === 'partial' ? 'Em andamento' : 'Não iniciado'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setActiveTab('construir')}
          className="px-5 py-2 bg-blue-main hover:bg-blue-bright text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
        >
          ✏️ Continuar Construindo
        </button>
        <button
          onClick={() => exportWorldMarkdown(worldName, method, db)}
          className="px-5 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
        >
          🌳 Exportar (.md)
        </button>
      </div>
    </div>
  );
};
