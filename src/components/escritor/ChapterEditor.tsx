import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Chapter } from '@/hooks/useManuscript';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import {
  Edit3, Eye, Maximize, Minimize, PanelRightOpen, PanelRightClose, ChevronRight,
  Keyboard, SpellCheck2, Sparkles, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildEntriesByName, renderInlineMentions } from './MentionChip';
import { RichTextEditor, RichTextView } from '@/components/editor/RichTextEditor';
import { useSpellcheckEnabled } from '@/lib/spellcheck/spellcheckSettings';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const isHTML = (s: string) => /^\s*<(p|div|h[1-6]|ul|ol|blockquote)[\s>]/i.test(s || '');
const stripHTML = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const FORMAT_COST_DROPS = 2;

interface Props {
  chapter: Chapter;
  entries: CodexEntry[];
  isMobile: boolean;
  zenMode: boolean;
  setZenMode: (v: boolean) => void;
  showRefPanel: boolean;
  setShowRefPanel: (v: boolean) => void;
  onBack?: () => void;
  onTitleSave: (title: string) => void;
  onContentSave: (content: string) => void;
  onPreviewEntry: (entry: CodexEntry) => void;
}

export const ChapterEditor: React.FC<Props> = React.memo(({
  chapter, entries, isMobile, zenMode, setZenMode,
  showRefPanel, setShowRefPanel, onBack,
  onTitleSave, onContentSave, onPreviewEntry,
}) => {
  const [content, setContent] = useState(chapter.content || '');
  const [title, setTitle] = useState(chapter.title);
  const [previewMode, setPreviewMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [spellOn, setSpellOn] = useSpellcheckEnabled();
  const plan = usePlanLimits();
  const [formatOpen, setFormatOpen] = useState(false);
  const [formatGuidance, setFormatGuidance] = useState('');
  const [formatting, setFormatting] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorToastIdRef = useRef<string | number | null>(null);


  useEffect(() => {
    setContent(chapter.content || '');
    setTitle(chapter.title);
    setSaveStatus('idle');
  }, [chapter.id]); // eslint-disable-line

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const debouncedSave = useCallback((value: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await Promise.resolve(onContentSave(value));
        setSaveStatus('saved');
        // Discreet success toast (replaces any prior error toast).
        if (errorToastIdRef.current != null) {
          toast.dismiss(errorToastIdRef.current);
          errorToastIdRef.current = null;
        }
        toast.success('Capítulo salvo', { duration: 1500 });
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1800);
      } catch (err) {
        setSaveStatus('error');
        errorToastIdRef.current = toast.error('Erro ao salvar capítulo', {
          description: 'Verifique sua conexão. Tentaremos novamente na próxima alteração.',
          duration: 5000,
        });
      }
    }, 1500);
  }, [onContentSave]);

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    debouncedSave(value);
  }, [debouncedSave]);

  const wordCount = useMemo(() => {
    const text = isHTML(content) ? stripHTML(content) : content;
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [content]);

  const handleTitleBlur = () => {
    if (title.trim() && title !== chapter.title) onTitleSave(title.trim());
  };

  const handleFormatWithIdriel = useCallback(async () => {
    const raw = content || '';
    const plain = isHTML(raw) ? stripHTML(raw) : raw.trim();
    if (plain.length < 40) {
      toast.error('Capítulo curto demais para a Idriel formatar.');
      return;
    }
    setFormatting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-format-chapter', {
        body: { text: raw, guidance: formatGuidance.trim() || undefined },
      });
      if (error) {
        const msg = (data as { error?: string } | null)?.error || error.message || 'Falha ao formatar.';
        toast.error(msg);
        return;
      }
      const formatted = (data as { formatted?: string } | null)?.formatted;
      if (!formatted) {
        toast.error('A Idriel não retornou um resultado. Tente novamente.');
        return;
      }
      handleContentChange(formatted);
      setFormatOpen(false);
      setFormatGuidance('');
      toast.success(`Capítulo formatado pela Idriel (−${FORMAT_COST_DROPS} gotas).`);
    } catch (e) {
      console.error('ai-format-chapter error', e);
      toast.error(e instanceof Error ? e.message : 'Falha ao formatar.');
    } finally {
      setFormatting(false);
    }
  }, [content, formatGuidance, handleContentChange]);


  const byName = useMemo(() => buildEntriesByName(entries), [entries]);

  const previewNodes = useMemo(
    () => (previewMode && !isHTML(content)) ? renderInlineMentions(content, byName, {
      allEntries: entries,
      onOpenEntry: (id) => { const e = entries.find(x => x.id === id); if (e) onPreviewEntry(e); },
      onSave: (next) => handleContentChange(next),
    }) : null,
    [previewMode, content, byName, entries, onPreviewEntry, handleContentChange],
  );

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b border-blue-bright/10 flex items-center gap-2">
        {isMobile && onBack && (
          <button onClick={onBack} aria-label="Voltar" className="p-1 text-text-dim hover:text-foreground">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          lang="pt-BR"
          spellCheck
          className="bg-transparent font-montserrat font-bold text-sm text-foreground border-none focus:outline-none flex-1 min-w-0"
          placeholder="Título do capítulo"
        />
        <span className="text-[11px] font-mono text-text-dim bg-white/[0.04] px-2 py-0.5 rounded">{wordCount} palavras</span>

        {/* Liga/desliga do corretor ortográfico PT-BR. */}
        <button
          type="button"
          onClick={() => {
            const next = !spellOn;
            setSpellOn(next);
            toast.message(
              next ? 'Corretor ortográfico ativado' : 'Corretor ortográfico desativado',
              { duration: 1600 },
            );
          }}
          aria-pressed={spellOn}
          aria-label={spellOn ? 'Desativar corretor ortográfico' : 'Ativar corretor ortográfico'}
          title={
            spellOn
              ? 'Corretor ortográfico: ATIVADO (clique para desativar)'
              : 'Corretor ortográfico: DESATIVADO (clique para ativar)'
          }
          className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
            spellOn
              ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/[0.06] hover:bg-emerald-400/[0.12]'
              : 'border-white/10 text-text-dim hover:text-foreground hover:bg-white/[0.05]'
          }`}
        >
          <SpellCheck2 className="w-3 h-3" />
          <span className="font-mono">{spellOn ? 'ABC ✓' : 'ABC'}</span>
        </button>



        {plan.canUseAI && (
          <button
            type="button"
            onClick={() => setFormatOpen(true)}
            title={`Idriel formata a diagramação do capítulo (parágrafos, travessões, espaçamento) — custa ${FORMAT_COST_DROPS} gotas.`}
            className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-amber-400/40 text-amber-300 bg-gradient-to-r from-amber-400/[0.08] to-emerald-400/[0.08] hover:from-amber-400/[0.16] hover:to-emerald-400/[0.16] transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span className="font-mono">Formatar · {FORMAT_COST_DROPS}g</span>
          </button>
        )}


        <button
          title="Atalho: Ctrl + L — foca o editor com segurança e abre o seletor do Codex"
          className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-dim border border-white/10 hover:text-foreground hover:bg-white/[0.05] transition-colors"
          onClick={() => toast.info('Use Ctrl + L para focar o editor e abrir o seletor do Codex (@).')}
        >
          <Keyboard className="w-3 h-3" />
          <span className="font-mono">Ctrl + L</span>
        </button>



        <div className="flex items-center bg-white/[0.03] rounded border border-blue-bright/10 p-0.5">
          <button onClick={() => setPreviewMode(false)}
            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors ${!previewMode ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground'}`}
            title="Editar">
            <Edit3 className="w-3 h-3" />
          </button>
          <button onClick={() => setPreviewMode(true)}
            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors ${previewMode ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground'}`}
            title="Pré-visualizar">
            <Eye className="w-3 h-3" />
          </button>
        </div>
        <button onClick={() => setZenMode(!zenMode)}
          className={`p-1.5 rounded hover:bg-white/[0.05] transition-colors ${zenMode ? 'text-blue-light' : 'text-text-dim hover:text-foreground'}`}
          title={zenMode ? 'Sair do modo foco' : 'Modo foco'}>
          {zenMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
        {!zenMode && (
          <button onClick={() => setShowRefPanel(!showRefPanel)}
            className="p-1.5 rounded hover:bg-white/[0.05] text-text-dim hover:text-foreground transition-colors"
            title={showRefPanel ? 'Fechar referências' : 'Abrir referências'}>
            {showRefPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Editor body */}
      <div className="flex-1 relative overflow-hidden">
        {previewMode ? (
          <div className="w-full h-full overflow-y-auto p-4">
            {isHTML(content) ? (
              <RichTextView value={content} />
            ) : previewNodes && previewNodes.length > 0 ? (
              <div className="font-merriweather text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {previewNodes}
              </div>
            ) : (
              <span className="text-text-dim/40 italic">Nada escrito ainda.</span>
            )}
          </div>
        ) : (
          <RichTextEditor
            entries={entries}
            value={content}
            onChange={handleContentChange}
            placeholder="Comece a escrever seu capítulo aqui… Use @ para inserir referências do Codex (ou Ctrl+L)."
            lang="pt-BR"
            minHeight="100%"
            saveStatus={saveStatus}
            stickyToolbar={!zenMode}
            onOpenEntry={(id) => { const e = entries.find(x => x.id === id); if (e) onPreviewEntry(e); }}
          />

        )}
      </div>

      <Dialog open={formatOpen} onOpenChange={(o) => { if (!formatting) setFormatOpen(o); }}>
        <DialogContent className="border-amber-400/30 bg-[#0a0f18] backdrop-blur-xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-lg text-amber-300 flex items-center gap-2">
              <Sparkles className="w-5 h-5" strokeWidth={2} /> Idriel formata seu capítulo
            </DialogTitle>
            <DialogDescription className="font-montserrat text-sm text-text-secondary">
              A Idriel corrige apenas a <strong>diagramação</strong>: separa parágrafos colados,
              padroniza travessões de diálogo (—), remove espaços duplos e quebras estranhas.
              <span className="block mt-2 text-text-dim">
                Ela <strong>não</strong> reescreve o texto, não altera palavras nem corrige ortografia.
              </span>
              <span className="block mt-2 text-amber-300/90">
                Custo: <strong>{FORMAT_COST_DROPS} gotas</strong> de Seiva Dourada.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-montserrat text-text-secondary">
              Orientação para a Idriel (opcional)
            </label>
            <textarea
              value={formatGuidance}
              onChange={(e) => setFormatGuidance(e.target.value.slice(0, 1000))}
              placeholder="Ex.: cada fala começa em nova linha; preserve os asteriscos como marcadores de cena."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm font-merriweather text-foreground/90 focus:outline-none focus:border-amber-400/40"
              disabled={formatting}
            />
            <div className="text-[10px] font-mono text-text-dim text-right">
              {formatGuidance.length}/1000
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setFormatOpen(false)}
              disabled={formatting}
              className="font-montserrat text-xs font-bold uppercase tracking-wider px-4 py-2 rounded border border-blue-bright/20 text-text-secondary hover:text-foreground hover:bg-white/[0.04] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleFormatWithIdriel}
              disabled={formatting}
              className="font-montserrat text-xs font-bold uppercase tracking-wider px-4 py-2 rounded border border-amber-400/40 text-amber-200 bg-gradient-to-r from-amber-400/20 to-emerald-400/20 hover:from-amber-400/30 hover:to-emerald-400/30 disabled:opacity-60 flex items-center gap-2"
            >
              {formatting ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Formatando…</>
              ) : (
                <><Sparkles className="w-3 h-3" /> Formatar ({FORMAT_COST_DROPS}g)</>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

});
ChapterEditor.displayName = 'ChapterEditor';

