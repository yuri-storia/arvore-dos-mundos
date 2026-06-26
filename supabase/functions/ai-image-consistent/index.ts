import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: quota } = await adminClient.rpc("check_ai_quota", { _user_id: userId, _type: "image" });
    if (!quota?.allowed) {
      const reason = quota?.reason || "unknown";
      const messages: Record<string, string> = {
        no_subscription: "Você precisa de um plano ativo para gerar imagens.",
        credit_limit_reached: `Créditos esgotados (${quota?.used}/${quota?.limit}). Aguarde o próximo mês.`,
      };
      return new Response(JSON.stringify({ error: messages[reason] || "Quota exceeded", quota }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { prompt, referenceImageUrls, referenceText, references } = body as Record<string, unknown>;
    if (!prompt || typeof prompt !== "string" || prompt.length === 0) {
      return new Response(JSON.stringify({ error: "prompt must be a non-empty string" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // New structured references: [{ url, intent }] where intent ∈ estilo | composicao | ambientacao | personagem | paleta
    type IntentKey = "estilo" | "composicao" | "ambientacao" | "personagem" | "paleta";
    const INTENT_INSTRUCTIONS: Record<IntentKey, string> = {
      estilo: "USE ONLY for visual STYLE — art technique, brushwork, rendering, color treatment, level of detail. DO NOT copy subjects, characters, composition, or specific objects from this image.",
      composicao: "USE ONLY for COMPOSITION/FRAMING — camera angle, layout, perspective, depth of field, rule of thirds. DO NOT copy art style, subjects, or color palette.",
      ambientacao: "USE ONLY for ATMOSPHERE/SETTING — lighting direction and quality, mood, weather, environment textures and ambience. DO NOT copy characters or composition.",
      personagem: "USE as CHARACTER/SUBJECT CANON — preserve appearance, body type, clothing, identifying features, and proportions of the subject. DO NOT copy background or composition.",
      paleta: "USE ONLY for COLOR PALETTE — extract the dominant colors and apply them. DO NOT copy subjects, composition, or art style.",
    };

    type StructuredRef = { url: string; intent: IntentKey };
    const structured: StructuredRef[] = Array.isArray(references)
      ? (references as unknown[]).flatMap(r => {
          if (!r || typeof r !== "object") return [];
          const obj = r as Record<string, unknown>;
          const url = typeof obj.url === "string" && obj.url.length < 4000 ? obj.url : null;
          const intentRaw = typeof obj.intent === "string" ? obj.intent : "estilo";
          const intent = (Object.keys(INTENT_INSTRUCTIONS) as IntentKey[]).includes(intentRaw as IntentKey)
            ? (intentRaw as IntentKey)
            : "estilo";
          return url ? [{ url, intent }] : [];
        }).slice(0, 5)
      : [];

    // Legacy plain URL list (fall back to "canon" usage)
    const legacyUrls: string[] = Array.isArray(referenceImageUrls)
      ? (referenceImageUrls as unknown[]).filter((u): u is string => typeof u === "string" && u.length < 4000).slice(0, 5)
      : [];

    const refText = typeof referenceText === "string" ? referenceText.slice(0, 4000) : "";

    const userContent: Array<Record<string, unknown>> = [];

    // Per-reference instruction + image (Midjourney-style targeted refs)
    const intentBlock = structured.length > 0
      ? "REFERENCE IMAGES — each one has a SPECIFIC role. Follow the role strictly; do NOT mix roles between references.\n\n" +
        structured.map((r, idx) => `Reference ${idx + 1} (${r.intent.toUpperCase()}): ${INTENT_INSTRUCTIONS[r.intent]}`).join("\n") +
        "\n"
      : "";

    // Legacy: generic canon refs
    const legacyBlock = legacyUrls.length > 0
      ? "Additional canon references: use these to keep characters, clothing, symbols, locations, palette and lighting consistent with the established world. Do not invent lore not present in the canon text.\n"
      : "";

    const header = `You are generating a new image. ${intentBlock}${legacyBlock}${refText ? `\nWorld context (canon, do not contradict):\n${refText}\n` : ""}\nNew image to generate: ${prompt}`;
    userContent.push({ type: "text", text: header });

    for (const r of structured) userContent.push({ type: "image_url", image_url: { url: r.url } });
    for (const url of legacyUrls) userContent.push({ type: "image_url", image_url: { url } });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image",
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("ai-image-consistent error:", response.status, t);
      throw new Error(`AI image error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";
    if (!imageUrl) throw new Error("No image generated");

    await adminClient.rpc("increment_ai_usage", { _user_id: userId, _type: "image" });

    return new Response(JSON.stringify({ imageUrl, quota, referencesUsed: structured.length + legacyUrls.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-image-consistent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
