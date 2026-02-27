import React, { useState, useRef } from 'react';
import { FRUITS, CODEX_ENTRY_TYPES, type GalleryImage } from '@/lib/data';
import { useCodexEntries, type CodexEntry } from '@/hooks/useCodexEntries';
import { useAuth } from '@/contexts/AuthContext';
import { ImageLightbox } from '@/components/ImageLightbox';
import { CodexCard } from '@/components/CodexCard';
import { exportSingleEntry, exportFruitEntries, exportSelectedFruits, exportAllEntries } from '@/lib/codexPdfExport';

const FRUIT_ALL = -1;

interface Props {
  gallery: GalleryImage[];
}

export const TabCodex: React.FC<Props> = ({ gallery }) => {
  const { user } = useAuth();
  const { entries, loading, createEntry, updateEntry, deleteEntry, uploadImage } = useCodexEntries();
  
  const [filterFruit, setFilterFruit] = useState(FRUIT_ALL);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportSelectedFruitIds, setExportSelectedFruitIds] = useState<number[]>([]);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<string>('personagem');
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

  const filtered = entries.filter(e => {
    if (filterFruit !== FRUIT_ALL && e.fruit_id !== filterFruit) return false;
    return true;
  });

  const handleImageUpload = async (file: File, onUrl: (url: string) => void) => {
    setUploading(true);
    const url = await uploadImage(file);
    if (url) onUrl(url);
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createEntry({
      title: newTitle,
      content: newContent,
      image_url: newImageUrl || undefined,
      entry_type: newType,
      fruit_id: newFruit,
    });
    setNewTitle(''); setNewContent(''); setNewImageUrl(''); setNewType('personagem'); setNewFruit(null);
    setShowCreate(false);
  };

  const resetCreate = () => {
    setShowCreate(false);
    setNewTitle(''); setNewContent(''); setNewImageUrl(''); setNewType('personagem'); setNewFruit(null);
  };

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-cinzel font-bold text-xl sm:text-2xl md:text-3xl text-foreground">📖 Codex</h1>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button
              onClick={() => { setShowExport(!showExport); setExportSelectedFruitIds([]); }}
              className="px-3 py-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:via-teal-300 hover:to-cyan-400 text-white rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all shadow-[0_0_16px_rgba(16,185,129,0.4)] hover:shadow-[0_0_24px_rgba(16,185,129,0.6)] animate-pulse"
            >
              📄 Exportar PDF
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:via-amber-300 hover:to-yellow-400 text-black rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(218,165,32,0.3)]"
          >
            + Nova Ficha
          </button>
        </div>
      </div>
      <p className="font-merriweather italic text-text-dim text-sm mb-5">Suas fichas de personagens, lugares, itens e mais</p>

      {/* Export panel */}
      {showExport && (
        <div className="rounded-lg p-4 mb-5 animate-fadeUp border border-emerald-500/20" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.12) 50%, rgba(59,130,246,0.12) 100%)', backdropFilter: 'blur(20px)' }}>
          <h3 className="font-cinzel font-bold text-sm mb-3 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">📄 Exportar Fichas em PDF</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => { exportAllEntries(entries); setShowExport(false); }}
              className="px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-blue-light rounded-md text-[11px] font-montserrat font-bold uppercase tracking-wider transition-colors border border-ring/20 text-left"
            >
              📚 Exportar todas as fichas ({entries.length})
            </button>
            {filterFruit !== FRUIT_ALL && (
              <button
                onClick={() => { exportFruitEntries(filterFruit, entries); setShowExport(false); }}
                className="px-4 py-2.5 bg-accent/15 hover:bg-accent/25 text-accent-foreground rounded-md text-[11px] font-montserrat font-bold uppercase tracking-wider transition-colors border border-accent/20 text-left"
              >
                🍎 Exportar fichas de "{FRUITS.find(f => f.id === filterFruit)?.name}" ({entries.filter(e => e.fruit_id === filterFruit).length})
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

      {/* Filters by fruit */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <button onClick={() => setFilterFruit(FRUIT_ALL)} className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${filterFruit === FRUIT_ALL ? 'bg-accent/20 text-accent-foreground border border-accent/40' : 'text-text-dim border border-transparent hover:border-accent/20'}`}>
          Todos
        </button>
        {FRUITS.map(f => (
          <button key={f.id} onClick={() => setFilterFruit(f.id)} className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${filterFruit === f.id ? 'bg-accent/20 text-accent-foreground border border-accent/40' : 'text-text-dim border border-transparent hover:border-accent/20'}`}>
            {f.icon} {f.name}
          </button>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="card-glass rounded-lg p-4 sm:p-5 mb-6 animate-fadeUp">
          <h3 className="font-cinzel font-bold text-sm text-blue-light mb-3">Nova Ficha</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Título</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nome da ficha…" className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-ring/50" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Tipo</label>
              <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none focus:border-ring/50">
                {CODEX_ENTRY_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Fruto (opcional)</label>
            <select value={newFruit ?? ''} onChange={e => setNewFruit(e.target.value ? Number(e.target.value) : null)} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none focus:border-ring/50">
              <option value="">Nenhum</option>
              {FRUITS.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
            </select>
          </div>

          {/* Image */}
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

          <div className="mb-3">
            <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Conteúdo</label>
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Descreva livremente…" rows={5} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-ring/50 resize-y" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!newTitle.trim()} className="px-4 py-2 bg-primary hover:bg-ring text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-colors">
              Criar Ficha
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
        <div className="text-center py-12">
          <p className="font-merriweather italic text-text-dim text-sm">
            {entries.length === 0 ? 'Nenhuma ficha criada ainda. Comece pelo botão acima ou crie direto ao preencher um campo na aba Construir!' : 'Nenhuma ficha encontrada com esses filtros.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(entry => (
            <CodexCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
              onImageUpload={uploadImage}
              onLightbox={setLightbox}
              gallery={gallery}
            />
          ))}
        </div>
      )}

      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
};
