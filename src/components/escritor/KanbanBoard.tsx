import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type Storyline, type StorylineColumn } from '@/hooks/useStorylines';
import { useStorylineCards, type StorylineCard } from '@/hooks/useStorylineCards';
import type { Manuscript } from '@/hooks/useManuscript';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GripVertical, Plus, X, Pencil, Check, Link2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const COLOR_PRESETS: Record<string, string> = {
  yellow: 'border-yellow-500/30 bg-yellow-500/5',
  blue: 'border-blue-bright/30 bg-blue-bright/5',
  purple: 'border-purple-500/30 bg-purple-500/5',
  green: 'border-green-500/30 bg-green-500/5',
  pink: 'border-pink-500/30 bg-pink-500/5',
  orange: 'border-orange-500/30 bg-orange-500/5',
  gray: 'border-white/10 bg-white/5',
};
const colorClass = (c: string | null) => COLOR_PRESETS[c || 'gray'] || COLOR_PRESETS.gray;

// Fixed width per column (CRM-style — same preset for all)
const COLUMN_WIDTH = 280;

interface Props {
  storylines: Storyline[];
  activeStoryline: Storyline | null;
  setActiveStoryline: (s: Storyline) => void;
  columns: StorylineColumn[];
  onCreateStoryline: () => void;
  onRenameStoryline: (id: string, name: string) => void;
  onDeleteStoryline: (id: string) => void;
  onCreateColumn: () => void;
  onUpdateColumn: (id: string, updates: Partial<Pick<StorylineColumn, 'title' | 'color'>>) => void;
  onDeleteColumn: (id: string) => void;
  onLinkManuscript: (storylineId: string, manuscriptId: string | null) => void;
  manuscripts: Manuscript[];
}

// ── Inline editable card (CRM-style: title + free-write content) ──
const KanbanCard: React.FC<{
  card: StorylineCard;
  onUpdate: (id: string, updates: Partial<Pick<StorylineCard, 'title' | 'content' | 'storyline_column_id'>>) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  isDragging: boolean;
}> = ({ card, onUpdate, onDelete, onDragStart, isDragging }) => {
  const [title, setTitle] = useState(card.title);
  const [content, setContent] = useState(card.content);
  const [expanded, setExpanded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from external changes (e.g. drag-and-drop reload)
  useEffect(() => { setTitle(card.title); }, [card.title]);
  useEffect(() => { setContent(card.content); }, [card.content]);

  const debouncedSave = (patch: Partial<Pick<StorylineCard, 'title' | 'content'>>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUpdate(card.id, patch), 600);
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, card.id)}
      className={`p-2.5 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-all group ${
        isDragging ? 'opacity-40 scale-95' : ''
      }`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="w-3 h-3 text-text-dim/30 mt-1 shrink-0 opacity-0 group-hover:opacity-100 cursor-grab" />
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); debouncedSave({ title: e.target.value }); }}
            placeholder="Título do card"
            className="w-full bg-transparent text-xs font-montserrat font-semibold text-foreground border-none focus:outline-none placeholder:text-text-dim/40"
          />
          {expanded ? (
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); debouncedSave({ content: e.target.value }); }}
              onBlur={() => content.trim() === '' && setExpanded(false)}
              placeholder="Escreva livremente…"
              autoFocus
              rows={4}
              className="w-full mt-1.5 bg-white/[0.03] rounded p-1.5 text-[11px] font-merriweather text-foreground/90 border border-white/5 focus:border-blue-bright/30 focus:outline-none resize-y placeholder:text-text-dim/40 leading-relaxed"
            />
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-left text-[11px] text-text-dim/70 mt-1 line-clamp-3 font-merriweather italic hover:text-text-dim transition-colors"
            >
              {content || <span className="opacity-60">+ adicionar conteúdo</span>}
            </button>
          )}
        </div>
        <ConfirmDialog
          trigger={
            <button className="opacity-0 group-hover:opacity-100 p-0.5 text-text-dim hover:text-red-alert transition-all" title="Excluir card">
              <X className="w-3 h-3" />
            </button>
          }
          title="Excluir card"
          description="Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={() => onDelete(card.id)}
        />
      </div>
    </div>
  );
};

export const KanbanBoard: React.FC<Props> = ({
  storylines, activeStoryline, setActiveStoryline, columns,
  onCreateStoryline, onRenameStoryline, onDeleteStoryline,
  onCreateColumn, onUpdateColumn, onDeleteColumn,
  onLinkManuscript, manuscripts,
}) => {
  const columnIds = useMemo(() => columns.map(c => c.id), [columns]);
  const { cards, createCard, updateCard, deleteCard } = useStorylineCards(columnIds);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColTitle, setEditingColTitle] = useState('');
  const [editingStorylineName, setEditingStorylineName] = useState(false);
  const [storylineNameDraft, setStorylineNameDraft] = useState('');

  const cardsByColumn = useMemo(() => {
    const map: Record<string, StorylineCard[]> = {};
    columns.forEach(c => { map[c.id] = []; });
    cards.forEach(c => {
      if (map[c.storyline_column_id]) map[c.storyline_column_id].push(c);
    });
    return map;
  }, [columns, cards]);

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(cardId);
  };
  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) updateCard(cardId, { storyline_column_id: columnId });
    setDraggedId(null);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const startEditingCol = (col: StorylineColumn) => {
    setEditingColId(col.id);
    setEditingColTitle(col.title);
  };
  const saveEditingCol = () => {
    if (editingColId && editingColTitle.trim()) onUpdateColumn(editingColId, { title: editingColTitle.trim() });
    setEditingColId(null);
  };

  const startEditStoryline = () => {
    if (!activeStoryline) return;
    setStorylineNameDraft(activeStoryline.name);
    setEditingStorylineName(true);
  };
  const saveStorylineName = () => {
    if (activeStoryline && storylineNameDraft.trim()) {
      onRenameStoryline(activeStoryline.id, storylineNameDraft.trim());
    }
    setEditingStorylineName(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-blue-bright/10 flex items-center gap-2 flex-wrap">
        <Select value={activeStoryline?.id || ''} onValueChange={id => {
          const sl = storylines.find(s => s.id === id);
          if (sl) setActiveStoryline(sl);
        }}>
          <SelectTrigger className="h-7 w-[200px] text-xs bg-white/[0.03] border-blue-bright/10">
            <SelectValue placeholder="Selecionar storyline" />
          </SelectTrigger>
          <SelectContent>
            {storylines.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <button onClick={onCreateStoryline} className="p-1 rounded text-blue-light hover:bg-blue-bright/10" title="Nova storyline">
          <Plus className="w-3.5 h-3.5" />
        </button>

        {activeStoryline && (
          editingStorylineName ? (
            <div className="flex items-center gap-1">
              <input
                value={storylineNameDraft}
                onChange={e => setStorylineNameDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveStorylineName(); if (e.key === 'Escape') setEditingStorylineName(false); }}
                className="h-7 px-2 text-xs bg-white/[0.05] border border-blue-bright/20 rounded focus:outline-none"
                autoFocus
              />
              <button onClick={saveStorylineName} className="p-1 text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={startEditStoryline} className="p-1 rounded text-text-dim hover:text-foreground" title="Renomear storyline">
              <Pencil className="w-3 h-3" />
            </button>
          )
        )}

        {activeStoryline && (
          <div className="flex items-center gap-1.5 ml-2">
            <Link2 className="w-3 h-3 text-text-dim" />
            <Select
              value={activeStoryline.manuscript_id || 'none'}
              onValueChange={v => onLinkManuscript(activeStoryline.id, v === 'none' ? null : v)}
            >
              <SelectTrigger className="h-7 w-[180px] text-xs bg-white/[0.03] border-blue-bright/10">
                <SelectValue placeholder="Vincular a manuscrito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem vínculo —</SelectItem>
                {manuscripts.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {activeStoryline && storylines.length > 1 && (
          <ConfirmDialog
            trigger={
              <button className="p-1 text-text-dim hover:text-red-alert ml-1" title="Excluir storyline">
                <X className="w-3.5 h-3.5" />
              </button>
            }
            title="Excluir storyline"
            description={`Excluir "${activeStoryline.name}"? Todas as colunas e cards serão removidos.`}
            confirmLabel="Excluir"
            onConfirm={() => onDeleteStoryline(activeStoryline.id)}
          />
        )}

        <button onClick={onCreateColumn} className="ml-auto px-2 py-1 rounded text-[11px] font-montserrat text-blue-light border border-blue-bright/20 hover:bg-blue-bright/10 transition-colors">
          + Coluna
        </button>
      </div>

      {/* Columns — fixed equal width */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 p-3 h-full" style={{ minWidth: Math.max(columns.length, 1) * (COLUMN_WIDTH + 12) }}>
          {columns.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-text-dim text-xs">
              Esta storyline ainda não tem colunas. Clique em "+ Coluna" para criar.
            </div>
          ) : columns.map(col => {
            const colCards = cardsByColumn[col.id] || [];
            return (
              <div
                key={col.id}
                style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH, maxWidth: COLUMN_WIDTH }}
                className={`shrink-0 rounded-lg border ${colorClass(col.color)} flex flex-col`}
                onDrop={e => handleDrop(e, col.id)}
                onDragOver={handleDragOver}
              >
                <div className="p-2.5 border-b border-white/5 flex items-center justify-between gap-1">
                  {editingColId === col.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        value={editingColTitle}
                        onChange={e => setEditingColTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditingCol(); if (e.key === 'Escape') setEditingColId(null); }}
                        className="flex-1 min-w-0 h-6 px-1.5 text-xs bg-white/[0.06] border border-white/15 rounded focus:outline-none"
                        autoFocus
                      />
                      <button onClick={saveEditingCol} className="p-0.5 text-green-400"><Check className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEditingCol(col)} className="text-xs font-montserrat font-bold truncate text-left flex-1 hover:text-blue-light transition-colors" title="Clique para renomear">
                      {col.title}
                    </button>
                  )}
                  <span className="text-[10px] text-text-dim bg-white/[0.05] px-1.5 py-0.5 rounded-full shrink-0">{colCards.length}</span>
                  {columns.length > 1 && (
                    <ConfirmDialog
                      trigger={
                        <button className="p-0.5 text-text-dim hover:text-red-alert" title="Excluir coluna">
                          <X className="w-3 h-3" />
                        </button>
                      }
                      title="Excluir coluna"
                      description={`Excluir "${col.title}"? Os cards desta coluna serão removidos.`}
                      confirmLabel="Excluir"
                      onConfirm={() => onDeleteColumn(col.id)}
                    />
                  )}
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {colCards.map(card => (
                      <KanbanCard
                        key={card.id}
                        card={card}
                        onUpdate={updateCard}
                        onDelete={deleteCard}
                        onDragStart={handleDragStart}
                        isDragging={draggedId === card.id}
                      />
                    ))}
                    {colCards.length === 0 && (
                      <div className="text-center py-6 text-[10px] text-text-dim/30">
                        Arraste cards aqui ou crie um novo
                      </div>
                    )}
                    <button
                      onClick={() => createCard(col.id)}
                      className="w-full text-[11px] py-1.5 rounded border border-dashed border-white/10 text-text-dim hover:text-blue-light hover:border-blue-bright/30 transition-colors"
                    >
                      + Card
                    </button>
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
