import React, { useState, useMemo } from 'react';
import { type Scene, type SceneStatus, type Chapter } from '@/hooks/useManuscript';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, GripVertical, Plus, Filter } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const COLUMNS: { key: SceneStatus; label: string; color: string }[] = [
  { key: 'ideia', label: '💡 Ideia', color: 'border-yellow-500/30 bg-yellow-500/5' },
  { key: 'rascunho', label: '✏️ Rascunho', color: 'border-blue-bright/30 bg-blue-bright/5' },
  { key: 'revisao', label: '🔍 Revisão', color: 'border-purple-500/30 bg-purple-500/5' },
  { key: 'pronto', label: '✅ Pronto', color: 'border-green-500/30 bg-green-500/5' },
];

interface Props {
  chapters: Chapter[];
  scenes: Scene[];
  onUpdateScene: (id: string, updates: Partial<Pick<Scene, 'status' | 'title' | 'content' | 'sort_order'>>) => Promise<void>;
  onSelectScene: (id: string) => void;
  onCreateScene: (chapterId: string) => Promise<any>;
}

export const KanbanBoard: React.FC<Props> = ({ chapters, scenes, onUpdateScene, onSelectScene, onCreateScene }) => {
  const [filterChapter, setFilterChapter] = useState<string>('all');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const filteredScenes = useMemo(() => {
    if (filterChapter === 'all') return scenes;
    return scenes.filter(s => s.chapter_id === filterChapter);
  }, [scenes, filterChapter]);

  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    e.dataTransfer.setData('text/plain', sceneId);
    setDraggedId(sceneId);
  };

  const handleDrop = (e: React.DragEvent, status: SceneStatus) => {
    e.preventDefault();
    const sceneId = e.dataTransfer.getData('text/plain');
    if (sceneId) onUpdateScene(sceneId, { status });
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-blue-bright/10 flex items-center gap-3">
        <Filter className="w-3.5 h-3.5 text-text-dim" />
        <Select value={filterChapter} onValueChange={setFilterChapter}>
          <SelectTrigger className="h-7 w-[180px] text-xs bg-white/[0.03] border-blue-bright/10">
            <SelectValue placeholder="Todos os capítulos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os capítulos</SelectItem>
            {chapters.map(ch => (
              <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] text-text-dim ml-auto">{filteredScenes.length} arcos</span>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 p-3 min-h-full" style={{ minWidth: COLUMNS.length * 240 }}>
          {COLUMNS.map(col => {
            const colScenes = filteredScenes.filter(s => s.status === col.key);
            return (
              <div
                key={col.key}
                className={`flex-1 min-w-[220px] rounded-lg border ${col.color} flex flex-col`}
                onDrop={e => handleDrop(e, col.key)}
                onDragOver={handleDragOver}
              >
                <div className="p-2.5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-montserrat font-bold">{col.label}</span>
                  <span className="text-[10px] text-text-dim bg-white/[0.05] px-1.5 py-0.5 rounded-full">{colScenes.length}</span>
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
