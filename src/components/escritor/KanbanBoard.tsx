import React, { useState, useMemo } from 'react';
import { type Scene, type Chapter } from '@/hooks/useManuscript';
import { type Storyline, type StorylineColumn } from '@/hooks/useStorylines';
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

interface Props {
  // Storyline state
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

  // Scenes (cards in the columns)
  chapters: Chapter[];
  scenes: Scene[];
  onUpdateScene: (id: string, updates: Partial<Pick<Scene, 'title' | 'content' | 'sort_order' | 'status' | 'storyline_column_id'>>) => Promise<void>;
  onSelectScene: (id: string) => void;
  onCreateScene: (chapterId: string, columnId?: string) => Promise<any>;
}

export const KanbanBoard: React.FC<Props> = ({
  storylines, activeStoryline, setActiveStoryline, columns,
  onCreateStoryline, onRenameStoryline, onDeleteStoryline,
  onCreateColumn, onUpdateColumn, onDeleteColumn,
  onLinkManuscript, manuscripts,
  chapters, scenes, onUpdateScene, onSelectScene, onCreateScene,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColTitle, setEditingColTitle] = useState('');
  const [editingStorylineName, setEditingStorylineName] = useState(false);
  const [storylineNameDraft, setStorylineNameDraft] = useState('');

  // Map scenes to columns. Scenes without storyline_column_id show up only in the
  // first column of the active storyline as "loose" cards (until they're moved).
  const scenesByColumn = useMemo(() => {
    const map: Record<string, Scene[]> = {};
    columns.forEach(c => { map[c.id] = []; });
    const firstColId = columns[0]?.id;
    scenes.forEach(s => {
      if (s.storyline_column_id && map[s.storyline_column_id]) {
        map[s.storyline_column_id].push(s);
      } else if (firstColId) {
        map[firstColId].push(s);
      }
    });
    return map;
  }, [columns, scenes]);

  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    e.dataTransfer.setData('text/plain', sceneId);
    setDraggedId(sceneId);
  };
  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const sceneId = e.dataTransfer.getData('text/plain');
    if (sceneId) onUpdateScene(sceneId, { storyline_column_id: columnId });
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

  // Where should the "+ arco" button create a new scene? We need a chapter.
  // Pick the first chapter (or do nothing if none).
  const handleAddScene = async (columnId: string) => {
    const chapter = chapters[0];
    if (!chapter) return;
    const sc = await onCreateScene(chapter.id, columnId);
    if (sc) await onUpdateScene(sc.id, { storyline_column_id: columnId });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-blue-bright/10 flex items-center gap-2 flex-wrap">
        {/* Storyline switcher */}
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

        {/* Link to manuscript */}
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

        {/* Delete storyline */}
        {activeStoryline && storylines.length > 1 && (
          <ConfirmDialog
            trigger={
              <button className="p-1 text-text-dim hover:text-red-alert ml-1" title="Excluir storyline">
                <X className="w-3.5 h-3.5" />
              </button>
            }
            title="Excluir storyline"
            description={`Excluir "${activeStoryline.name}"? As colunas serão removidas, mas as cenas continuam nos capítulos.`}
            confirmLabel="Excluir"
            onConfirm={() => onDeleteStoryline(activeStoryline.id)}
          />
        )}

        <button onClick={onCreateColumn} className="ml-auto px-2 py-1 rounded text-[11px] font-montserrat text-blue-light border border-blue-bright/20 hover:bg-blue-bright/10 transition-colors">
          + Coluna
        </button>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 p-3 min-h-full" style={{ minWidth: Math.max(columns.length, 1) * 240 }}>
          {columns.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-text-dim text-xs">
              Esta storyline ainda não tem colunas. Clique em "+ Coluna" para criar.
            </div>
          ) : columns.map(col => {
            const colScenes = scenesByColumn[col.id] || [];
            return (
              <div
                key={col.id}
                className={`flex-1 min-w-[220px] rounded-lg border ${colorClass(col.color)} flex flex-col`}
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
                  <span className="text-[10px] text-text-dim bg-white/[0.05] px-1.5 py-0.5 rounded-full shrink-0">{colScenes.length}</span>
                  {columns.length > 1 && (
                    <ConfirmDialog
                      trigger={
                        <button className="p-0.5 text-text-dim hover:text-red-alert" title="Excluir coluna">
                          <X className="w-3 h-3" />
                        </button>
                      }
                      title="Excluir coluna"
                      description={`Excluir "${col.title}"? As cenas voltarão ao padrão (sem coluna).`}
                      confirmLabel="Excluir"
                      onConfirm={() => onDeleteColumn(col.id)}
                    />
                  )}
                </div>
                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-2">
                    {colScenes.map(scene => {
                      const chapter = chapters.find(c => c.id === scene.chapter_id);
                      return (
                        <div
                          key={scene.id}
                          draggable
                          onDragStart={e => handleDragStart(e, scene.id)}
                          onClick={() => onSelectScene(scene.id)}
                          className={`p-2.5 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-all group ${
                            draggedId === scene.id ? 'opacity-40 scale-95' : ''
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="w-3 h-3 text-text-dim/30 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 cursor-grab" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-montserrat font-semibold text-foreground truncate">{scene.title}</p>
                              {chapter && (
                                <p className="text-[9px] text-text-dim mt-0.5">{chapter.title}</p>
                              )}
                              {scene.content && (
                                <p className="text-[10px] text-text-dim/60 mt-1 line-clamp-2">{scene.content.substring(0, 100)}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[9px] text-text-dim/40">{scene.word_count} palavras</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {colScenes.length === 0 && (
                      <div className="text-center py-6 text-[10px] text-text-dim/30">
                        Arraste arcos aqui
                      </div>
                    )}
                    {chapters.length > 0 && (
                      <button
                        onClick={() => handleAddScene(col.id)}
                        className="w-full text-[10px] py-1.5 rounded border border-dashed border-white/10 text-text-dim hover:text-foreground hover:border-blue-bright/30 transition-colors"
                      >
                        + arco
                      </button>
                    )}
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
