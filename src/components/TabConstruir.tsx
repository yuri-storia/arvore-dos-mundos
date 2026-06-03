import React, { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import idrielAvatar from '@/assets/idriel-avatar.png';
import { FRUITS, getOrderedFruits, METHOD_DESCRIPTIONS, MethodType, GalleryImage } from '@/lib/data';
import { getFruitProgress, callAIText, exportWorldMarkdown, summarizeIdrielResponse, friendlyAIError } from '@/lib/helpers';
import { FRUIT_IMAGES } from '@/assets/fruitImages';
import { FruitGuideBlock } from '@/components/FruitGuideBlock';
import { ImageLightbox } from '@/components/ImageLightbox';
import { CreateFichaButton } from '@/components/CreateFichaButton';
import { MapGenerator } from '@/components/MapGenerator';
import { useCodexEntries } from '@/hooks/useCodexEntries';
import { useIdrielHistory } from '@/hooks/useIdrielHistory';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AppState } from '@/lib/data';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useNavigate } from 'react-router-dom';
import { History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  state: AppState;
  updateField: (fruitId: number, fieldId: string, value: string) => void;
  setCurrentFruit: (id: number) => void;
  setMethod: (m: MethodType) => void;
  onNavigateCodex?: () => void;
}

export const TabConstruir: React.FC<Props> = ({ state, updateField, setCurrentFruit, setMethod, onNavigateCodex }) => {
  const isMobile = useIsMobile();
  const { db, currentFruit, method, worldName, currentSaveId } = state;
  const { entries, createEntry, updateEntry } = useCodexEntries(currentSaveId || undefined);
  const { suggestions, saveSuggestion, deleteSuggestion } = useIdrielHistory(currentSaveId, currentFruit);
  const planLimits = usePlanLimits();
  const navigate = useNavigate();
  const draftKey = `idriel_draft_${currentSaveId}_${currentFruit}`;
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const magictypeArticleRef = useRef<string | null>(null);
  const [showMagictypeCreated, setShowMagictypeCreated] = useState(false);
  const [showMagictypeUpdate, setShowMagictypeUpdate] = useState(false);
  const [pendingMagictypeValue, setPendingMagictypeValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [savingAs, setSavingAs] = useState<null | 'ficha' | 'artigo'>(null);
  const [saveDraft, setSaveDraft] = useState({ title: '', content: '' });
  const [saveLoading, setSaveLoading] = useState(false);

  // Restore aiQuestion draft per fruit/world
  useEffect(() => {
    if (!currentSaveId) return;
    const saved = localStorage.getItem(draftKey);
    if (saved) setAiQuestion(saved);
    else setAiQuestion('');
  }, [draftKey, currentSaveId]);

  useEffect(() => {
    if (!currentSaveId) return;
    if (aiQuestion) localStorage.setItem(draftKey, aiQuestion);
    else localStorage.removeItem(draftKey);
  }, [aiQuestion, draftKey, currentSaveId]);

  const handleOpenSaveDialog = async (kind: 'ficha' | 'artigo', sourceText?: string) => {
    const text = sourceText ?? aiResponse;
    if (!text.trim()) return;
    setSavingAs(kind);
    setSaveLoading(true);
    setSaveDraft({ title: `${FRUITS[currentFruit].name} — sugestão de Idriel`, content: '⏳ Resumindo…' });
    try {
      const summary = await summarizeIdrielResponse(text, kind);
      setSaveDraft(prev => ({ ...prev, content: summary }));
    } catch (e: any) {
      toast.error(e.message || 'Erro ao resumir');
      setSaveDraft(prev => ({ ...prev, content: text }));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!savingAs || !saveDraft.title.trim() || !saveDraft.content.trim()) return;
    await createEntry({
      title: saveDraft.title.trim(),
      content: saveDraft.content.trim(),
      entry_type: savingAs,
      fruit_id: currentFruit,
    });
    toast.success(`${savingAs === 'ficha' ? 'Ficha' : 'Artigo'} criado no Codex!`);
    setSavingAs(null);
    setSaveDraft({ title: '', content: '' });
  };


  // Fruits that generate fichas
  const FICHA_FRUITS = [0, 5, 9]; // Mapa do Mundo, Seres Fantásticos, Personagens

  const getEntryTypeForField = (fruitId: number, fieldId: string): 'ficha' | 'artigo' => {
    if (FICHA_FRUITS.includes(fruitId)) return 'ficha';
    if (fruitId === 3 && fieldId === 'items') return 'ficha';
    return 'artigo';
  };

  // Handle magictype auto-article creation/update
  const handleMagictypeChange = async (value: string) => {
    if (!value) {
      updateField(4, 'magictype', value);
      return;
    }
    const existing = entries.find(e => 
      e.fruit_id === 4 && e.entry_type === 'artigo' && e.content?.startsWith('__magictype__')
    );
    if (existing) {
      setPendingMagictypeValue(value);
      setShowMagictypeUpdate(true);
    } else {
      updateField(4, 'magictype', value);
      await createEntry({
        title: value,
        content: `__magictype__\n\nTipo de sistema mágico selecionado: ${value}`,
        entry_type: 'artigo',
        fruit_id: 4,
      });
      setShowMagictypeCreated(true);
    }
  };

  const handleConfirmMagictypeUpdate = async () => {
    updateField(4, 'magictype', pendingMagictypeValue);
    const existing = entries.find(e => 
      e.fruit_id === 4 && e.entry_type === 'artigo' && e.content?.startsWith('__magictype__')
    );
    if (existing) {
      await updateEntry(existing.id, { 
        title: pendingMagictypeValue,
        content: `__magictype__\n\nTipo de sistema mágico selecionado: ${pendingMagictypeValue}`,
      });
    }
    setShowMagictypeUpdate(false);
  };

  const handleSkipMagictypeUpdate = () => {
    updateField(4, 'magictype', pendingMagictypeValue);
    setShowMagictypeUpdate(false);
  };

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
      const systemPrompt = `Você é Idriel, a Guardiã da Árvore dos Mundos — uma sábia ancestral de aparência élfica que observa os mundos florescerem através dos Frutos da criação. Você fala com elegância, sabedoria profunda e encorajamento maternal. Mundo: '${worldName || 'Sem nome'}'. Fruto atual: ${fruit.num} — ${fruit.name}. Metodologia: ${method === 'top-down' ? 'Cima para Baixo' : 'Baixo para Cima'}. Responda em português brasileiro. Seja específica, criativa e encantada com a criação do usuário.`;
      const userMsg = `Contexto atual do Fruto:\n${context}\n\nPergunta: ${aiQuestion}`;
      const response = await callAIText(
        [{ role: 'user', content: userMsg }],
        systemPrompt
      );
      setAiResponse(response);
      if (response && !response.startsWith('❌')) {
        await saveSuggestion(aiQuestion, response);
      }
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      const f = friendlyAIError(e?.message || '');
      setAiResponse(`❌ ${f.title}\n\n${f.hint}`);
    } finally {
      setAiLoading(false);
    }
  };

  const selectFruit = (id: number) => {
    setCurrentFruit(id);
    setAiResponse('');
    setAiQuestion('');
    setActiveChip(null);
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
      <div data-tour="method-selector" className="flex flex-col sm:flex-row gap-2 mb-3">
        {(['top-down', 'bottom-up'] as const).map(m => (
          <button
            key={m}
            data-tour={m === 'bottom-up' ? 'method-bottom-up' : undefined}
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
      <div className="mb-5 p-3.5 rounded-md bg-blue-bright/[0.04] border border-blue-bright/10">
        <p className="font-merriweather italic text-text-secondary text-sm leading-relaxed">
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
      <div data-tour="fruit-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
        {orderedFruits.map((f, idx) => {
          const fp = getFruitProgress(db, f.id);
          const isActive = currentFruit === f.id;
          const isComplete = fp.filled === fp.total;
          const coverImage = FRUIT_IMAGES[f.id];
          return (
            <button
              key={f.id}
              onClick={() => {
                selectFruit(f.id);
                if (isMobile) {
                  setTimeout(() => {
                    document.getElementById('fruit-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 150);
                }
              }}
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
                <div className="absolute inset-0 flex items-center justify-center opacity-30"><f.Icon className="w-10 h-10 text-gold-champagne" strokeWidth={1.5} /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-blue-light font-montserrat font-bold">
                {idx + 1}º
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <span className="font-cinzel text-[10px] sm:text-xs text-blue-light block">{f.num}</span>
                <span className="font-montserrat font-bold text-[11px] sm:text-xs text-foreground uppercase leading-tight block">{f.name}</span>
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
        <div id="fruit-panel" key={currentFruit} className="animate-fadeUp card-glass rounded-lg overflow-hidden">
          {/* Hero */}
          <div className="relative h-[140px] sm:h-[200px]">
            {FRUIT_IMAGES[fruit.id] ? (
              <img src={FRUIT_IMAGES[fruit.id]} alt={fruit.name} className="absolute inset-0 w-full h-full object-cover opacity-50" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${fruit.gradient}`}>
                <div className="absolute inset-0 flex items-center justify-center opacity-20"><fruit.Icon className="w-28 h-28 text-gold-champagne" strokeWidth={1.25} /></div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(6,14,28,0.95)] via-transparent to-transparent" />
          </div>

          <div className="p-4 sm:p-5 md:p-7">
            <span className="font-cinzel text-sm text-blue-light">✦ {fruit.num}</span>
            <h2 className="font-cinzel font-bold text-2xl sm:text-3xl text-foreground mt-1 mb-1">{fruit.name}</h2>
            <p className="font-merriweather italic text-text-dim text-[15px] leading-relaxed mb-4">{fruit.desc}</p>

            {/* Idriel methodology note */}
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-lg bg-idriel/[0.04] border border-idriel/15">
              <img src={idrielAvatar} alt="Idriel" className="w-7 h-7 rounded-full object-cover border border-idriel/30 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-merriweather italic text-sm text-text-secondary leading-relaxed">
                  {method === 'top-down'
                    ? `Este é o ${orderedFruits.findIndex(f => f.id === currentFruit) + 1}º passo na abordagem "De Cima para Baixo" — construímos do panorama geral aos detalhes. Se preferir começar pelos personagens e expandir, experimente "De Baixo para Cima".`
                    : `Este é o ${orderedFruits.findIndex(f => f.id === currentFruit) + 1}º passo na abordagem "De Baixo para Cima" — partimos dos personagens e expandimos o mundo conforme a história pede. Se preferir começar pela visão geral, experimente "De Cima para Baixo".`
                  }
                </p>
              </div>
            </div>

            <FruitGuideBlock guide={fruit.guide} id="orientacoes-idriel" fruitId={fruit.id} />

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

            {/* Fields — simplified, no per-field AI buttons */}
            <div className="space-y-4 mb-8">
              {fruit.fields.map(field => {
                const isMagictype = currentFruit === 4 && field.id === 'magictype';
                const entryType = getEntryTypeForField(currentFruit, field.id);

                return (
                  <div key={field.id}>
                    <label className="block text-xs uppercase tracking-wider text-blue-light font-montserrat font-bold mb-1.5">
                      {field.label}
                    </label>

                    {isMagictype ? (
                      <select
                        value={db[currentFruit]?.[field.id] || ''}
                        onChange={e => handleMagictypeChange(e.target.value)}
                        className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none focus:border-blue-bright/50"
                      >
                        <option value="">Selecione…</option>
                        {field.opts?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <CreateFichaButton
                        fieldValue={db[currentFruit]?.[field.id] || ''}
                        fieldLabel={field.label}
                        fruitId={currentFruit}
                        entryType={entryType}
                        onCreated={(action) => action === 'codex' && onNavigateCodex?.()}
                      >
                        {field.type === 'select' ? (
                          <select
                            value={db[currentFruit]?.[field.id] || ''}
                            onChange={e => updateField(currentFruit, field.id, e.target.value)}
                            className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 border-b-0 rounded-t-md px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none focus:border-blue-bright/50"
                          >
                            <option value="">Selecione…</option>
                            {field.opts?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <textarea
                            value={db[currentFruit]?.[field.id] || ''}
                            onChange={e => updateField(currentFruit, field.id, e.target.value)}
                            placeholder={field.ph}
                            rows={3}
                            className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 border-b-0 rounded-t-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-blue-bright/50 resize-y"
                          />
                        )}
                      </CreateFichaButton>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Conditional bottom section: Map generator for fruit 0, Idriel for others */}
            {currentFruit === 0 ? (
              <MapGenerator worldName={worldName} db={db} />
            ) : planLimits.canUseAI ? (
              <div data-tour="consult-idriel" className="border-t border-idriel/15 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-idriel-light animate-blink" />
                  <span className="font-cinzel font-bold text-xs text-idriel-light">🌳 Consultar Idriel</span>
                  <span className="font-merriweather italic text-[10px] text-text-dim">— Guardiã da Árvore dos Mundos</span>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {fruit.chips.map(chip => (
                    <button
                      key={chip}
                      onClick={() => { setAiQuestion(chip); setActiveChip(chip); }}
                      className={`px-3 py-1 rounded-full text-xs font-montserrat transition-all ${
                        activeChip === chip
                          ? 'border border-idriel-light text-idriel-light bg-idriel/15'
                          : 'border border-idriel/20 text-text-dim hover:text-text-secondary hover:border-idriel/30'
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
                    placeholder="Faça uma pergunta a Idriel sobre este fruto…"
                    className="flex-1 bg-idriel/[0.04] border border-idriel/20 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-idriel/50"
                  />
                  <button
                    onClick={handleConsult}
                    disabled={!aiQuestion.trim() || aiLoading}
                    className="px-4 py-2 bg-idriel-dim hover:bg-idriel text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    🌿 Consultar Idriel
                  </button>
                </div>

                {aiLoading && (
                  <div className="flex items-center gap-1 text-text-dim text-sm mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-idriel-light dot-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-idriel-light dot-bounce-2" />
                    <span className="w-1.5 h-1.5 rounded-full bg-idriel-light dot-bounce-3" />
                    <span className="ml-2 font-merriweather italic text-xs">Idriel contempla os galhos da Árvore…</span>
                  </div>
                )}

                {aiResponse && !aiLoading && (
                  <div className="animate-fadeUp border-l-[3px] border-idriel-light pl-4 py-3 bg-idriel/[0.04] rounded-r-md">
                    <span className="font-cinzel text-[10px] text-idriel-light block mb-2">🌿 Idriel responde</span>
                    <p className="font-merriweather text-sm text-foreground/95 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-idriel/15">
                      <button
                        onClick={() => handleOpenSaveDialog('ficha')}
                        className="px-3 py-1.5 rounded-md text-[11px] font-montserrat font-bold uppercase tracking-wider border border-idriel/40 text-idriel-light hover:bg-idriel/15 transition-colors"
                      >
                        💾 Salvar como Ficha
                      </button>
                      <button
                        onClick={() => handleOpenSaveDialog('artigo')}
                        className="px-3 py-1.5 rounded-md text-[11px] font-montserrat font-bold uppercase tracking-wider border border-idriel/40 text-idriel-light hover:bg-idriel/15 transition-colors"
                      >
                        💾 Salvar como Artigo
                      </button>
                    </div>
                  </div>
                )}

                {/* History toggle */}
                {suggestions.length > 0 && (
                  <button
                    onClick={() => setShowHistory(true)}
                    className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-montserrat text-text-dim border border-idriel/20 hover:text-idriel-light hover:border-idriel/40 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    📜 Histórico de Idriel ({suggestions.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="border-t border-idriel/15 pt-6">
                <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-5 text-center">
                  <span className="text-2xl block mb-2">🌳</span>
                  <h4 className="font-cinzel font-bold text-sm text-gold-light mb-1">Consultar Idriel</h4>
                  <p className="font-merriweather italic text-text-dim text-xs mb-3">
                    A Guardiã da Árvore aguarda seu chamado — disponível no plano Idriel.
                  </p>
                  <button
                    onClick={() => navigate('/planos')}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[#1a0f00] font-montserrat font-bold text-xs uppercase tracking-wider hover:shadow-[0_0_20px_rgba(218,165,32,0.3)] transition-all"
                  >
                    ✨ Conhecer planos
                  </button>
                </div>
              </div>
            )}
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

      {/* Idriel history drawer */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-background border-idriel/20 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-cinzel text-idriel-light flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico de Idriel — {fruit.name}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {suggestions.length === 0 ? (
              <p className="font-merriweather italic text-text-dim text-sm">Nenhuma consulta salva neste fruto ainda.</p>
            ) : suggestions.map(s => (
              <div key={s.id} className="rounded-md border border-idriel/15 bg-idriel/[0.04] p-3">
                <p className="text-[10px] uppercase font-montserrat text-idriel-light/70 mb-1">
                  {new Date(s.created_at).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs font-bold text-foreground mb-2">❓ {s.question}</p>
                <p className="text-xs font-merriweather text-foreground/90 whitespace-pre-wrap leading-relaxed mb-3 max-h-[200px] overflow-y-auto">
                  {s.response}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => { handleOpenSaveDialog('ficha', s.response); setShowHistory(false); }}
                    className="px-2 py-1 rounded text-[10px] font-montserrat border border-idriel/30 text-idriel-light hover:bg-idriel/15 transition-colors"
                  >
                    💾 Ficha
                  </button>
                  <button
                    onClick={() => { handleOpenSaveDialog('artigo', s.response); setShowHistory(false); }}
                    className="px-2 py-1 rounded text-[10px] font-montserrat border border-idriel/30 text-idriel-light hover:bg-idriel/15 transition-colors"
                  >
                    💾 Artigo
                  </button>
                  <button
                    onClick={() => deleteSuggestion(s.id)}
                    className="ml-auto p-1 rounded text-text-dim hover:text-red-alert transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Save Idriel response as ficha/artigo dialog */}
      <Dialog open={!!savingAs} onOpenChange={(open) => { if (!open) { setSavingAs(null); setSaveDraft({ title: '', content: '' }); } }}>
        <DialogContent className="card-glass border-idriel/30 max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-idriel-light">
              💾 Salvar como {savingAs === 'ficha' ? 'Ficha' : 'Artigo'}
            </DialogTitle>
            <DialogDescription className="text-text-dim font-merriweather text-xs italic">
              Idriel resumiu a resposta de forma objetiva. Você pode editar antes de salvar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-montserrat text-idriel-light/80 block mb-1">Título</label>
              <Input
                value={saveDraft.title}
                onChange={e => setSaveDraft(prev => ({ ...prev, title: e.target.value }))}
                disabled={saveLoading}
                className="bg-background/60 border-idriel/20"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-montserrat text-idriel-light/80 block mb-1">Conteúdo</label>
              <Textarea
                value={saveDraft.content}
                onChange={e => setSaveDraft(prev => ({ ...prev, content: e.target.value }))}
                disabled={saveLoading}
                rows={10}
                className="bg-background/60 border-idriel/20 font-merriweather text-sm leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSavingAs(null); setSaveDraft({ title: '', content: '' }); }} className="border-idriel/30 text-text-secondary">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={saveLoading || !saveDraft.title.trim() || !saveDraft.content.trim()}
              className="bg-idriel-dim hover:bg-idriel text-foreground"
            >
              {saveLoading ? 'Resumindo…' : '💾 Salvar no Codex'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Magictype first-time creation dialog */}
      <Dialog open={showMagictypeCreated} onOpenChange={setShowMagictypeCreated}>
        <DialogContent className="card-glass-gold border-gold/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-gold-light">
              ✨ Artigo Criado!
            </DialogTitle>
            <DialogDescription className="text-text-secondary font-merriweather text-sm">
              Um artigo sobre o sistema de magia <strong>"{db[4]?.magictype}"</strong> foi criado automaticamente no Codex.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button 
              variant="outline"
              onClick={() => { setShowMagictypeCreated(false); onNavigateCodex?.(); }}
              className="border-gold/30 text-gold-light hover:bg-gold/20"
            >
              📖 Ver Codex
            </Button>
            <Button 
              onClick={() => setShowMagictypeCreated(false)}
              className="bg-gold/80 hover:bg-gold text-background"
            >
              ✍️ Continuar a Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Magictype update confirmation dialog */}
      <Dialog open={showMagictypeUpdate} onOpenChange={(open) => { if (!open) handleSkipMagictypeUpdate(); }}>
        <DialogContent className="card-glass-gold border-gold/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-gold-light">
              🔄 Atualizar Artigo?
            </DialogTitle>
            <DialogDescription className="text-text-secondary font-merriweather text-sm">
              Você já possui um artigo sobre o sistema de magia no Codex. Deseja atualizá-lo para <strong>"{pendingMagictypeValue}"</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button 
              variant="outline"
              onClick={handleSkipMagictypeUpdate}
              className="border-gold/30 text-gold-light hover:bg-gold/20"
            >
              Não, manter o artigo atual
            </Button>
            <Button 
              onClick={handleConfirmMagictypeUpdate}
              className="bg-gold/80 hover:bg-gold text-background"
            >
              Sim, atualizar artigo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
