import React, { useState, useRef } from 'react';
import { FRUITS, type GalleryImage } from '@/lib/data';
import { useCodexEntries, type CodexEntry } from '@/hooks/useCodexEntries';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { ImageLightbox } from '@/components/ImageLightbox';
import { CodexCard } from '@/components/CodexCard';
import { exportSingleEntry, exportFruitEntries, exportSelectedFruits, exportAllEntries } from '@/lib/codexPdfExport';
import { CodexAnalysis } from '@/components/CodexAnalysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WorldRecord } from '@/hooks/useWorlds';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

const FRUIT_ALL = -1;
const FRUIT_NONE = -2; // sentinel for "no fruit" filter

type EntryKind = 'ficha' | 'artigo';

interface Props {
  gallery: GalleryImage[];
  worldId: string;
  worlds: WorldRecord[];
}

export const TabCodex: React.FC<Props> = ({ gallery, worldId, worlds }) => {
  const { user } = useAuth();
  const planLimits = usePlanLimits();
  const { entries, loading, createEntry, updateEntry, deleteEntry, uploadImage, fetchEntriesFromWorld, importEntries } = useCodexEntries(worldId || undefined);
  
  const [filterFruits, setFilterFruits] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createKind, setCreateKind] = useState<EntryKind | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportSelectedFruitIds, setExportSelectedFruitIds] = useState<number[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importWorldId, setImportWorldId] = useState<string>('');
  const [importEntryList, setImportEntryList] = useState<CodexEntry[]>([]);
  const [importSelectedIds, setImportSelectedIds] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newFruit, setNewFruit] = useState<number | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-12 text-center">
        <p className="font-merriweather text-text-dim">Faça login para acessar seu Codex.</p>
      </div>
    );
  }

  if (!worldId) {
    return (
      <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-12 text-center">
        <p className="font-merriweather text-text-dim">Crie ou selecione um Mundo para acessar seu Codex.</p>
      </div>
    );
  }

  const filtered = entries.filter(e => {
    if (filterFruits.length === 0) return true;
    return filterFruits.includes(e.fruit_id ?? FRUIT_NONE);
  });

  const handleImageUpload = async (file: File, onUrl: (url: string) => void) => {
    setUploading(true);
    const url = await uploadImage(file);
    if (url) onUrl(url);
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || newFruit === null) return;
    
    // Check plan limits
    const fichaCount = entries.filter(e => e.entry_type !== 'artigo').length;
    const artigoCount = entries.filter(e => e.entry_type === 'artigo').length;
    const isFicha = createKind !== 'artigo';
    
    if (isFicha && fichaCount >= planLimits.maxFichas) {
      toast.error(`O plano ${planLimits.planLabel} permite apenas ${planLimits.maxFichas} fichas. Faça upgrade para criar mais!`);
      return;
    }
    if (!isFicha && artigoCount >= planLimits.maxArtigos) {
      toast.error(`O plano ${planLimits.planLabel} permite apenas ${planLimits.maxArtigos} artigo. Faça upgrade para criar mais!`);
      return;
    }
    
    await createEntry({
      title: newTitle,
      content: newContent,
      image_url: createKind === 'ficha' ? (newImageUrl || undefined) : undefined,
      entry_type: createKind || 'geral',
      fruit_id: newFruit,
    });
    resetCreate();
  };

  const resetCreate = () => {
    setShowCreate(false);
    setCreateKind(null);
    setNewTitle(''); setNewContent(''); setNewImageUrl(''); setNewFruit(null);
    setShowImport(false);
    setImportWorldId('');
    setImportEntryList([]);
    setImportSelectedIds([]);
  };

  const handleSelectImportWorld = async (wId: string) => {
    setImportWorldId(wId);
    setImportLoading(true);
    const items = await fetchEntriesFromWorld(wId);
    setImportEntryList(items);
    setImportLoading(false);
  };

  const handleImport = async () => {
    const selected = importEntryList.filter(e => importSelectedIds.includes(e.id));
    if (selected.length === 0) return;
    await importEntries(selected);
    resetCreate();
  };

  const openCreate = (kind: EntryKind) => {
    setCreateKind(kind);
    setShowCreate(true);
  };

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-cinzel font-bold text-xl sm:text-2xl md:text-3xl text-foreground">📖 Codex</h1>
        <div className="flex gap-2">
          {entries.length > 0 && planLimits.canExport && (
              <button
                onClick={() => { setShowExport(!showExport); setExportSelectedFruitIds([]); }}
                className="px-3 py-2 bg-idriel-dim hover:bg-idriel text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all shadow-[0_0_16px_hsl(var(--idriel)/0.4)] hover:shadow-[0_0_24px_hsl(var(--idriel)/0.6)]"
              >
                📄 Exportar PDF
              </button>
          )}
          {entries.length > 0 && !planLimits.canExport && (
              <button
                disabled
                className="px-3 py-2 bg-muted/30 text-muted-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all cursor-not-allowed flex items-center gap-1.5"
                title="Exportação disponível a partir do plano Raiz"
              >
                <Lock className="w-3 h-3" /> Exportar PDF
              </button>
          )}
          {/* Nova Entrada dropdown */}
          <div data-tour="codex-new-entry" className="relative">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:via-amber-300 hover:to-yellow-400 text-black rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(218,165,32,0.3)]"
            >
              + Nova Entrada
            </button>
            {showCreate && !createKind && !showImport && (
              <div className="absolute right-0 top-full mt-1 z-50 w-[240px] card-glass rounded-lg p-3 shadow-lg border border-blue-bright/30 animate-fadeUp">
                <h4 className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-blue-light mb-2">Tipo de entrada</h4>
                {(() => {
                  const fichaCount = entries.filter(e => e.entry_type !== 'artigo').length;
                  const artigoCount = entries.filter(e => e.entry_type === 'artigo').length;
                  const fichaLimitReached = fichaCount >= planLimits.maxFichas;
                  const artigoLimitReached = artigoCount >= planLimits.maxArtigos;
                  return (
                    <>
                      <button
                        onClick={() => !fichaLimitReached && openCreate('ficha')}
                        disabled={fichaLimitReached}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors mb-1 ${fichaLimitReached ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-bright/10'}`}
                      >
                        <span className="font-montserrat font-bold text-xs text-foreground block">📋 Ficha</span>
                        <span className="text-[10px] text-text-dim font-merriweather">
                          {fichaLimitReached 
                            ? `Limite atingido (${fichaCount}/${planLimits.maxFichas}) — faça upgrade` 
                            : planLimits.maxFichas < Infinity 
                              ? `Com imagem, estruturada (${fichaCount}/${planLimits.maxFichas})`
                              : 'Com imagem, estruturada'}
                        </span>
                      </button>
                      <button
                        onClick={() => !artigoLimitReached && openCreate('artigo')}
                        disabled={artigoLimitReached}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors mb-1 ${artigoLimitReached ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-bright/10'}`}
                      >
                        <span className="font-montserrat font-bold text-xs text-foreground block">📝 Artigo</span>
                        <span className="text-[10px] text-text-dim font-merriweather">
                          {artigoLimitReached 
                            ? `Limite atingido (${artigoCount}/${planLimits.maxArtigos}) — faça upgrade` 
                            : planLimits.maxArtigos < Infinity 
                              ? `Texto livre, explicativo (${artigoCount}/${planLimits.maxArtigos})`
                              : 'Texto livre, explicativo'}
                        </span>
                      </button>
                    </>
                  );
                })()}
                {worlds.filter(w => w.id !== worldId).length > 0 && (
                  <>
                    <div className="border-t border-blue-bright/15 my-2" />
                    <button
                      onClick={() => { setShowImport(true); }}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-bright/10 transition-colors"
                    >
                      <span className="font-montserrat font-bold text-xs text-foreground block">📥 Importar de outro Mundo</span>
                      <span className="text-[10px] text-text-dim font-merriweather">Copiar fichas ou artigos</span>
                    </button>
                  </>
                )}
                <button onClick={resetCreate} className="absolute top-1 right-1 w-5 h-5 rounded-full text-text-dim hover:text-foreground text-xs flex items-center justify-center">✕</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="font-merriweather italic text-text-dim text-sm mb-5">Suas fichas, artigos e anotações organizados por fruto</p>

      {/* Import panel */}
      {showImport && (
        <div className="card-glass rounded-lg p-4 sm:p-5 mb-6 animate-fadeUp border border-blue-bright/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-cinzel font-bold text-sm text-blue-light">📥 Importar de outro Mundo</h3>
            <button onClick={resetCreate} className="text-[10px] text-text-dim font-montserrat hover:text-foreground">✕ Fechar</button>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Selecione o Mundo de origem</label>
            <Select value={importWorldId} onValueChange={handleSelectImportWorld}>
              <SelectTrigger className="w-full bg-background/60 border-blue-bright/20 text-sm font-merriweather">
                <SelectValue placeholder="Escolha um mundo…" />
              </SelectTrigger>
              <SelectContent>
                {worlds.filter(w => w.id !== worldId).map(w => (
                  <SelectItem key={w.id} value={w.id}>🌍 {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {importLoading && (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-ring dot-bounce" />
                <span className="w-2 h-2 rounded-full bg-ring dot-bounce-2" />
                <span className="w-2 h-2 rounded-full bg-ring dot-bounce-3" />
              </div>
            </div>
          )}

          {importWorldId && !importLoading && importEntryList.length === 0 && (
            <p className="font-merriweather text-sm text-text-dim italic text-center py-4">Nenhuma entrada encontrada nesse mundo.</p>
          )}

          {importEntryList.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat font-bold">
                  {importEntryList.length} entrada(s) disponíveis
                </span>
                <button
                  onClick={() => setImportSelectedIds(importSelectedIds.length === importEntryList.length ? [] : importEntryList.map(e => e.id))}
                  className="text-[10px] text-blue-light font-montserrat font-bold hover:underline"
                >
                  {importSelectedIds.length === importEntryList.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
                </button>
              </div>
              <div className="max-h-[250px] overflow-y-auto space-y-1.5 mb-4 pr-1">
                {importEntryList.map(e => {
                  const fruit = e.fruit_id !== null ? FRUITS.find(f => f.id === e.fruit_id) : null;
                  const selected = importSelectedIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => setImportSelectedIds(prev => selected ? prev.filter(id => id !== e.id) : [...prev, e.id])}
                      className={`w-full text-left px-3 py-2 rounded-md border transition-colors flex items-center gap-2 ${
                        selected
                          ? 'border-ring/40 bg-primary/10'
                          : 'border-border hover:border-blue-bright/20'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                        selected ? 'bg-primary border-ring text-foreground' : 'border-border'
                      }`}>
                        {selected && '✓'}
                      </span>
                      <span className="text-[10px] font-montserrat font-bold uppercase text-text-dim">
                        {e.entry_type === 'ficha' ? '📋' : '📝'}
                      </span>
                      {fruit && <span className="text-[10px]">{fruit.icon}</span>}
                      <span className="font-merriweather text-sm text-foreground truncate">{e.title}</span>
                    </button>
                  );
                })}
              </div>
              {importSelectedIds.length > 0 && (
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-primary hover:bg-ring text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
                >
                  📥 Importar {importSelectedIds.length} entrada(s)
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Export panel */}
      {showExport && (
        <div className="card-glass-idriel rounded-lg p-4 mb-5 animate-fadeUp">
          <h3 className="font-cinzel font-bold text-sm mb-3 text-idriel-light">📄 Exportar Entradas em PDF</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => { exportAllEntries(entries); setShowExport(false); }}
              className="px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-blue-light rounded-md text-[11px] font-montserrat font-bold uppercase tracking-wider transition-colors border border-ring/20 text-left"
            >
              📚 Exportar todas as entradas ({entries.length})
            </button>
            {filterFruits.length === 1 && (
              <button
                onClick={() => { exportFruitEntries(filterFruits[0], entries); setShowExport(false); }}
                className="px-4 py-2.5 bg-accent/15 hover:bg-accent/25 text-accent-foreground rounded-md text-[11px] font-montserrat font-bold uppercase tracking-wider transition-colors border border-accent/20 text-left"
              >
                🍎 Exportar de "{FRUITS.find(f => f.id === filterFruits[0])?.name}" ({entries.filter(e => e.fruit_id === filterFruits[0]).length})
              </button>
            )}
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat font-bold mb-2">Selecionar frutos para exportar:</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {FRUITS.map(f => {
                const count = entries.filter(e => e.fruit_id === f.id).length;
                if (count === 0) return null;
                const selected = exportSelectedFruitIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => setExportSelectedFruitIds(prev => selected ? prev.filter(id => id !== f.id) : [...prev, f.id])}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${
                      selected
                        ? 'bg-accent/20 text-accent-foreground border border-accent/40'
                        : 'text-text-dim border border-border hover:border-accent/20'
                    }`}
                  >
                    {f.icon} {f.name} ({count})
                  </button>
                );
              })}
            </div>
            {exportSelectedFruitIds.length > 0 && (
              <button
                onClick={() => { exportSelectedFruits(exportSelectedFruitIds, entries); setShowExport(false); }}
                className="px-4 py-2 bg-accent/80 hover:bg-accent text-accent-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors"
              >
                📄 Exportar {exportSelectedFruitIds.length} fruto(s) selecionado(s)
              </button>
            )}
          </div>

          <div className="flex justify-end mt-3">
            <button onClick={() => setShowExport(false)} className="text-[10px] text-text-dim font-montserrat hover:text-foreground transition-colors">Fechar</button>
          </div>
        </div>
      )}

      {/* Filters by fruit — multi-select chips */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat font-bold mr-1">Filtrar:</span>
        {FRUITS.map(f => {
          const count = entries.filter(e => e.fruit_id === f.id).length;
          const active = filterFruits.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => setFilterFruits(prev => active ? prev.filter(id => id !== f.id) : [...prev, f.id])}
              className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold transition-colors border ${
                active
                  ? 'bg-primary/20 text-blue-light border-ring/40'
                  : 'text-text-dim border-border hover:border-ring/20 hover:text-foreground'
              }`}
            >
              {f.icon} {f.name} {count > 0 ? `(${count})` : ''}
            </button>
          );
        })}
        {filterFruits.length > 0 && (
          <button onClick={() => setFilterFruits([])} className="text-[10px] text-text-dim hover:text-foreground font-montserrat transition-colors ml-1">
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Create form (after choosing kind) */}
      {showCreate && createKind && (
        <div className="card-glass rounded-lg p-4 sm:p-5 mb-6 animate-fadeUp">
          <h3 className="font-cinzel font-bold text-sm text-blue-light mb-3">
            {createKind === 'ficha' ? '📋 Nova Ficha' : '📝 Novo Artigo'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Título</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={createKind === 'ficha' ? 'Nome da ficha…' : 'Título do artigo…'} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-ring/50" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Fruto</label>
              <select value={newFruit ?? ''} onChange={e => setNewFruit(e.target.value ? Number(e.target.value) : null)} className={`w-full bg-[rgba(4,12,24,0.6)] border rounded-md px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none focus:border-ring/50 ${newFruit === null ? 'border-destructive/40' : 'border-blue-bright/15'}`}>
                <option value="">Selecione um fruto…</option>
                {FRUITS.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
              </select>
            </div>
          </div>

          {/* Image — only for ficha */}
          {createKind === 'ficha' && (
            <div className="mb-3">
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Imagem</label>
              {newImageUrl ? (
                <div className="relative w-full max-w-[300px] rounded-lg overflow-hidden border border-blue-bright/20">
                  <img src={newImageUrl} alt="" className="w-full h-[180px] object-cover" />
                  <button onClick={() => setNewImageUrl('')} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-foreground text-xs flex items-center justify-center hover:bg-destructive/80">✕</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, setNewImageUrl); }} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-colors">
                    {uploading ? '⏳ Enviando…' : '📁 Upload'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mb-3">
            <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Conteúdo</label>
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder={createKind === 'artigo' ? 'Escreva livremente seu artigo…' : 'Descreva livremente…'} rows={createKind === 'artigo' ? 8 : 5} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-ring/50 resize-y" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!newTitle.trim() || newFruit === null} className="px-4 py-2 bg-primary hover:bg-ring text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-colors">
              {createKind === 'ficha' ? 'Criar Ficha' : 'Criar Artigo'}
            </button>
            <button onClick={resetCreate} className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Entries grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-ring dot-bounce" />
            <span className="w-2 h-2 rounded-full bg-ring dot-bounce-2" />
            <span className="w-2 h-2 rounded-full bg-ring dot-bounce-3" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-bright/10 flex items-center justify-center">
            <span className="text-3xl">{entries.length === 0 ? '📖' : '🔍'}</span>
          </div>
          {entries.length === 0 ? (
            <>
              <h3 className="font-cinzel font-bold text-lg text-foreground mb-2">Seu Codex está vazio</h3>
              <p className="font-merriweather text-sm text-text-dim mb-4 max-w-md mx-auto">
                Crie fichas de personagens, locais e artefatos, ou artigos de lore e história do seu mundo.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => openCreate('ficha')}
                  className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-blue-bright/30 text-blue-light bg-blue-bright/[0.08] hover:bg-blue-bright/[0.18] transition-all">
                  📋 Criar primeira Ficha
                </button>
                <button onClick={() => openCreate('artigo')}
                  className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold/30 text-gold-light bg-gold/[0.08] hover:bg-gold/[0.18] transition-all">
                  📝 Criar primeiro Artigo
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-cinzel font-bold text-lg text-foreground mb-2">Nenhuma entrada encontrada</h3>
              <p className="font-merriweather text-sm text-text-dim">Tente ajustar o filtro ou crie uma nova entrada.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Fichas section */}
          {filtered.some(e => e.entry_type === 'ficha') && (
            <div className="mb-8">
              <h2 className="font-cinzel font-bold text-base text-blue-light mb-3 flex items-center gap-2">
                <span className="w-8 h-[2px] bg-gradient-to-r from-ring to-transparent" />
                📋 Fichas
                <span className="text-[10px] font-montserrat font-bold text-text-dim uppercase">({filtered.filter(e => e.entry_type === 'ficha').length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.filter(e => e.entry_type === 'ficha').map(entry => (
                  <CodexCard
                    key={entry.id}
                    entry={entry}
                    expanded={false}
                    onToggle={() => setExpandedId(entry.id)}
                    onUpdate={updateEntry}
                    onDelete={deleteEntry}
                    onImageUpload={uploadImage}
                    onLightbox={setLightbox}
                    gallery={gallery}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Artigos section */}
          {filtered.some(e => e.entry_type === 'artigo') && (
            <div className="mb-8">
              <h2 className="font-cinzel font-bold text-base text-gold mb-3 flex items-center gap-2">
                <span className="w-8 h-[2px] bg-gradient-to-r from-gold to-transparent" />
                📝 Artigos
                <span className="text-[10px] font-montserrat font-bold text-text-dim uppercase">({filtered.filter(e => e.entry_type === 'artigo').length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.filter(e => e.entry_type === 'artigo').map(entry => (
                  <CodexCard
                    key={entry.id}
                    entry={entry}
                    expanded={false}
                    onToggle={() => setExpandedId(entry.id)}
                    onUpdate={updateEntry}
                    onDelete={deleteEntry}
                    onImageUpload={uploadImage}
                    onLightbox={setLightbox}
                    gallery={gallery}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Expanded card modal overlay */}
          {expandedId && (() => {
            const expandedEntry = entries.find(e => e.id === expandedId);
            if (!expandedEntry) return null;
            return (
              <div
                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-3 sm:px-6"
                onClick={() => setExpandedId(null)}
              >
                <div
                  className="w-full max-w-[900px] animate-fadeUp"
                  onClick={e => e.stopPropagation()}
                >
                  <CodexCard
                    entry={expandedEntry}
                    expanded={true}
                    onToggle={() => setExpandedId(null)}
                    onUpdate={updateEntry}
                    onDelete={async (id) => { await deleteEntry(id); setExpandedId(null); }}
                    onImageUpload={uploadImage}
                    onLightbox={setLightbox}
                    gallery={gallery}
                  />
                </div>
              </div>
            );
          })()}
        </>
        </>
      )}

      {/* Analyze World — bottom CTA */}
      {entries.length > 0 && (
        <div className="mt-10 mb-4">
          {!showAnalysis ? (
            <button
              onClick={() => setShowAnalysis(true)}
              className="w-full py-5 rounded-xl text-center font-cinzel font-bold text-base sm:text-lg uppercase tracking-wider transition-all
                bg-idriel/[0.08] hover:bg-idriel/[0.15]
                border border-idriel/30 hover:border-idriel-light/50
                shadow-[0_0_30px_hsl(var(--idriel)/0.15)] hover:shadow-[0_0_50px_hsl(var(--idriel)/0.3)]"
            >
              <span className="text-idriel-light">
                🌳 Consultar Idriel — Guardiã da Árvore
              </span>
              <p className="font-merriweather italic text-text-dim text-xs mt-1 normal-case tracking-normal">
                Peça à sábia guardiã para avaliar suas entradas e guiar seu worldbuilding
              </p>
            </button>
          ) : (
            <CodexAnalysis entries={entries} onClose={() => setShowAnalysis(false)} />
          )}
        </div>
      )}

      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
};

