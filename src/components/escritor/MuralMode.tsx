import React from 'react';
import { useStorylines } from '@/hooks/useStorylines';
import { KanbanBoard } from '@/components/escritor/KanbanBoard';
import type { Manuscript } from '@/hooks/useManuscript';

/**
 * Wrapper isolado para o modo Storyline/Mural.
 * Mantém `useStorylines` desligado enquanto o usuário estiver no modo Manuscrito,
 * evitando fetches e re-renders desnecessários.
 */
export const MuralMode: React.FC<{ worldId: string; manuscripts: Manuscript[] }> = React.memo(
  ({ worldId, manuscripts }) => {
    const storylineState = useStorylines(worldId);
    return (
      <div className="h-[calc(100vh-220px)] min-h-[400px] bg-white/[0.02] rounded-lg border border-blue-bright/10">
        <KanbanBoard
          storylines={storylineState.storylines}
          activeStoryline={storylineState.activeStoryline}
          setActiveStoryline={storylineState.setActiveStoryline}
          columns={storylineState.columns}
          onCreateStoryline={() => storylineState.createStoryline('Nova storyline')}
          onRenameStoryline={(id, name) => storylineState.updateStoryline(id, { name })}
          onDeleteStoryline={storylineState.deleteStoryline}
          onCreateColumn={() => storylineState.createColumn('Nova coluna')}
          onUpdateColumn={storylineState.updateColumn}
          onDeleteColumn={storylineState.deleteColumn}
          onLinkManuscript={(id, mid) => storylineState.updateStoryline(id, { manuscript_id: mid })}
          manuscripts={manuscripts}
        />
      </div>
    );
  },
);
MuralMode.displayName = 'MuralMode';
