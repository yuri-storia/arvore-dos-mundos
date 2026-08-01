import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { generateImageB64, persistImage, ImageGenError } from "../_shared/image-provider.ts";
import { compileVisionPrompt, type RefIntent, type StructuredRef } from "../_shared/prompt-compilers.ts";
import { resolveQuality } from "../_shared/image-quality.ts";
import { ndjsonStream } from "../_shared/ndjson-stream.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const VALID_INTENTS: RefIntent[] = ["estilo", "composicao", "ambientacao", "personagem", "paleta"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rl = await checkRateLimit(adminClient, userId, "ai-image-consistent", 6);
    if (rl) return rl;

    let body: unknown;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request body" }, 400);

    const { prompt, referenceImageUrls, referenceText, references, qualityTier } = body as Record<string, unknown>;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return json({ error: "prompt must be a non-empty string" }, 400);
    }

    // Qualidade/custo definidos pela matriz central da Galeria.
    const q = resolveQuality("gallery", qualityTier);

    const { data: quota } = await adminClient.rpc("check_ai_quota", {
      _user_id: userId,
      _type: "image",
      _cost_override: q.cost,
    });
    if (!quota?.allowed) {
      const reason = quota?.reason || "unknown";
      const messages: Record<string, string> = {
        no_subscription: "Você precisa de um plano ativo para gerar imagens.",
        credit_limit_reached: "Gotas insuficientes. Faça uma recarga ou aguarde a renovação mensal.",
      };
      return json({ error: messages[reason] || "Quota exceeded", quota }, 403);
    }

    // Referências com papéis (identidade/estilo/ambiente/composição/paleta) — no máximo 3.
    const structured: StructuredRef[] = Array.isArray(references)
      ? (references as unknown[]).flatMap((r) => {
          if (!r || typeof r !== "object") return [];
          const obj = r as Record<string, unknown>;
          const url = typeof obj.url === "string" && obj.url.length < 4000 ? obj.url : null;
          const raw = typeof obj.intent === "string" ? obj.intent : "estilo";
          const intent = VALID_INTENTS.includes(raw as RefIntent) ? (raw as RefIntent) : "estilo";
          return url ? [{ url, intent }] : [];
        }).slice(0, 3)
      : [];

    const legacyUrls: string[] = Array.isArray(referenceImageUrls)
      ? (referenceImageUrls as unknown[]).filter((u): u is string => typeof u === "string" && u.length < 4000).slice(0, 3)
      : [];

    const allRefs: StructuredRef[] = structured.length > 0
      ? structured
      : legacyUrls.map((url) => ({ url, intent: "personagem" as RefIntent }));

    const canonText = typeof referenceText === "string" ? referenceText.slice(0, 4000) : "";

    const jobId = await createJob(adminClient, userId, "vision", q.cost, q.tier);

    runJob(adminClient, jobId, async (emit) => {
      emit.phase("compiling", 8);
      const finalPrompt = await compileVisionPrompt(LOVABLE_API_KEY, {
        basePrompt: prompt.slice(0, 6000),
        canonText,
        references: allRefs,
      });

      emit.phase("generating", 25);
      const b64 = await generateImageB64(LOVABLE_API_KEY, finalPrompt, "1024x1024", q.quality);

      emit.phase("saving", 88);
      const imageUrl = await persistImage(adminClient, userId, b64, "vision");

      emit.phase("charging", 96);
      await adminClient.rpc("increment_ai_usage", { _user_id: userId, _type: "image", _cost_override: q.cost });

      return { imageUrl, prompt: finalPrompt };
    });

    return json({ jobId, quota, referencesUsed: allRefs.length, quality: q.tier, cost: q.cost });

  } catch (e) {
    console.error("ai-image-consistent error:", e);
    if (e instanceof ImageGenError) return json({ error: e.message }, e.status);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
