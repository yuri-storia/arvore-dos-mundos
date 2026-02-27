import React, { useState } from 'react';
import { FRUITS, getOrderedFruits, METHOD_DESCRIPTIONS, MethodType, GalleryImage } from '@/lib/data';
import { getFruitProgress, callAIText, exportWorldMarkdown } from '@/lib/helpers';
import { FRUIT_IMAGES } from '@/assets/fruitImages';
import { FruitGuideBlock } from '@/components/FruitGuideBlock';
import { ImageLightbox } from '@/components/ImageLightbox';
import type { AppState } from '@/lib/data';

interface Props {
  state: AppState;
  updateField: (fruitId: number, fieldId: string, value: string) => void;
  setCurrentFruit: (id: number) => void;
  setMethod: (m: MethodType) => void;
}

export const TabConstruir: React.FC<Props> = ({ state, updateField, setCurrentFruit, setMethod }) => {
  const { db, currentFruit, method, worldName } = state;
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [aiHelpField, setAiHelpField] = useState<string | null>(null);
  const [aiHelpQuestion, setAiHelpQuestion] = useState('');
  const [aiHelpResponse, setAiHelpResponse] = useState('');
  const [aiHelpLoading, setAiHelpLoading] = useState(false);

  const orderedFruits = getOrderedFruits(method);
  const fruitsStarted = FRUITS.filter(f => getFruitProgress(db, f.id).filled > 0).length;
  const totalPct = FRUITS.reduce((acc, f) => acc + getFruitProgress(db, f.id).filled, 0);
  const totalFields = FRUITS.reduce((acc, f) => acc + f.fields.length, 0);
  const pct = totalFields ? Math.round((totalPct / totalFields) * 100) : 0;

  const fruit = FRUITS[currentFruit];
  const currentOrderIndex = orderedFruits.findIndex(f => f.id === currentFruit);

  const handleConsult = async () => {
    setAiLoading(true);
    setAiResponse('');
    try {
      const fruitData = db[currentFruit] || {};
      const context = fruit.fields.map(f => `${f.label}: ${fruitData[f.id] || '(vazio)'}`).join('\n');
      const systemPrompt = `Você é um especialista em worldbuilding criativo, metodologia 'A Árvore dos Mundos' do Universo STORIA. Mundo: '${worldName || 'Sem nome'}'. Fruto atual: ${fruit.num} — ${fruit.name}. Metodologia: ${method === 'top-down' ? 'Cima para Baixo' : 'Baixo para Cima'}. Responda em português brasileiro. Seja específico, criativo e direto.`;
      const userMsg = `Contexto atual do Fruto:\n${context}\n\nPergunta: ${aiQuestion}`;
      const response = await callAIText(
        [{ role: 'user', content: userMsg }],
        systemPrompt
      );
      setAiResponse(response);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      setAiResponse(`❌ ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFieldAiHelp = async (fieldLabel: string) => {
    setAiHelpLoading(true);
    setAiHelpResponse('');
    try {
      const fruitData = db[currentFruit] || {};
      const context = fruit.fields.map(f => `${f.label}: ${fruitData[f.id] || '(vazio)'}`).join('\n');
      const systemPrompt = `Você é um especialista em worldbuilding criativo, metodologia 'A Árvore dos Mundos' do Universo STORIA. Mundo: '${worldName || 'Sem nome'}'. Fruto atual: ${fruit.num} — ${fruit.name}. Responda em português brasileiro. Seja específico, criativo e direto. Foque sua resposta no campo "${fieldLabel}".`;
      const userMsg = aiHelpQuestion.trim()
        ? `Contexto do Fruto:\n${context}\n\nCampo: ${fieldLabel}\nPergunta: ${aiHelpQuestion}`
        : `Contexto do Fruto:\n${context}\n\nMe ajude a preencher o campo "${fieldLabel}" com sugestões criativas e detalhadas.`;
      const response = await callAIText(
        [{ role: 'user', content: userMsg }],
        systemPrompt
      );
      setAiHelpResponse(response);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      setAiHelpResponse(`❌ ${e.message}`);
    } finally {
      setAiHelpLoading(false);
    }
  };

  const toggleAiHelp = (fieldId: string) => {
    if (aiHelpField === fieldId) {
      setAiHelpField(null);
      setAiHelpQuestion('');
      setAiHelpResponse('');
    } else {
      setAiHelpField(fieldId);
      setAiHelpQuestion('');
      setAiHelpResponse('');
    }
  };

  const selectFruit = (id: number) => {
    setCurrentFruit(id);
    setAiResponse('');
    setAiQuestion('');
    setActiveChip(null);
    setAiHelpField(null);
    setAiHelpQuestion('');
    setAiHelpResponse('');
  };

  const navigateFruit = (dir: -1 | 1) => {
    const newIdx = currentOrderIndex + dir;
    if (newIdx >= 0 && newIdx < orderedFruits.length) {
      selectFruit(orderedFruits[newIdx].id);
    }
  };

  const methodInfo = METHOD_DESCRIPTIONS[method];

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-6">
      {/* Method toggle */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        {(['top-down', 'bottom-up'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all ${
              method === m
                ? 'border border-blue-bright text-blue-bright bg-blue-main/20'
                : 'border border-blue-bright/20 text-text-dim hover:text-text-secondary'
            }`}
          >
            {METHOD_DESCRIPTIONS[m].title}
          </button>
        ))}
      </div>

      {/* Method description */}
      <div className="mb-5 p-3 rounded-md bg-blue-bright/[0.04] border border-blue-bright/10">
        <p className="font-merriweather italic text-text-secondary text-xs leading-relaxed">
          {methodInfo.desc}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="relative h-[3px] bg-secondary rounded-full overflow-hidden mb-1">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-main to-blue-bright rounded-full shadow-[0_0_10px_rgba(33,150,243,0.5)]"
            style={{ width: `${pct}%`, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </div>
        <div className="flex justify-between text-xs text-text-dim">
          <span>{fruitsStarted} de 11 frutos iniciados</span>
          <span className="text-blue-light font-bold">{pct}%</span>
        </div>
      </div>

      {/* Fruit grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
        {orderedFruits.map((f, idx) => {
          const fp = getFruitProgress(db, f.id);
          const isActive = currentFruit === f.id;
          const isComplete = fp.filled === fp.total;
          const coverImage = FRUIT_IMAGES[f.id];
          return (
            <button
              key={f.id}
              onClick={() => selectFruit(f.id)}
              className={`relative aspect-[3/4] rounded-lg overflow-hidden transition-all group ${
                isActive
                  ? 'border border-blue-bright shadow-[0_0_20px_rgba(33,150,243,0.3),inset_0_0_30px_rgba(33,150,243,0.1)]'
                  : 'border border-transparent hover:border-blue-bright/30'
              }`}
            >
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={f.name}
                  className={`absolute inset-0 w-full h-full object-cover ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'} transition-opacity`}
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'} transition-opacity`} />
              )}
              {!coverImage && (
                <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">{f.icon}</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-blue-light font-montserrat font-bold">
                {idx + 1}º
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <span className="font-cinzel text-[9px] sm:text-[10px] text-blue-light block">{f.num}</span>
                <span className="font-montserrat font-bold text-[10px] sm:text-[11px] text-foreground uppercase leading-tight block">{f.name}</span>
                {fp.filled > 0 && !isComplete && (
                  <span className="text-[9px] sm:text-[10px] text-gold-light">{fp.filled}/{fp.total} campos</span>
                )}
              </div>
              {isComplete && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white">✓</div>
              )}
              <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-blue-bright transition-transform origin-left ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
            </button>
          );
        })}
      </div>

      {/* Fruit panel */}
      {fruit && (
        <div key={currentFruit} className="animate-fadeUp card-glass rounded-lg overflow-hidden">
          {/* Hero */}
          <div className="relative h-[140px] sm:h-[200px]">
            {FRUIT_IMAGES[fruit.id] ? (
              <img src={FRUIT_IMAGES[fruit.id]} alt={fruit.name} className="absolute inset-0 w-full h-full object-cover opacity-50" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${fruit.gradient}`}>
                <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-20">{fruit.icon}</div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(6,14,28,0.95)] via-transparent to-transparent" />
          </div>

          <div className="p-4 sm:p-5 md:p-7">
            <span className="font-cinzel text-xs text-blue-light">✦ {fruit.num}</span>
            <h2 className="font-cinzel font-bold text-xl sm:text-2xl text-foreground mt-1 mb-1">{fruit.name}</h2>
            <p className="font-merriweather italic text-text-dim text-sm mb-6">{fruit.desc}</p>

            <FruitGuideBlock guide={fruit.guide} />

            {/* Gallery images */}
            {(() => {
              const fruitTag = `Fruto: ${fruit.name}`;
              const fruitImages = state.gallery.filter(img => img.cat === fruitTag);
              if (fruitImages.length === 0) return null;
              return (
                <div className="mb-6">
                  <h3 className="font-montserrat font-bold text-xs uppercase tracking-wider text-gold mb-2">🖼 Referências deste Fruto</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {fruitImages.map(img => (
                      <div key={img.id} className="rounded-lg overflow-hidden border border-gold/20 hover:border-gold/50 transition-colors">
                        <img
                          src={img.src}
                          alt={img.name}
                          className="w-full h-[80px] sm:h-[100px] object-cover cursor-zoom-in"
                          onClick={() => setLightbox({ src: img.src, alt: img.name })}
                        />
                        <p className="text-[9px] text-text-dim font-montserrat p-1 truncate">{img.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {fruit.fields.map(field => (
                <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] uppercase tracking-wider text-blue-light font-montserrat font-bold">
                      {field.label}
                    </label>
                    <button
                      onClick={() => toggleAiHelp(field.id)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-montserrat font-bold transition-all ${
                        aiHelpField === field.id
                          ? 'bg-gold/20 text-gold border border-gold/40 shadow-[0_0_8px_rgba(200,146,42,0.3)]'
                          : 'text-gold/60 hover:text-gold hover:bg-gold/10 border border-transparent hover:border-gold/20'
                      }`}
                    >
                      <span className={`text-sm ${aiHelpField === field.id ? 'animate-pulse' : ''}`} style={{ filter: aiHelpField === field.id ? 'drop-shadow(0 0 4px rgba(232,184,75,0.8))' : 'drop-shadow(0 0 2px rgba(232,184,75,0.4))' }}>💡</span>
                      Modo Ajuda AI
                    </button>
                  </div>
                  {field.type === 'select' ? (
                    <select
                      value={db[currentFruit]?.[field.id] || ''}
                      onChange={e => updateField(currentFruit, field.id, e.target.value)}
                      className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 border-b-blue-bright/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none focus:border-blue-bright/50"
                    >
                      <option value="">Selecione…</option>
                      {field.opts?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={db[currentFruit]?.[field.id] || ''}
                      onChange={e => updateField(currentFruit, field.id, e.target.value)}
                      placeholder={field.ph}
                      rows={4}
                      className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 border-b-blue-bright/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-blue-bright/50 resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      value={db[currentFruit]?.[field.id] || ''}
                      onChange={e => updateField(currentFruit, field.id, e.target.value)}
                      placeholder={field.ph}
                      className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 border-b-blue-bright/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-blue-bright/50"
                    />
                  )}
                  {/* AI Help panel for this field */}
                  {aiHelpField === field.id && (
                    <div className="animate-fadeUp mt-2 p-3 rounded-lg border border-gold/20 bg-gold/[0.04]">
                      <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <input
                          type="text"
                          value={aiHelpQuestion}
                          onChange={e => setAiHelpQuestion(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleFieldAiHelp(field.label)}
                          placeholder={`Pergunte algo sobre "${field.label}" ou clique para sugestão automática…`}
                          className="flex-1 bg-[rgba(4,12,24,0.6)] border border-gold/20 rounded-md px-3 py-1.5 text-xs text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/60 focus:outline-none focus:border-gold/40"
                        />
                        <button
                          onClick={() => handleFieldAiHelp(field.label)}
                          disabled={aiHelpLoading}
                          className="px-3 py-1.5 bg-gold/80 hover:bg-gold text-background rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-colors whitespace-nowrap"
                        >
                          💡 {aiHelpQuestion.trim() ? 'Perguntar' : 'Sugerir'}
                        </button>
                      </div>
                      {aiHelpLoading && (
                        <div className="flex items-center gap-1 text-gold/70 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce-2" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce-3" />
                          <span className="ml-2 font-merriweather italic text-[10px]">Consultando IA…</span>
                        </div>
                      )}
                      {aiHelpResponse && !aiHelpLoading && (
                        <div className="border-l-2 border-gold/40 pl-3 py-2 bg-gold/[0.03] rounded-r-md">
                          <span className="font-cinzel text-[9px] text-gold block mb-1">💡 Sugestão da IA</span>
                          <p className="font-merriweather text-xs text-foreground whitespace-pre-wrap leading-relaxed">{aiHelpResponse}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* AI Assistant */}
            <div className="border-t border-blue-bright/15 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-bright animate-blink" />
                <span className="font-montserrat font-bold text-xs text-foreground">Assistente de Worldbuilding</span>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {fruit.chips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => { setAiQuestion(chip); setActiveChip(chip); }}
                    className={`px-3 py-1 rounded-full text-xs font-montserrat transition-all ${
                      activeChip === chip
                        ? 'border border-blue-bright text-blue-bright bg-blue-main/15'
                        : 'border border-blue-bright/20 text-text-dim hover:text-text-secondary hover:border-blue-bright/30'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Question input */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && aiQuestion.trim() && handleConsult()}
                  placeholder="Faça uma pergunta ao assistente…"
                  className="flex-1 bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-blue-bright/50"
                />
                <button
                  onClick={handleConsult}
                  disabled={!aiQuestion.trim() || aiLoading}
                  className="px-4 py-2 bg-blue-main hover:bg-blue-bright text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  ✦ Consultar
                </button>
              </div>

              {aiLoading && (
                <div className="flex items-center gap-1 text-text-dim text-sm mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-light dot-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-light dot-bounce-2" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-light dot-bounce-3" />
                  <span className="ml-2 font-merriweather italic text-xs">Consultando IA…</span>
                </div>
              )}

              {aiResponse && !aiLoading && (
                <div className="animate-fadeUp border-l-[3px] border-blue-bright pl-4 py-3 bg-blue-bright/5 rounded-r-md">
                  <span className="font-cinzel text-[10px] text-blue-light block mb-2">✦ Resposta da IA</span>
                  <p className="font-merriweather text-sm text-foreground whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-5 border-t border-blue-bright/15">
              <button
                onClick={() => navigateFruit(-1)}
                disabled={currentOrderIndex <= 0}
                className="px-3 sm:px-4 py-2 rounded-md text-xs font-montserrat font-bold text-text-dim border border-blue-bright/15 hover:text-foreground hover:border-blue-bright/30 disabled:opacity-30 transition-all"
              >
                ← Anterior
              </button>
              {currentOrderIndex < orderedFruits.length - 1 ? (
                <button
                  onClick={() => navigateFruit(1)}
                  className="px-4 sm:px-5 py-2 bg-blue-main hover:bg-blue-bright text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
                >
                  Próximo Fruto →
                </button>
              ) : (
                <button
                  onClick={() => exportWorldMarkdown(worldName, method, db)}
                  className="px-4 sm:px-5 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
                >
                  🌳 Exportar Mundo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
};
