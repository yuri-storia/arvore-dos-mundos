// Resposta NDJSON com heartbeat — usada pelas gerações visuais.
//
// GPT Image 2 em alta fidelidade pode levar >150s, e a edge function
// derruba a conexão por IDLE_TIMEOUT se nada for escrito. Aqui abrimos o
// stream imediatamente, mandamos linhas de progresso/heartbeat e fechamos
// com `{"t":"done"}` ou `{"t":"error"}`.

export interface StreamEmitter {
  phase: (phase: string, pct?: number) => void;
}

// deno-lint-ignore no-explicit-any
export function ndjsonStream(
  corsHeaders: Record<string, string>,
  work: (emit: StreamEmitter) => Promise<Record<string, unknown>>,
): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream({
    start(controller) {
      let closed = false;
      const write = (obj: Record<string, unknown>) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch { /* ignore */ }
      };

      write({ t: "start" });
      const heartbeat = setInterval(() => write({ t: "ping", at: Date.now() }), 5000);

      const emit: StreamEmitter = {
        phase: (phase, pct) => write({ t: "phase", phase, pct }),
      };

      work(emit)
        .then((result) => write({ t: "done", ...result }))
        .catch((e) => {
          console.error("ndjsonStream error:", e);
          const status = (e && typeof e === "object" && "status" in e) ? (e as { status: number }).status : 500;
          write({ t: "error", error: e instanceof Error ? e.message : "Unknown error", status });
        })
        .finally(() => {
          clearInterval(heartbeat);
          closed = true;
          try { controller.close(); } catch { /* ignore */ }
        });
    },
  });

  return new Response(body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
