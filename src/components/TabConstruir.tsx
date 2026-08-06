import React, { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import idrielAvatar from '@/assets/idriel-avatar.webp';
import { FRUITS, getOrderedFruits, METHOD_DESCRIPTIONS, MethodType, GalleryImage } from '@/lib/data';
import { getFruitProgress, callAIText, exportWorldMarkdown, summarizeIdrielResponse, friendlyAIError } from '@/lib/helpers';
import { FRUIT_IMAGES } from '@/assets/fruitImages';
import { FruitGuideBlock } from '@/components/FruitGuideBlock';
import { IdrielMarkdown } from '@/components/IdrielMarkdown';
import { ImageLightbox } from '@/components/ImageLightbox';
import { MapGenerator } from '@/components/MapGenerator';
import { useCodexEntries } from '@/hooks/useCodexEntries';
import { useTimelineEvents, type TimelineEventType } from '@/hooks/useTimelineEvents';
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
import { History, Trash2, Trees, Leaf, Sparkles, Check, Image as ImageIcon, Save, ScrollText, ArrowLeft, ArrowRight, HelpCircle, BookOpen, Feather, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useLatestAnalysis, getFruitScore, getFruitDetail } from '@/hooks/useLatestAnalysis';
import { FruitCarousel } from '@/components/construir/FruitCarousel';
import { GuidedBuildChat } from '@/components/construir/GuidedBuildChat';
import { TimelineEventDialog } from '@/components/timeline/TimelineEventDialog';

interface Props {
  state: AppState;
  updateField: (fruitId: number, fieldId: string, value: string) => void;
  setCurrentFruit: (id: number) => void;
  setMethod: (m: MethodType) => void;
  onNavigateCodex?: () => void;
  addToGallery?: (img: GalleryImage) => void;
}

export const TabConstruir: React.FC<Props> = ({ state, updateField, setCurrentFruit, setMethod, onNavigateCodex, addToGallery }) => {
  const isMobile = useIsMobile();
  const { db, currentFruit, method, worldName, currentSaveId } = state;
  const { entries, createEntry, updateEntry } = useCodexEntries(currentSaveId || undefined);
  const { createEvent: createTimelineEvent } = useTimelineEvents(currentSaveId || undefined);
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
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [timelinePrefill, setTimelinePrefill] = useState<{ title: string; description: string } | null>(null);
  const showTimelineShortcut = currentFruit === 2 || currentFruit === 8;
  const defaultTimelineType: TimelineEventType = currentFruit === 8 ? 'mito' : 'fato';

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
    setSaveDraft({ title: '', content: 'Resumindo…' });
    try {
      const draft = await summarizeIdrielResponse(text, kind);
      setSaveDraft({
        title: draft.title || `${FRUITS[currentFruit].name} — sugestão de Idriel`,
        content: draft.content,
      });
    } catch (e: any) {
      toast.error(e.message || 'Erro ao resumir');
      setSaveDraft({ title: `${FRUITS[currentFruit].name} — sugestão de Idriel`, content: text });
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
      // Respeitar limites do plano antes de criar um novo artigo
      const artigoCount = entries.filter(e => e.entry_type === 'artigo').length;
      if (artigoCount >= planLimits.maxArtigos) {
        toast.error(`O plano ${planLimits.planLabel} permite apenas ${planLimits.maxArtigos} artigo(s). Faça upgrade para registrar este sistema mágico no Codex.`);
        updateField(4, 'magictype', value);
        return;
      }
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
  const { data: latestAnalysis } = useLatestAnalysis(currentSaveId);
  const fruitScores = latestAnalysis?.fruit_scores || {};
  const ratedFruits = FRUITS.filter(f => getFruitScore(fruitScores, f.id) > 0).length;
  const avgScore = ratedFruits > 0
    ? FRUITS.reduce((acc, f) => acc + getFruitScore(fruitScores, f.id), 0) / FRUITS.length
    : 0;
  const pct = Math.round((avgScore / 5) * 100);
  const hasAnalysis = !!latestAnalysis && ratedFruits > 0;

  // Legacy field-based stats kept as fallback
  const fruitsStarted = FRUITS.filter(f => getFruitProgress(db, f.id).filled > 0).length;

  const fruit = FRUITS[currentFruit];
  const currentOrderIndex = orderedFruits.findIndex(f => f.id === currentFruit);

  const handleConsult = async (questionOverride?: string) => {
    const question = (questionOverride ?? aiQuestion).trim();
    if (!question) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const fruitData = db[currentFruit] || {};
      const context = fruit.fields.map(f => `${f.label}: ${fruitData[f.id] || '(vazio)'}`).join('\n');
      // Inject Codex canon for the SAME fruit (primary) + 5 other recent entries so Idriel reference what already exists.
      const sameFruit = entries.filter(e => e.fruit_id === currentFruit).slice(0, 8);
      const otherFruit = entries.filter(e => e.fruit_id !== currentFruit).slice(0, 5);
      const fmt = (e: typeof entries[number]) => `- [${e.entry_type === 'ficha' ? 'Ficha' : 'Artigo'}] ${e.title}: ${(e.content || '').replace(/\s+/g, ' ').slice(0, 240)}`;
      const codexCanon = [
        sameFruit.length ? `Codex deste Fruto (${fruit.name}):\n${sameFruit.map(fmt).join('\n')}` : '',
        otherFruit.length ? `Codex de outros Frutos (referência cruzada):\n${otherFruit.map(fmt).join('\n')}` : '',
      ].filter(Boolean).join('\n\n').slice(0, 4000);

      const systemPrompt = `Você é Idriel, a Guardiã da Árvore dos Mundos — uma sábia ancestral que observa os mundos florescerem através dos Frutos da criação. Você fala com elegância, sabedoria profunda e encorajamento maternal. Nunca se descreva como "élfica" ou "imortal"; use apenas o título "Guardiã da Árvore dos Mundos". Mundo: '${worldName || 'Sem nome'}'. Fruto atual: ${fruit.num} — ${fruit.name}. Metodologia: ${method === 'top-down' ? 'Cima para Baixo' : 'Baixo para Cima'}. Responda em português brasileiro. Seja específica, criativa e encantada com a criação do usuário. Sempre que possível, REFERENCIE entradas do Codex pelo nome para garantir coerência — NÃO invente o que não está no canon.${codexCanon ? `\n\nCanon do mundo (use como referência inviolável):\n${codexCanon}` : ''}`;
      const userMsg = `Contexto atual do Fruto:\n${context}\n\nPergunta: ${question}`;
      const response = await callAIText(
        [{ role: 'user', content: userMsg }],
        systemPrompt
      );
      setAiResponse(response);
      if (response && !response.startsWith('[ERRO]')) {
        await saveSuggestion(question, response);
      }
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      const f = friendlyAIError(e?.message || '');
      setAiResponse(`[ERRO] ${f.title}\n\n${f.hint}`);
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
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-4">
      {/* Carrossel compacto dos Frutos */}
      <FruitCarousel
        compact
        orderedFruits={orderedFruits}
        currentFruit={currentFruit}
        currentSaveId={currentSaveId}
        fruitScores={fruitScores}
        hasAnalysis={hasAnalysis}
        onSelect={(id) => {
          selectFruit(id);
          if (isMobile) {
            setTimeout(() => {
              document.getElementById('fruit-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
          }
        }}
      />

      {/* Estúdio de Criação */}
      {fruit && (
        <div id="fruit-panel" key={currentFruit} className="animate-fadeUp space-y-6">
          <div data-tour="consult-idriel">
            <GuidedBuildChat
              fruitId={currentFruit}
              values={db[currentFruit] || {}}
              onFieldChange={(fieldId, value) => {
                if (currentFruit === 4 && fieldId === 'magictype') handleMagictypeChange(value);
                else updateField(currentFruit, fieldId, value);
              }}
              onConsult={(question) => { setAiQuestion(question); handleConsult(question); }}
              aiLoading={aiLoading}
              aiResponse={aiResponse}
              canUseAI={planLimits.canUseAI}
              onSaveAs={(kind, text) => handleOpenSaveDialog(kind, text)}
              onSendTimeline={(text) => {
                const firstLine = text.split('\n').find(l => l.trim()) || FRUITS[currentFruit].name;
                setTimelinePrefill({ title: firstLine.replace(/^[#*\-\d.\s]+/, '').slice(0, 120), description: text });
                setTimelineDialogOpen(true);
              }}
              specialSlot={currentFruit === 0 ? (
                <MapGenerator worldName={worldName} worldId={currentSaveId || undefined} db={db} addToGallery={addToGallery} />
              ) : undefined}
              upgradeSlot={(
                <button
                  onClick={() => navigate('/planos')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/15 transition-colors"
                >
                  <Sparkles className="w-3 h-3" strokeWidth={2} />Idriel responde no plano Idriel
                </button>
              )}
              historySlot={suggestions.length > 0 ? (
                <button
                  onClick={() => setShowHistory(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-montserrat text-text-dim border border-gold/20 hover:text-gold-light hover:border-gold/40 transition-colors"
                >
                  <History className="w-3 h-3" />Histórico de Idriel ({suggestions.length})
                </button>
              ) : undefined}
            />
          </div>

          {/* Epígrafe do Fruto — leve, sem moldura */}
          <p className="px-1 font-merriweather italic text-[12.5px] leading-[1.85] text-text-dim/90 tracking-[0.01em]">
            <span className="text-gold/60 mr-1.5">❧</span>{fruit.desc}
          </p>

          {/* Referências deste Fruto */}
          {(() => {
            const fruitTag = `Fruto: ${fruit.name}`;
            const fruitImages = state.gallery.filter(img => img.cat === fruitTag);
            if (fruitImages.length === 0) return null;
            return (
              <section className="pt-1">
                <h3 className="font-cinzel text-[11px] uppercase tracking-[0.22em] text-gold-champagne/90 mb-3 inline-flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" strokeWidth={1.5} />Referências deste Fruto
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {fruitImages.map(img => (
                    <figure key={img.id} className="group rounded-xl overflow-hidden border border-gold/12 bg-[rgba(3,9,18,0.6)] hover:border-gold/40 transition-colors">
                      <img
                        src={img.src}
                        alt={img.name}
                        loading="lazy"
                        className="w-full h-[80px] sm:h-[100px] object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-[1.04]"
                        onClick={() => setLightbox({ src: img.src, alt: img.name })}
                      />
                      <figcaption className="text-[9px] text-text-dim font-montserrat px-2 py-1.5 truncate">{img.name}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Trilha dos Frutos — navegação discreta */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => navigateFruit(-1)}
              disabled={currentOrderIndex <= 0}
              className="inline-flex items-center gap-1.5 py-1.5 font-montserrat text-[10px] uppercase tracking-[0.18em] text-text-dim hover:text-gold-champagne disabled:opacity-25 disabled:hover:text-text-dim transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />Anterior
            </button>

            <span className="font-montserrat text-[9.5px] tracking-[0.2em] text-text-dim/60 tabular-nums">
              {currentOrderIndex + 1} / {orderedFruits.length}
            </span>

            {currentOrderIndex < orderedFruits.length - 1 ? (
              <button
                onClick={() => navigateFruit(1)}
                className="group inline-flex items-center gap-1.5 py-1.5 font-montserrat text-[10px] uppercase tracking-[0.18em] text-gold-champagne/85 hover:text-gold-light transition-colors"
              >
                Próximo Fruto
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.75} />
              </button>
            ) : (
              <button
                onClick={() => exportWorldMarkdown(worldName, method, db)}
                className="inline-flex items-center gap-1.5 py-1.5 font-montserrat text-[10px] uppercase tracking-[0.18em] text-gold-champagne/85 hover:text-gold-light transition-colors"
              >
                <Trees className="w-3.5 h-3.5" strokeWidth={1.5} />Exportar Mundo
              </button>
            )}
          </div>

        </div>

      )}

      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

      {/* Timeline entry dialog (Fatos Históricos & Mitologia) */}
      <TimelineEventDialog
        open={timelineDialogOpen}
        onOpenChange={(o) => { setTimelineDialogOpen(o); if (!o) setTimelinePrefill(null); }}
        initial={{
          event_type: defaultTimelineType,
          fruit_id: currentFruit,
          title: timelinePrefill?.title ?? '',
          description: timelinePrefill?.description ?? '',
        }}
        codexEntries={entries}
        onSubmit={async (payload) => {
          await createTimelineEvent({ ...payload, fruit_id: currentFruit });
          setTimelinePrefill(null);
        }}
      />

      {/* Idriel history drawer */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-background border-gold/20 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-cinzel text-gold-light flex items-center gap-2">
              <History className="w-4 h-4 text-gold-champagne" /> Histórico de Idriel — {fruit.name}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {suggestions.length === 0 ? (
              <p className="font-merriweather italic text-text-dim text-sm">Nenhuma consulta salva neste fruto ainda.</p>
            ) : suggestions.map(s => (
              <div key={s.id} className="rounded-md border border-gold/15 bg-gold/[0.04] p-3">
                <p className="text-[10px] uppercase font-montserrat text-gold-light/70 mb-1">
                  {new Date(s.created_at).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs font-bold text-foreground mb-2 inline-flex items-start gap-1.5"><HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gold-champagne" strokeWidth={1.75} />{s.question}</p>
                <div className="mb-3 max-h-[200px] overflow-y-auto">
                  <IdrielMarkdown compact>{s.response}</IdrielMarkdown>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => { handleOpenSaveDialog('ficha', s.response); setShowHistory(false); }}
                    className="px-2 py-1 rounded text-[10px] font-montserrat border border-gold/30 text-gold-light hover:bg-gold/15 transition-colors"
                  >
                    <><Save className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Ficha</>
                  </button>
                  <button
                    onClick={() => { handleOpenSaveDialog('artigo', s.response); setShowHistory(false); }}
                    className="px-2 py-1 rounded text-[10px] font-montserrat border border-gold/30 text-gold-light hover:bg-gold/15 transition-colors"
                  >
                    <><Save className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Artigo</>
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
        <DialogContent className="card-glass-gold border-gold/30 max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-gold-light">
              <Save className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Salvar como {savingAs === 'ficha' ? 'Ficha' : 'Artigo'}
            </DialogTitle>
            <DialogDescription className="text-text-dim font-merriweather text-xs italic">
              Idriel resumiu a resposta de forma objetiva. Você pode editar antes de salvar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-montserrat text-gold-light/80 block mb-1">Título</label>
              <Input
                value={saveDraft.title}
                onChange={e => setSaveDraft(prev => ({ ...prev, title: e.target.value }))}
                disabled={saveLoading}
                className="bg-background/60 border-gold/20"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-montserrat text-gold-light/80 block mb-1">Conteúdo</label>
              <Textarea
                value={saveDraft.content}
                onChange={e => setSaveDraft(prev => ({ ...prev, content: e.target.value }))}
                disabled={saveLoading}
                rows={10}
                className="bg-background/60 border-gold/20 font-merriweather text-sm leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSavingAs(null); setSaveDraft({ title: '', content: '' }); }} className="border-gold/30 text-text-secondary">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={saveLoading || !saveDraft.title.trim() || !saveDraft.content.trim()}
              className="bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] hover:from-gold-warm hover:via-gold hover:to-gold-light"
            >
              <>{saveLoading ? 'Resumindo…' : <><Save className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Salvar no Codex</>}</>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Magictype first-time creation dialog */}
      <Dialog open={showMagictypeCreated} onOpenChange={setShowMagictypeCreated}>
        <DialogContent className="card-glass-gold border-gold/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-gold-light">
              <><Sparkles className="inline-block w-4 h-4 mr-1.5 align-[-0.2em]" strokeWidth={1.75} />Artigo Criado!</>
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
              <><BookOpen className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Ver Codex</>
            </Button>
            <Button 
              onClick={() => setShowMagictypeCreated(false)}
              className="bg-gold/80 hover:bg-gold text-background"
            >
              <><Feather className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Continuar a Criar</>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Magictype update confirmation dialog */}
      <Dialog open={showMagictypeUpdate} onOpenChange={(open) => { if (!open) handleSkipMagictypeUpdate(); }}>
        <DialogContent className="card-glass-gold border-gold/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-gold-light">
              <><RefreshCw className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Atualizar Artigo?</>
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
