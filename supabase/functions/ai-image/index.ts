import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { generateImageB64, persistImage, ImageGenError } from "../_shared/image-provider.ts";
import { compileMapPrompt, compileVisionPrompt } from "../_shared/prompt-compilers.ts";
import { resolveQuality } from "../_shared/image-quality.ts";
import { createJob, runJob } from "../_shared/image-job.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    const rl = await checkRateLimit(adminClient, userId, "ai-image", 6);
    if (rl) return rl;

    let body: unknown;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request body" }, 400);

    const b = body as Record<string, unknown>;
    const purpose: "map" | "vision" = b.purpose === "map" ? "map" : "vision";
    // Custo e qualidade vêm da matriz central (nunca do cliente).
    const q = resolveQuality(purpose === "map" ? "map" : "gallery", b.qualityTier);

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

    if (purpose === "vision" && !(typeof b.prompt === "string" && b.prompt.trim())) {
      return json({ error: "prompt or map parameters are required" }, 400);
    }

    // Trabalho assíncrono: respondemos já com o jobId e seguimos em background.
    const jobId = await createJob(adminClient, userId, purpose, q.cost, q.tier);

    runJob(adminClient, jobId, async (emit) => {
      emit.phase("compiling", 8);

      let finalPrompt = "";
      let size: "1024x1024" | "1536x1024" = "1024x1024";

      if (purpose === "map") {
        const style = (b.style || {}) as Record<string, unknown>;
        finalPrompt = await compileMapPrompt(LOVABLE_API_KEY, {
          styleId: String(style.id || "explorer"),
          styleLabel: String(style.label || "Explorador"),
          styleDesc: String(style.desc || ""),
          styleKeywords: String(style.prompt || ""),
          custom: !!style.custom,
          description: typeof b.description === "string" ? b.description.slice(0, 2000) : "",
          worldContext: typeof b.worldContext === "string" ? b.worldContext.slice(0, 4000) : "",
        });
        size = "1536x1024"; // mapas em paisagem
      } else {
        finalPrompt = await compileVisionPrompt(LOVABLE_API_KEY, {
          basePrompt: String(b.prompt).slice(0, 6000),
          canonText: typeof b.canonText === "string" ? b.canonText : "",
        });
      }

      emit.phase("generating", 25);
      const b64 = await generateImageB64(LOVABLE_API_KEY, finalPrompt, size, q.quality);

      emit.phase("saving", 88);
      const imageUrl = await persistImage(adminClient, userId, b64, purpose);

      emit.phase("charging", 96);
      await adminClient.rpc("increment_ai_usage", { _user_id: userId, _type: "image", _cost_override: q.cost });

      return { imageUrl, prompt: finalPrompt };
    });

    return json({ jobId, quota, purpose, quality: q.tier, cost: q.cost });

  } catch (e) {
    console.error("ai-image error:", e);
    if (e instanceof ImageGenError) return json({ error: e.message }, e.status);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
