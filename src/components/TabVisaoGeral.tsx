import React from 'react';
import { PencilLine, FileDown, Star } from 'lucide-react';
import { FRUITS, getOrderedFruits } from '@/lib/data';
import { getFruitProgress, getFruitsStarted, getFruitsComplete, getTotalProgress, exportWorldMarkdown } from '@/lib/helpers';
import { FRUIT_IMAGES } from '@/assets/fruitImages';
import type { AppState, TabType } from '@/lib/data';
import { useLatestAnalysis, getFruitScore } from '@/hooks/useLatestAnalysis';

interface Props {
  state: AppState;
  setActiveTab: (t: TabType) => void;
  setCurrentFruit: (id: number) => void;
}

export const TabVisaoGeral: React.FC<Props> = ({ state, setActiveTab, setCurrentFruit }) => {
  const { db, worldName, method, gallery, currentSaveId } = state;
  const stats = getTotalProgress(db);
  const started = getFruitsStarted(db);
  const complete = getFruitsComplete(db);
  const orderedFruits = getOrderedFruits(method);
  const { data: latestAnalysis } = useLatestAnalysis(currentSaveId);
  const fruitScores = latestAnalysis?.fruit_scores || {};
  const ratedFruits = FRUITS.filter(f => (fruitScores[String(f.id)] ?? 0) > 0).length;
  const avgScore = ratedFruits > 0
    ? FRUITS.reduce((acc, f) => acc + (fruitScores[String(f.id)] ?? 0), 0) / FRUITS.length
    : 0;
  const hasAnalysis = !!latestAnalysis && ratedFruits > 0;

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
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-6">
      <h1 className="font-cinzel font-bold text-xl sm:text-2xl md:text-3xl text-foreground mb-1">
        {worldName || 'Seu Mundo'}
      </h1>
      <p className="font-merriweather italic text-text-dim text-sm mb-6">Visão geral do seu worldbuilding</p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mb-6">
        {[
          { label: 'Frutos Iniciados', value: started },
          { label: 'Frutos Avaliados', value: hasAnalysis ? `${ratedFruits}/11` : '—' },
          { label: 'Avaliação Idriel', value: hasAnalysis ? `${avgScore.toFixed(1)}/5` : '—' },
          { label: 'Progresso (estrelas)', value: hasAnalysis ? `${Math.round((avgScore / 5) * 100)}%` : '—' },
          { label: 'Imagens na Galeria', value: gallery.length },
        ].map(s => (
          <div key={s.label} className="card-glass rounded-lg p-3 sm:p-4 text-center">
            <div className={`font-cinzel font-bold text-xl sm:text-2xl mb-1 ${typeof s.value === 'string' && s.value === '—' ? 'text-text-dim' : 'text-gold-light'}`}>{s.value}</div>
            <div className="text-[10px] sm:text-[11px] text-text-dim font-montserrat uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>
      {!hasAnalysis && (
        <p className="text-[11px] text-text-dim italic text-center mb-6 -mt-3">
          O progresso agora vem da <strong className="text-gold-light not-italic">Análise da Idriel</strong>. Gere uma análise no Codex para acompanhar suas estrelas.
        </p>
      )}

      {/* World summary */}
      {summaryFields.length > 0 && (
        <div className="card-glass-gold rounded-lg p-4 sm:p-5 mb-6">
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

      {/* Fruit progress grid — agora baseado na análise da Idriel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mb-6">
        {orderedFruits.map(f => {
          const score = fruitScores[String(f.id)] ?? 0;
          const status = score >= 5 ? 'mastered' : score >= 3 ? 'good' : score > 0 ? 'partial' : 'empty';
          const borderColor = status === 'mastered' ? 'border-l-gold-light' : status === 'good' ? 'border-l-gold' : status === 'partial' ? 'border-l-gold/60' : 'border-l-transparent';
          const barColor = status === 'mastered' ? 'bg-gold-light' : status === 'good' ? 'bg-gold' : status === 'partial' ? 'bg-gold/50' : 'bg-secondary';
          const barW = (score / 5) * 100;
          const coverImage = FRUIT_IMAGES[f.id];

          return (
            <button
              key={f.id}
              onClick={() => goToFruit(f.id)}
              className={`relative card-glass rounded-lg p-3 text-left border-l-[3px] ${borderColor} hover:border-blue-bright/50 transition-all group overflow-hidden`}
            >
              {coverImage ? (
                <div className="absolute inset-0 opacity-[0.08]">
                  <img src={coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-[0.05] rounded-lg`} />
              )}
              <span className="font-cinzel text-[10px] text-blue-light relative">{f.num}</span>
              <h4 className="font-montserrat font-bold text-xs text-foreground mb-2 relative">{f.name}</h4>
              <div className="h-[2px] bg-secondary rounded-full mb-1.5 relative">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${barW}%` }} />
              </div>
              <div className="flex justify-between items-center relative">
                <span className="inline-flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-2.5 h-2.5" strokeWidth={1.5}
                      style={{ color: 'hsl(var(--gold-light))', fill: i <= score ? 'hsl(var(--gold-light))' : 'transparent' }} />
                  ))}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  status === 'mastered' ? 'bg-gold-light/20 text-gold-light' :
                  status === 'good' ? 'bg-gold/20 text-gold-light' :
                  status === 'partial' ? 'bg-gold/10 text-gold-light/80' :
                  'bg-secondary text-text-dim'
                }`}>
                  {status === 'mastered' ? 'Maduro' : status === 'good' ? 'Vigoroso' : status === 'partial' ? 'Em flor' : hasAnalysis ? 'Não avaliado' : 'Sem análise'}
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
          <><PencilLine className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Continuar Construindo</>
        </button>
        <button
          onClick={() => exportWorldMarkdown(worldName, method, db)}
          className="px-5 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
        >
          <><FileDown className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Exportar PDF</>
        </button>
      </div>
    </div>
  );
};
