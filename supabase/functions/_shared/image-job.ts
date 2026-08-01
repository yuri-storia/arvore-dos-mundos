// Execução assíncrona das gerações visuais.
//
// Por quê: GPT Image 2 em alta fidelidade pode levar de 1 a 4 minutos.
// O gateway HTTP do Supabase corta a requisição (504) mesmo com stream/heartbeat,
// então a edge function agora responde na hora com um `jobId` e continua o
// trabalho em background (`EdgeRuntime.waitUntil`), gravando as fases na tabela
// `image_jobs`. O cliente acompanha por polling — nada é cancelado antes da hora.

export type JobPhase = "compiling" | "generating" | "saving" | "charging" | "done" | "error";

// deno-lint-ignore no-explicit-any
type Admin = any;

export interface JobEmitter {
  phase: (phase: JobPhase, pct?: number) => void;
}

export async function createJob(admin: Admin, userId: string, kind: "vision" | "map", cost: number, quality: string) {
  const { data, error } = await admin
    .from("image_jobs")
    .insert({ user_id: userId, kind, cost, quality, status: "running", phase: "compiling", pct: 5 })
    .select("id")
    .single();
  if (error) throw new Error(`Não foi possível iniciar a geração: ${error.message}`);
  return data.id as string;
}

/**
 * Roda o trabalho em background e mantém `image_jobs` atualizado.
 * Nunca lança — falhas viram `status='error'` na linha do job.
 */
export function runJob(
  admin: Admin,
  jobId: string,
  work: (emit: JobEmitter) => Promise<{ imageUrl: string; prompt: string } & Record<string, unknown>>,
) {
  const update = (patch: Record<string, unknown>) =>
    admin.from("image_jobs").update(patch).eq("id", jobId).then(
      () => {},
      (e: unknown) => console.error("image_jobs update failed:", e),
    );

  const emit: JobEmitter = {
    phase: (phase, pct) => { void update({ phase, pct: pct ?? 0 }); },
  };

  const task = (async () => {
    try {
      const result = await work(emit);
      await update({
        status: "done",
        phase: "done",
        pct: 100,
        image_url: result.imageUrl,
        prompt: result.prompt?.slice(0, 8000) ?? null,
      });
    } catch (e) {
      console.error("image job failed:", jobId, e);
      await update({
        status: "error",
        phase: "error",
        error: e instanceof Error ? e.message : "Falha desconhecida na geração.",
      });
    }
  })();

  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(task);
  return task;
}
