import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Chapter } from '@/hooks/useManuscript';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import {
  Edit3, Eye, Maximize, Minimize, PanelRightOpen, PanelRightClose, ChevronRight,
  SpellCheck2, Keyboard,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildEntriesByName, renderInlineMentions } from './MentionChip';
import { RichTextEditor, RichTextView } from '@/components/editor/RichTextEditor';

const isHTML = (s: string) => /^\s*<(p|div|h[1-6]|ul|ol|blockquote)[\s>]/i.test(s || '');
const stripHTML = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

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
  const [spellcheckOn, setSpellcheckOn] = useState<boolean>(() => {
    try { return localStorage.getItem('adm-spell-enabled') !== '0'; } catch { return true; }
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
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

        <div className="relative flex items-center gap-0.5">
          <button
            onClick={() => {
              setSpellcheckOn(v => {
                const next = !v;
                try { localStorage.setItem('adm-spell-enabled', next ? '1' : '0'); } catch { /* ignore */ }
                toast.info(next
                  ? 'Corretor ortográfico ativado.'
                  : 'Corretor ortográfico desativado.');
                return next;
              });
            }}
            title={spellcheckOn
              ? 'Corretor ortográfico (PT-BR) ativo — clique para desativar. Clique com o botão direito numa palavra sublinhada para ver sugestões.'
              : 'Corretor desativado — clique para ativar'}
            aria-pressed={spellcheckOn}
            aria-label="Alternar corretor ortográfico"
            className={`p-1.5 rounded transition-all border ${
              spellcheckOn
                ? 'border-emerald-400/40 text-emerald-300 bg-gradient-to-b from-emerald-400/20 via-emerald-500/10 to-emerald-700/20 shadow-[0_0_12px_-2px_rgba(52,211,153,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'border-white/10 text-text-dim hover:text-foreground hover:bg-white/[0.05]'
            }`}
          >
            <SpellCheck2 className="w-4 h-4" />
          </button>
        </div>

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
            spellCheck={spellcheckOn}
            lang="pt-BR"
            minHeight="100%"
            saveStatus={saveStatus}
          />
        )}
      </div>
    </>
  );
});
ChapterEditor.displayName = 'ChapterEditor';

/* ---------------------- Spellcheck help popover ---------------------- */
const SpellcheckHelpPopover: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 z-50 w-[320px] p-4 rounded-lg border border-blue-bright/30 bg-[rgba(4,10,22,0.98)] shadow-[0_8px_28px_rgba(0,0,0,0.6)] backdrop-blur-md text-xs"
      role="dialog"
      aria-label="Como ativar o corretor PT-BR"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-cinzel text-gold-light text-sm">Corretor ortográfico (PT-BR)</h4>
        <button onClick={onClose} aria-label="Fechar" className="text-text-dim hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-text-dim mb-3 leading-relaxed">
        A Árvore dos Mundos já marca o editor como <code className="text-blue-light">lang="pt-BR"</code>.
        Se as palavras erradas não aparecerem sublinhadas, ative o dicionário no seu dispositivo:
      </p>
      <ul className="space-y-2 text-text-dim">
        <li>
          <strong className="text-foreground">Chrome / Edge (desktop):</strong> <em>Configurações → Idiomas → Verificação ortográfica</em>,
          ative e adicione <strong>Português (Brasil)</strong>.
        </li>
        <li>
          <strong className="text-foreground">Firefox:</strong> clique com o botão direito no editor →
          <em> Idiomas → Português (Brasil)</em> e marque <em>Verificar ortografia</em>.
        </li>
        <li>
          <strong className="text-foreground">Safari (macOS):</strong> <em>Editar → Ortografia e gramática → Verificar ortografia ao digitar</em>.
        </li>
        <li>
          <strong className="text-foreground">iPad / iPhone:</strong> <em>Ajustes → Geral → Teclado</em> e ative
          <em> Verificar ortografia</em> e <em>Autocorreção</em>. Adicione o teclado <strong>Português (Brasil)</strong>.
        </li>
        <li>
          <strong className="text-foreground">Android / tablet:</strong> <em>Configurações → Sistema → Idiomas e entrada → Corretor ortográfico</em>.
          Em alguns Gboard: <em>Preferências → Corretor ortográfico</em>.
        </li>
      </ul>
      <p className="text-[10px] text-text-dim/70 mt-3 italic">
        Observação: no tablet/celular o navegador depende do dicionário do sistema —
        sem teclado/idioma PT-BR instalado, as marcações não aparecem.
      </p>
    </div>
  );
};
