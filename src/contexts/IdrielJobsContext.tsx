import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Idriel Jobs Context
 *
 * Mantém solicitações de IA da Idriel vivas mesmo quando o usuário muda de aba.
 * Como o estado vive aqui (acima do roteamento de tabs), desmontar uma aba
 * NÃO cancela a Promise — a chamada continua e o resultado fica disponível
 * quando o usuário voltar.
 */

export type IdrielJobKind = 'prompt' | 'image';

export interface IdrielJob<T = unknown> {
  id: string;
  kind: IdrielJobKind;
  label: string;
  status: 'running' | 'done' | 'error';
  result?: T;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

interface Ctx {
  jobs: Record<string, IdrielJob>;
  /** Executa uma promise persistente. Retorna o id do job. */
  run: <T>(opts: { id: string; kind: IdrielJobKind; label: string; task: () => Promise<T> }) => string;
  get: <T = unknown>(id: string) => IdrielJob<T> | undefined;
  clear: (id: string) => void;
  isRunning: (id: string) => boolean;
}

const IdrielJobsContext = createContext<Ctx | null>(null);

export const IdrielJobsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Record<string, IdrielJob>>({});

  const run = useCallback(<T,>(opts: { id: string; kind: IdrielJobKind; label: string; task: () => Promise<T> }) => {
    const { id, kind, label, task } = opts;
    setJobs(prev => ({
      ...prev,
      [id]: { id, kind, label, status: 'running', startedAt: Date.now() },
    }));
    // Fire-and-forget — promise vive no closure, sem depender de mount.
    task()
      .then(result => {
        setJobs(prev => ({
          ...prev,
          [id]: { ...(prev[id] || { id, kind, label, startedAt: Date.now() }), status: 'done', result, finishedAt: Date.now() },
        }));
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setJobs(prev => ({
          ...prev,
          [id]: { ...(prev[id] || { id, kind, label, startedAt: Date.now() }), status: 'error', error: msg, finishedAt: Date.now() },
        }));
      });
    return id;
  }, []);

  const get = useCallback(<T,>(id: string) => jobs[id] as IdrielJob<T> | undefined, [jobs]);

  const clear = useCallback((id: string) => {
    setJobs(prev => {
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  }, []);

  const isRunning = useCallback((id: string) => jobs[id]?.status === 'running', [jobs]);

  return (
    <IdrielJobsContext.Provider value={{ jobs, run, get, clear, isRunning }}>
      {children}
    </IdrielJobsContext.Provider>
  );
};

export function useIdrielJobs() {
  const ctx = useContext(IdrielJobsContext);
  if (!ctx) throw new Error('useIdrielJobs must be used within IdrielJobsProvider');
  return ctx;
}
